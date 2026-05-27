export const FICTIONIA_BASIN = 'FICT';
export const FICTIONIA_CREDIT = 'FICTIONIA MAP - CREDIT: diamondlife';
export const FICTIONIA_CENTER = { lon: -112, lat: 28 };
export const FICTIONIA_BOUNDS = {
    lon: { min: -148, max: -86 },
    lat: { min: 3, max: 52 }
};

function feature(name, coordinates) {
    return {
        type: 'Feature',
        properties: {
            name,
            fictionia: true
        },
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
        }
    };
}

function line(name, coordinates, kind = 'county') {
    return {
        type: 'Feature',
        properties: { name, kind, fictionia: true },
        geometry: {
            type: 'LineString',
            coordinates
        }
    };
}

function polygon(name, coordinates, kind = 'water') {
    return {
        type: 'Feature',
        properties: { name, kind, fictionia: true },
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
        }
    };
}

export const FICTIONIA_LAND_FEATURES = [
    feature('Fictionia Mainland', [
        [-139.0, 51.0], [-94.0, 51.0], [-94.0, 44.0], [-96.5, 42.8], [-99.5, 41.5],
        [-103.0, 39.5], [-106.5, 38.0], [-110.0, 36.0], [-112.0, 33.0], [-115.0, 31.2],
        [-119.5, 31.0], [-123.8, 33.2], [-127.8, 34.2], [-131.0, 35.0], [-134.0, 33.8],
        [-136.2, 31.0], [-136.2, 27.0], [-134.4, 23.0], [-134.8, 18.4], [-137.8, 16.2],
        [-142.5, 15.4], [-147.0, 18.0], [-147.0, 28.0], [-145.0, 31.2], [-145.0, 35.0],
        [-147.0, 38.2], [-145.0, 42.0], [-139.0, 42.0], [-139.0, 51.0]
    ]),
    feature('Fictionia South Coast', [
        [-115.0, 31.2], [-110.0, 30.0], [-105.0, 28.0], [-103.0, 25.0], [-102.0, 22.0],
        [-105.0, 18.0], [-107.0, 14.0], [-104.0, 10.0], [-99.0, 8.0], [-94.0, 6.0],
        [-91.0, 10.0], [-95.0, 16.0], [-99.0, 22.0], [-101.0, 29.0], [-103.0, 34.0],
        [-106.5, 38.0], [-110.0, 36.0], [-112.0, 33.0], [-115.0, 31.2]
    ]),
    feature('Fictionia Southwest Lowlands', [
        [-147.0, 18.0], [-142.5, 15.4], [-137.8, 16.2], [-134.8, 18.4], [-134.4, 12.2],
        [-130.0, 9.0], [-124.0, 8.0], [-120.0, 6.0], [-117.0, 4.0], [-125.0, 4.0],
        [-134.0, 7.0], [-142.0, 10.0], [-148.0, 13.0], [-147.0, 18.0]
    ]),
    feature('Diamondlife Island', [
        [-96.4, 24.7], [-95.8, 25.0], [-95.2, 24.7], [-95.0, 24.2], [-95.4, 23.8],
        [-96.1, 23.8], [-96.7, 24.2], [-96.4, 24.7]
    ])
];

export const FICTIONIA_WATER_FEATURES = [
    polygon('Silver Reach', [
        [-123.6, 32.4], [-120.5, 32.0], [-116.8, 31.2], [-113.2, 29.6], [-110.0, 27.2],
        [-109.0, 25.5], [-114.2, 26.4], [-118.2, 28.4], [-121.0, 30.8], [-123.6, 32.4]
    ]),
    polygon('South Diamond Bay', [
        [-126.0, 16.4], [-122.0, 14.2], [-117.5, 12.2], [-112.0, 8.4], [-108.4, 4.0],
        [-117.0, 4.0], [-123.4, 7.2], [-126.5, 11.4], [-126.0, 16.4]
    ]),
    polygon('Twin Lakes North', [
        [-124.3, 15.4], [-123.2, 15.8], [-122.0, 15.0], [-122.2, 14.2], [-123.7, 13.9],
        [-124.6, 14.4], [-124.3, 15.4]
    ]),
    polygon('Twin Lakes South', [
        [-125.0, 12.2], [-123.8, 12.5], [-122.7, 11.5], [-123.2, 10.4], [-124.6, 10.2],
        [-125.3, 11.0], [-125.0, 12.2]
    ])
];

const northVerticals = [-136, -133, -130, -127, -124, -121, -118, -115, -112, -109, -106, -103, -100, -97]
    .map((lon, index) => line(`North Meridian ${index + 1}`, [[lon, 42.0], [lon, 51.0]]));
const northHorizontals = [44.0, 46.0, 48.0, 50.0]
    .map((lat, index) => line(`North Parallel ${index + 1}`, [[-139.0, lat], [-94.0, lat]]));
const centralVerticals = [-144, -141, -138, -135, -132, -129, -126, -123, -120, -117, -114, -111]
    .map((lon, index) => line(`Central Meridian ${index + 1}`, [[lon, 18.0], [lon, 42.0]]));
const centralHorizontals = [20, 23, 26, 29, 32, 35, 38, 41]
    .map((lat, index) => line(`Central Parallel ${index + 1}`, [[-147.0, lat], [-104.0, lat]]));
const southVerticals = [-144, -140, -136, -132, -128, -124, -120, -116, -112, -108, -104, -100, -96]
    .map((lon, index) => line(`South Meridian ${index + 1}`, [[lon, 4.0], [lon, 24.0]]));
const southHorizontals = [6, 8.5, 11, 13.5, 16, 18.5, 21]
    .map((lat, index) => line(`South Parallel ${index + 1}`, [[-148.0, lat], [-92.0, lat]]));

export const FICTIONIA_COUNTY_LINES = [
    ...northVerticals,
    ...northHorizontals,
    ...centralVerticals,
    ...centralHorizontals,
    ...southVerticals,
    ...southHorizontals,
    line('Blackwater River', [[-136, 42], [-134, 38], [-132, 34], [-131, 30], [-132, 26], [-130, 22], [-128, 18], [-126, 15]], 'river'),
    line('Crown Divide', [[-131, 35], [-127, 33], [-123, 31], [-119, 29], [-115, 27], [-111, 25]], 'county'),
    line('East Coast Road', [[-104, 38], [-102, 34], [-101, 30], [-100, 26], [-99, 22], [-97, 18], [-95, 15]], 'county'),
    line('Western Delta', [[-146, 16], [-142, 13], [-138, 11], [-134, 9], [-130, 8], [-126, 7]], 'county'),
    line('Diamond Island Cut', [[-96.7, 24.2], [-95.0, 24.2]], 'county')
];

export const FICTIONIA_CITIES = [
    { n: 'Diamond City', lon: -132.8, lat: 35.8, p: 2450000, cap: 1, wc: 1, r: 0 },
    { n: 'Northgate', lon: -123.8, lat: 47.2, p: 980000, wc: 1, r: 2 },
    { n: 'Silverport', lon: -106.0, lat: 25.3, p: 1850000, wc: 1, r: 1 },
    { n: 'Lakeshore', lon: -119.4, lat: 31.6, p: 725000, r: 2 },
    { n: 'Westhaven', lon: -143.2, lat: 27.8, p: 610000, r: 2 },
    { n: 'Crownfall', lon: -128.6, lat: 21.5, p: 540000, r: 3 },
    { n: 'Baymarch', lon: -113.0, lat: 15.0, p: 820000, wc: 1, r: 2 },
    { n: 'Southpoint', lon: -99.8, lat: 10.2, p: 465000, wc: 1, r: 3 },
    { n: 'Blackwater', lon: -136.2, lat: 17.2, p: 390000, r: 3 },
    { n: 'Diamondlife Island', lon: -95.8, lat: 24.3, p: 65000, wc: 1, r: 4 }
];

function isInExpandedBounds(lon, lat, pad = 0) {
    return lon >= FICTIONIA_BOUNDS.lon.min - pad
        && lon <= FICTIONIA_BOUNDS.lon.max + pad
        && lat >= FICTIONIA_BOUNDS.lat.min - pad
        && lat <= FICTIONIA_BOUNDS.lat.max + pad;
}

function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersects = ((yi > lat) !== (yj > lat))
            && lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

function isPointInFictioniaLand(lon, lat) {
    return FICTIONIA_LAND_FEATURES.some(item => item.geometry.coordinates.some(ring => pointInRing(lon, lat, ring)));
}

export function getFictioniaLandStatus(lon, lat, nearThresholdDeg = 0.2) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !isInExpandedBounds(lon, lat, nearThresholdDeg)) {
        return { isLand: false, isNearLand: false };
    }

    const isLand = isPointInFictioniaLand(lon, lat);
    if (isLand || nearThresholdDeg <= 0) {
        return { isLand, isNearLand: isLand };
    }

    const samples = 12;
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const sampleLon = lon + Math.cos(angle) * nearThresholdDeg;
        const sampleLat = lat + Math.sin(angle) * nearThresholdDeg;
        if (isPointInFictioniaLand(sampleLon, sampleLat)) {
            return { isLand: false, isNearLand: true };
        }
    }

    return { isLand: false, isNearLand: false };
}

export function addFictioniaToWorld(world) {
    if (!world || !Array.isArray(world.features)) return world;
    if (world.features.some(item => item?.properties?.fictionia)) return world;
    return {
        ...world,
        features: [
            ...world.features,
            ...FICTIONIA_LAND_FEATURES
        ]
    };
}

export function isFictioniaBasin(basin) {
    return basin === FICTIONIA_BASIN;
}
