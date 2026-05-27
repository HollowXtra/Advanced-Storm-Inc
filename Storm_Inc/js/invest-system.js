const INVEST_BASIN_CODES = {
    NATL: { code: 'AL', suffix: 'L' },
    EPAC: { code: 'EP', suffix: 'E' },
    CPAC: { code: 'CP', suffix: 'C' },
    WPAC: { code: 'WP', suffix: 'W' },
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
    if (percent >= 70) return { label: 'High', color: '#ef4444', code: 'HIGH' };
    if (percent >= 40) return { label: 'Medium', color: '#fb923c', code: 'MED' };
    if (percent > 0) return { label: 'Low', color: '#facc15', code: 'LOW' };
    return { label: 'None', color: '#94a3b8', code: 'NONE' };
}

export function calculateInvestOutlook(cyclone, env = {}) {
    const intensity = Number(cyclone?.intensity || 0);
    const sst = Number(env.sst ?? 26);
    const ohc = Number(env.ohcKjCm2 ?? cyclone?.ohcKjCm2 ?? 0);
    const shear = Number(env.shearKt ?? 18);
    const humidity = Number(env.humidity ?? cyclone?.environmentHumidity ?? 70);
    const rainRate = Number(cyclone?.rainRateMmHr || 0);
    const previousOrganization = Number(cyclone?.investOrganization ?? 0.25);
    const isLand = !!env.isLand;
    const isNearLand = !!env.isNearLand;

    const windScore = clamp((intensity - 17) / 18, 0, 1);
    const oceanScore = clamp((sst - 25.4) / 3.0, 0, 1) * 0.55 + clamp((ohc - 35) / 70, 0, 1) * 0.45;
    const shearScore = 1 - clamp((shear - 10) / 34, 0, 1);
    const moistureScore = clamp((humidity - 52) / 36, 0, 1);
    const convectionScore = clamp((rainRate - 4) / 36, 0, 1);
    const landPenalty = isLand ? 0.42 : (isNearLand ? 0.82 : 1.0);
    const monsoonBonus = cyclone?.isMonsoonDepression ? 0.08 : 0;
    const targetOrganization = clamp(
        (windScore * 0.28 + oceanScore * 0.24 + shearScore * 0.2 + moistureScore * 0.14 + convectionScore * 0.14 + monsoonBonus) * landPenalty,
        0,
        1
    );
    const noise = (Math.random() - 0.5) * 0.045;
    const organization = clamp(previousOrganization * 0.7 + targetOrganization * 0.3 + noise, 0, 1);
    const closedLow = organization >= 0.48 && intensity >= 23 && shear < 30 && !isLand;

    let chance48h = roundToNearestTen(organization * 72 + windScore * 18 + oceanScore * 12 - Math.max(0, shear - 24) * 0.8);
    let chance7d = roundToNearestTen(chance48h + oceanScore * 18 + shearScore * 10 + moistureScore * 6);

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

    return {
        organization,
        closedLow,
        formationChance48h: finalChance48h,
        formationChance7d: finalChance7d,
        chanceCategory: classifyInvestChance(finalChance7d),
        modelGuidanceAvailable: true
    };
}
