import { calculateDistance, getSST, normalizeLongitude, shortestLongitudeDistance } from './utils.js';
import { getElevationAt, getLandStatus } from './terrain-data.js';

const PAR_POLYGON = [
    [115, 5],
    [115, 15],
    [120, 21],
    [120, 25],
    [135, 25],
    [135, 5]
];

export const PAGASA_NAME_SETS = [
    [
        'Auring', 'Bising', 'Crising', 'Dante', 'Emong', 'Fabian', 'Gorio', 'Huaning', 'Isang', 'Jacinto',
        'Kiko', 'Lannie', 'Mirasol', 'Nando', 'Opong', 'Paolo', 'Quedan', 'Ramil', 'Salome', 'Tino',
        'Uwan', 'Verbena', 'Wilma', 'Yasmin', 'Zoraida'
    ],
    [
        'Ada', 'Basyang', 'Caloy', 'Domeng', 'Ester', 'Francisco', 'Gardo', 'Henry', 'Inday', 'Josie',
        'Kiyapo', 'Luis', 'Maymay', 'Neneng', 'Obet', 'Pilandok', 'Queenie', 'Rosal', 'Samuel', 'Tomas',
        'Umberto', 'Venus', 'Waldo', 'Yayang', 'Zeny'
    ],
    [
        'Amang', 'Betty', 'Chedeng', 'Dodong', 'Emil', 'Falcon', 'Gavino', 'Hanna', 'Ineng', 'Jenny',
        'Kabayan', 'Liwayway', 'Marilyn', 'Nimfa', 'Onyok', 'Perla', 'Quiel', 'Ramon', 'Sarah', 'Tamaraw',
        'Ugong', 'Viring', 'Weng', 'Yoyoy', 'Zigzag'
    ],
    [
        'Aghon', 'Butchoy', 'Carina', 'Dindo', 'Enteng', 'Ferdie', 'Gener', 'Helen', 'Igme', 'Julian',
        'Kristine', 'Leon', 'Marce', 'Nika', 'Ofel', 'Pepito', 'Querubin', 'Romina', 'Siony', 'Tonyo',
        'Upang', 'Vicky', 'Warren', 'Yoyong', 'Zosimo'
    ]
];

const PAGASA_AUXILIARY_NAMES = [
    'Alamid', 'Bruno', 'Conching', 'Dolor', 'Ernie', 'Florante', 'Gerardo', 'Hernan', 'Isko', 'Jerome'
];

const WARM_POOLS = [
    { label: 'WPAC warm pool', lon: 145, lat: 12, amp: 42, sx: 23, sy: 10 },
    { label: 'Philippine Sea', lon: 132, lat: 16, amp: 34, sx: 13, sy: 8 },
    { label: 'Gulf loop current', lon: -87, lat: 25, amp: 44, sx: 10, sy: 7 },
    { label: 'Caribbean', lon: -75, lat: 16, amp: 34, sx: 18, sy: 8 },
    { label: 'Bay of Bengal', lon: 89, lat: 14, amp: 38, sx: 11, sy: 8 },
    { label: 'Arabian Sea warm layer', lon: 66, lat: 16, amp: 24, sx: 11, sy: 7 },
    { label: 'Ionian Sea medicane pocket', lon: 18, lat: 36.5, amp: 16, sx: 8, sy: 4 },
    { label: 'Levantine warm basin', lon: 30, lat: 34, amp: 14, sx: 8, sy: 4 },
    { label: 'central Mediterranean warm layer', lon: 13, lat: 36.5, amp: 12, sx: 9, sy: 4 },
    { label: 'Coral Sea', lon: 155, lat: -15, amp: 28, sx: 17, sy: 8 },
    { label: 'South Indian warm pool', lon: 75, lat: -13, amp: 32, sx: 24, sy: 9 }
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toEastLongitude(lon) {
    const value = lon % 360;
    return value < 0 ? value + 360 : value;
}

function gaussian(lon, lat, centerLon, centerLat, sx, sy) {
    const dx = shortestLongitudeDistance(lon, centerLon);
    const dy = lat - centerLat;
    return Math.exp(-((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy)));
}

function isMediterraneanPoint(lon, lat) {
    const x = normalizeLongitude(lon);
    return x >= -6 && x <= 36 && lat >= 30 && lat <= 46;
}

export function pointInPAR(lon, lat) {
    const x = toEastLongitude(lon);
    const y = lat;
    let inside = false;

    for (let i = 0, j = PAR_POLYGON.length - 1; i < PAR_POLYGON.length; j = i++) {
        const xi = PAR_POLYGON[i][0];
        const yi = PAR_POLYGON[i][1];
        const xj = PAR_POLYGON[j][0];
        const yj = PAR_POLYGON[j][1];
        const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-6) + xi;
        if (intersects) inside = !inside;
    }

    return inside;
}

export function getPagasaName(index, setIndex = 1) {
    const primary = PAGASA_NAME_SETS[((setIndex % PAGASA_NAME_SETS.length) + PAGASA_NAME_SETS.length) % PAGASA_NAME_SETS.length];
    if (index < primary.length) return primary[index];
    return PAGASA_AUXILIARY_NAMES[(index - primary.length) % PAGASA_AUXILIARY_NAMES.length];
}

export function calculateOceanHeatContent(lat, lon, month = 8, globalTempK = 289) {
    const sst = getSST(lat, lon, month, globalTempK);
    const isMediterranean = isMediterraneanPoint(lon, lat);
    const warmAnomaly = Math.max(0, sst - (isMediterranean ? 19.0 : 26.0));
    const absLat = Math.abs(lat);
    const seasonPeak = lat >= 0 ? 8 : 2;
    const season = 0.5 + 0.5 * Math.cos((month - seasonPeak) * Math.PI / 6);
    const normalizedLon = normalizeLongitude(lon);

    let regionalDepthBoost = 0;
    let regionLabel = 'open ocean';
    WARM_POOLS.forEach(pool => {
        const influence = gaussian(normalizedLon, lat, pool.lon, pool.lat, pool.sx, pool.sy);
        const boost = pool.amp * influence;
        if (boost > regionalDepthBoost) regionLabel = pool.label;
        regionalDepthBoost += boost;
    });

    const equatorialBoost = isMediterranean ? 0 : clamp(18 - absLat * 0.55, 0, 18);
    const subtropicalPenalty = isMediterranean ? Math.max(0, absLat - 42) * 0.7 : Math.max(0, absLat - 28) * 2.1;
    const medSeasonPeak = 9.5;
    const medSeason = 0.5 + 0.5 * Math.cos((month - medSeasonPeak) * Math.PI / 6);
    const seasonalBoost = isMediterranean ? (8 + medSeason * 14) : season * (lat >= 0 ? 16 : 13);
    const depth26M = isMediterranean
        ? clamp(7 + warmAnomaly * 5.8 + regionalDepthBoost * 0.55 + seasonalBoost - subtropicalPenalty, 0, 82)
        : clamp(8 + warmAnomaly * 13.5 + equatorialBoost + regionalDepthBoost + seasonalBoost - subtropicalPenalty, 0, 175);

    const rhoCp = 4.09e6;
    const ohc = rhoCp * warmAnomaly * depth26M / 1e7;
    const roundedOHC = Math.round(clamp(ohc, 0, isMediterranean ? 90 : 180));

    return {
        sst,
        depth26M: Math.round(depth26M),
        ohcKjCm2: roundedOHC,
        supportsIntensification: isMediterranean ? (sst >= 18.5 && roundedOHC >= 12) : (sst >= 26 && roundedOHC >= 50),
        label: regionLabel
    };
}

export function calculateCycloneRainfall(cyclone, month = 8, globalTempK = 289, shearKt = 0) {
    if (!cyclone) return { centerRateMmHr: 0, rainShieldKm: 0, moistureFactor: 1 };

    const sst = getSST(cyclone.lat, cyclone.lon, month, globalTempK);
    const ohc = Number(cyclone.ohcKjCm2 || 0);
    const humidity = clamp(Number(cyclone.environmentHumidity ?? 74), 35, 98);
    const intensity = Math.max(10, Number(cyclone.intensity || 0));
    const size = clamp(Number(cyclone.circulationSize || 300), 100, 800);
    const speed = clamp(Number(cyclone.speed || 8), 2, 35);
    const isMedicane = cyclone.basin === 'MED';

    const moistureFactor = clamp(humidity / 74, 0.45, 1.45);
    const slowFactor = clamp(10 / speed, 0.65, 2.65);
    const warmRainFactor = isMedicane ? clamp((sst - 17.0) / 8.5, 0.38, 1.18) : clamp((sst - 24.5) / 6.0, 0.25, 1.35);
    const ohcFactor = isMedicane ? clamp(0.88 + ohc / 90, 0.78, 1.35) : clamp(0.78 + ohc / 125, 0.7, 1.55);
    const shearVentFactor = clamp(1.1 - shearKt / 80, 0.62, 1.12);
    const monsoonFactor = cyclone.isMonsoonDepression ? 1.45 : 1.0;
    const structureFactor = cyclone.ercState && cyclone.ercState !== 'none' ? 1.1 : 1.0;
    const medicaneRainFactor = isMedicane ? 1.18 : 1.0;

    const innerCoreRate = (5 + intensity * 0.16 + Math.sqrt(size) * 0.45)
        * moistureFactor
        * slowFactor
        * warmRainFactor
        * ohcFactor
        * shearVentFactor
        * monsoonFactor
        * structureFactor
        * medicaneRainFactor;

    const rainShieldKm = isMedicane
        ? clamp(110 + size * 1.2 + Math.max(0, humidity - 70) * 5.5, 150, 620)
        : clamp(160 + size * 1.55 + Math.max(0, humidity - 70) * 7, 180, 1300);

    return {
        centerRateMmHr: clamp(innerCoreRate, 0, 95),
        rainShieldKm,
        moistureFactor,
        slowFactor,
        warmRainFactor
    };
}

export function estimateRainAtPoint(cyclone, lon, lat) {
    if (!cyclone || cyclone.status !== 'active') {
        return { rateMmHr: 0, distanceKm: Infinity, bandScore: 0 };
    }

    const centerLon = Number(cyclone.lon);
    const centerLat = Number(cyclone.lat);
    const distKm = calculateDistance(centerLat, centerLon, lat, lon);
    const size = clamp(Number(cyclone.circulationSize || 300), 100, 800);
    const rmwKm = clamp(Number(cyclone.rmwKm || (10 + size * 0.14)), 12, 120);
    const rainShieldKm = clamp(Number(cyclone.rainShieldKm || (170 + size * 1.55)), 180, 1300);

    if (distKm > rainShieldKm * 1.25) {
        return { rateMmHr: 0, distanceKm: distKm, bandScore: 0 };
    }

    const baseRate = Number(cyclone.rainRateMmHr || 8);
    const core = Math.exp(-((distKm - rmwKm) ** 2) / (2 * (rmwKm * 1.15) ** 2));
    const eyewall = Math.exp(-((distKm - rmwKm * 0.85) ** 2) / (2 * (rmwKm * 0.45) ** 2));
    const outerEnvelope = Math.exp(-(distKm * distKm) / (2 * (rainShieldKm * 0.62) ** 2));
    const theta = Math.atan2(lat - centerLat, shortestLongitudeDistance(lon, centerLon));
    const hemi = centerLat >= 0 ? 1 : -1;
    const motionAngle = (90 - Number(cyclone.direction || 280)) * Math.PI / 180;
    const rightFrontAngle = motionAngle - hemi * Math.PI / 4;
    const asymmetry = 0.72 + 0.34 * Math.cos(theta - rightFrontAngle);
    const bandWave = 0.5 + 0.5 * Math.sin(theta * 3 * hemi + distKm / 62 - (cyclone.age || 0) * 0.14);
    const bandScore = clamp(bandWave * outerEnvelope, 0, 1);

    const land = getLandStatus(lon, lat, 0.16);
    const terrain = Math.max(0, getElevationAt(lon, lat) || 0);
    const orographic = land.isLand ? clamp(1 + terrain / 1600, 1.02, 1.75) : (land.isNearLand ? 1.08 : 1.0);

    const rate = baseRate * (0.22 * outerEnvelope + 0.62 * core + 0.72 * eyewall + 0.38 * bandScore) * asymmetry * orographic;
    return {
        rateMmHr: clamp(rate, 0, 125),
        distanceKm: distKm,
        bandScore
    };
}

export function estimateRainEnhancedSurge(cyclone, city, windKt, rainTotalMm) {
    if (!cyclone || !city) return { surgeM: 0, floodM: 0, totalWaterM: 0 };

    const land = getLandStatus(city.lon, city.lat, 0.22);
    const coastalFactor = land.isNearLand ? 1.0 : (land.isLand ? 0.45 : 0.85);
    const windSurge = Math.pow(Math.max(0, windKt - 35) / 70, 1.75) * 2.2 * coastalFactor;
    const pressureSurge = Math.max(0, 1005 - Number(cyclone.centralPressure || 1005)) / 45 * coastalFactor;
    const rainFlood = Math.pow(Math.max(0, rainTotalMm - 90) / 260, 1.28) * 1.25;
    const slowPileup = clamp(10 / Math.max(2, cyclone.speed || 8), 0.7, 2.0);
    const totalWaterM = clamp((windSurge + pressureSurge) * 0.72 + rainFlood * slowPileup, 0, 8.5);

    return {
        surgeM: clamp((windSurge + pressureSurge) * 0.72, 0, 7.5),
        floodM: clamp(rainFlood * slowPileup, 0, 5.5),
        totalWaterM
    };
}
