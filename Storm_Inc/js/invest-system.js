const INVEST_BASIN_CODES = {
    NATL: { code: 'AL', suffix: 'L' },
    EPAC: { code: 'EP', suffix: 'E' },
    CPAC: { code: 'CP', suffix: 'C' },
    WPAC: { code: 'WP', suffix: 'W' },
    MED: { code: 'ME', suffix: 'M' },
    FICT: { code: 'FI', suffix: 'F' },
    FICT2: { code: 'FI', suffix: 'F' },
    RED: { code: 'RS', suffix: 'R' },
    REDG: { code: 'RS', suffix: 'R' },
    NIO: { code: 'IO', suffix: 'B' },
    SIO: { code: 'SH', suffix: 'S' },
    SHEM: { code: 'SH', suffix: 'S' },
    SATL: { code: 'SL', suffix: 'Q' }
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function roundToNearestTen(value) {
    return Math.round(clamp(value, 0, 100) / 10) * 10;
}

function smoothStep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(0.001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

function getInvestDisturbanceType(cyclone, env = {}) {
    if (cyclone?.basin === 'MED') return 'MEDICANE LOW';
    if (cyclone?.isSubtropical || cyclone?.isExtratropical) return 'FRONTAL REMNANT';
    if (cyclone?.basin === 'NIO') return 'MONSOON LOW';
    if (cyclone?.basin === 'SHEM' || cyclone?.basin === 'SIO') return Number(cyclone?.lat || 0) < -15 ? 'TROPICAL LOW' : 'MONSOON LOW';
    if (Number(env.shearKt ?? 0) > 28) return 'SHEARED WAVE';
    if (Number(cyclone?.circulationSize || 0) > 430) return 'BROAD LOW';
    return Number(cyclone?.intensity || 0) >= 24 ? 'LOW PRESSURE AREA' : 'TROPICAL WAVE';
}

export function getInvestBasinInfo(basin = 'WPAC') {
    return INVEST_BASIN_CODES[basin] || INVEST_BASIN_CODES.WPAC;
}

export function buildInvestId(basin = 'WPAC', number = 90) {
    const info = getInvestBasinInfo(basin);
    const safeNumber = Math.max(90, Math.min(99, Math.round(number || 90)));
    return `${info.code}${String(safeNumber).padStart(2, '0')}`;
}

export function buildInvestDisplayId(basin = 'WPAC', number = 90) {
    const info = getInvestBasinInfo(basin);
    const safeNumber = Math.max(90, Math.min(99, Math.round(number || 90)));
    return `${String(safeNumber).padStart(2, '0')}${info.suffix}`;
}

export function classifyInvestChance(percent) {
    if (percent > 60) return { label: 'High', color: '#ef4444', fill: 'rgba(239, 68, 68, 0.30)', code: 'HIGH' };
    if (percent >= 40) return { label: 'Medium', color: '#fb923c', fill: 'rgba(251, 146, 60, 0.28)', code: 'MED' };
    if (percent > 0) return { label: 'Low', color: '#facc15', fill: 'rgba(250, 204, 21, 0.24)', code: 'LOW' };
    return { label: 'None', color: '#94a3b8', fill: 'rgba(148, 163, 184, 0.18)', code: 'NONE' };
}

export function calculateInvestOutlook(cyclone, env = {}) {
    const intensity = Number(cyclone?.intensity || 0);
    const sst = Number(env.sst ?? 26);
    const ohc = Number(env.ohcKjCm2 ?? cyclone?.ohcKjCm2 ?? 0);
    const shear = Number(env.shearKt ?? 18);
    const humidity = Number(env.humidity ?? cyclone?.environmentHumidity ?? 70);
    const rainRate = Number(cyclone?.rainRateMmHr || 0);
    const previousOrganization = Number(cyclone?.investOrganization ?? 0.25);
    const previousConvectivePulse = Number(cyclone?.investConvectivePulse ?? 0.2);
    const previousLowLevelCenter = Number(cyclone?.investLowLevelCenter ?? 0.18);
    const age = Number(cyclone?.age || 0);
    const speed = Number(cyclone?.speed || 8);
    const direction = Number(cyclone?.direction ?? 285);
    const isLand = !!env.isLand;
    const isNearLand = !!env.isNearLand;

    const isMedicane = cyclone?.basin === 'MED';
    const windScore = clamp((intensity - 17) / 18, 0, 1);
    const oceanScore = isMedicane
        ? clamp((sst - 18.0) / 6.5, 0, 1) * 0.58 + clamp((ohc - 10) / 48, 0, 1) * 0.42
        : clamp((sst - 25.4) / 3.0, 0, 1) * 0.55 + clamp((ohc - 35) / 70, 0, 1) * 0.45;
    const shearScore = 1 - clamp((shear - 10) / 34, 0, 1);
    const moistureScore = clamp((humidity - 52) / 36, 0, 1);
    const convectionScore = clamp((rainRate - 4) / 36, 0, 1);
    const persistenceScore = smoothStep(6, isMedicane ? 36 : 48, age);
    const spinScore = clamp((intensity - 14) / 20, 0, 1);
    const pressureScore = clamp((1012 - Number(cyclone?.centralPressure || 1012)) / 24, 0, 1);
    const landPenalty = isLand ? 0.42 : (isNearLand ? 0.82 : 1.0);
    const monsoonBonus = cyclone?.isMonsoonDepression ? 0.08 : 0;
    const medicaneBonus = isMedicane ? 0.05 : 0;
    const convectiveTarget = clamp(
        convectionScore * 0.46 + moistureScore * 0.22 + oceanScore * 0.2 + shearScore * 0.12,
        0,
        1
    );
    const convectivePulse = clamp(previousConvectivePulse * 0.58 + convectiveTarget * 0.42 + (Math.random() - 0.5) * 0.07, 0, 1);
    const llcTarget = clamp(spinScore * 0.46 + pressureScore * 0.22 + persistenceScore * 0.18 + shearScore * 0.14, 0, 1);
    const lowLevelCenter = clamp(previousLowLevelCenter * 0.66 + llcTarget * 0.34 + (Math.random() - 0.5) * 0.035, 0, 1);
    const outflowQuality = clamp(shearScore * 0.52 + oceanScore * 0.24 + moistureScore * 0.16 + persistenceScore * 0.08, 0, 1);
    const targetOrganization = clamp(
        (
            windScore * 0.18
            + oceanScore * 0.18
            + shearScore * 0.15
            + moistureScore * 0.1
            + convectivePulse * 0.16
            + lowLevelCenter * 0.17
            + persistenceScore * 0.06
            + monsoonBonus
            + medicaneBonus
        ) * landPenalty,
        0,
        1
    );
    const noise = (Math.random() - 0.5) * 0.035;
    const organization = clamp(previousOrganization * 0.62 + targetOrganization * 0.38 + noise, 0, 1);
    const organizationTrend = clamp(organization - previousOrganization, -0.3, 0.3);
    const closedLow = organization >= (isMedicane ? 0.46 : 0.5)
        && lowLevelCenter >= 0.48
        && intensity >= 23
        && shear < (isMedicane ? 34 : 30)
        && !isLand;

    let chance48h = roundToNearestTen(
        organization * 46
        + lowLevelCenter * 22
        + convectivePulse * 14
        + windScore * 12
        + oceanScore * 10
        + persistenceScore * 8
        - Math.max(0, shear - 24) * 0.85
    );
    let chance7d = roundToNearestTen(
        chance48h
        + oceanScore * 16
        + shearScore * 10
        + moistureScore * 7
        + outflowQuality * 8
        + Math.max(0, organizationTrend) * 80
    );

    if (isLand) {
        chance48h = Math.min(chance48h, 20);
        chance7d = Math.min(chance7d, 30);
    }

    if (closedLow && intensity >= 30) {
        chance48h = Math.max(chance48h, 70);
        chance7d = Math.max(chance7d, 80);
    }

    const finalChance48h = clamp(chance48h, 0, 100);
    const finalChance7d = clamp(Math.max(chance48h, chance7d), 0, 100);
    const chanceCategory = classifyInvestChance(finalChance7d);
    const chance48Category = classifyInvestChance(finalChance48h);
    const convectionTrend = organizationTrend > 0.035 ? 'INCREASING' : (organizationTrend < -0.035 ? 'WANING' : 'PULSING');
    const llcLabel = lowLevelCenter >= 0.64 ? 'DEFINED LLC' : (lowLevelCenter >= 0.42 ? 'BROAD LLC' : 'OPEN WAVE');
    const modelGuidanceAvailable = finalChance7d >= 10 || organization >= 0.22;
    const outlookLength = clamp(1.25 + finalChance7d / 85 + speed / 34, 1.2, 2.9);
    const outlookWidth = clamp(0.72 + (1 - shearScore) * 0.5 + organization * 0.35, 0.7, 1.6);
    const outlookArea = {
        direction,
        length,
        width: outlookWidth,
        offset: clamp(0.18 + speed / 70, 0.15, 0.55)
    };

    return {
        organization,
        closedLow,
        formationChance48h: finalChance48h,
        formationChance7d: finalChance7d,
        chanceCategory,
        chance48Category,
        disturbanceType: getInvestDisturbanceType(cyclone, env),
        convectivePulse,
        convectionTrend,
        lowLevelCenter,
        lowLevelCenterLabel: llcLabel,
        outflowQuality,
        outlookArea,
        modelGuidanceAvailable
    };
}
