/**
 * forecast-models.js
 * 负责生成各种数值模型的预报数据。
 * [修正版] 修复陆地检测逻辑，检测"预报点"而非"初始点"
 */
import { getSST, normalizeLongitude } from './utils.js';
import { calculateSteering, updatePressureSystems, updateShearEnvironment } from './cyclone-model.js';
import { calculateBackgroundHumidity } from './visualization.js';
import { calculateOceanHeatContent } from './environment-model.js';

// [辅助] 坐标清洗
function wrap180(lon) {
    lon = lon % 360;
    return (lon > 180) ? lon - 360 : (lon < -180 ? lon + 360 : lon);
}

export function generatePathForecasts(cyclone, pressureSystems, checkLandFunc = null, globalTemp = 289, globalShearSetting = 100) {
    if (cyclone.isExtratropical) {
        return [];
    }
    const forecasts = [];
    const isMedicane = cyclone.basin === 'MED';
    
    // ICWC guidance members. Global models use broader steering spread while
    // hurricane/diagnostic members keep tighter inner-core assumptions.
    const models = [
        { name: "ICWC", modelName: "ICWC", family: "consensus", color: "#f8fafc", bias: { u: 0.35, v: 0.45 }, speedScale: 1.00, turnRate: 0.25, intensityBias: 0, shearBias: 0 },
        { name: "GFS", modelName: "GFS", family: "global", color: "#38bdf8", bias: { u: 0.82, v: 0.18 }, speedScale: 1.06, turnRate: 0.21, intensityBias: -2, shearBias: 1.5 },
        { name: "ECMWF", modelName: "ECMWF", family: "global", color: "#f97316", bias: { u: -0.38, v: 0.24 }, speedScale: 0.95, turnRate: 0.18, intensityBias: 1, shearBias: -0.5 },
        { name: "UKMET", modelName: "UKMET", family: "global", color: "#a78bfa", bias: { u: -0.18, v: 0.68 }, speedScale: 1.01, turnRate: 0.19, intensityBias: 0, shearBias: 0.75 },
        { name: "ICON", modelName: "ICON", family: "global", color: "#22c55e", bias: { u: 0.16, v: -0.48 }, speedScale: 0.98, turnRate: 0.23, intensityBias: -1, shearBias: 0.25 },
        { name: "CMC", modelName: "CMC", family: "global", color: "#eab308", bias: { u: 0.44, v: -0.28 }, speedScale: 1.03, turnRate: 0.22, intensityBias: -1, shearBias: 0.5 },
        { name: "HAFS-A", modelName: "HAFS-A", family: "hurricane", color: "#ef4444", bias: { u: 0.08, v: 0.1 }, speedScale: 0.97, turnRate: 0.31, intensityBias: 6, shearBias: -1.5 },
        { name: "HWRF", modelName: "HWRF", family: "hurricane", color: "#ec4899", bias: { u: -0.1, v: -0.08 }, speedScale: 0.94, turnRate: 0.34, intensityBias: 4, shearBias: -0.75 },
        { name: "HMON", modelName: "HMON", family: "hurricane", color: "#14b8a6", bias: { u: 0.24, v: -0.04 }, speedScale: 1.00, turnRate: 0.29, intensityBias: 2, shearBias: 0.25 },
        { name: "HWDAT", modelName: "HWDAT", family: "diagnostic", color: "#f43f5e", bias: { u: -0.04, v: 0.02 }, speedScale: 0.92, turnRate: 0.38, intensityBias: 5, shearBias: -1.0 }
    ];

    // 参数配置
    const PATH_STEP_HOURS = 3;
    const INTENSITY_STEP_HOURS = 6;
    const TOTAL_HOURS = 72; // 预测时长
    
    const STEPS_PER_INTENSITY_UPDATE = INTENSITY_STEP_HOURS / PATH_STEP_HOURS; 
    const TOTAL_STEPS = TOTAL_HOURS / PATH_STEP_HOURS; 

    models.forEach(model => {
        let tempCyclone = JSON.parse(JSON.stringify(cyclone));
        let tempPressureSystems = JSON.parse(JSON.stringify(pressureSystems));
        
        let track = [[tempCyclone.lon, tempCyclone.lat, tempCyclone.intensity, tempCyclone.isTransitioning, tempCyclone.isExtratropical]];

        let lastCalculatedIntensity = tempCyclone.intensity;
        const startAge = tempCyclone.age || 0;
        for(let t = 1; t <= TOTAL_STEPS; t++) { 
            // 1. 路径计算 (3小时/步)
            updatePressureSystems(tempPressureSystems, cyclone.currentMonth);
            const { steerU, steerV, shearU, shearV } = calculateSteering(tempCyclone.lon, tempCyclone.lat, tempPressureSystems, model.bias);
            
            let steeringDirection = (Math.atan2(steerU, steerV) * 180 / Math.PI + 360) % 360;
            let angleDiff = steeringDirection - tempCyclone.direction;
            while (angleDiff < -180) angleDiff += 360;
            while (angleDiff > 180) angleDiff -= 360;
            tempCyclone.direction = (tempCyclone.direction + angleDiff * (model.turnRate || 0.25) + 360) % 360;
            
            const steeringSpeedKnots = Math.hypot(steerU, steerV) * 1.94384;
            tempCyclone.speed += ((steeringSpeedKnots * (model.speedScale || 1)) - tempCyclone.speed) * (model.speedRelaxation || 0.3);
            
            const currentSpeed = Math.max(3, tempCyclone.speed);
            const angleRad = (90 - tempCyclone.direction) * (Math.PI / 180);
            const distanceDeg = currentSpeed * PATH_STEP_HOURS * 1.852 / 111;
            
            tempCyclone.lat += distanceDeg * Math.sin(angleRad);
            tempCyclone.lon = normalizeLongitude(tempCyclone.lon + (distanceDeg * Math.cos(angleRad)) / Math.cos(tempCyclone.lat * Math.PI / 180));
            tempCyclone.age = startAge + (t * PATH_STEP_HOURS);

            // 2. 强度计算 (12小时/步)
            if (t % STEPS_PER_INTENSITY_UPDATE === 0) {
                const queryLon = wrap180(tempCyclone.lon);
                
                // [修正核心] 检测"当前预报点"是否在陆地，而不是检测 cyclone.isLand (初始点)
                const isForecastingLand = checkLandFunc(tempCyclone.lon, tempCyclone.lat);
                // 只有在非陆地时才查 SST，节省性能
                let sst = 29.0;
                let hum = 65.0;
                
                if (!isForecastingLand) {
                    const val = getSST(tempCyclone.lat, tempCyclone.lon, cyclone.currentMonth || 8, globalTemp);
                    if (val !== undefined && val !== null && val > -5) sst = val;
                    
                    // [关键修改] 安全调用：如果函数存在且运行正常，才覆盖默认值
                    if (typeof calculateBackgroundHumidity === 'function') {
                        try {
                            const hVal = calculateBackgroundHumidity(tempCyclone.lon, tempCyclone.lat, pressureSystems, cyclone.currentMonth, cyclone, globalTemp);
                            // 确保返回值是有效数字
                            if (typeof hVal === 'number' && !isNaN(hVal)) {
                                hum = hVal;
                            }
                        } catch (e) {
                            console.warn("Forecast humidity calc failed, using 65", e);
                            hum = 65.0;
                        }
                    }
                }

                let nextIntensity = lastCalculatedIntensity;

                if (isForecastingLand) {
                    // --- 陆地逻辑 (衰减) ---
                    const frictionDecay = Math.max(5, lastCalculatedIntensity * 0.22); 
                    let naturalDecayResult = lastCalculatedIntensity - frictionDecay;

                    // 强制约束：强度上限 = 上次强度 - 10KT
                    const hardCap = lastCalculatedIntensity - 10;
                    
                    nextIntensity = Math.min(naturalDecayResult, hardCap);
                } else {
                    // --- 海洋逻辑 (增强/维持) ---
                    let mpi = 0;
                    if (sst >= 24.7) {
                        // 考虑湿度影响的 MPI
                        mpi = (15 + (sst - 24.7) * 24.7 - (75 - hum)) * (1.08 - 1/tempCyclone.lat); 
                    }
                    if (isMedicane) {
                        const medMonth = cyclone.currentMonth || 8;
                        const medSeason = (medMonth >= 9 || medMonth <= 2) ? 1 : 0;
                        mpi = sst >= 17.0 ? Math.max(0, Math.min(86, 25 + (sst - 17.0) * 6.2 + medSeason * 13 + (globalTemp - 289) * 1.5)) : 0;
                        const ohc = calculateOceanHeatContent(tempCyclone.lat, tempCyclone.lon, cyclone.currentMonth || 8, globalTemp);
                        const ohcSupport = Math.max(-0.28, Math.min(0.65, (ohc.ohcKjCm2 - 10) / 58));
                        const waterFuel = Math.max(0, Math.min(1.15, (ohc.ohcKjCm2 - 8) / 62));
                        mpi *= 1 + ohcSupport * 0.26;
                        mpi += waterFuel * 6;
                    } else if (sst >= 24.7) {
                        const ohc = calculateOceanHeatContent(tempCyclone.lat, tempCyclone.lon, cyclone.currentMonth || 8, globalTemp);
                        const ohcSupport = Math.max(-0.38, Math.min(0.85, (ohc.ohcKjCm2 - 35) / 115));
                        const waterFuel = Math.max(0, Math.min(1.25, (ohc.ohcKjCm2 - 35) / 115));
                        mpi *= 1 + ohcSupport * 0.4;
                        mpi += waterFuel * 14;
                    }
                    mpi += model.intensityBias || 0;
                    tempCyclone.environmentHumidity = hum;
                    const shearEnv = updateShearEnvironment(tempCyclone, shearU, shearV, cyclone.currentMonth || 8, globalShearSetting, isMedicane);
                    const totalShear = Math.max(0, shearEnv.effectiveShearKt + (model.shearBias || 0));
                    const gap = mpi - lastCalculatedIntensity;
                    const changeRate = isMedicane
                        ? (gap > 0 ? Math.random()*0.025 + 0.045 - 0.5/lastCalculatedIntensity - (totalShear * 0.0038) : 0.08 + (totalShear * 0.0024))
                        : (gap > 0 ? Math.random()*0.04 + 0.07 - 0.9/lastCalculatedIntensity - (totalShear * 0.005) : 0.11 + (totalShear * 0.003));
                    const forecastWaterFuel = gap > 0 ? Math.max(0, Math.min(1.2, gap / 90)) : 0;
                    const shearAlignmentBoost = shearEnv.alignmentBoostKt || 0;
                    nextIntensity += gap * (changeRate + forecastWaterFuel * (isMedicane ? 0.012 : 0.022)) + shearAlignmentBoost;
                    const currentForecastAge = tempCyclone.age;
                    
                    if (tempCyclone.shearEventActive && currentForecastAge < tempCyclone.shearEventEndTime) {
                        const shearPenalty = tempCyclone.shearEventMagnitude * (0.18 + Math.random() * 0.18);
                        nextIntensity -= shearPenalty;
                    }
                }

                nextIntensity = Math.max(15, Math.min(isMedicane ? 95 : 185, nextIntensity));
                tempCyclone.intensity = nextIntensity;
                lastCalculatedIntensity = nextIntensity;
            } 
            
            track.push([
                tempCyclone.lon, 
                tempCyclone.lat, 
                tempCyclone.intensity, 
                tempCyclone.isTransitioning || false, 
                tempCyclone.isExtratropical || false
            ]);
        }
        forecasts.push({
            name: model.name,
            modelName: model.modelName || model.name,
            family: model.family || "guidance",
            color: model.color || "#38bdf8",
            track: track
        });
    });
    return forecasts;
}
