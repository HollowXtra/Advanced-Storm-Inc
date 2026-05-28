export const FICTIONIA_BASIN = 'FICT';
export const FICTIONIA2_BASIN = 'FICT2';
export const FICTIONIA_BASINS = [FICTIONIA_BASIN, FICTIONIA2_BASIN];
export const REDSTONE_BASIN = 'RED';
export const REDSTONE_GRID_BASIN = 'REDG';
export const REDSTONE_BASINS = [REDSTONE_BASIN, REDSTONE_GRID_BASIN];
export const CUSTOM_MAP_BASINS = [...FICTIONIA_BASINS, ...REDSTONE_BASINS];
export const FICTIONIA_CREDIT = 'FICTIONIA MAP - CREDIT: diamondlife';
export const FICTIONIA2_CREDIT = 'FICTIONIA2 MAP - CREDIT: diamondlife';
export const REDSTONE_CREDIT = 'REDSTONE BASIN - CUSTOM SHEM MAP';
export const REDSTONE_GRID_CREDIT = 'REDSTONE BASIN GRID - CUSTOM SHEM MAP';
export const FICTIONIA_CENTER = { lon: -112, lat: 28 };
export const FICTIONIA_BOUNDS = {
    lon: { min: -148, max: -86 },
    lat: { min: 3, max: 52 }
};
export const REDSTONE_CENTER = { lon: 130, lat: -20 };
export const REDSTONE_BOUNDS = {
    lon: { min: 92, max: 170 },
    lat: { min: -45, max: 4 }
};

function feature(name, coordinates, customMap = 'fictionia', extraProperties = {}) {
    return {
        type: 'Feature',
        properties: {
            name,
            fictionia: customMap === 'fictionia',
            customMap,
            customMapFeature: true,
            ...extraProperties
        },
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
        }
    };
}

function line(name, coordinates, kind = 'county', customMap = 'fictionia') {
    return {
        type: 'Feature',
        properties: {
            name,
            kind,
            fictionia: customMap === 'fictionia',
            customMap,
            customMapFeature: true
        },
        geometry: {
            type: 'LineString',
            coordinates
        }
    };
}

function polygon(name, coordinates, kind = 'water', customMap = 'fictionia') {
    return {
        type: 'Feature',
        properties: {
            name,
            kind,
            fictionia: customMap === 'fictionia',
            customMap,
            customMapFeature: true
        },
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

export const REDSTONE_LAND_FEATURES = [
    feature('Redstone North Reach', [
        [92.0, 3.5], [101.2, 3.0], [111.4, 2.5], [113.2, 1.0], [110.6, -0.2],
        [104.8, 0.1], [99.0, -1.8], [94.4, -1.1], [92.0, 0.2], [92.0, 3.5]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Dallas Isle', [
        [115.2, 2.8], [121.8, 2.2], [124.0, 0.4], [123.5, -1.2], [119.0, -1.8],
        [115.8, -0.6], [115.2, 2.8]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone West Mainland', [
        [92.0, -5.2], [98.0, -4.0], [103.0, -5.4], [107.8, -8.0], [110.8, -11.6],
        [111.8, -15.2], [108.5, -18.0], [104.8, -19.8], [101.5, -18.6], [96.6, -16.6],
        [93.5, -13.4], [92.0, -9.5], [92.0, -5.2]
    ], 'redstone', { biome: 'dry' }),
    feature('Redstone Lower Peninsula', [
        [110.0, -20.8], [116.2, -22.5], [121.8, -25.2], [125.4, -29.5], [126.8, -34.0],
        [124.8, -37.5], [120.6, -35.6], [116.8, -31.0], [112.0, -27.6], [108.0, -23.5],
        [110.0, -20.8]
    ], 'redstone', { biome: 'dry' }),
    feature('Redstone San Diego Cape', [
        [118.5, -18.4], [123.4, -18.2], [128.0, -20.2], [130.4, -23.5], [127.0, -25.8],
        [122.0, -25.0], [117.5, -22.6], [115.6, -20.0], [118.5, -18.4]
    ], 'redstone', { biome: 'dry' }),
    feature('Redstone Booker Island', [
        [112.2, -16.4], [114.0, -16.2], [115.2, -17.4], [115.0, -19.0], [112.8, -19.2],
        [111.6, -18.2], [112.2, -16.4]
    ], 'redstone', { biome: 'dry' }),
    feature('Redstone Cherokee Island', [
        [98.5, -18.9], [101.2, -19.1], [102.8, -20.4], [100.8, -21.4], [97.8, -21.0],
        [96.5, -20.0], [98.5, -18.9]
    ], 'redstone', { biome: 'dry' }),
    feature('Redstone Mecklen Island', [
        [124.8, -37.2], [127.4, -36.3], [129.2, -37.8], [128.2, -39.6], [125.4, -39.3],
        [124.0, -38.2], [124.8, -37.2]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Santa Barbara Island', [
        [132.0, -37.6], [135.4, -36.7], [138.8, -37.8], [136.2, -39.0], [132.4, -38.6],
        [132.0, -37.6]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Verde Island', [
        [132.2, -9.4], [134.1, -9.1], [135.0, -9.8], [134.3, -10.5], [132.8, -10.4],
        [132.2, -9.4]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Lagos Island', [
        [130.4, -10.8], [132.0, -10.6], [132.6, -11.4], [131.8, -12.0], [130.1, -11.8],
        [130.4, -10.8]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Sao Paulo Island', [
        [139.4, -9.3], [141.4, -9.1], [142.1, -9.9], [141.0, -10.5], [139.6, -10.3],
        [139.4, -9.3]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Riverland', [
        [139.0, -11.6], [141.8, -11.3], [143.4, -12.6], [142.2, -14.0], [139.5, -13.7],
        [138.2, -12.8], [139.0, -11.6]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone East Continent', [
        [151.0, -25.0], [157.0, -23.2], [164.0, -25.6], [170.0, -30.0], [168.0, -35.5],
        [163.8, -37.8], [160.0, -35.4], [156.0, -36.2], [151.8, -39.8], [148.4, -37.0],
        [149.5, -31.0], [151.0, -25.0]
    ], 'redstone', { biome: 'forest' }),
    feature('Redstone Vancouver Tail', [
        [164.0, -36.0], [169.0, -37.0], [170.0, -40.0], [166.2, -40.2], [161.5, -38.2],
        [164.0, -36.0]
    ], 'redstone', { biome: 'forest' })
];

export const REDSTONE_WATER_FEATURES = [
    polygon('Viroqua Lake', [
        [101.8, -9.4], [102.7, -9.0], [103.5, -9.8], [103.2, -10.9], [102.0, -11.0],
        [101.4, -10.1], [101.8, -9.4]
    ], 'water', 'redstone'),
    polygon('Adair Lake', [
        [104.0, -15.4], [105.0, -15.1], [105.8, -15.7], [105.6, -16.5], [104.4, -16.7],
        [103.7, -16.1], [104.0, -15.4]
    ], 'water', 'redstone'),
    polygon('Mexicali Sound', [
        [106.2, -15.0], [107.2, -14.8], [107.8, -15.3], [107.4, -15.9], [106.3, -15.8],
        [106.2, -15.0]
    ], 'water', 'redstone'),
    polygon('San Jose Inlet', [
        [123.0, -30.4], [124.2, -31.8], [123.8, -34.6], [122.3, -34.2], [121.7, -31.8],
        [123.0, -30.4]
    ], 'water', 'redstone')
];

const redstoneGridVerticals = Array.from({ length: 17 }, (_, index) => 94 + index * 4.5)
    .map((lon, index) => line(`Redstone Grid Meridian ${index + 1}`, [[lon, REDSTONE_BOUNDS.lat.min], [lon, REDSTONE_BOUNDS.lat.max]], index % 4 === 0 ? 'grid-major' : 'grid-minor', 'redstone'));
const redstoneGridHorizontals = Array.from({ length: 12 }, (_, index) => -44 + index * 4)
    .map((lat, index) => line(`Redstone Grid Parallel ${index + 1}`, [[REDSTONE_BOUNDS.lon.min, lat], [REDSTONE_BOUNDS.lon.max, lat]], index % 4 === 0 ? 'grid-major' : 'grid-minor', 'redstone'));

export const REDSTONE_DETAIL_LINES = [];
export const REDSTONE_GRID_LINES = [
    ...redstoneGridVerticals,
    ...redstoneGridHorizontals,
    line('Redstone Equator Reference', [[REDSTONE_BOUNDS.lon.min, 0], [REDSTONE_BOUNDS.lon.max, 0]], 'equator', 'redstone')
];

export const REDSTONE_CITIES = [
    { n: 'Madrid', lon: 97.0, lat: 1.7, p: 820000, cap: 1, wc: 1, r: 2 },
    { n: 'London', lon: 105.4, lat: 0.8, p: 1100000, wc: 1, r: 1 },
    { n: 'Dallas', lon: 119.5, lat: 0.6, p: 740000, wc: 1, r: 2 },
    { n: 'Valencia', lon: 96.2, lat: -4.6, p: 520000, wc: 1, r: 2 },
    { n: 'Rogersville', lon: 103.2, lat: -6.3, p: 410000, r: 3 },
    { n: 'Viroqua', lon: 97.0, lat: -9.6, p: 360000, r: 3 },
    { n: 'Los Santos', lon: 107.0, lat: -11.5, p: 1320000, wc: 1, r: 1 },
    { n: 'Mexicali', lon: 101.2, lat: -13.4, p: 480000, r: 3 },
    { n: 'Adair', lon: 104.0, lat: -16.9, p: 250000, r: 4 },
    { n: 'Booker Island', lon: 113.4, lat: -18.1, p: 56000, wc: 1, r: 5 },
    { n: 'Cherokee Island', lon: 99.8, lat: -20.2, p: 46000, wc: 1, r: 5 },
    { n: 'Lalo', lon: 119.8, lat: -24.4, p: 175000, r: 4 },
    { n: 'Bluefield', lon: 118.0, lat: -28.0, p: 640000, wc: 1, r: 2 },
    { n: 'San Diego', lon: 126.0, lat: -27.2, p: 880000, wc: 1, r: 1 },
    { n: 'San Jose', lon: 121.0, lat: -33.8, p: 570000, r: 2 },
    { n: 'Hazelton', lon: 126.8, lat: -35.2, p: 220000, r: 4 },
    { n: 'Santa Ana', lon: 122.8, lat: -37.8, p: 365000, wc: 1, r: 3 },
    { n: 'Mecklen', lon: 126.5, lat: -39.0, p: 94000, wc: 1, r: 5 },
    { n: 'Santa Barbara', lon: 136.0, lat: -37.3, p: 185000, wc: 1, r: 4 },
    { n: 'Chickasha', lon: 134.2, lat: -39.8, p: 142000, wc: 1, r: 4 },
    { n: 'Lagos Island', lon: 131.2, lat: -11.5, p: 51000, wc: 1, r: 5 },
    { n: 'Verde Island', lon: 133.6, lat: -9.8, p: 68000, wc: 1, r: 5 },
    { n: 'Sao Paulo Island', lon: 140.7, lat: -9.9, p: 76000, wc: 1, r: 5 },
    { n: 'Riverland', lon: 141.0, lat: -12.9, p: 260000, wc: 1, r: 3 },
    { n: 'Orlando', lon: 153.0, lat: -29.6, p: 610000, wc: 1, r: 2 },
    { n: 'Norfolk', lon: 160.0, lat: -29.0, p: 720000, wc: 1, r: 2 },
    { n: 'Talbot', lon: 165.2, lat: -32.2, p: 330000, r: 3 },
    { n: 'Birmingham', lon: 156.0, lat: -34.2, p: 980000, cap: 1, r: 1 },
    { n: 'Savannah', lon: 162.6, lat: -36.6, p: 590000, wc: 1, r: 2 },
    { n: 'Portland', lon: 167.0, lat: -38.5, p: 460000, wc: 1, r: 3 },
    { n: 'Vancouver', lon: 169.2, lat: -41.4, p: 310000, wc: 1, r: 3 },
    { n: 'Albany', lon: 160.4, lat: -39.2, p: 245000, wc: 1, r: 4 },
    { n: 'Cleveland', lon: 152.2, lat: -40.8, p: 390000, wc: 1, r: 3 }
];

export const CUSTOM_MAP_CITIES = [...FICTIONIA_CITIES, ...REDSTONE_CITIES];

const CUSTOM_MAP_DEFINITIONS = {
    [FICTIONIA_BASIN]: {
        key: 'fictionia',
        bounds: FICTIONIA_BOUNDS,
        center: FICTIONIA_CENTER,
        landFeatures: FICTIONIA_LAND_FEATURES,
        waterFeatures: FICTIONIA_WATER_FEATURES,
        detailLines: FICTIONIA_COUNTY_LINES,
        credit: FICTIONIA_CREDIT,
        terrain: false,
        grid: false
    },
    [FICTIONIA2_BASIN]: {
        key: 'fictionia',
        bounds: FICTIONIA_BOUNDS,
        center: FICTIONIA_CENTER,
        landFeatures: FICTIONIA_LAND_FEATURES,
        waterFeatures: FICTIONIA_WATER_FEATURES,
        detailLines: FICTIONIA_COUNTY_LINES,
        credit: FICTIONIA2_CREDIT,
        terrain: true,
        grid: false
    },
    [REDSTONE_BASIN]: {
        key: 'redstone',
        bounds: REDSTONE_BOUNDS,
        center: REDSTONE_CENTER,
        landFeatures: REDSTONE_LAND_FEATURES,
        waterFeatures: REDSTONE_WATER_FEATURES,
        detailLines: REDSTONE_DETAIL_LINES,
        credit: REDSTONE_CREDIT,
        terrain: true,
        grid: false
    },
    [REDSTONE_GRID_BASIN]: {
        key: 'redstone',
        bounds: REDSTONE_BOUNDS,
        center: REDSTONE_CENTER,
        landFeatures: REDSTONE_LAND_FEATURES,
        waterFeatures: REDSTONE_WATER_FEATURES,
        detailLines: REDSTONE_GRID_LINES,
        credit: REDSTONE_GRID_CREDIT,
        terrain: true,
        grid: true
    }
};

function isInExpandedBounds(lon, lat, bounds = FICTIONIA_BOUNDS, pad = 0) {
    return lon >= bounds.lon.min - pad
        && lon <= bounds.lon.max + pad
        && lat >= bounds.lat.min - pad
        && lat <= bounds.lat.max + pad;
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

function isPointInCustomMapLand(definition, lon, lat) {
    if (!definition) return false;
    if (definition.waterFeatures.some(item => item.geometry.coordinates.some(ring => pointInRing(lon, lat, ring)))) {
        return false;
    }
    return definition.landFeatures.some(item => item.geometry.coordinates.some(ring => pointInRing(lon, lat, ring)));
}

export function getCustomMapDefinition(basin) {
    return CUSTOM_MAP_DEFINITIONS[basin] || null;
}

export function getCustomMapCenter(basin) {
    return getCustomMapDefinition(basin)?.center || null;
}

export function getCustomMapBounds(basin) {
    return getCustomMapDefinition(basin)?.bounds || null;
}

export function getCustomMapRenderWindow(basin) {
    const definition = getCustomMapDefinition(basin);
    if (!definition) return null;
    return {
        lon: (definition.bounds.lon.min + definition.bounds.lon.max) / 2,
        lat: (definition.bounds.lat.min + definition.bounds.lat.max) / 2,
        lonSpan: (definition.bounds.lon.max - definition.bounds.lon.min) + 12,
        latSpan: (definition.bounds.lat.max - definition.bounds.lat.min) + 12,
        customOnly: true,
        customMap: definition.key
    };
}

export function isCustomMapBasin(basin) {
    return !!getCustomMapDefinition(basin);
}

export function isCustomMapTerrainBasin(basin) {
    return !!getCustomMapDefinition(basin)?.terrain;
}

export function isCustomMapGridBasin(basin) {
    return !!getCustomMapDefinition(basin)?.grid;
}

export function isCustomMapFeature(feature) {
    return !!feature?.properties?.customMapFeature || !!feature?.properties?.fictionia;
}

export function getCustomMapCredit(basin) {
    return getCustomMapDefinition(basin)?.credit || '';
}

export function getCustomMapDetailLines(basin) {
    return getCustomMapDefinition(basin)?.detailLines || [];
}

export function getCustomMapWaterFeatures(basin) {
    return getCustomMapDefinition(basin)?.waterFeatures || [];
}

export function getCustomMapLandStatus(basin, lon, lat, nearThresholdDeg = 0.2) {
    const definition = getCustomMapDefinition(basin);
    if (!definition || !Number.isFinite(lon) || !Number.isFinite(lat) || !isInExpandedBounds(lon, lat, definition.bounds, nearThresholdDeg)) {
        return { isLand: false, isNearLand: false, inCustomBounds: false };
    }

    const isLand = isPointInCustomMapLand(definition, lon, lat);
    if (isLand || nearThresholdDeg <= 0) {
        return { isLand, isNearLand: isLand, inCustomBounds: true };
    }

    const samples = 12;
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const sampleLon = lon + Math.cos(angle) * nearThresholdDeg;
        const sampleLat = lat + Math.sin(angle) * nearThresholdDeg;
        if (isPointInCustomMapLand(definition, sampleLon, sampleLat)) {
            return { isLand: false, isNearLand: true, inCustomBounds: true };
        }
    }

    return { isLand: false, isNearLand: false, inCustomBounds: true };
}

export function getFictioniaLandStatus(lon, lat, nearThresholdDeg = 0.2) {
    return getCustomMapLandStatus(FICTIONIA_BASIN, lon, lat, nearThresholdDeg);
}

export function addCustomMapsToWorld(world) {
    if (!world || !Array.isArray(world.features)) return world;
    if (world.features.some(item => isCustomMapFeature(item))) return world;
    return {
        ...world,
        features: [
            ...world.features,
            ...FICTIONIA_LAND_FEATURES,
            ...REDSTONE_LAND_FEATURES
        ]
    };
}

export function addFictioniaToWorld(world) {
    return addCustomMapsToWorld(world);
}

export function isFictioniaBasin(basin) {
    return FICTIONIA_BASINS.includes(basin);
}

export function isFictioniaTerrainBasin(basin) {
    return basin === FICTIONIA2_BASIN;
}

export function getFictioniaCredit(basin) {
    return isFictioniaTerrainBasin(basin) ? FICTIONIA2_CREDIT : FICTIONIA_CREDIT;
}
