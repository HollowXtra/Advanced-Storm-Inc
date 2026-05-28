/**
 * js/satellite-view.js
 * 负责处理 WebGL 卫星云图渲染
 */

let gl, program;
let startTime;
let canvas;
let uniforms = {};
let isGrayscale = false;

// 顶点着色器
const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// 片元着色器 (已更新不对称逻辑)
const fragmentShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_spiral_strength;
    uniform float u_eye_radius;
    uniform float u_shape_distortion;
    uniform float u_storm_radius;
    uniform float u_cloud_low;
    uniform float u_cloud_high;
    uniform float u_central_mass_size;
    uniform float u_wind_shear_strength;
    uniform float u_random_seed;
    uniform float u_hemisphere; 

    uniform float u_grayscale;
    
    // [新增] 不对称参数
    uniform float u_asym_strength;
    uniform float u_asym_dir;
    uniform float u_outer_eyewall_radius;
    uniform float u_outer_eyewall_strength;
    uniform float u_rain_shield;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }
    #define FBM_OCTAVES 5
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.6;
        float max_amplitude = 0.0;
        for (int i = 0; i < FBM_OCTAVES; i++) {
            value += amplitude * noise(st);
            max_amplitude += amplitude;
            st *= 2.0;
            amplitude *= 0.5;
        }
        return (value / max_amplitude) * 0.9999;
    }
    vec3 nrl_color_ramp(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 c0 = vec3(0.0, 0.1, 0.2);
        vec3 c1 = vec3(0.7, 1.0, 1.0);
        vec3 c2 = vec3(0.0, 0.0, 1.0);
        vec3 c3 = vec3(0.0, 1.0, 0.0);
        vec3 c4 = vec3(1.0, 0.0, 0.0);
        vec3 c5 = vec3(1.0, 1.0, 0.0);
        vec3 c6 = vec3(1.0, 1.0, 1.0);
        vec3 color = c0;
        color = mix(color, c1, smoothstep(0.0, 0.2, t));
        color = mix(color, c2, smoothstep(0.2, 0.3, t));
        color = mix(color, c3, smoothstep(0.3, 0.5, t));
        color = mix(color, c4, smoothstep(0.5, 0.8, t));
        color = mix(color, c5, smoothstep(0.8, 0.99, t));
        color = mix(color, c6, smoothstep(0.99, 1.0, t));
        return color;
    }

    void main() {
        vec2 uv = 0.7 * (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);
        
        // --- [新增] 不对称几何计算 ---
        // 1. 计算角度差异
        float angle_diff = angle - u_asym_dir;
        // 2. 角度因子
        float asym_factor = cos(angle_diff);
        // 3. 半径拉伸
        float radius_multiplier = 1.0 + asym_factor * u_asym_strength;
        radius_multiplier = max(0.3, radius_multiplier); 
        // 4. 动态风暴半径
        float dynamic_storm_radius = u_storm_radius * radius_multiplier;
        
        float base_distortion_amp = 0.01;
        float shear_distortion_factor = 0.9;
        float total_distortion_amplitude = base_distortion_amp + u_wind_shear_strength * shear_distortion_factor;
        
        float ROTATION_SPEED = 0.3;
        float NOISE_SCALE = 4.0;

        // 1. 螺旋云带
        float spiral_angle = angle + u_spiral_strength * log(dist) * u_hemisphere - u_time * ROTATION_SPEED * u_hemisphere;
        
        vec2 noise_uv = vec2(cos(spiral_angle) * dist, sin(spiral_angle) * dist) * NOISE_SCALE;
        noise_uv.y += u_time * 0.1;
        float noise_val = fbm(noise_uv + u_random_seed);

        // --- 密度不对称增强 (让延伸侧云层稍厚) ---
        float density_boost = smoothstep(-0.5, 1.0, asym_factor) * u_asym_strength * 0.2;
        noise_val += density_boost;

        // 2. 风眼与边缘
        vec2 spiral_boundary_noise_uv = uv * 6.0 + u_time * 0.3;
        float spiral_boundary_perturbation = fbm(spiral_boundary_noise_uv) * total_distortion_amplitude;
        
        float spiral_inner_radius = (u_eye_radius - u_wind_shear_strength) + spiral_boundary_perturbation;
        float spiral_inner_radius_soft = (u_eye_radius + 0.1 - u_wind_shear_strength) + spiral_boundary_perturbation;
        
        float eye_falloff = smoothstep(spiral_inner_radius, spiral_inner_radius_soft, dist);
        noise_val *= eye_falloff;
        
        float distortion_noise = fbm(uv * 1.5 + u_time * 0.05);
        float distorted_dist = dist - distortion_noise * u_shape_distortion;
        
        // [修改] 使用 dynamic_storm_radius 替代原有的 u_storm_radius
        float storm_falloff = 1.0 - smoothstep(dynamic_storm_radius, dynamic_storm_radius + 0.2, distorted_dist);
        noise_val *= storm_falloff;
        
        // 3. 中心云团 (CDO)
        float central_mass_value = 0.0;
        if (u_central_mass_size > 0.0) {
            vec2 shear_direction = normalize(vec2(1.0, 1.0));
            vec2 cdo_uv = uv - shear_direction * u_wind_shear_strength;
            float cdo_dist = length(cdo_uv);
            float cdo_angle = atan(cdo_uv.y, cdo_uv.x);
            
            float central_mass_outer_radius = u_eye_radius + u_central_mass_size;
            vec2 boundary_noise_uv = cdo_uv * 6.0 + u_time * 0.3;
            float boundary_perturbation = fbm(boundary_noise_uv) * total_distortion_amplitude;

            float perturbed_inner_radius = (u_eye_radius - u_wind_shear_strength) + boundary_perturbation;
            float perturbed_outer_radius = central_mass_outer_radius + boundary_perturbation;

            float central_mass_shape = smoothstep(perturbed_inner_radius, perturbed_inner_radius + 0.06, cdo_dist)
                                     * (1.0 - smoothstep(perturbed_outer_radius, perturbed_outer_radius + 0.15, cdo_dist));
            
            float central_mass_rotation_speed = ROTATION_SPEED * 1.2;
            
            float central_mass_internal_angle = cdo_angle + u_spiral_strength * log(cdo_dist) * u_hemisphere 
                                              - u_time * central_mass_rotation_speed * u_hemisphere 
                                              - u_wind_shear_strength;
                                  
            vec2 central_mass_internal_noise_coords;
            central_mass_internal_noise_coords.x = cos(central_mass_internal_angle) * cdo_dist - u_wind_shear_strength;
            central_mass_internal_noise_coords.y = sin(central_mass_internal_angle) * cdo_dist - u_wind_shear_strength;
            
            float internal_texture = fbm(central_mass_internal_noise_coords * 6.0);
            central_mass_value = central_mass_shape * (0.85 + internal_texture * 0.15);
        }
        
        float outer_eyewall = exp(-pow((dist - u_outer_eyewall_radius) / 0.035, 2.0))
                             * u_outer_eyewall_strength
                             * (0.72 + 0.28 * fbm(uv * 10.0 + u_time * 0.18));
        float rain_canopy = u_rain_shield
                          * (1.0 - smoothstep(dynamic_storm_radius * 0.58, dynamic_storm_radius + 0.32, dist))
                          * (0.35 + 0.65 * fbm(noise_uv * 0.8 + 4.0));

        noise_val = max(noise_val, central_mass_value);
        noise_val = max(noise_val, outer_eyewall);
        noise_val += rain_canopy * 0.18;
        float cloud_intensity = smoothstep(u_cloud_low, u_cloud_high, noise_val);
        vec3 color = nrl_color_ramp(cloud_intensity);
        float ir_val = max(0.1, pow(cloud_intensity*1.3, 1.2));
        vec3 grayColor = vec3(ir_val);
        vec3 final_color = mix(color, grayColor, u_grayscale);
        
        gl_FragColor = vec4(final_color, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// 参数状态
let currentParams = {
    spiral: 1.0, eye: -0.1, distortion: 0.4, stormRadius: 0.2,
    centralMass: 0.0, shear: 0.0, cloudLow: 0.1, cloudHigh: 0.8,
    hemisphere: 1.0, // [新增] 1.0 for NH, -1.0 for SH
    seed: Math.random() * 100,
    asymStrength: 0.0,
    asymDir: 0.0,
    outerEyewallRadius: 0.0,
    outerEyewallStrength: 0.0,
    rainShield: 0.0
};

export function resetSatelliteParams() {
    currentParams = {
        spiral: 1.0, 
        eye: -0.1, 
        distortion: Math.random() * 0.4, 
        stormRadius: Math.random() * 0.2 + 0.1,
        centralMass: Math.random() * 0.2, 
        shear: Math.random() * 0.1, 
        cloudLow: 0.0, 
        cloudHigh: Math.random() * 0.5 + 0.5,
        hemisphere: 1.0, // 默认为北半球
        seed: Math.random() * 100,
        asymStrength: Math.random() * 0.3, 
        asymDir: Math.random() * 6.28,
        outerEyewallRadius: 0.0,
        outerEyewallStrength: 0.0,
        rainShield: 0.0
    };
}

// 插值函数
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// 辅助：生成正弦波动
function oscillate(base, amplitude, speed) {
    return base + Math.sin(Date.now() * 0.001 * speed) * amplitude;
}

export function initSatelliteView(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;

    const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vShader || !fShader) return;

    program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return;
    }

    // Cache uniform locations
    const uniformNames = [
        "u_resolution", "u_time", "u_spiral_strength", "u_eye_radius", 
        "u_shape_distortion", "u_storm_radius", "u_central_mass_size", 
        "u_wind_shear_strength", "u_cloud_low", "u_cloud_high", "u_random_seed",
        "u_outer_eyewall_radius", "u_outer_eyewall_strength", "u_rain_shield",
        "u_hemisphere", "u_asym_strength", "u_asym_dir", "u_grayscale" // [新增]
    ];
    uniformNames.forEach(name => {
        uniforms[name] = gl.getUniformLocation(program, name);
    });

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionAttrib = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    startTime = Date.now();
    requestAnimationFrame(render);
}

export function setSatelliteGrayscale(enable) {
    isGrayscale = enable;
}

// 根据强度更新目标参数
export function updateSatelliteView(intensityKnots, age, latitude, isExtratropical, isSubtropical, isLand = false, sst = 29, humidity = 75, structure = {}) {
    if (intensityKnots == null || isNaN(intensityKnots)) intensityKnots = 0;
    if (latitude == null || isNaN(latitude)) latitude = 0;
    if (sst == null || isNaN(sst)) sst = 29;
    if (humidity == null || isNaN(humidity)) humidity = 75;

    currentParams.hemisphere = latitude < 0 ? -1.0 : 1.0;

    // 基础目标对象
    let target = { 
        spiral: 1.0, eye: -0.1, distortion: 0.4, stormRadius: 0.2, 
        centralMass: 0.0, shear: 0.0, 
        cloudLow: 0.1, 
        cloudHigh: 0.8, // 默认值，会被覆盖
        asymStrength: 0.0, asymDir: 0.0,
        outerEyewallRadius: 0.0,
        outerEyewallStrength: 0.0,
        rainShield: 0.0
    };
    let randomFactor = Math.random(); 
    let dynamicAsymStr = oscillate(0.25, 0.55, 0.5);
    let dynamicAsymDir = (Date.now() * 0.0002) % 6.28;
    // ============================================================
    // 1. 结构形态设定 (Spiral, Eye, Distortion) - 保持基于强度的逻辑
    // ============================================================
    if (isExtratropical) {
        target.spiral = 0.8; target.eye = -0.2; target.distortion = 0.6; target.stormRadius = 0.4; target.centralMass = 0.0; target.shear = 0.2; target.asymStrength = 1.5; target.asymDir = 5.5;
    } else if (isSubtropical) {
        target.spiral = 1.0; target.eye = -0.15; target.distortion = 0.5; target.stormRadius = 0.3; target.centralMass = 0.05; target.shear = 0.15; target.asymStrength = 0.5; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 24) { // LO
        target.spiral = 0.5; target.eye = -0.10; target.distortion = Math.random()*0.3+0.1; target.stormRadius = 0.1; target.centralMass = 0.0; target.shear = 0.10; target.asymStrength = dynamicAsymStr * 1.5; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 34) { // TD
        target.spiral = 1.0; target.eye = -0.10; target.distortion = 0.4; target.stormRadius = 0.15; target.centralMass = 0.0; target.shear = 0.10; target.asymStrength = dynamicAsymStr * 1.4; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 64) { // TS
        let dynamicShear = randomFactor * 0.20;
        let dynamicMass = randomFactor * 0.30;
        target.spiral = 1.2; target.eye = -0.06; target.distortion = 0.35; target.stormRadius = 0.25; target.centralMass = dynamicMass; target.shear = dynamicShear; target.asymStrength = dynamicAsymStr * 1.3; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 83) { // Cat 1
        if (currentParams.seed > 50) {
            let dynamicEye = oscillate(0.025, 0.025, 1.0); 
            target.spiral = 1.4; target.eye = dynamicEye; target.distortion = 0.30; target.stormRadius = 0.2; target.centralMass = 0.15; target.shear = 0.08; target.asymStrength = dynamicAsymStr * 1.2; target.asymDir = dynamicAsymDir;
        } else {
            let dynamicEye = oscillate(0.0, 0.025, 1.0); 
            target.spiral = 1.4; target.eye = dynamicEye; target.distortion = 0.30; target.stormRadius = 0.2; target.centralMass = -0.05; target.shear = 0.0; target.asymStrength = dynamicAsymStr * 1.2; target.asymDir = dynamicAsymDir;
        }
    } else if (intensityKnots < 96) { // Cat 2
        let dynamicEye = oscillate(0.025, 0.025, 1.5); 
        target.spiral = 1.6; target.eye = dynamicEye; target.distortion = 0.35; target.stormRadius = 0.22; target.centralMass = 0.12; target.shear = 0.04; target.asymStrength = dynamicAsymStr * 1.1; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 113) { // Cat 3
        let dynamicEye = oscillate(0.025, 0.025, 2.0); 
        target.spiral = 1.9; target.eye = dynamicEye; target.distortion = Math.random()*0.05 + 0.27; target.stormRadius = Math.random()*0.05 + 0.27; target.centralMass = 0.10; target.shear = 0.03; target.asymStrength = dynamicAsymStr * 1.0; target.asymDir = dynamicAsymDir;
    } else if (intensityKnots < 137) { // Cat 4
        let dynamicEye = oscillate(0.0, 0.02, 2.5); 
        target.spiral = 2.0; target.eye = dynamicEye; target.distortion = Math.random()*0.30; target.stormRadius = 0.25; target.centralMass = 0.08; target.shear = 0.02; target.asymStrength = dynamicAsymStr * 1.0; target.asymDir = dynamicAsymDir;
    } else { // Cat 5
        let dynamicEye = oscillate(-0.005, 0.015, 3.0);
        target.spiral = 2.5; target.eye = dynamicEye; target.distortion = Math.random()*0.30; target.stormRadius = 0.20; target.centralMass = Math.random()*0.05 + 0.05; target.shear = 0.00; target.asymStrength = dynamicAsymStr * 1.0; target.asymDir = dynamicAsymDir;
    }

    const ercState = structure?.ercState || 'none';
    const ercProgress = Math.max(0, Math.min(1, Number(structure?.ercProgress || 0)));
    const pinholeScore = Math.max(0, Math.min(1, Number(structure?.pinholeScore || 0)));
    const secondaryEyewallKm = Number(structure?.secondaryEyewallRadiusKm || 0);
    const eyeKm = Number(structure?.eyeRadiusKm || 0);
    const eyeClosing = Math.max(0, Math.min(1, Number(structure?.eyeClosing || 0)));
    const eyeOpenFraction = Math.max(0, Math.min(1, Number(structure?.eyeOpenFraction ?? 1)));
    const eyeMaturity = Math.max(0, Math.min(1, Number(structure?.eyeMaturity ?? eyeOpenFraction)));
    const bandingMaturity = Math.max(0, Math.min(1, Number(structure?.bandingMaturity ?? (intensityKnots >= 96 ? 0.7 : 0.35))));
    const coldCloudShield = Math.max(0, Math.min(1, Number(structure?.coldCloudShield || 0)));
    const convectiveBurstiness = Math.max(0, Math.min(1, Number(structure?.convectiveBurstiness || 0)));
    const microwaveRingScore = Math.max(0, Math.min(1, Number(structure?.microwaveRingScore || 0)));
    const bandFragmentation = Math.max(0, Math.min(1, Number(structure?.bandFragmentation || 0)));
    const shapeFamily = structure?.shapeFamily || 'classic';
    target.rainShield = Math.max(0, Math.min(1, Number(structure?.rainShieldKm || 0) / 950));

    if (pinholeScore > 0.55 && intensityKnots >= 96 && eyeMaturity > 0.64) {
        target.eye = Math.max(0.006, target.eye * 0.42);
        target.spiral += 0.25;
        target.distortion *= 0.65;
    } else if (eyeKm > 0 && intensityKnots >= 64 && eyeMaturity > 0.18) {
        target.eye = Math.max(0.006, Math.min(0.085, eyeKm / 520) * (0.35 + eyeMaturity * 0.65));
    }

    if (intensityKnots >= 64 && !isExtratropical && !isSubtropical) {
        target.spiral *= 0.64 + bandingMaturity * 0.4;
        target.distortion += (1 - bandingMaturity) * 0.12;
        target.asymStrength += (1 - bandingMaturity) * 0.2;
        target.centralMass += (1 - eyeMaturity) * 0.12;
        target.centralMass += coldCloudShield * 0.08;
        target.distortion += convectiveBurstiness * 0.08;
        target.spiral += microwaveRingScore * 0.08;
        if (eyeMaturity < 0.18) {
            target.eye = Math.min(target.eye, -0.04);
        } else if (eyeMaturity < 0.48) {
            target.eye *= 0.42 + eyeMaturity * 0.95;
        }
    }

    if (ercState === 'weakening') {
        target.outerEyewallRadius = Math.max(0.12, Math.min(0.34, (secondaryEyewallKm || 72) / 430));
        target.outerEyewallStrength = 0.58 + ercProgress * 0.42;
        target.eye = Math.max(0.003, target.eye * (0.72 - ercProgress * 0.36));
        target.centralMass += 0.14;
        target.stormRadius += 0.05;
        target.distortion += 0.08;
    } else if (ercState === 'recovering') {
        target.outerEyewallRadius = Math.max(0.14, Math.min(0.36, (secondaryEyewallKm || 85) / 430));
        target.outerEyewallStrength = Math.max(0.0, 0.55 * (1 - ercProgress));
        target.eye = Math.max(target.eye, 0.035 + ercProgress * 0.035);
        target.stormRadius += 0.04;
    }

    if (eyeClosing > 0.05 && intensityKnots >= 64) {
        target.eye = Math.max(-0.1, target.eye * Math.max(0.05, eyeOpenFraction * 0.72));
        if (eyeClosing > 0.45) {
            target.eye = Math.min(target.eye, -0.02 - eyeClosing * 0.07);
        }
        target.centralMass += 0.1 + eyeClosing * 0.22;
        target.distortion += 0.04 + eyeClosing * 0.08;
        target.asymStrength += eyeClosing * 0.24;
    }

    if (shapeFamily === 'annular') {
        target.spiral *= 0.78;
        target.stormRadius += 0.05;
        target.distortion *= 0.62;
        target.centralMass += 0.08;
    } else if (shapeFamily === 'compact') {
        target.spiral += 0.22;
        target.stormRadius -= 0.04;
        target.distortion *= 0.72;
    } else if (shapeFamily === 'comma' || shapeFamily === 'sheared') {
        target.spiral *= 0.9;
        target.asymStrength += 0.48;
        target.distortion += 0.18;
        target.stormRadius += 0.04;
    } else if (shapeFamily === 'ragged' || shapeFamily === 'lopsided') {
        target.asymStrength += 0.22 + bandFragmentation * 0.34;
        target.distortion += 0.1 + bandFragmentation * 0.18;
    } else if (shapeFamily === 'monsoon') {
        target.stormRadius += 0.12;
        target.spiral *= 0.82;
        target.centralMass -= 0.04;
        target.asymStrength += 0.18;
    } else if (shapeFamily === 'open-wave') {
        target.spiral *= 0.7;
        target.centralMass -= 0.06;
        target.asymStrength += 0.36;
        target.distortion += 0.18;
    }

    // ============================================================
    // 2. 云量 (Cloud High) 核心计算逻辑
    // ============================================================
    
    // 判断是否为成熟的热带系统 (TS及以上)
    const isMatureTropical = !isExtratropical && !isSubtropical && intensityKnots >= 34;

    if (!isMatureTropical) {
        // [A] 弱系统/非热带系统：保持原有的“松散/随机”风格
        // 这里的 CloudHigh 仍然主要由预设决定，湿度只做微调
        if (isExtratropical) target.cloudHigh = 2.0;
        else if (isSubtropical) target.cloudHigh = 1.6;
        else if (intensityKnots < 24) target.cloudHigh = 1.3; // LO: 很淡
        else target.cloudHigh = 1.1; // TD: 稍浓
        
        // 弱系统对湿度的敏感度较低，但也稍微受点影响
        // 湿度越低，云越淡 (+0.1)
        if (humidity < 60) target.cloudHigh += 0.2;

    } else {
        // [B] 成熟热带气旋：完全由湿度驱动 (Direct Mapping)
        // ---------------------------------------------------
        // 映射逻辑：
        // 湿度 95% -> CloudHigh 0.45 (极浓密，CDO 亮白)
        // 湿度 75% -> CloudHigh 0.80 (正常，有层次)
        // 湿度 40% -> CloudHigh 1.35 (极稀薄，即将消散)
        // ---------------------------------------------------
        
        // 钳制湿度输入范围，防止数值溢出
        const effectiveHum = Math.max(30, Math.min(98, humidity));
        
        // 线性方程：y = mx + c
        // (95, 0.45), (40, 1.35)
        // m = (1.35 - 0.45) / (40 - 95) = 0.9 / -55 ≈ -0.0163
        // 使用稍微平滑一点的系数 -0.013
        
        target.cloudHigh = 2.1 - (effectiveHum * 0.015);
    }

    // 全局随机性
    let jitter = (Math.random() - 0.5) * 0.02;
    target.stormRadius += jitter;
    target.distortion += jitter * 2.0;

    let sstThreshold = 27.0;
    let sstEffect = Math.max(0, (sstThreshold - sst) * 0.3);
    
    target.cloudHigh += sstEffect;

    const smoothFactor = 0.25;

    // 登陆后逻辑
    if (isLand) {
        currentParams.cloudHigh += 0.15; 
        currentParams.centralMass -= 0.04;
        if (currentParams.cloudHigh > 2.0) currentParams.cloudHigh = 2.0; 
        
        target.eye = -0.15; 
        target.spiral *= 0.8; 
    } else {
        currentParams.cloudHigh = lerp(currentParams.cloudHigh, target.cloudHigh, smoothFactor);
    }

    currentParams.spiral = lerp(currentParams.spiral, target.spiral, smoothFactor);
    currentParams.eye = lerp(currentParams.eye, target.eye, smoothFactor);
    currentParams.distortion = lerp(currentParams.distortion, target.distortion, smoothFactor);
    currentParams.stormRadius = lerp(currentParams.stormRadius, target.stormRadius, smoothFactor);
    currentParams.centralMass = lerp(currentParams.centralMass, target.centralMass, smoothFactor);
    currentParams.shear = lerp(currentParams.shear, target.shear, smoothFactor);
    currentParams.cloudLow = lerp(currentParams.cloudLow, target.cloudLow, smoothFactor);
    currentParams.cloudHigh = lerp(currentParams.cloudHigh, target.cloudHigh, smoothFactor);
    currentParams.asymStrength = lerp(currentParams.asymStrength, target.asymStrength, smoothFactor);
    currentParams.asymDir = lerp(currentParams.asymDir, target.asymDir, smoothFactor * 0.5);
    currentParams.outerEyewallRadius = lerp(currentParams.outerEyewallRadius, target.outerEyewallRadius, smoothFactor);
    currentParams.outerEyewallStrength = lerp(currentParams.outerEyewallStrength, target.outerEyewallStrength, smoothFactor);
    currentParams.rainShield = lerp(currentParams.rainShield, target.rainShield, smoothFactor);
}

function render() {
    if (!gl || !program) return;

    const time = (Date.now() - startTime) * 0.001;
    
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.useProgram(program);
    
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.u_time, time);
    gl.uniform1f(uniforms.u_spiral_strength, currentParams.spiral);
    gl.uniform1f(uniforms.u_eye_radius, currentParams.eye);
    gl.uniform1f(uniforms.u_shape_distortion, currentParams.distortion);
    gl.uniform1f(uniforms.u_storm_radius, currentParams.stormRadius);
    gl.uniform1f(uniforms.u_central_mass_size, currentParams.centralMass);
    gl.uniform1f(uniforms.u_wind_shear_strength, currentParams.shear);
    gl.uniform1f(uniforms.u_cloud_low, currentParams.cloudLow);
    gl.uniform1f(uniforms.u_cloud_high, currentParams.cloudHigh);
    gl.uniform1f(uniforms.u_random_seed, currentParams.seed);
    gl.uniform1f(uniforms.u_hemisphere, currentParams.hemisphere);
    gl.uniform1f(uniforms.u_asym_strength, currentParams.asymStrength);
    gl.uniform1f(uniforms.u_asym_dir, currentParams.asymDir);
    gl.uniform1f(uniforms.u_outer_eyewall_radius, currentParams.outerEyewallRadius);
    gl.uniform1f(uniforms.u_outer_eyewall_strength, currentParams.outerEyewallStrength);
    gl.uniform1f(uniforms.u_rain_shield, currentParams.rainShield);
    gl.uniform1f(uniforms.u_grayscale, isGrayscale ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

export function getSatelliteSnapshot() {
    if (!gl || !canvas || !program) return null;

    // 1. 强制渲染一帧，确保画面是最新的
    render(); 
    
    // 2. 导出图片数据
    return canvas.toDataURL('image/png');
}
