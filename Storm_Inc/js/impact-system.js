import { CITY_DATA } from './city-data.js';
import { estimateRainAtPoint, estimateRainEnhancedSurge } from './environment-model.js';
import { calculateDistance } from './utils.js';
import { FICTIONIA_CITIES } from './fictionia-map.js';

const IMPACT_CITY_DATA = [...CITY_DATA, ...FICTIONIA_CITIES];

export const WARNING_META = {
    EW_WARNING: { label: 'Extreme Wind Warning', shortLabel: 'EXT WIND', color: '#ff005d', priority: 6 },
    EW_WATCH: { label: 'Extreme Wind Watch', shortLabel: 'EXT WATCH', color: '#f97316', priority: 5 },
    HU_WARNING: { label: 'Hurricane Warning', shortLabel: 'HU WARN', color: '#dc2626', priority: 4 },
    HU_WATCH: { label: 'Hurricane Watch', shortLabel: 'HU WATCH', color: '#e879f9', priority: 3 },
    TS_WARNING: { label: 'Tropical Storm Warning', shortLabel: 'TS WARN', color: '#2563eb', priority: 2 },
    TS_WATCH: { label: 'Tropical Storm Watch', shortLabel: 'TS WATCH', color: '#facc15', priority: 1 }
};

export function createImpactState() {
    return {
        damageUsd: 0,
        deaths: 0,
        casualtyRemainder: 0,
        lastHour: null,
        affectedCities: {},
        rainfallByCity: {},
        maxRainMm: 0,
        maxRainCity: '',
        maxSurgeM: 0,
        floodDamageUsd: 0,
        recentImpacts: []
    };
}

export function formatDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return '$0';
    if (amount >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(2)}T`;
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
    return `$${Math.round(amount)}`;
}

export function formatRain(mm) {
    if (!Number.isFinite(mm) || mm <= 0) return '0 mm';
    if (mm >= 1000) return `${(mm / 1000).toFixed(2)} m`;
    return `${Math.round(mm)} mm`;
}

export function formatSurge(meters) {
    if (!Number.isFinite(meters) || meters <= 0) return '0.0 m';
    return `${meters.toFixed(1)} m`;
}

export function estimateWindAtCity(cycloneLike, city) {
    if (!cycloneLike || !city) return 0;

    const centerLon = Number(cycloneLike.lon ?? cycloneLike[0]);
    const centerLat = Number(cycloneLike.lat ?? cycloneLike[1]);
    const intensity = Number(cycloneLike.intensity ?? cycloneLike[2] ?? 0);
    const circulationSize = Number(cycloneLike.circulationSize ?? cycloneLike[5] ?? 320);

    if (!Number.isFinite(centerLon) || !Number.isFinite(centerLat) || !Number.isFinite(intensity)) {
        return 0;
    }

    const distKm = calculateDistance(centerLat, centerLon, city.lat, city.lon);
    const rmwKm = Math.max(14, 8 + circulationSize * 0.12);
    const outerRadiusKm = Math.max(180, circulationSize * 3.2);

    if (distKm > outerRadiusKm) return 0;

    let wind;
    if (distKm <= rmwKm) {
        wind = intensity * (0.35 + 0.65 * distKm / rmwKm);
    } else {
        const decayExponent = 0.72 - Math.min(0.18, circulationSize * 0.0002);
        wind = intensity * Math.pow(rmwKm / Math.max(distKm, rmwKm), decayExponent);
    }

    const fadeStart = outerRadiusKm * 0.45;
    if (distKm > fadeStart) {
        const t = Math.min(1, (distKm - fadeStart) / (outerRadiusKm - fadeStart));
        wind *= (1 - t) * (1 - t);
    }

    return Math.max(0, wind);
}

export function updateImpactState(impactState, cyclone) {
    if (!impactState || !cyclone || cyclone.status !== 'active') {
        return { changed: false, recentImpacts: [] };
    }

    const currentHour = cyclone.age || 0;
    if (impactState.lastHour === currentHour) {
        return { changed: false, recentImpacts: impactState.recentImpacts || [] };
    }

    const previousHour = Number.isFinite(impactState.lastHour) ? impactState.lastHour : currentHour - 3;
    const elapsedHours = Math.max(1, Math.min(6, currentHour - previousHour));
    impactState.lastHour = currentHour;
    const recentImpacts = [];

    IMPACT_CITY_DATA.forEach(city => {
        const wind = estimateWindAtCity(cyclone, city);
        const rain = estimateRainAtPoint(cyclone, city.lon, city.lat);
        const rainAddedMm = rain.rateMmHr * elapsedHours;
        const key = `${city.n}|${city.lon}|${city.lat}`;

        if (wind < 28 && rain.rateMmHr < 4) return;

        const population = Math.max(25000, city.p || 25000);
        const exposure = Math.min(4.0, Math.sqrt(population / 250000));
        const windFactor = Math.pow(Math.max(0, wind - 33) / 50, 2.35);
        const majorWindBoost = wind >= 96 ? 1.7 : (wind >= 64 ? 1.25 : 1.0);
        const windDamage = windFactor * exposure * majorWindBoost * 11_500_000;

        const rainfallRecord = impactState.rainfallByCity[key] || { name: city.n, totalMm: 0, maxRateMmHr: 0 };
        rainfallRecord.totalMm += rainAddedMm;
        rainfallRecord.maxRateMmHr = Math.max(rainfallRecord.maxRateMmHr, rain.rateMmHr);
        impactState.rainfallByCity[key] = rainfallRecord;

        const water = estimateRainEnhancedSurge(cyclone, city, wind, rainfallRecord.totalMm);
        const floodThreshold = Math.max(60, 110 - Math.min(50, wind));
        const floodFactor = Math.pow(Math.max(0, rainfallRecord.totalMm - floodThreshold) / 210, 1.55);
        const flashFloodFactor = Math.pow(Math.max(0, rain.rateMmHr - 22) / 38, 1.45);
        const waterFactor = Math.pow(Math.max(0, water.totalWaterM) / 1.4, 1.65);
        const floodDamage = (floodFactor + flashFloodFactor * 0.65 + waterFactor * 0.7) * exposure * 4_800_000;
        const cityDamage = windDamage + floodDamage;

        const casualtyFactor = Math.pow(Math.max(0, wind - 55) / 60, 2.25);
        const floodCasualtyFactor = Math.pow(Math.max(0, rainfallRecord.totalMm - 180) / 320, 1.55)
            + Math.pow(Math.max(0, water.totalWaterM - 1.2) / 2.4, 1.4);
        const casualtyEstimate = casualtyFactor * exposure * 0.24 + floodCasualtyFactor * exposure * 0.08;

        impactState.damageUsd += cityDamage;
        impactState.floodDamageUsd += floodDamage;
        impactState.casualtyRemainder += casualtyEstimate;
        impactState.maxRainMm = Math.max(impactState.maxRainMm || 0, rainfallRecord.totalMm);
        if (impactState.maxRainMm === rainfallRecord.totalMm) impactState.maxRainCity = city.n;
        impactState.maxSurgeM = Math.max(impactState.maxSurgeM || 0, water.totalWaterM);

        const newDeaths = Math.floor(impactState.casualtyRemainder);
        if (newDeaths > 0) {
            impactState.deaths += newDeaths;
            impactState.casualtyRemainder -= newDeaths;
        }

        const previous = impactState.affectedCities[key] || { name: city.n, maxWind: 0, damageUsd: 0, rainfallMm: 0, maxSurgeM: 0 };
        previous.maxWind = Math.max(previous.maxWind, wind);
        previous.damageUsd += cityDamage;
        previous.rainfallMm = rainfallRecord.totalMm;
        previous.maxSurgeM = Math.max(previous.maxSurgeM || 0, water.totalWaterM);
        impactState.affectedCities[key] = previous;

        if (cityDamage > 200000 || wind >= 50 || rainfallRecord.totalMm >= 125 || rain.rateMmHr >= 20) {
            recentImpacts.push({
                name: city.n,
                wind,
                rainRateMmHr: rain.rateMmHr,
                rainfallMm: rainfallRecord.totalMm,
                surgeM: water.totalWaterM,
                damageUsd: cityDamage
            });
        }
    });

    recentImpacts.sort((a, b) => b.damageUsd - a.damageUsd);
    impactState.recentImpacts = recentImpacts.slice(0, 4);

    return { changed: recentImpacts.length > 0, recentImpacts: impactState.recentImpacts };
}

function classifyWarning(windKt, hoursUntilImpact) {
    if (hoursUntilImpact > 48) return null;
    // Extreme Wind Warnings are short-fused; the sim uses 3-hour forecast steps.
    if (windKt >= 100) {
        return hoursUntilImpact <= 3 ? 'EW_WARNING' : (hoursUntilImpact <= 18 ? 'EW_WATCH' : 'HU_WATCH');
    }
    if (windKt >= 64) return hoursUntilImpact <= 36 ? 'HU_WARNING' : 'HU_WATCH';
    if (windKt >= 34) return hoursUntilImpact <= 36 ? 'TS_WARNING' : 'TS_WATCH';
    return null;
}

export function buildWarningAdvisory(cyclone, pathForecasts, previousAdvisory = null) {
    if (!cyclone || cyclone.status !== 'active' || cyclone.isExtratropical) {
        return { active: [], signature: '', changed: previousAdvisory?.signature !== '' };
    }

    const primaryForecast = pathForecasts?.[0]?.track || [];
    if (primaryForecast.length < 2 || cyclone.intensity < 30) {
        return { active: [], signature: '', changed: previousAdvisory?.signature !== '' };
    }

    const warningMap = new Map();

    IMPACT_CITY_DATA.forEach(city => {
        let best = null;

        for (let i = 0; i < primaryForecast.length; i++) {
            const point = primaryForecast[i];
            const hours = i * 3;
            if (hours > 48) break;

            const pointLike = {
                lon: point[0],
                lat: point[1],
                intensity: point[2],
                circulationSize: cyclone.circulationSize
            };
            const wind = estimateWindAtCity(pointLike, city);
            const code = classifyWarning(wind, hours);
            if (!code) continue;

            const meta = WARNING_META[code];
            const score = meta.priority * 1000 + wind - hours * 0.5 + Math.log10(Math.max(1, city.p || 1));
            if (!best || score > best.score) {
                best = {
                    id: `${city.n}|${city.lon}|${city.lat}`,
                    city: city.n,
                    lon: city.lon,
                    lat: city.lat,
                    population: city.p || 0,
                    code,
                    label: meta.label,
                    shortLabel: meta.shortLabel,
                    color: meta.color,
                    priority: meta.priority,
                    wind,
                    hours,
                    score
                };
            }
        }

        if (best) warningMap.set(best.id, best);
    });

    const active = [...warningMap.values()]
        .sort((a, b) => b.priority - a.priority || a.hours - b.hours || b.wind - a.wind)
        .slice(0, 24);
    const signature = active
        .map(w => `${w.code}:${w.city}`)
        .sort()
        .join('|');

    return {
        active,
        signature,
        changed: signature !== (previousAdvisory?.signature || '')
    };
}
