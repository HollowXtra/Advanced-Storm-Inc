/**
 * cyclone-model.js
 * Core logic
 */
import { NAME_LISTS, getSST, getPressureAt, normalizeLongitude, calculateDistance, windToPressure } from './utils.js';
import { getElevationAt, getLandStatus } from './terrain-data.js';
import { calculateBackgroundHumidity } from './visualization.js';
import { calculateCycloneRainfall, calculateOceanHeatContent } from './environment-model.js';
import { calculateInvestOutlook } from './invest-system.js';
import { FICTIONIA_BASIN } from './fictionia-map.js';

const basinConfig = {
    'WPAC': { lon: { min: 100, max: 180 }, lat: { min: 5, max: 25 } },  // 西北太平洋
    'EPAC': { lon: { min: 180, max: 260 }, lat: { min: 5, max: 20 } },  // 东北太平洋 (140W to 80W)
    'NATL': { lon: { min: 260, max: 350 }, lat: { min: 6, max: 32 } },  // 北大西洋 (75W to 10W)
    'NIO':  { lon: { min: 60,  max: 100 }, lat: { min: 5, max: 25 } },   // 北印度洋
    'SHEM':  { lon: { min: 140,  max: 200 }, lat: { min: -15, max: -5 } },   // 南太平洋
    'SIO':  { lon: { min: 30,  max: 140 }, lat: { min: -15, max: -5 } },
    'SATL':  { lon: { min: -50,  max: 15 }, lat: { min: -25, max: -10 } },
    'MED': { lon: { min: -5.5, max: 36 }, lat: { min: 31, max: 41.5 } },
    [FICTIONIA_BASIN]: { lon: { min: -101, max: -86 }, lat: { min: 10, max: 24 } }
};

const genesisProfiles = {
    WPAC: [
        { weight: 3.4, lon: 145, lonSpread: 15, lat: 11, latSpread: 4.5, peaks: [8, 9], motion: { direction: 292, spread: 22, speed: 10.5 } },
        { weight: 2.4, lon: 125, lonSpread: 10, lat: 14, latSpread: 4.0, peaks: [7, 8, 9], motion: { direction: 300, spread: 24, speed: 9.5 } },
        { weight: 1.3, lon: 162, lonSpread: 10, lat: 9, latSpread: 3.5, peaks: [10, 11], motion: { direction: 285, spread: 20, speed: 12.0 } },
        { weight: 0.9, lon: 114, lonSpread: 8, lat: 16, latSpread: 4.0, peaks: [6, 7, 8], motion: { direction: 305, spread: 24, speed: 8.5 } }
    ],
    EPAC: [
        { weight: 3.0, lon: 250, lonSpread: 8, lat: 12, latSpread: 3.0, peaks: [8, 9], motion: { direction: 285, spread: 18, speed: 11.0 } },
        { weight: 2.0, lon: 232, lonSpread: 14, lat: 12, latSpread: 3.5, peaks: [7, 8, 9], motion: { direction: 280, spread: 18, speed: 12.5 } },
        { weight: 0.9, lon: 200, lonSpread: 11, lat: 11, latSpread: 3.0, peaks: [8, 9, 10], motion: { direction: 280, spread: 20, speed: 13.0 } }
    ],
    NATL: [
        { weight: 3.0, lon: 315, lonSpread: 14, lat: 13, latSpread: 3.0, peaks: [8, 9], motion: { direction: 285, spread: 18, speed: 13.0 } },
        { weight: 2.2, lon: 285, lonSpread: 12, lat: 16, latSpread: 4.0, peaks: [9, 10], motion: { direction: 300, spread: 24, speed: 9.5 } },
        { weight: 1.5, lon: 268, lonSpread: 6, lat: 21, latSpread: 4.5, peaks: [8, 9, 10], motion: { direction: 325, spread: 30, speed: 8.0 } },
        { weight: 0.9, lon: 340, lonSpread: 7, lat: 25, latSpread: 4.0, peaks: [9, 10], motion: { direction: 330, spread: 34, speed: 10.0 } }
    ],
    NIO: [
        { weight: 2.2, lon: 88, lonSpread: 6, lat: 13, latSpread: 4.0, peaks: [5, 10, 11], motion: { direction: 315, spread: 38, speed: 8.0 } },
        { weight: 1.6, lon: 66, lonSpread: 6, lat: 14, latSpread: 4.0, peaks: [5, 6, 10, 11], motion: { direction: 300, spread: 36, speed: 7.5 } }
    ],
    SHEM: [
        { weight: 2.6, lon: 165, lonSpread: 16, lat: -11, latSpread: 3.8, peaks: [1, 2, 3], motion: { direction: 245, spread: 24, speed: 10.5 } },
        { weight: 1.4, lon: 185, lonSpread: 10, lat: -13, latSpread: 4.0, peaks: [1, 2, 3], motion: { direction: 250, spread: 24, speed: 11.0 } }
    ],
    SIO: [
        { weight: 2.5, lon: 75, lonSpread: 18, lat: -11, latSpread: 3.6, peaks: [1, 2, 3], motion: { direction: 250, spread: 24, speed: 10.0 } },
        { weight: 1.8, lon: 120, lonSpread: 12, lat: -12, latSpread: 3.6, peaks: [1, 2, 3], motion: { direction: 250, spread: 24, speed: 10.5 } },
        { weight: 0.8, lon: 48, lonSpread: 8, lat: -13, latSpread: 3.5, peaks: [1, 2, 12], motion: { direction: 235, spread: 24, speed: 8.5 } }
    ],
    SATL: [
        { weight: 1.0, lon: -35, lonSpread: 10, lat: -19, latSpread: 4.0, peaks: [2, 3], motion: { direction: 235, spread: 28, speed: 8.0 } },
        { weight: 0.6, lon: -15, lonSpread: 8, lat: -22, latSpread: 3.5, peaks: [2, 3], motion: { direction: 225, spread: 28, speed: 9.0 } }
    ],
    MED: [
        { weight: 2.4, lon: 18.5, lonSpread: 5.5, lat: 36.6, latSpread: 2.1, peaks: [9, 10, 11], motion: { direction: 82, spread: 42, speed: 7.0 } },
        { weight: 1.7, lon: 13.0, lonSpread: 4.5, lat: 36.0, latSpread: 1.8, peaks: [10, 11, 12], motion: { direction: 92, spread: 48, speed: 6.5 } },
        { weight: 1.1, lon: 2.5, lonSpread: 4.5, lat: 39.0, latSpread: 1.6, peaks: [9, 10, 11], motion: { direction: 95, spread: 55, speed: 6.0 } },
        { weight: 0.8, lon: 28.5, lonSpread: 4.0, lat: 34.5, latSpread: 1.8, peaks: [9, 10, 1], motion: { direction: 55, spread: 44, speed: 7.5 } },
        { weight: 0.45, lon: 20.5, lonSpread: 5.0, lat: 35.2, latSpread: 2.0, peaks: [1, 2, 12], motion: { direction: 70, spread: 60, speed: 5.8 } }
    ],
    [FICTIONIA_BASIN]: [
        { weight: 2.6, lon: -92.5, lonSpread: 4.2, lat: 15.5, latSpread: 3.0, peaks: [7, 8, 9], motion: { direction: 294, spread: 24, speed: 9.5 } },
        { weight: 1.8, lon: -98.0, lonSpread: 3.0, lat: 12.5, latSpread: 2.4, peaks: [8, 9, 10], motion: { direction: 314, spread: 26, speed: 8.5 } },
        { weight: 1.1, lon: -88.5, lonSpread: 2.2, lat: 20.0, latSpread: 2.8, peaks: [9, 10], motion: { direction: 282, spread: 30, speed: 10.5 } }
    ]
};

function randNormal(mean = 0, spread = 1) {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * spread;
}

function circularMonthDistance(month, targetMonth) {
    const raw = Math.abs(month - targetMonth);
    return Math.min(raw, 12 - raw);
}

function seasonalProfileWeight(profile, month) {
    if (!profile.peaks || profile.peaks.length === 0) return 1;
    const nearest = Math.min(...profile.peaks.map(peak => circularMonthDistance(month, peak)));
    return 0.18 + Math.exp(-(nearest * nearest) / 8);
}

function chooseWeighted(items, getWeight) {
    const weighted = items.map(item => ({ item, weight: Math.max(0.001, getWeight(item)) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
        roll -= entry.weight;
        if (roll <= 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isMedicaneBasin(cycloneOrBasin) {
    return (typeof cycloneOrBasin === 'string' ? cycloneOrBasin : cycloneOrBasin?.basin) === 'MED';
}

function calculateStormStructure(cyclone, totalShear = 0) {
    const intensity = Number(cyclone.intensity || 0);
    const isMedicane = isMedicaneBasin(cyclone);
    const size = clamp(Number(cyclone.circulationSize || 300), 100, 800);
    const rmwKm = isMedicane
        ? clamp(5 + size * 0.09 - Math.max(0, intensity - 45) * 0.08, 8, 48)
        : clamp(7 + size * 0.12 - Math.max(0, intensity - 75) * 0.12, 8, 95);
    const ohc = Number(cyclone.ohcKjCm2 || 0);
    const humidity = Number(cyclone.environmentHumidity || 72);
    const ercActive = cyclone.ercState && cyclone.ercState !== 'none';
    const ercProgress = ercActive && cyclone.ercStartTime != null && cyclone.ercDuration
        ? clamp(((cyclone.age || 0) - cyclone.ercStartTime) / cyclone.ercDuration, 0, 1)
        : 0;
    const compactCore = clamp((intensity - 90) / 55, 0, 1) * clamp((ohc - 45) / 75, 0, 1) * clamp((78 - totalShear) / 78, 0, 1);
    const pinholeScore = ercActive ? 0 : compactCore * (humidity >= 68 ? 1 : 0.65);

    const eyeThreshold = isMedicane ? 48 : 64;
    let eyeRadiusKm = intensity >= eyeThreshold
        ? clamp((isMedicane ? 21 : 42) - (intensity - eyeThreshold) * 0.2 + size * (isMedicane ? 0.01 : 0.015), 5, isMedicane ? 34 : 62)
        : 0;
    let secondaryEyewallRadiusKm = 0;
    let dualWindMaxima = false;

    if (pinholeScore > 0.55) {
        eyeRadiusKm = clamp(17 - pinholeScore * 10, 5, 14);
    }

    if (ercActive) {
        dualWindMaxima = true;
        const startEye = clamp(eyeRadiusKm, 8, 36);
        if (cyclone.ercState === 'weakening') {
            eyeRadiusKm = clamp(startEye * (1 - ercProgress * 0.55), 5, 32);
            secondaryEyewallRadiusKm = clamp(rmwKm * (1.65 + ercProgress * 0.9), 35, 160);
        } else {
            const recoveryProgress = ercProgress;
            eyeRadiusKm = clamp(startEye + 18 * recoveryProgress, 18, 75);
            secondaryEyewallRadiusKm = clamp(rmwKm * (2.2 - recoveryProgress * 0.35), 40, 180);
            dualWindMaxima = recoveryProgress < 0.82;
        }
    }

    return {
        rmwKm,
        eyeRadiusKm,
        secondaryEyewallRadiusKm,
        dualWindMaxima,
        pinholeScore,
        ercState: cyclone.ercState || 'none',
        ercProgress,
        asymmetry: clamp(totalShear / 40, 0, 1.3),
        rainShieldKm: cyclone.rainShieldKm || 0
    };
}

function sampleClampedNormal(mean, spread, min, max) {
    for (let i = 0; i < 6; i++) {
        const value = randNormal(mean, spread);
        if (value >= min && value <= max) return value;
    }
    return clamp(randNormal(mean, spread * 0.7), min, max);
}

function normalizeForBasinRange(lon, lonRange) {
    if (lonRange.min >= 0 && lonRange.max > 180) {
        let value = lon % 360;
        if (value < 0) value += 360;
        return value;
    }

    return normalizeLongitude(lon);
}

function sampleGenesisPoint(basin, month, globalTemp) {
    const selectedBasin = basinConfig[basin] || basinConfig.WPAC;
    const profiles = genesisProfiles[basin] || genesisProfiles.WPAC;
    const tempAnomaly = Number.isFinite(globalTemp) ? globalTemp - 289 : 0;
    const profile = chooseWeighted(profiles, item => item.weight * seasonalProfileWeight(item, month));
    const hemisphere = selectedBasin.lat.max <= 0 ? -1 : 1;
    const polewardShift = hemisphere * clamp(tempAnomaly * 0.35, -1.8, 2.4);
    const latMin = selectedBasin.lat.min + polewardShift;
    const latMax = selectedBasin.lat.max + polewardShift;

    const lon = sampleClampedNormal(
        normalizeForBasinRange(profile.lon, selectedBasin.lon),
        profile.lonSpread,
        selectedBasin.lon.min,
        selectedBasin.lon.max
    );
    const lat = sampleClampedNormal(profile.lat + polewardShift, profile.latSpread, latMin, latMax);

    return { lon, lat, profile };
}

function getInitialMotion(lon, lat, basin, profile = null) {
    const fallbackByBasin = {
        WPAC: { direction: 292, spread: 24, speed: 10 },
        EPAC: { direction: 282, spread: 18, speed: 12 },
        NATL: { direction: lon > 305 ? 286 : 310, spread: 26, speed: 10 },
        NIO: { direction: 305, spread: 36, speed: 8 },
        SHEM: { direction: 248, spread: 24, speed: 10 },
        SIO: { direction: 248, spread: 24, speed: 10 },
        SATL: { direction: 232, spread: 28, speed: 8 },
        MED: { direction: 88, spread: 48, speed: 6.5 },
        [FICTIONIA_BASIN]: { direction: 300, spread: 30, speed: 9 }
    };
    const motion = profile?.motion || fallbackByBasin[basin] || fallbackByBasin.WPAC;
    const polewardBias = Math.abs(lat) > 18 ? (lat >= 0 ? 12 : -12) : 0;
    const direction = (randNormal(motion.direction + polewardBias, motion.spread) + 360) % 360;
    const speed = clamp(randNormal(motion.speed, 2.2), 5, 18);
    return { direction, speed };
}

function calculateLayerWind(lon, lat, systems) {
    const dDeg = 0.5;
    const RE = 6371000;
    const latRad = lat * (Math.PI / 180);
    const f = 2 * 7.292115e-5 * Math.sin(latRad);
    
    const effectiveF = Math.abs(f) < 5e-5 ? (f >= 0 ? 5e-5 : -5e-5) : f; 

    const p_x_plus = getPressureAt(lon + dDeg, lat, systems, false);
    const p_x_minus = getPressureAt(lon - dDeg, lat, systems, false);
    const p_y_plus = getPressureAt(lon, lat + dDeg, systems, false);
    const p_y_minus = getPressureAt(lon, lat - dDeg, systems, false);

    const gradX = (p_x_plus - p_x_minus);
    const gradY = (p_y_plus - p_y_minus);

    const scale = 6.0;
    const u = -gradY * scale / effectiveF * 0.0001; 
    const v =  gradX * scale / effectiveF * 0.0001;
    return { u, v };
}

export function getWindVectorAt(lon, lat, month, cyclone, pressureSystems) {
    let k = 1.0;
    let alphaDeg = 15;
    const landInfo = getLandStatus(lon, lat);
    const isLand = landInfo ? landInfo.isLand : false;
    if (isLand) {
        const elevation = getElevationAt(lon, lat) || 0;
        k = Math.max(0.4, 0.8 - (elevation / 1700));
        alphaDeg = Math.min(55, 15 + (elevation / 17));
    }

    const inflowAngle = alphaDeg * (Math.PI / 180);

    // 1. Environmental Flow
    const envWind = calculateLayerWind(lon, lat, pressureSystems.lower);
    
    // 2. Vortex Flow
    let u_vortex = 0;
    let v_vortex = 0;
    let u_trans = 0;
    let v_trans = 0;

    if (cyclone.status === 'active') {
        const dist = calculateDistance(lat, lon, cyclone.lat, cyclone.lon);
        const RMW = 5 + cyclone.circulationSize * 0.125;
        const outerRadius = cyclone.circulationSize * 4.0; 

        if (dist < outerRadius) {
            let vortexSpeed = 0;
            const maxWind = cyclone.intensity;

            if (dist < RMW) {
                vortexSpeed = maxWind * (dist / RMW);
            } else {
                const decayExponent = 0.80 - cyclone.circulationSize * 0.0002;
                const rawSpeed = maxWind * Math.pow(RMW / dist, decayExponent);
                
                // Decay
                let fade = 1;
                const fadeStart = outerRadius * 0.35;
                if (dist > fadeStart) {
                    const t = (dist - fadeStart) / (outerRadius - fadeStart);
                    fade = (Math.exp(-2*t) - Math.exp(-2)) / (1 - Math.exp(-2));
                }
                vortexSpeed = rawSpeed * fade;
            }

            const dx = lon - cyclone.lon;
            const dy = lat - cyclone.lat;
            const angleToCenter = Math.atan2(dy, dx);
            
            // Inflow Angle
            const rotationOffset = (cyclone.lat >= 0) ? (Math.PI / 2 + inflowAngle) : (-Math.PI / 2 - inflowAngle);
            const windAngle = angleToCenter + rotationOffset;

            const speedMs = vortexSpeed; 

            u_vortex = Math.cos(windAngle) * speedMs;
            v_vortex = Math.sin(windAngle) * speedMs;
            const moveSpeed = cyclone.speed;
            const moveAngleMath = (450 - cyclone.direction) % 360 * (Math.PI / 180);
            const asymmetryFactor = 0.6;
            u_trans = Math.cos(moveAngleMath) * moveSpeed * asymmetryFactor;
            v_trans = Math.sin(moveAngleMath) * moveSpeed * asymmetryFactor;
            let transDecay = 1.0;
            if (dist > RMW) {
                transDecay = Math.max(0, 1 - (dist - RMW) / (outerRadius - RMW));
            }
            
            u_trans *= transDecay;
            v_trans *= transDecay;
        }
    }

    return { 
        u: envWind.u + u_vortex * k + u_trans, 
        v: envWind.v + v_vortex * k + v_trans, 
        magnitude: Math.hypot(envWind.u + u_vortex * k + u_trans, envWind.v + v_vortex * k + v_trans) 
    };
}

export function initializeCyclone(world, month, basin = 'WPAC', globalTemp, globalShear, customLon = null, customLat = null) {
    let lat, lon, isOverLand;
    let selectedProfile = null;
    const isMedicane = isMedicaneBasin(basin);

    let useCustomCoords = (customLon !== null && customLat !== null);
    
    if (useCustomCoords) {
        isOverLand = world.features.some(feature => d3.geoContains(feature, [customLon, customLat]));
        if (isOverLand) {
            console.warn(`Custom coordinates (${customLon}, ${customLat}) are on land. Falling back to random generation.`);
            useCustomCoords = false;
        } else {
            lon = customLon;
            lat = customLat;
            // console.log(`Using custom generation point: ${lon}, ${lat}`);
        }
    }
    
    if (!useCustomCoords) {
        const selectedBasin = basinConfig[basin] || basinConfig['WPAC'];
        let bestCandidate = null;

        for (let attempt = 0; attempt < 180; attempt++) {
            const candidate = attempt < 135
                ? sampleGenesisPoint(basin, month, globalTemp)
                : {
                    lon: selectedBasin.lon.min + Math.random() * (selectedBasin.lon.max - selectedBasin.lon.min),
                    lat: selectedBasin.lat.min + Math.random() * (selectedBasin.lat.max - selectedBasin.lat.min),
                    profile: null
                };

            const status = getLandStatus(candidate.lon, candidate.lat);
            const sst = getSST(candidate.lat, candidate.lon, month, globalTemp);
            const score = sst - (status.isLand ? 100 : 0) - (status.isNearLand ? 1.2 : 0);

            if (!bestCandidate || score > bestCandidate.score) {
                bestCandidate = { ...candidate, isOverLand: status.isLand, score };
            }

            const minGenesisSst = isMedicane ? (attempt < 120 ? 17.5 : 15.8) : (attempt < 100 ? 25.7 : 25.1);
            if (!status.isLand && sst >= minGenesisSst) {
                lon = candidate.lon;
                lat = candidate.lat;
                selectedProfile = candidate.profile;
                isOverLand = false;
                break;
            }
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            lon = bestCandidate?.lon ?? ((selectedBasin.lon.min + selectedBasin.lon.max) / 2);
            lat = bestCandidate?.lat ?? ((selectedBasin.lat.min + selectedBasin.lat.max) / 2);
            selectedProfile = bestCandidate?.profile || null;
            isOverLand = bestCandidate?.isOverLand || false;
        }
    }

    // --- Subtropical ---
    const initialSST = getSST(lat, lon, month, globalTemp);
    let isSubtropical = false;
    let subtropicalTransitionTime = 0;
    if (isMedicane || (initialSST < 27.5 && Math.random() < 0.75 && (lon > 122 || lon < 40))) {
        isSubtropical = true;
        const durationSteps = isMedicane ? 2 + Math.floor(Math.random() * 12) : 0 + Math.floor(Math.random() * 25);
        subtropicalTransitionTime = durationSteps * 3;
    }

    let isMonsoonDepression = false;
    let monsoonDepressionEndTime = 0;
    if (!isMedicane && Math.random() < (0.2 + globalTemp / 72.25 - 4) && (lat > 0)) {
        isMonsoonDepression = true;
        const durationSteps = Math.floor(Math.random() * 50);
        monsoonDepressionEndTime = durationSteps * 3;
    }

    const initialMotion = getInitialMotion(lon, lat, basin, selectedProfile);
    const initialSize = isMedicane ? 145 + Math.random() * 115 : 150 + Math.random() * 350;

    return {
        lat: lat,
        lon: lon,
        intensity: (isMedicane ? 21.5 : 23) + Math.random() * (isMedicane ? 3.5 : 2),
        direction: initialMotion.direction,
        speed: initialMotion.speed,
        basin: basin,
        age: 0,
        shearEventActive: false,
        shearEventEndTime: 0,
        shearEventMagnitude: 0,
        track: [],
        status: 'active',
        isTransitioning: false,
        isLand: isOverLand || false,
        isExtratropical: false,
        isSubtropical: isSubtropical,
        subtropicalTransitionTime: subtropicalTransitionTime,
        isMonsoonDepression: isMonsoonDepression,
        monsoonDepressionEndTime: monsoonDepressionEndTime,
        extratropicalStage: 'none',
        extratropicalDevelopmentEndTime: 0,
        extratropicalMaxIntensity: 0,
        upwellingCoolingEffect: 0,
        ohcKjCm2: 0,
        depth26M: 0,
        ohcLabel: 'open ocean',
        rainRateMmHr: 0,
        rainTotalMm: 0,
        maxRainRateMmHr: 0,
        rainShieldKm: 0,
        environmentHumidity: 74,
        medicaneCore: isMedicane,
        medicaneUpperSupport: isMedicane ? 0.45 + Math.random() * 0.35 : 0,
        centralPressure: 1010,
        isInvest: true,
        investId: '',
        investDisplayId: '',
        investNumber: null,
        investStatus: 'open',
        investOpenedHour: 0,
        investClosedHour: null,
        investOrganization: 0.24 + Math.random() * 0.18,
        closedLow: false,
        formationChance48h: 10,
        formationChance7d: 20,
        investChanceCategory: 'LOW',
        modelGuidanceAvailable: true,
        inPAR: false,
        pagasaName: '',
        parEnteredHour: null,
        isERCActive: false,
        ercState: 'none',
        ercEndTime: 0,
        ercStartTime: 0,
        ercDuration: 0,
        ercMpiReduction: 0,
        ercSizeFactor: 1.0,
        stormStructure: {
            rmwKm: isMedicane ? 22 : 28,
            eyeRadiusKm: 0,
            secondaryEyewallRadiusKm: 0,
            dualWindMaxima: false,
            pinholeScore: 0,
            ercState: 'none',
            ercProgress: 0,
            asymmetry: 0,
            rainShieldKm: 0
        },
        circulationSize: initialSize,
        r34: 0, r50: 0, r64: 0,
        motionWobble: (Math.random() - 0.5) * 4,
        motionPhase: Math.random() * Math.PI * 2,
        steerMemoryU: 0,
        steerMemoryV: 0,
        forecastLogs: {},
        ace: 0
    };

}

export function initializePressureSystems(cyclone, month) {
    if (typeof month !== 'number' || !Number.isFinite(month)) month = 8;
    
    const tempAllSystems = [];
    
    const seasonalFactor = (Math.cos((month - 8) * (Math.PI / 6)) + 1) / 2;
    const baseLat = cyclone.lat; 
    const baseLon = cyclone.lon; 
    const isMedicane = isMedicaneBasin(cyclone);
    const isFictionia = cyclone?.basin === FICTIONIA_BASIN;

    if (isMedicane) {
        tempAllSystems.push({
            type: 'low',
            x: baseLon - 4 + (Math.random() - 0.5) * 6,
            y: baseLat + 4 + (Math.random() - 0.5) * 4,
            baseSigmaX: 9 + Math.random() * 8, sigmaX: 12 + Math.random() * 7, sigmaY: 6 + Math.random() * 4,
            strength: -(14 + Math.random() * 10), baseStrength: -(14 + Math.random() * 10),
            velocityX: 0.25 + Math.random() * 0.35, velocityY: (Math.random() - 0.5) * 0.18,
            oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.018 + Math.random() * 0.015, oscillationAmount: 0.16,
            noiseLayers: []
        });
        tempAllSystems.push({
            type: 'high',
            x: baseLon + 12 + (Math.random() - 0.5) * 9,
            y: baseLat - 6 + (Math.random() - 0.5) * 4,
            baseSigmaX: 16 + Math.random() * 12, sigmaX: 16 + Math.random() * 12, sigmaY: 7 + Math.random() * 5,
            strength: 10 + Math.random() * 8, baseStrength: 10 + Math.random() * 8,
            velocityX: 0.15 + Math.random() * 0.25, velocityY: (Math.random() - 0.5) * 0.12,
            oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.012 + Math.random() * 0.01, oscillationAmount: 0.18,
            noiseLayers: []
        });
    }

    if (isFictionia) {
        tempAllSystems.push({
            type: 'high',
            x: -80 + (Math.random() - 0.5) * 8,
            y: 27 + (Math.random() - 0.5) * 6,
            baseSigmaX: 24 + Math.random() * 10, sigmaX: 24 + Math.random() * 10, sigmaY: 9 + Math.random() * 4,
            strength: 15 + Math.random() * 7, baseStrength: 15 + Math.random() * 7,
            velocityX: -0.06 + (Math.random() - 0.5) * 0.08, velocityY: (Math.random() - 0.5) * 0.08,
            oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.012 + Math.random() * 0.01, oscillationAmount: 0.16,
            noiseLayers: []
        });
        tempAllSystems.push({
            type: 'low',
            x: -126 + (Math.random() - 0.5) * 10,
            y: 38 + (Math.random() - 0.5) * 5,
            baseSigmaX: 17 + Math.random() * 8, sigmaX: 17 + Math.random() * 8, sigmaY: 8 + Math.random() * 4,
            strength: -(10 + Math.random() * 8), baseStrength: -(10 + Math.random() * 8),
            velocityX: 0.08 + Math.random() * 0.12, velocityY: -0.04 + (Math.random() - 0.5) * 0.08,
            oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.015 + Math.random() * 0.01, oscillationAmount: 0.18,
            noiseLayers: []
        });
    }

    // 1. Tropical Low
    tempAllSystems.push({
        type: 'high',
        x: 140, y: 1 + (Math.random() - 0.5) * 5, 
        baseSigmaX: 300, sigmaX: 300, sigmaY: 10 + Math.random() * 4, 
        strength: -(10 + Math.random() * 3), baseStrength: -(10 + Math.random() * 3),
        velocityX: (Math.random() - 0.5) * 0.1, velocityY: (Math.random() - 0.5) * 0.1,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.01 + Math.random() * 0.01, oscillationAmount: 0.1,
        noiseLayers: []
    });

    tempAllSystems.push({
        type: 'low',
        x: 120, y: 10 + (Math.random() - 0.5) * 5, 
        baseSigmaX: 70, sigmaX: 70, sigmaY: 20 + Math.random() * 4, 
        strength: -(5 + Math.random() * 3) * (0.5+0.5*seasonalFactor), baseStrength: -(5 + Math.random() * 3) * (0.5+0.5*seasonalFactor),
        velocityX: (Math.random() - 0.5) * 0.01, velocityY: (Math.random() - 0.5) * 0.01,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.01 + Math.random() * 0.01, oscillationAmount: 0.01,
        noiseLayers: []
    });

    // 2. Subtropical High
    // (A) WPAC
    tempAllSystems.push({
        type: 'high',
        x: 150 + (Math.random() - 0.5) * 50, 
        y: 26 + (Math.random() - 0.5) * 8 + 14 * seasonalFactor,
        baseSigmaX: 25 + Math.random() * 30, sigmaX: 0, sigmaY: 10 + Math.random() * 15,
        strength: 15 + Math.random() * 6, baseStrength: 15 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.9, velocityY: (Math.random() - 0.5) * 0.3,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.02 + Math.random() * 0.01, oscillationAmount: 0.2 + Math.random() * 0.5,
        noiseLayers: []
    });
    // (B) WPAC Land
    tempAllSystems.push({
        type: 'high',
        x: 115 + (Math.random() - 0.5) * 50, 
        y: 23 + (Math.random() - 0.5) * 10 + 14 * seasonalFactor,
        baseSigmaX: 30 + Math.random() * 25, sigmaX: 0, sigmaY: 5 + Math.random() * 25,
        strength: 8 + Math.random() * 11, baseStrength: 8 + Math.random() * 11,
        velocityX: (Math.random() - 0.5) * 1.5, velocityY: (Math.random() - 0.5) * 1.6,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.05, oscillationAmount: 0.25 + Math.random() * 0.3,
        noiseLayers: []
    });
    // (B2) WPAC Land 2
    tempAllSystems.push({
        type: 'high',
        x: 50 + (Math.random() - 0.5) * 15, 
        y: 24 + (Math.random() - 0.5) * 10 + 12 * seasonalFactor,
        baseSigmaX: 30 + Math.random() * 10, sigmaX: 0, sigmaY: 10 + Math.random() * 8,
        strength: 10 + Math.random() * 8, baseStrength: 10 + Math.random() * 8,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });
    // (C) Hawaii High
    tempAllSystems.push({
        type: 'high',
        x: -140 + (Math.random() - 0.5) * 40, 
        y: 20 + (Math.random() - 0.5) * 20 + 6 * seasonalFactor,
        baseSigmaX: 40 + Math.random() * 25, sigmaX: 0, sigmaY: 13 + Math.random() * 13,
        strength: 20 + Math.random() * 12, baseStrength: 20 + Math.random() * 12,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.005 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });
    // (D) Atlantic High
    tempAllSystems.push({
        type: 'high',
        x: -30 + (Math.random() - 0.5) * 15, 
        y: 30 + (Math.random() - 0.5) * 10 + 6 * seasonalFactor,
        baseSigmaX: 50 + Math.random() * 10, sigmaX: 0, sigmaY: 10 + Math.random() * 10,
        strength: 22 + Math.random() * 6, baseStrength: 22 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });
    // South Hemisphere Highs
    tempAllSystems.push({
        type: 'high', x: 75 + (Math.random() - 0.5) * 50, y: -22 + (Math.random() - 0.5) * 10 + 6 * seasonalFactor,
        baseSigmaX: 40 + Math.random() * 60, sigmaX: 0, sigmaY: 5 + Math.random() * 10,
        strength: 20 + Math.random() * 6, baseStrength: 20 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });
    tempAllSystems.push({
        type: 'high', x: 150 + (Math.random() - 0.5) * 50, y: -22 + (Math.random() - 0.5) * 10 + 6 * seasonalFactor,
        baseSigmaX: 15 + Math.random() * 35, sigmaX: 0, sigmaY: 5 + Math.random() * 10,
        strength: 18 + Math.random() * 6, baseStrength: 18 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });
    tempAllSystems.push({
        type: 'high', x: -30 + (Math.random() - 0.5) * 50, y: -22 + (Math.random() - 0.5) * 10 + 6 * seasonalFactor,
        baseSigmaX: 15 + Math.random() * 20, sigmaX: 0, sigmaY: 5 + Math.random() * 10,
        strength: 15 + Math.random() * 6, baseStrength: 15 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });

    // (E) Polar Low
    tempAllSystems.push({
        type: 'high',
        x: -60 + (Math.random() - 0.5) * 15, 
        y: 72 + (Math.random() - 0.5) * 10,
        baseSigmaX: 250, sigmaX: 250, sigmaY: 10 + Math.random() * 5,
        strength: 25 + Math.random() * 6, baseStrength: 25 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.025 + Math.random() * 0.01, oscillationAmount: 0.25 + Math.random() * 0.2,
        noiseLayers: []
    });

    // (U) Local Low
    tempAllSystems.push({
        type: 'high',
        x: 100 + (Math.random() - 0.5) * 5, y: 20 + (Math.random() - 0.5) * 5,
        sigmaX: 5, sigmaY: 3 + Math.random() * 2,
        strength: 6 + Math.random() * 6,
        velocityX: (Math.random() - 0.5) * 0.5, velocityY: (Math.random() - 0.5) * 0.4,
        noiseLayers: []
    });

    // (F1) Random Low
    const numberOfSystems = 2 + Math.floor(Math.random() * 11);
    for (let i = 0; i < numberOfSystems; i++) {
        tempAllSystems.push({
            type: 'low',
            x: (Math.random() - 0.5) * 60 + baseLon,
            y: baseLat > 0 ? Math.max(10, (Math.random() - 0.2) * 25 + baseLat) : Math.min(-10, (Math.random() - 0.7) * 20 + baseLat),
            sigmaX: 1 + Math.random() * 3, sigmaY: 1 + Math.random() * 4,
            strength: -4 + (Math.random()) * 2,
            velocityX: 0.5 - Math.random() * 1, velocityY: (Math.random() - 0.5) * 0.1,
            noiseLayers: [ { offsetX: 0, offsetY: 0, freqX: 5, freqY: 5, amplitude: 0.1 }, { offsetX: 0, offsetY: 0, freqX: 1, freqY: 1, amplitude: Math.random() * 0.1 } ]
        });
    }

    // (F0) Random High
    const numberOfSystemsH = 0 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numberOfSystemsH; i++) {
        tempAllSystems.push({
            type: 'high',
            x: (Math.random() - 0.5) * 60 + baseLon,
            y: baseLat > 0 ? Math.max(15, (Math.random() - 1) * 5 + baseLat) : Math.min(-15, (Math.random() + 1) * 5 + baseLat),
            sigmaX: 2 + Math.random() * 4, sigmaY: 2 + Math.random() * 1,
            strength: 1 + (Math.random()) * 10,
            velocityX: 0.5 - Math.random() * 1, velocityY: (Math.random() - 0.5) * 0.1,
            noiseLayers: []
        });
    }

    // (F2) Random System
    const isWinterSeason = (month >= 10 || month <= 3);

    if (!isWinterSeason && Math.random() < 0.95) {
        tempAllSystems.push({
            type: 'low',
            x: 85  + (Math.random() - 0.5) * 15, y: 25  + (Math.random() - 0.5) * 5,
            sigmaX: 30 + Math.random() * 3, sigmaY: 10, strength: -10 - (Math.random()) * 5,
            velocityX: (Math.random()-0.5) * 0.2, velocityY: Math.random() * -1.0, noiseLayers: []
        });
    }

    // 3. Subtropical Low(North)
    const subtropicalHighs = tempAllSystems.filter(p => p.strength > 0 && p.y > 10 && p.y < 45);
    const meanSubtropicalLat = subtropicalHighs.length > 0 ? subtropicalHighs.reduce((sum, p) => sum + p.y, 0) / subtropicalHighs.length : 45;
    const subpolarLat = meanSubtropicalLat + 18 + (Math.random() - 0.5) * 4;

    tempAllSystems.push({
        type: 'high',
        x: 150, y: subpolarLat, baseSigmaX: 250, sigmaX: 250, sigmaY: 8 + Math.random() * 5,
        strength: -(65 + Math.random() * 10), baseStrength: -(65 + Math.random() * 10),
        velocityX: (Math.random() - 0.5) * 0.2, velocityY: (Math.random() - 0.5) * 0.1,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.015 + Math.random() * 0.01, oscillationAmount: 0.15,
        noiseLayers: []
    });

    // 4. Subtropical Low(South)
    const subtropicalHighsS = tempAllSystems.filter(p => p.strength > 0 && p.y < -10 && p.y > -40);
    const meanSubtropicalLatS = subtropicalHighsS.length > 0 ? subtropicalHighsS.reduce((sum, p) => sum + p.y, 0) / subtropicalHighsS.length : -40;
    const subpolarLatS = meanSubtropicalLatS - 18 - (Math.random() - 0.5) * 4;

    tempAllSystems.push({
        type: 'high',
        x: 150, y: -35 - Math.random() * 5, baseSigmaX: 250, sigmaX: 250, sigmaY: 5 + Math.random() * 5,
        strength: -(40 + Math.random() * 10), baseStrength: -(40 + Math.random() * 10),
        velocityX: (Math.random() - 0.5) * 0.2, velocityY: (Math.random() - 0.5) * 0.1,
        oscillationPhase: Math.random() * Math.PI * 2, oscillationSpeed: 0.015 + Math.random() * 0.01, oscillationAmount: 0.15,
        noiseLayers: []
    });

    // --- 2. Double Layer ---
    
    const upperSystems = [];
    const lowerSystems = [];

    tempAllSystems.forEach(sys => {
        const upperSys = JSON.parse(JSON.stringify(sys));
        const lowerSys = JSON.parse(JSON.stringify(sys));
        const absLat = Math.abs(sys.y);
        if (sys.type === 'high') {
            upperSys.strength *= 0.6;
            lowerSys.strength *= 0.4;
        } else {
            upperSys.strength *= 0.4; 
            lowerSys.strength *= 0.5;
        }

        // Random tilt
        upperSys.x += (Math.random() - 0.5) * 2;
        lowerSys.x += (Math.random() - 0.5) * 2;

        upperSystems.push(upperSys);
        lowerSystems.push(lowerSys);
    });

    const systemsObj = { upper: upperSystems, lower: lowerSystems };
    updatePressureSystems(systemsObj);
    return systemsObj;
}

export function updatePressureSystems(systemsObj, month) {
    const updateList = (list) => {
        for (let i = list.length - 1; i >= 0; i--) {
            const cell = list[i];
            
            cell.x += cell.velocityX;
            cell.y += cell.velocityY;
            
            // Cold Surge ---
            if (cell.isColdSurge) {
                // 1. Fade
                if (cell.y < 30) {
                    const decay = Math.max(0, (cell.y - 10) / 20);
                    cell.strength *= 0.96 * decay;
                    
                    if (cell.sigmaX) cell.sigmaX *= 1.02; 
                    if (cell.sigmaY) cell.sigmaY *= 0.98;
                }

                // 2. Delete
                if (cell.strength < 1.5 || cell.y < 5) {
                    list.splice(i, 1);
                    continue;
                }
            } else {
                if (cell.x > 360) cell.x -= 360;
                if (cell.x < 0) cell.x += 360;
            }

            if (cell.oscillationSpeed) {
                cell.oscillationPhase = (cell.oscillationPhase || 0) + cell.oscillationSpeed;
                const stretch = Math.sin(cell.oscillationPhase) * cell.oscillationAmount;
                if (cell.baseSigmaX) {
                    cell.sigmaX = cell.baseSigmaX * (1 + stretch);
                }
            }
        }
    };

    if (systemsObj.upper) updateList(systemsObj.upper);
    
    if (systemsObj.lower) {
        updateList(systemsObj.lower);
        
        // --- Generation ---
        const isWinter = (month >= 10 || month <= 3);
        
        const activeSurges = systemsObj.lower.filter(s => s.isColdSurge).length;

        if (isWinter && activeSurges < 1 && Math.random() < 0.1) {
            console.log("cold high.");
            systemsObj.lower.push({
                type: 'high',
                isColdSurge: true, // 标记为冷涌
                
                x: 100 + Math.random() * 15, 
                y: 42 + Math.random() * 5,
                
                baseSigmaX: 6, sigmaX: 6, 
                sigmaY: 8 + Math.random() * 5,
                
                strength: 30 + Math.random() * 15,
                
                velocityX: 0.15 + Math.random() * 0.1,
                velocityY: -0.2 - Math.random() * 0.2, 
                
                oscillationSpeed: 0,
                noiseLayers: []
            });
        }
    }
    
    return systemsObj;
}

export function updateFrontalZone(pressureSystemsObj, month) {
    const list = Array.isArray(pressureSystemsObj) ? pressureSystemsObj : pressureSystemsObj.upper;
    
    const highs = list.filter(p => p.strength > 8 && p.y > 10);
    if (highs.length === 0) return { latitude: 35 };
    
    const avgLat = highs.reduce((sum, p) => sum + p.y, 0) / highs.length;
    return { latitude: avgLat + 8 * Math.cos((month - 8) * (Math.PI / 6)) + 3 * Math.random() - 11 };
}

export function calculateSteering(lon, lat, pressureSystemsObj, bias = { u: 0, v: 0 }) {
    const windUpper = calculateLayerWind(lon, lat, pressureSystemsObj.upper);
    const windLower = calculateLayerWind(lon, lat, pressureSystemsObj.lower);

    // 3. Deep Layer Mean
    const weightUpper = 0.8;
    const weightLower = 0.2;

    const steerU = 0.7*(windUpper.u * weightUpper + windLower.u * weightLower) + bias.u;
    const steerV = 0.7*(windUpper.v * weightUpper + windLower.v * weightLower) + bias.v;

    // Beta Drift
    const latRad = lat * (Math.PI / 180);
    const betaFactor = Math.sin(latRad < 0 ? 1.2*latRad - (Math.PI/12) : 1.2*latRad + (Math.PI/12));
    const betaU = -0.6 * betaFactor; 
    const betaV = 4.4 * betaFactor;

    // Shear Vector
    const shearU = windUpper.u - windLower.u;
    const shearV = windUpper.v - windLower.v;

    return { 
        steerU: steerU + betaU, 
        steerV: steerV + betaV,
        shearU,
        shearV
    };
}

export function updateCycloneState(cyclone, pressureSystems, frontalZone, world, month, globalTemp, globalShearSetting, nameIndex) {
    let updatedCyclone = { ...cyclone };
    updatedCyclone.age += 3;
    const isMedicane = isMedicaneBasin(updatedCyclone);

    // --- ACE Calculation ---
    if (updatedCyclone.age % 6 === 0 && updatedCyclone.intensity >= 34 && !updatedCyclone.isExtratropical) {
        const ace_contribution = (updatedCyclone.intensity ** 2) / 10000;
        updatedCyclone.ace += ace_contribution;
    }

    if (updatedCyclone.isMonsoonDepression && updatedCyclone.age >= updatedCyclone.monsoonDepressionEndTime) {
        updatedCyclone.isMonsoonDepression = false;
    }

    // --- Steering ---
    const { steerU, steerV, shearU, shearV } = calculateSteering(updatedCyclone.lon, updatedCyclone.lat, pressureSystems);
    const physicalShear = Math.hypot(shearU, shearV) * 2.0; 
    
    // Wind Shear
    let totalShear = physicalShear * (globalShearSetting / 100.0);
    const isWinterHalf = (month >= 11 || month <= 4);
    const medicaneSeason = (month >= 9 || month <= 2) ? 1 : 0;
    if (isMedicane) {
        totalShear *= 0.78 + (medicaneSeason ? -0.08 : 0.08);
    }
    const shearEventProb = isMedicane
        ? (0.025 + (medicaneSeason ? 0.01 : 0.04) * (globalShearSetting / 100))
        : ((isWinterHalf && updatedCyclone.lon > 100 && updatedCyclone.lon < 121 && updatedCyclone.lat > 16) ? 0.55 : (isWinterHalf ? 0.045 * (globalShearSetting ** 2 / 10000) : 0.03 * (globalShearSetting ** 2 / 10000)));
    // Random shear event
    if (updatedCyclone.shearEventActive) {
        if (updatedCyclone.age >= updatedCyclone.shearEventEndTime) {
            updatedCyclone.shearEventActive = false;
            updatedCyclone.shearEventMagnitude = 0;
        } else {
            totalShear += Math.max(0, updatedCyclone.shearEventMagnitude);
        }
    } else if (Math.random() < shearEventProb && !updatedCyclone.isTransitioning) {
        updatedCyclone.shearEventActive = true;
        updatedCyclone.shearEventEndTime = updatedCyclone.age + (1 + Math.random()*48);
        updatedCyclone.shearEventMagnitude = -3 + Math.random() * 6 + 1.8 * Math.abs(month - 8) ** 0.5 + Math.max(0,(globalShearSetting / 10 - 10));
    }

    // Movement
    const prevSteerU = Number.isFinite(updatedCyclone.steerMemoryU) ? updatedCyclone.steerMemoryU : steerU;
    const prevSteerV = Number.isFinite(updatedCyclone.steerMemoryV) ? updatedCyclone.steerMemoryV : steerV;
    const steerBlend = updatedCyclone.isExtratropical ? 0.55 : 0.34 + Math.min(0.08, Math.abs(updatedCyclone.lat) / 250);
    const smoothedSteerU = prevSteerU * (1 - steerBlend) + steerU * steerBlend;
    const smoothedSteerV = prevSteerV * (1 - steerBlend) + steerV * steerBlend;
    updatedCyclone.steerMemoryU = smoothedSteerU;
    updatedCyclone.steerMemoryV = smoothedSteerV;

    let steeringDirection = (Math.atan2(smoothedSteerU, smoothedSteerV) * 180 / Math.PI + 360) % 360;
    let angleDiff = steeringDirection - updatedCyclone.direction;
    while (angleDiff < -180) angleDiff += 360;
    while (angleDiff > 180) angleDiff -= 360;
    const turnRate = updatedCyclone.isExtratropical ? 0.38 : 0.16 + Math.min(0.1, Math.abs(updatedCyclone.lat) / 160);
    updatedCyclone.direction = (updatedCyclone.direction + angleDiff * turnRate + 360) % 360;

    const steeringSpeedKnots = Math.max(2, Math.min(isMedicane ? 26 : 42, Math.hypot(smoothedSteerU, smoothedSteerV) * 1.94384));
    const speedResponse = updatedCyclone.isExtratropical ? 0.36 : 0.18 + Math.min(0.2, Math.abs(updatedCyclone.lat) / 120);
    updatedCyclone.speed += (steeringSpeedKnots - updatedCyclone.speed) * speedResponse;

    // Cold welling
    if (updatedCyclone.speed < 6) {
        const coolingRate = (6 - updatedCyclone.speed) / 6 * 0.25; 
        updatedCyclone.upwellingCoolingEffect = Math.min(updatedCyclone.upwellingCoolingEffect + coolingRate, 5.0); 
    } else {
        updatedCyclone.upwellingCoolingEffect = Math.max(updatedCyclone.upwellingCoolingEffect - 0.2, 0); 
    }

    const ohcInfo = calculateOceanHeatContent(updatedCyclone.lat, updatedCyclone.lon, month, globalTemp);
    let sst = getSST(updatedCyclone.lat, updatedCyclone.lon, month, globalTemp);
    sst -= updatedCyclone.upwellingCoolingEffect;
    const upwellingHeatPenalty = updatedCyclone.upwellingCoolingEffect * 10;
    updatedCyclone.ohcKjCm2 = Math.max(0, Math.round(ohcInfo.ohcKjCm2 - upwellingHeatPenalty));
    updatedCyclone.depth26M = Math.max(0, Math.round(ohcInfo.depth26M - updatedCyclone.upwellingCoolingEffect * 4));
    updatedCyclone.ohcLabel = ohcInfo.label;
    
    // Transition
    if (!updatedCyclone.isTransitioning && sst < -8.0) {
        updatedCyclone.isTransitioning = true;
    }
    
    const oldIntensity = updatedCyclone.intensity;
    const terrainElevation = getElevationAt(updatedCyclone.lon, updatedCyclone.lat);
    const landStatus = getLandStatus(updatedCyclone.lon, updatedCyclone.lat, 0.2);
    const isOverLand = landStatus.isLand;
    const isNearLand = landStatus.isNearLand;

    updatedCyclone.isLand = isOverLand;
    const EXf = !updatedCyclone.isExtratropical ? 1 : 0.1;

    // --- Intensity Change (Strictly Preserved Coefficients) ---
    
    // 1. Terrain Decay
    if (terrainElevation > 0 && updatedCyclone.intensity > 45) {
        let weakeningFactor = 0.88 + updatedCyclone.circulationSize*0.0001*EXf - (terrainElevation / 1200);
        const JPAdj = (updatedCyclone.lat >= 30 && updatedCyclone.lat <= 40 && updatedCyclone.lon >= 129 && updatedCyclone.lon <= 140) ? 0.03 : 0;
        updatedCyclone.intensity *= weakeningFactor + JPAdj;
        updatedCyclone.circulationSize *= 1 + terrainElevation * 0.0008;

    } else if (isOverLand || isNearLand) {
        const JPAdjustment = (updatedCyclone.lat >= 30 && updatedCyclone.lat <= 40 && updatedCyclone.lon >= 129 && updatedCyclone.lon <= 140) ? 0.04 : 0;
        const PHAdjustment = (updatedCyclone.lat >= 5 && updatedCyclone.lat <= 18 && updatedCyclone.lon >= 120 && updatedCyclone.lon <= 127 && updatedCyclone.intensity < 85) ? 0.05 : 0;
        const AUAdjustment = (updatedCyclone.lat >= -18 && updatedCyclone.lat <= -10 && updatedCyclone.lon >= 123 && updatedCyclone.lon <= 137) ? 0.05 : 0;
        updatedCyclone.intensity *= 0.88 + updatedCyclone.circulationSize*0.0001*EXf + JPAdjustment + PHAdjustment + AUAdjustment;
        updatedCyclone.speed *= 0.99;

    } else if (updatedCyclone.isExtratropical) {
        updatedCyclone.speed += 1.5; 
        if (updatedCyclone.extratropicalStage === 'developing') {
            if (updatedCyclone.age >= updatedCyclone.extratropicalDevelopmentEndTime) {
                updatedCyclone.extratropicalStage = 'decaying';
                const decayRate = -6 + Math.random() * 6; 
                updatedCyclone.intensity += decayRate;
            } else {
                const divisor = 9 + Math.random() * 5; 
                const intensification = (updatedCyclone.extratropicalMaxIntensity - updatedCyclone.intensity) / divisor;
                updatedCyclone.intensity += intensification;
            }
        } else { 
            const decayRate = -1 - Math.random() * 2; 
            updatedCyclone.intensity += decayRate;
        }

    } else {
        // MPI Logic
        let mpi = sst > 25.0 ? 264.28 * (1 - Math.exp(-0.182 * (sst - 25.00))) : 0; // [保留]
        
        if (isMedicane) {
            const upperSupport = clamp(Number(updatedCyclone.medicaneUpperSupport || 0.45) + (medicaneSeason ? 0.16 : -0.06) - totalShear / 95, 0, 1);
            mpi = sst > 17.0
                ? clamp(26 + (sst - 17.0) * 6.4 + upperSupport * 27 + (globalTemp - 289) * 1.8, 22, 88)
                : 0;
        }

        const ohcSupport = isMedicane
            ? clamp((updatedCyclone.ohcKjCm2 - 12) / 55, -0.35, 0.38)
            : clamp((updatedCyclone.ohcKjCm2 - 50) / 95, -0.45, 0.55);
        mpi *= 1 + ohcSupport * (isMedicane ? 0.16 : 0.24);

        // ERC Logic
        switch (updatedCyclone.ercState) {
            case 'weakening':
                updatedCyclone.isERCActive = true;
                if (updatedCyclone.age < updatedCyclone.ercEndTime) {
                    const ercProgress = updatedCyclone.ercDuration
                        ? clamp((updatedCyclone.age - updatedCyclone.ercStartTime) / updatedCyclone.ercDuration, 0, 1)
                        : 0;
                    const peakPulse = Math.sin(ercProgress * Math.PI);
                    updatedCyclone.ercMpiReduction = (1.5 + Math.random() * 4.5 + peakPulse * 5.5) * Math.max(0, (updatedCyclone.intensity / 100));
                    updatedCyclone.intensity -= updatedCyclone.ercMpiReduction;
                }
                updatedCyclone.circulationSize *= 1.018;
                if (updatedCyclone.age >= updatedCyclone.ercEndTime) {
                    updatedCyclone.ercState = 'recovering';
                    const recoveryDuration = 2 + Math.floor(Math.random() * 8);
                    updatedCyclone.ercStartTime = updatedCyclone.age;
                    updatedCyclone.ercDuration = recoveryDuration * 3;
                    updatedCyclone.ercEndTime = updatedCyclone.age + updatedCyclone.ercDuration;
                }
                break;
            case 'recovering':
                updatedCyclone.isERCActive = true;
                updatedCyclone.circulationSize *= 0.998;
                if (updatedCyclone.ohcKjCm2 >= 55 && totalShear < 22) {
                    updatedCyclone.intensity += Math.random() * 1.8;
                }
                if (updatedCyclone.age >= updatedCyclone.ercEndTime) {
                    updatedCyclone.ercState = 'none';
                    updatedCyclone.isERCActive = false;
                    updatedCyclone.ercMpiReduction = 0;
                    updatedCyclone.ercDuration = 0;
                }
                break;
            default:
                updatedCyclone.isERCActive = false;
                const ercTriggerChance = 0.035
                    + clamp((updatedCyclone.intensity - 95) / 90, 0, 0.16)
                    + clamp((updatedCyclone.ohcKjCm2 - 70) / 450, 0, 0.07);
                if (updatedCyclone.intensity > 96 && !isOverLand && !updatedCyclone.isTransitioning && Math.random() < ercTriggerChance) {
                    updatedCyclone.ercState = 'weakening';
                    const weakeningDuration = 4 + Math.floor(Math.random() * 10);
                    updatedCyclone.ercStartTime = updatedCyclone.age;
                    updatedCyclone.ercDuration = weakeningDuration * 3;
                    updatedCyclone.ercEndTime = updatedCyclone.age + updatedCyclone.ercDuration;
                }
                break;
        }

        // Growth Rate Logic
        let latF = (0.4 / Math.abs(updatedCyclone.lat) ** 2) * (updatedCyclone.intensity / 50);
        let ri = Math.random() > 0.97 ? Math.random() * 0.35 - 0.05 : 0;
        let intensificationRate = Math.random() * (0.14 + ri) * Math.min(1, ((updatedCyclone.intensity - 13) / 65)) - latF; // [保留]
        if (isMedicane) {
            intensificationRate = Math.random() * (0.085 + ri * 0.45) * clamp((updatedCyclone.intensity - 14) / 48, 0.15, 1.0) + 0.012 - totalShear * 0.00055;
        }

        if (updatedCyclone.isMonsoonDepression) {
            intensificationRate *= (Math.random() + 0.10) * 0.70; 
        }
        
        let potentialChange = (mpi - updatedCyclone.intensity) * intensificationRate;
        
        // Shear Factors
        let shear = totalShear / (isMedicane ? 13.5 : 10.0);
        
        // Fix term
        const nioShearBoost = (updatedCyclone.lat >= 5 && updatedCyclone.lat <= 30 && updatedCyclone.lon >= 30 && updatedCyclone.lon <= 100) ? 8.5 : 0;
        const shemShearBoost = (updatedCyclone.lat <= -5 && updatedCyclone.lat >= -30 && updatedCyclone.lon >= 100) ? (25.0 * Math.sin((month - 2) * (Math.PI / 6))) : 0;
        
        let baseGradient = updatedCyclone.lat > 0 ? (0.0 + 2.0 * Math.cos((month - 2) * (Math.PI / 6))) : (0.0 + 1.5 * Math.sin((month - 2) * (Math.PI / 6)));
        let highLatCorrection = 0;
        if (Math.abs(updatedCyclone.lat) > 35) {
            highLatCorrection = Math.pow(Math.abs(updatedCyclone.lat) - 35, 0.9) * -0.1;
        }
        const latGradientFactor = baseGradient + highLatCorrection;

        shear += Math.max(0, (Math.abs(updatedCyclone.lat) * latGradientFactor - 30 + nioShearBoost + shemShearBoost)) / 20;
        if (isMedicane) {
            shear = Math.max(0, shear * 0.62 - 0.55);
            potentialChange += clamp(Number(updatedCyclone.medicaneUpperSupport || 0.5) - totalShear / 70, -0.2, 0.55);
        }

        // Dry Air Logic
        const samplingRadiusDeg = cyclone.circulationSize * 0.005;
        let envHumiditySum = 0;
        let minEnvHumidity = 60;
        const samplePoints = 12; 
        for (let i = 0; i < samplePoints; i++) {
            const angleRad = (i / samplePoints) * 2 * Math.PI;
            const sampleLon = cyclone.lon + samplingRadiusDeg * Math.cos(angleRad) / Math.cos(cyclone.lat * Math.PI / 180);
            const sampleLat = cyclone.lat + samplingRadiusDeg * Math.sin(angleRad);
            const val = calculateBackgroundHumidity(sampleLon, sampleLat, pressureSystems, month, cyclone, globalTemp);
            envHumiditySum += val;
            if (val < minEnvHumidity) minEnvHumidity = val;
        }
        const avgEnvHumidity = envHumiditySum / samplePoints;
        const effectiveHumidity = (minEnvHumidity * 0.4) + (avgEnvHumidity * 0.6);
        updatedCyclone.environmentHumidity = effectiveHumidity;
        let dryAirFactor = 0;
        if (effectiveHumidity < 60) {
            const sizeSensitivity = 600 - cyclone.circulationSize; 
            dryAirFactor = (60 - effectiveHumidity) * 0.0002 * sizeSensitivity;
        }
        const currentSize = updatedCyclone.circulationSize || 300;
        const clampedSize = Math.max(150, Math.min(500, currentSize));
        const sizeFactor = 1.2 + (clampedSize - 150) * (0.8 - 1.2) / (500 - 150);
        updatedCyclone.intensity += (potentialChange - sizeFactor * shear - dryAirFactor);
    }

    // Extratropical Transition Trigger
    const shouldTransitionExtratropical = isMedicane
        ? ((!updatedCyclone.isExtratropical && (sst < 16.0 || updatedCyclone.lat > 45 || updatedCyclone.lat < 29 || updatedCyclone.lon < -9 || updatedCyclone.lon > 42)) || (updatedCyclone.isSubtropical && sst < 16.8 && updatedCyclone.age > 30))
        : ((!updatedCyclone.isExtratropical && sst < 25.5 && (Math.abs(updatedCyclone.lat) > frontalZone.latitude) || sst < 23.0) || (updatedCyclone.isSubtropical && sst < 25.5));
    if (shouldTransitionExtratropical) {
        updatedCyclone.isExtratropical = true;
        if (updatedCyclone.extratropicalStage === 'none') { 
            if (Math.random() < 0.33 && Math.abs(updatedCyclone.lat) > 25) { 
                updatedCyclone.extratropicalStage = 'developing';
                const developmentDurationSteps = 4 + Math.floor(Math.random() * 25);
                updatedCyclone.extratropicalDevelopmentEndTime = updatedCyclone.age + (developmentDurationSteps * 3);
                updatedCyclone.extratropicalMaxIntensity = 45 + Math.random() * 45;
            } else {
                updatedCyclone.extratropicalStage = 'decaying';
            }
        }
    }

    if (updatedCyclone.isSubtropical && (updatedCyclone.age >= updatedCyclone.subtropicalTransitionTime || updatedCyclone.isExtratropical)) {
        updatedCyclone.isSubtropical = false;
    }

    const intensityChange = updatedCyclone.intensity - oldIntensity;
    if (updatedCyclone.isExtratropical || updatedCyclone.isTransitioning) {
        updatedCyclone.circulationSize *= 1.04;
    } else if (intensityChange > 0.5) {
        updatedCyclone.circulationSize *= 0.99;
    } else {
        updatedCyclone.circulationSize *= 1.002;
    }
    updatedCyclone.circulationSize = isMedicane
        ? Math.max(95, Math.min(updatedCyclone.circulationSize, 380))
        : Math.max(100, Math.min(updatedCyclone.circulationSize, 800));
    updatedCyclone.intensity = Math.max(10, updatedCyclone.intensity);
    
    const maxMotionSpeed = isMedicane ? (updatedCyclone.isExtratropical ? 34 : 24) : (updatedCyclone.isExtratropical ? 44 : 32);
    updatedCyclone.speed = clamp(updatedCyclone.speed, 2, maxMotionSpeed);
    updatedCyclone.motionWobble = clamp(
        (Number.isFinite(updatedCyclone.motionWobble) ? updatedCyclone.motionWobble : 0) * 0.78 + (Math.random() - 0.5) * 3.8,
        -11,
        11
    );
    const currentSpeed = Math.max(2, updatedCyclone.speed);
    const finalStepDirection = updatedCyclone.direction
        + updatedCyclone.motionWobble
        + Math.sin((updatedCyclone.age || 0) * 0.11 + (updatedCyclone.motionPhase || 0)) * 2.5;
    const angleRad = (90 - finalStepDirection) * (Math.PI / 180);
    const distanceDeg = currentSpeed * 3 * 1.852 / 111;

    const currentEnvPressure = getPressureAt(updatedCyclone.lon, updatedCyclone.lat, pressureSystems);
    const currentCentralPressure = windToPressure(
        updatedCyclone.intensity, 
        updatedCyclone.circulationSize, 
        updatedCyclone.basin, 
        currentEnvPressure
    );
    updatedCyclone.centralPressure = Math.round(currentCentralPressure);

    const rainfall = calculateCycloneRainfall(updatedCyclone, month, globalTemp, totalShear);
    updatedCyclone.rainRateMmHr = rainfall.centerRateMmHr;
    updatedCyclone.rainShieldKm = rainfall.rainShieldKm;
    updatedCyclone.rainTotalMm = Math.max(0, (updatedCyclone.rainTotalMm || 0) + rainfall.centerRateMmHr * 3);
    updatedCyclone.maxRainRateMmHr = Math.max(updatedCyclone.maxRainRateMmHr || 0, rainfall.centerRateMmHr);
    updatedCyclone.stormStructure = calculateStormStructure(updatedCyclone, totalShear);
    updatedCyclone.rmwKm = updatedCyclone.stormStructure.rmwKm;

    const investOutlook = calculateInvestOutlook(updatedCyclone, {
        sst,
        ohcKjCm2: updatedCyclone.ohcKjCm2,
        shearKt: totalShear,
        humidity: updatedCyclone.environmentHumidity,
        isLand: isOverLand,
        isNearLand
    });
    updatedCyclone.investOrganization = investOutlook.organization;
    updatedCyclone.closedLow = investOutlook.closedLow;
    updatedCyclone.formationChance48h = investOutlook.formationChance48h;
    updatedCyclone.formationChance7d = investOutlook.formationChance7d;
    updatedCyclone.investChanceCategory = investOutlook.chanceCategory.code;
    updatedCyclone.modelGuidanceAvailable = investOutlook.modelGuidanceAvailable;

    if (updatedCyclone.isInvest && !updatedCyclone.isExtratropical && updatedCyclone.intensity >= 24 && investOutlook.closedLow) {
        updatedCyclone.isInvest = false;
        updatedCyclone.investStatus = 'upgraded';
        updatedCyclone.investClosedHour = updatedCyclone.age;
    }

    // --- Wind Radii Calculation (Preserved) ---
    const RMW_KM = 5 + updatedCyclone.circulationSize * 0.15; 
    const MAX_SEARCH_KM = 900; 
    const STEP_KM = 15;        
    const SCAN_ANGLE_STEP = 10; 

    const getPointAt = (centerLon, centerLat, angleRad, distKm) => {
        const distDeg = distKm / 111.32; 
        const lonScale = 1.0 / Math.max(0.1, Math.cos(centerLat * Math.PI / 180));
        const lon = centerLon + distDeg * Math.cos(angleRad) * lonScale;
        const lat = centerLat + distDeg * Math.sin(angleRad);
        return [lon, lat];
    };

    const measureRadius = (angleRad, threshold) => {
        const [startLon, startLat] = getPointAt(updatedCyclone.lon, updatedCyclone.lat, angleRad, RMW_KM);
        const startVec = getWindVectorAt(startLon, startLat, month, updatedCyclone, pressureSystems);
        if (startVec.magnitude < threshold) return 0;

        let currentDist = RMW_KM;
        while (currentDist < MAX_SEARCH_KM) {
            const nextDist = currentDist + STEP_KM;
            const [lon, lat] = getPointAt(updatedCyclone.lon, updatedCyclone.lat, angleRad, nextDist);
            const vec = getWindVectorAt(lon, lat, month, updatedCyclone, pressureSystems);
            if (vec.magnitude < threshold) return currentDist;
            currentDist = nextDist;
        }
        return currentDist; 
    };

    const getQuadrantMax = (threshold) => {
        if (updatedCyclone.intensity < threshold) return [0, 0, 0, 0];
        const ranges = [ { start: 0, end: 90 }, { start: 270, end: 360 }, { start: 180, end: 270 }, { start: 90, end: 180 } ];
        const result = [];
        for (let range of ranges) {
            let maxKm = 0;
            for (let angle = range.start; angle <= range.end; angle += SCAN_ANGLE_STEP) {
                const rad = angle * (Math.PI / 180);
                const distKm = measureRadius(rad, threshold);
                if (distKm > maxKm) maxKm = distKm;
            }
            result.push(maxKm / 111.32);
        }
        return result;
    };

    const radii34 = getQuadrantMax(34);
    const radii50 = getQuadrantMax(50);
    const radii64 = getQuadrantMax(64);

    let newLat = updatedCyclone.lat + distanceDeg * Math.sin(angleRad);
    let newLon = updatedCyclone.lon + distanceDeg * Math.cos(angleRad) / Math.cos(updatedCyclone.lat * Math.PI / 180);
    updatedCyclone.lon = normalizeLongitude(newLon); 
    updatedCyclone.lat = newLat;
    updatedCyclone.track.push([
        updatedCyclone.lon,
        updatedCyclone.lat,
        updatedCyclone.intensity,
        updatedCyclone.isTransitioning,
        updatedCyclone.isExtratropical,
        updatedCyclone.circulationSize,
        updatedCyclone.isSubtropical,
        radii34,
        radii50,
        radii64,
        Math.round(currentCentralPressure),
        updatedCyclone.ohcKjCm2,
        Math.round(updatedCyclone.rainTotalMm || 0),
        updatedCyclone.ercState || 'none',
        updatedCyclone.investId || '',
        updatedCyclone.formationChance48h || 0,
        updatedCyclone.formationChance7d || 0,
        !!updatedCyclone.isInvest
    ]);

    if (isMedicane && (updatedCyclone.lon < -12 || updatedCyclone.lon > 45 || updatedCyclone.lat < 27 || updatedCyclone.lat > 48)) {
        updatedCyclone.status = 'dissipated';
    }

    if (updatedCyclone.intensity < 17 || (updatedCyclone.isExtratropical && updatedCyclone.intensity < 24) || updatedCyclone.lat > 70 || updatedCyclone.lat < -70) {
        updatedCyclone.status = 'dissipated';
    }
    
    if (!updatedCyclone.named && updatedCyclone.intensity >= 34 && !updatedCyclone.isExtratropical) {
        updatedCyclone.named = true;
        updatedCyclone.isInvest = false;
        updatedCyclone.investStatus = 'upgraded';
        updatedCyclone.investClosedHour = updatedCyclone.investClosedHour ?? updatedCyclone.age;
        const basinKey = updatedCyclone.basin || 'WPAC';
        const list = NAME_LISTS[basinKey] || NAME_LISTS['WPAC'];
        const safeIndex = nameIndex % list.length;
        updatedCyclone.name = list[safeIndex];
        console.log(`System upgraded to Tropical Storm ${updatedCyclone.name} (${basinKey})`);
    }
    
    return updatedCyclone;
}
