/**
 * main.js
 * 应用程序的入口点。负责状态管理、事件处理和协调其他模块。
 */

// 从各模块导入函数
import { getCategory, knotsToKph, knotsToMph, windToPressure, directionToCompass, getSST, calculateDistance, NAME_LISTS, getPressureAt } from './utils.js';
import { RadarRenderer, calculateRadarDbz, getShaderWindVector } from './radar-system.js';
import { DopplerRenderer } from './radar-doppler.js';
// [新增] 导入卫星云图模块
import { initSatelliteView, updateSatelliteView, resetSatelliteParams, setSatelliteGrayscale, getSatelliteSnapshot } from './satellite-view.js';
import { initTerrainSystem, getElevationAt, getLandStatus, setCustomBasinTerrainActive } from './terrain-data.js';
import { initializeCyclone, initializePressureSystems, updatePressureSystems, updateFrontalZone, updateCycloneState, getWindVectorAt } from './cyclone-model.js';
import { generatePathForecasts } from './forecast-models.js';
// [修改] 引入新的历史强度图绘制函数
import { drawMap, drawFinalPath, drawHistoricalIntensityChart, drawHumidityField, calculateBackgroundHumidity, calculateTotalHumidity, drawAllHistoryTracks, renderJTWCStyle, renderProbabilitiesStyle, renderSpaghettiStyle, renderModelFieldStyle, drawStationGraph, renderPhaseSpace, startNewsAnimation, renderStationSynopticChart } from './visualization.js';
import { buildWarningAdvisory, createImpactState, formatDamage, formatRain, formatSurge, updateImpactState } from './impact-system.js';
import { buildInvestDisplayId, buildInvestId, classifyInvestChance } from './invest-system.js';
import { estimateRainAtPoint, estimateRainEnhancedSurge, getPagasaName, pointInPAR } from './environment-model.js';
import { playClick, playToggleOn, playToggleOff, playStart, playError, playAlert, playUpgradeSound, playCat5Sound, toggleSFX } from './audio.js';
import { addCustomMapsToWorld, getCustomMapCenter, isCustomMapBasin } from './fictionia-map.js';

const checkLandWrapper = (lon, lat) => {
    const status = getLandStatus(lon, lat);
    return status.isLand; 
};

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM 元素与全局状态 ---
    const generateButton = document.getElementById('generateButton');
    const pauseButton = document.getElementById('pauseButton');
    const catButton = document.getElementById('catButton');
    const newsModal = document.getElementById('newsModal');
    const closeNewsModal = document.getElementById('closeNewsModal');
    const newsCanvas = document.getElementById('newsCanvas');
    let stopNewsAnimation = null;
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    const gameIntroOverlay = document.getElementById('gameIntroOverlay');
    const introScene = document.getElementById('introScene');
    const mainMenuScene = document.getElementById('mainMenuScene');
    const introContinueButton = document.getElementById('introContinueButton');
    const introSkipButton = document.getElementById('introSkipButton');
    const gameMenuButton = document.getElementById('gameMenuButton');
    const menuCloseButton = document.getElementById('menuCloseButton');
    const menuStartButton = document.getElementById('menuStartButton');
    const menuResumeButton = document.getElementById('menuResumeButton');
    const menuMultiplayerButton = document.getElementById('menuMultiplayerButton');
    const menuSettingsButton = document.getElementById('menuSettingsButton');
    const menuHelpButton = document.getElementById('menuHelpButton');
    const menuLofiButton = document.getElementById('menuLofiButton');
    const menuLofiAudio = document.getElementById('menuLofiAudio');
    const menuLofiTitle = document.getElementById('menuLofiTitle');
    const menuLofiStationLabel = document.getElementById('menuLofiStationLabel');
    const menuLofiStatus = document.getElementById('menuLofiStatus');
    const menuBasinSelector = document.getElementById('menuBasinSelector');
    const menuMonthSelector = document.getElementById('menuMonthSelector');
    const menuYearSelector = document.getElementById('menuYearSelector');
    const menuStatusText = document.getElementById('menuStatusText');
    const menuFeedbackBugButton = document.getElementById('menuFeedbackBugButton');
    const menuFeedbackSuggestionButton = document.getElementById('menuFeedbackSuggestionButton');
    const menuFeedbackTitle = document.getElementById('menuFeedbackTitle');
    const menuFeedbackDetails = document.getElementById('menuFeedbackDetails');
    const menuFeedbackSendButton = document.getElementById('menuFeedbackSendButton');
    const menuFeedbackStatus = document.getElementById('menuFeedbackStatus');
    const sfxButton = document.getElementById('sfxButton');
    const sfxIcon = sfxButton.querySelector('i');
    const multiplayerButton = document.getElementById('multiplayerButton');
    const multiplayerPanel = document.getElementById('multiplayerPanel');
    const mpCloseButton = document.getElementById('mpCloseButton');
    const mpStatusText = document.getElementById('mpStatusText');
    const mpNameInput = document.getElementById('mpNameInput');
    const mpHostInput = document.getElementById('mpHostInput');
    const mpPortInput = document.getElementById('mpPortInput');
    const mpHostButton = document.getElementById('mpHostButton');
    const mpConnectButton = document.getElementById('mpConnectButton');
    const mpDisconnectButton = document.getElementById('mpDisconnectButton');
    const mpRoomAddress = document.getElementById('mpRoomAddress');
    const mpPeerCount = document.getElementById('mpPeerCount');
    const mpRemoteAge = document.getElementById('mpRemoteAge');
    const mpRemoteSummary = document.getElementById('mpRemoteSummary');
    const mpChatLog = document.getElementById('mpChatLog');
    const mpChatInput = document.getElementById('mpChatInput');
    const mpSendButton = document.getElementById('mpSendButton');
    const irBwCheckbox = document.getElementById('irBwCheckbox');
    const satelliteInsetCheckbox = document.getElementById('satelliteInsetCheckbox');
    const customNameListInput = document.getElementById('customNameListInput');
    const saveNameListButton = document.getElementById('saveNameListButton');
    const resetNameListButton = document.getElementById('resetNameListButton');
    const nameListBasinLabel = document.getElementById('nameListBasinLabel');
    const nameListStatus = document.getElementById('nameListStatus');
    const basinSelector = document.getElementById('basinSelector');
    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');
    const leftContent = document.getElementById('left-hud-content');
    let selectedHistoryPointIndex = -1; // 记录当前选中的历史点
    const generateJTWCButton = document.getElementById('generateJTWCButton');
    const jtwcModal = document.getElementById('jtwcModal');
    const jtwcOutput = document.getElementById('jtwcOutput');
    const closeJtwcModal = document.getElementById('closeJtwcModal');
    const saveJtwcImage = document.getElementById('saveJtwcImage');
    let isLeftPanelCollapsed = false;
    let chartMode = 'kt';
    const tabKt = document.getElementById('tab-kt');
    const tabHpa = document.getElementById('tab-hpa');
    const togglePressureButton = document.getElementById('togglePressureButton');
    const toggleHumidityButton = document.getElementById('toggleHumidityButton');
    const toggleWindFieldButton = document.getElementById('toggleWindFieldButton');
    const toggleSteeringButton = document.getElementById('toggleSteeringButton');
    const toggleWindRadiiButton = document.getElementById('toggleWindRadiiButton');
    const windRadiiLegend = document.getElementById('wind-radii-legend');
    const radarLegend = document.getElementById('radar-legend');
    const dopplerLegend = document.getElementById('doppler-legend');
    const togglePathButton = document.getElementById('togglePathButton');
    const copyTrackButton = document.getElementById('copy-track-button');
    const downloadTrackButton = document.getElementById('download-track-button');
    const historyButton = document.getElementById('toggleHistoryButton'); 
    const historyModal = document.getElementById('historyModal');
    const historyHeader = historyModal.querySelector('.border-b');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const historyList = document.getElementById('historyList');
    const saveGameButton = document.getElementById('saveGameButton');
    const loadGameButton = document.getElementById('loadGameButton');
    const saveModal = document.getElementById('saveModal');
    const closeSaveModal = document.getElementById('closeSaveModal');
    const saveSlotList = document.getElementById('saveSlotList');
    const saveCurrentGameButton = document.getElementById('saveCurrentGameButton');
    const importSaveButton = document.getElementById('importSaveButton');
    const refreshSaveListButton = document.getElementById('refreshSaveListButton');
    const saveImportInput = document.getElementById('saveImportInput');
    const bestTrackContainer = document.getElementById('best-track-container');
    const bestTrackData = document.getElementById('best-track-data');
    const historyBestTrackContainer = document.getElementById('history-best-track-container');
    const historyBestTrackData = document.getElementById('history-best-track-data');
    const downloadHistoryTrackButton = document.getElementById('downloadHistoryTrackButton');
    const damageCounter = document.getElementById('damageCounter');
    const deathCounter = document.getElementById('deathCounter');
    const rainRateCounter = document.getElementById('rainRateCounter');
    const stormRainCounter = document.getElementById('stormRainCounter');
    const cityRainCounter = document.getElementById('cityRainCounter');
    const surgeCounter = document.getElementById('surgeCounter');
    const ohcCounter = document.getElementById('ohcCounter');
    const parStatus = document.getElementById('parStatus');
    const sttCounter = document.getElementById('sttCounter');
    const sttDelta = document.getElementById('sttDelta');
    const shearCounter = document.getElementById('shearCounter');
    const shearMeta = document.getElementById('shearMeta');
    const eyeStatusCounter = document.getElementById('eyeStatusCounter');
    const eyeMaturityCounter = document.getElementById('eyeMaturityCounter');
    const bandingStatusCounter = document.getElementById('bandingStatusCounter');
    const bandingMaturityCounter = document.getElementById('bandingMaturityCounter');
    const eyewallSpinCounter = document.getElementById('eyewallSpinCounter');
    const eyewallPeriodCounter = document.getElementById('eyewallPeriodCounter');
    const mesovortexCounter = document.getElementById('mesovortexCounter');
    const coreStageCounter = document.getElementById('coreStageCounter');
    const hotTowerCounter = document.getElementById('hotTowerCounter');
    const moatCounter = document.getElementById('moatCounter');
    const warningList = document.getElementById('warning-list');
    const warningCycle = document.getElementById('warning-cycle');
    const investIdCounter = document.getElementById('investIdCounter');
    const investChance48Counter = document.getElementById('investChance48Counter');
    const investChance7Counter = document.getElementById('investChance7Counter');
    const investOrgCounter = document.getElementById('investOrgCounter');
    const investCategoryCounter = document.getElementById('investCategoryCounter');
    const investOutlookSwatch = document.getElementById('investOutlookSwatch');
    const investOutlookBar = document.getElementById('investOutlookBar');
    const investStructureCounter = document.getElementById('investStructureCounter');
    const investSatelliteCounter = document.getElementById('investSatelliteCounter');
    const mapContainer = d3.select("#map-container");
    const chartContainer = d3.select("#intensity-chart-container");
    const forecastContainer = document.getElementById('intensity-chart-section'); // [新增] 获取容器元素
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // [新增] 设置菜单 DOM 元素
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    const musicButton = document.getElementById('musicButton');
    const musicMenu = document.getElementById('musicMenu');
    const musicListContainer = document.getElementById('musicListContainer');
    const bgmVolumeSlider = document.getElementById('bgmVolume');
    const bgmAudio = document.getElementById('bgmAudio');
    const globalTempSlider = document.getElementById('globalTempSlider');
    const globalTempValue = document.getElementById('globalTempValue');
    const globalShearSlider = document.getElementById('globalShearSlider');
    const globalShearValue = document.getElementById('globalShearValue');
    const siteNameInput = document.getElementById('siteNameInput');
    const siteLonInput = document.getElementById('siteLonInput');
    const siteLatInput = document.getElementById('siteLatInput');
    const customLonInput = document.getElementById('customLonInput');
    const customLatInput = document.getElementById('customLatInput');
    const showPathPointsCheckbox = document.getElementById('showPathPointsCheckbox');
    const savedSiteName = localStorage.getItem('tcs_site_name');
    const savedSiteLon = localStorage.getItem('tcs_site_lon');
    const savedSiteLat = localStorage.getItem('tcs_site_lat');
    const savedSimYear = localStorage.getItem('tcs_sim_year');
    const savedMpName = localStorage.getItem('tcs_mp_name');
    const savedMpHost = localStorage.getItem('tcs_mp_host');
    const savedMpPort = localStorage.getItem('tcs_mp_port');
    const savedSatelliteInset = localStorage.getItem('tcs_satellite_inset');
    const currentCalendarYear = new Date().getFullYear();
    const SIM_YEAR_MIN = 1851;
    const SIM_YEAR_MAX = 2200;
    const GITHUB_ISSUE_URL = 'https://github.com/HollowXtra/Advanced-Storm-Inc/issues/new';
    const stats = new Stats();
    const musicTracks = [
        "WPAC - Barotropic.m4a",
        "NATL - Static.m4a",
        "EPAC - Void.m4a",
        "NIO - MayDay.m4a",
        "SIO - Westerlies.m4a",
        "SATL - Serendipity Land.m4a",
    ];
    const menuLofiStations = [
        { title: 'Storm Radio - Study Loop', src: 'Freshly Squeezed - Graham Donald Harry Preskett.m4a', label: 'Local Mix' },
        { title: 'Storm Radio - Barotropic', src: 'WPAC - Barotropic.m4a', label: 'Warm Pool' },
        { title: 'Storm Radio - Static', src: 'NATL - Static.m4a', label: 'Night Desk' },
        { title: 'Storm Radio - Void', src: 'EPAC - Void.m4a', label: 'Quiet Radar' },
        { title: 'Storm Radio - Westerlies', src: 'SIO - Westerlies.m4a', label: 'Southern Loop' }
    ];
    let currentTrackIndex = -1;
    let currentMenuLofiIndex = -1;
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.position = 'absolute'; // 样式调整以适应你的布局
    stats.dom.style.top = '0px';
    stats.dom.style.right = '0px'; 
    //document.body.appendChild(stats.dom);
    if(bgmAudio) bgmAudio.volume = 0.4;
    let radarRenderer = null;
    let dopplerRenderer = null; // [新增] 多普勒渲染器实例
    let radarOverlayCtx = null; // 用于画圆圈和线的2D Canvas
    let radarOverlayCanvas = null;
    window.stormIncDebug = {
        getSnapshot: () => ({
            cycloneStatus: state.cyclone?.status || '',
            cycloneAge: Number(state.cyclone?.age || 0),
            cycloneIntensity: Number(state.cyclone?.intensity || 0),
            cyclonePeakIntensity: Math.max(
                Number(state.cyclone?.intensity || 0),
                ...((state.cyclone?.track || []).map(point => Number(point?.[2] || 0)))
            ),
            cycloneLat: Number.isFinite(state.cyclone?.lat) ? state.cyclone.lat : null,
            cycloneLon: Number.isFinite(state.cyclone?.lon) ? state.cyclone.lon : null,
            cycloneIsLand: !!state.cyclone?.isLand,
            cycloneSstC: Number(state.cyclone?.sstC || 0),
            cycloneOhcKjCm2: Number(state.cyclone?.ohcKjCm2 || 0),
            cycloneDepth26M: Number(state.cyclone?.depth26M || 0),
            cycloneWaterFuelIndex: Number(state.cyclone?.waterFuelIndex || 0),
            cycloneWaterFuelBoostKt: Number(state.cyclone?.waterFuelBoostKt || 0),
            cycloneMaxWaterFuelBoostKt: Number(state.cyclone?.maxWaterFuelBoostKt || 0),
            cycloneShearKt: Number(state.cyclone?.totalShearKt || 0),
            cycloneEffectiveShearKt: Number(state.cyclone?.effectiveShearKt || 0),
            cycloneShearClass: state.cyclone?.shearClass || '',
            cycloneStt: state.cyclone?.shortTermTrendLabel || '',
            simulationRunning: !!state.simulationInterval,
            visibleLandCount: document.querySelectorAll('.land').length
        })
    };
    const savedIrBw = localStorage.getItem('tcs_ir_bw') === 'true';
    if (irBwCheckbox) {
        irBwCheckbox.checked = savedIrBw;
        setSatelliteGrayscale(savedIrBw);
    }
    if (satelliteInsetCheckbox) {
        satelliteInsetCheckbox.checked = savedSatelliteInset !== 'false';
    }
    if (irBwCheckbox) {
        irBwCheckbox.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            setSatelliteGrayscale(isEnabled);
            if (typeof playClick === 'function') playClick();
            localStorage.setItem('tcs_ir_bw', isEnabled);
        });
    }
    if (satelliteInsetCheckbox) {
        satelliteInsetCheckbox.addEventListener('change', (e) => {
            state.showSatelliteInset = e.target.checked;
            localStorage.setItem('tcs_satellite_inset', String(state.showSatelliteInset));
            syncSatelliteInsetVisibility(state.showSatelliteInset && state.cyclone?.status === 'active');
            if (typeof playClick === 'function') playClick();
        });
    }
    if (historyHeader) {
        // 创建按钮容器以保持布局整洁
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-2 ml-auto mr-4"; // 放在右侧，关闭按钮左边

        const showAllBtn = document.createElement('button');
        showAllBtn.innerHTML = '<i class="fa-solid fa-earth-asia"></i> SHOW ALL';
        showAllBtn.className = "text-[10px] font-bold bg-cyan-900/50 hover:bg-cyan-700 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded transition-colors uppercase tracking-wider";
        
        showAllBtn.addEventListener('click', () => {
            if (state.history.length === 0) {
                    alert("No historical track to display :(");
                    return;
                }
            
                // 1. 关闭模态框
                historyModal.classList.add('hidden');
    
                // 2. 清理界面多余元素
                if (state.simulationInterval) clearInterval(state.simulationInterval);
                state.isPaused = false;
    
                // --- [修复开始] ---
                // 隐藏卫星云图窗口
                document.getElementById('satellite-window').classList.add('hidden');
                // 隐藏下方的“恢复卫星”按钮（如果存在）
                const restoreBtn = document.getElementById('restore-sat-btn');
                if(restoreBtn) restoreBtn.classList.add('hidden');

                // 隐藏整个信息面板容器 (不仅仅是内部文字)
                document.getElementById('info-panel').classList.add('hidden');
    
                // 隐藏其他组件
                document.getElementById('map-info-box').classList.add('hidden');
                document.getElementById('best-track-container').classList.add('hidden');
                forecastContainer.classList.add('hidden');
    
                // --- [修复结束] ---
    
                // 3. 更新状态栏文字 (为了让用户知道怎么退出，我们可以把状态写在顶部，或者让 Reset 按钮生效)
                // 由于 info-panel 隐藏了，原本的 'status' 元素也看不见了。
    
                // 4. 调用批量绘图
                drawAllHistoryTracks(mapSvg, mapProjection, state.history, state.world);
            });

        const closeBtn = document.getElementById('closeHistoryModal');
        historyHeader.insertBefore(showAllBtn, closeBtn);
    }

    // 创建一个独立的渲染循环来更新统计
    function animate() {
        stats.begin();
        // --- [新增/修改] 待机巡航模式 ---
        const hasTrackData = (state.cyclone && state.cyclone.track && state.cyclone.track.length > 1);
        if (state.radarMode || state.dopplerMode) {
                drawRadarScope();
        } else {
            if (radarCanvas && !radarCanvas.classList.contains('hidden')) {
                radarCanvas.classList.add('hidden');
            }
            if (radarOverlayCanvas && !radarOverlayCanvas.classList.contains('hidden')) {
                radarOverlayCanvas.classList.add('hidden');
                // 必须检查 ctx 是否存在
                if (radarOverlayCtx) {
                    radarOverlayCtx.clearRect(0, 0, radarOverlayCanvas.width, radarOverlayCanvas.height);
                }
            }
        }
        stats.end();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function normalizeSimulationYear(value) {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed)) return currentCalendarYear;
        return Math.min(SIM_YEAR_MAX, Math.max(SIM_YEAR_MIN, parsed));
    }

    function getActiveSimulationYear(cyclone = state.cyclone) {
        return normalizeSimulationYear(cyclone?.currentYear ?? state.currentYear ?? currentCalendarYear);
    }

    function formatLatitude(lat) {
        const value = Number(lat) || 0;
        return `${Math.abs(value).toFixed(1)}\u00B0${value < 0 ? 'S' : 'N'}`;
    }

    function formatLongitude(lon) {
        const normalized = (((Number(lon) || 0) + 540) % 360) - 180;
        return `${Math.abs(normalized).toFixed(1)}\u00B0${normalized < 0 ? 'W' : 'E'}`;
    }

    const CUSTOM_NAME_LISTS_KEY = 'tcs_custom_name_lists_v1';
    const PLAYER_ANALYSIS_KEY = 'tcs_player_analysis_v1';
    const parseNameListText = (text) => {
        const seen = new Set();
        return String(text || '')
            .split(/[\n,;]+/)
            .map(name => name.trim())
            .filter(name => name.length >= 2 && name.length <= 24)
            .filter(name => {
                const key = name.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 120);
    };
    const loadJsonMap = (key) => {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '{}');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (_error) {
            return {};
        }
    };
    const saveJsonMap = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value || {}));
    };
    const savedCustomNameLists = loadJsonMap(CUSTOM_NAME_LISTS_KEY);
    const savedPlayerAnalyses = loadJsonMap(PLAYER_ANALYSIS_KEY);

    let state = {
        simulationInterval: null,
        isPaused: false,
        showIntensityChart: true,
        hasAlerted: false,
        hasTriggeredCat1News: false,
        hasTriggeredCat5News: false,
        simulationSpeed: 200,
        cyclone: {},
        selectedHistoryCyclone: null,
        pressureSystems: { upper: [], lower: [] },
        pressureHistory: [],
        frontalZone: {},
        pathForecasts: [],
        currentMonth: 7,
        currentYear: normalizeSimulationYear(savedSimYear || currentCalendarYear),
        world: null,
        showPressureField: false,
        showHumidityField: false,
        showPathForecast: false,
        showWindRadii: false,
        GlobalShear: 100,
        GlobalTemp: 289, // [新增] 全局温度状态，默认 289K (16°C)
        siteName: savedSiteName || '',
        siteLon: savedSiteLon ? parseFloat(savedSiteLon) : null,
        siteLat: savedSiteLat ? parseFloat(savedSiteLat) : null,
        radarMode: false,
        dopplerMode: false,
        customLon: null,
        customLat: null,
        showPathPoints: false,
        showSatelliteInset: savedSatelliteInset !== 'false',
        showWindField: false,
        showSteeringCurrents: false,
        history: [],
        simulationCount: 1,
        nextNameIndex: 0,
        customNameLists: savedCustomNameLists,
        playerAnalyses: savedPlayerAnalyses,
        nextPagasaNameIndex: 0,
        selectedHistoryTrackData: '',
        lastFinalStats: null,
        currentSiteData: null,
        siteHistory: [],
        impactState: createImpactState(),
        warningAdvisory: { active: [], signature: '', issuedHour: null },
        lastWarningBannerSignature: '',
        lastParBannerSignature: '',
        lastInvestBannerSignature: '',
        nextInvestNumbers: {},
        multiplayer: {
            mode: 'offline',
            connected: false,
            address: '',
            port: parseInt(savedMpPort || '37219', 10),
            peers: [],
            remoteCyclone: null,
            lastSnapshotKey: ''
        },
        isSiteSelected: false,
        idleRotation: Math.random() * 50
    };

    let mapSvg, mapProjection;

    function getActiveNameList(basin = basinSelector?.value || 'WPAC') {
        const custom = state.customNameLists?.[basin];
        return Array.isArray(custom) && custom.length ? custom : (NAME_LISTS[basin] || NAME_LISTS.WPAC);
    }

    function getActiveNameLists() {
        const merged = { ...NAME_LISTS };
        Object.entries(state.customNameLists || {}).forEach(([basin, names]) => {
            if (Array.isArray(names) && names.length) merged[basin] = names;
        });
        return merged;
    }

    function syncCustomNameListEditor() {
        const basin = basinSelector?.value || 'WPAC';
        const custom = state.customNameLists?.[basin];
        if (nameListBasinLabel) nameListBasinLabel.textContent = basin;
        if (customNameListInput) {
            customNameListInput.value = Array.isArray(custom) ? custom.join('\n') : '';
            customNameListInput.placeholder = `Default: ${(NAME_LISTS[basin] || NAME_LISTS.WPAC).slice(0, 6).join(', ')}...`;
        }
        if (nameListStatus) {
            const active = Array.isArray(custom) && custom.length;
            nameListStatus.textContent = active ? `${custom.length} custom names active` : 'Default basin list active';
            nameListStatus.className = `mt-2 text-[9px] font-mono uppercase tracking-wider ${active ? 'text-cyan-300' : 'text-slate-500'}`;
        }
    }

    function syncSatelliteInsetVisibility(active = state.showSatelliteInset && state.cyclone?.status === 'active') {
        const satWindow = document.getElementById('satellite-window');
        const restoreBtn = document.getElementById('restore-sat-btn');
        if (!satWindow || !restoreBtn) return;

        const shouldShow = !!active;
        satWindow.classList.toggle('hidden', !shouldShow);
        restoreBtn.classList.toggle('hidden', shouldShow || !state.cyclone?.status || state.cyclone.status !== 'active');
        if (satelliteInsetCheckbox) {
            satelliteInsetCheckbox.checked = !!state.showSatelliteInset;
        }
    }

    window.collapseSat = function() {
        state.showSatelliteInset = false;
        localStorage.setItem('tcs_satellite_inset', 'false');
        syncSatelliteInsetVisibility(false);
    };

    window.expandSat = function() {
        state.showSatelliteInset = true;
        localStorage.setItem('tcs_satellite_inset', 'true');
        syncSatelliteInsetVisibility(state.cyclone?.status === 'active');
    };

    const basinViewCenters = {
        WPAC: { lon: 140, lat: 15 },
        EPAC: { lon: -122, lat: 14 },
        NATL: { lon: -70, lat: 22 },
        MED: { lon: 18, lat: 36 },
        NIO: { lon: 82, lat: 15 },
        SHEM: { lon: 165, lat: -12 },
        SIO: { lon: 78, lat: -13 },
        SATL: { lon: -30, lat: -18 }
    };

    function getBasinViewCenter(basin) {
        return getCustomMapCenter(basin) || basinViewCenters[basin] || basinViewCenters.WPAC;
    }

    function syncFictioniaTerrainMode(basin = basinSelector?.value || state.cyclone?.basin || 'WPAC') {
        setCustomBasinTerrainActive(isCustomMapBasin(basin) ? basin : null);
    }

    function isMobilePerformanceDevice() {
        const narrowViewport = window.matchMedia?.('(max-width: 900px)').matches || false;
        const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches || false;
        return narrowViewport || coarsePointer;
    }

    function getPerformanceProfile() {
        const mobile = isMobilePerformanceDevice();
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
        const heavyOverlayActive = state.showWindField || state.showPressureField || state.showSteeringCurrents;
        const activeStorm = state.cyclone && state.cyclone.status === 'active';
        const activeAge = Number(state.cyclone?.age || 0);

        return {
            mobile,
            reducedMotion,
            pressureGrid: mobile ? 44 : 80,
            windStep: mobile ? 0.9 : 0.4,
            steeringStep: mobile ? Math.max(118, Math.min(150, window.innerWidth / 4.7)) : null,
            showCityLabels: !mobile || !activeStorm || !heavyOverlayActive || activeAge % 6 === 0
        };
    }

    let introMenuTimer = null;
    let menuFeedbackType = 'bug';

    function syncMenuControlsFromMain() {
        if (menuBasinSelector && basinSelector) menuBasinSelector.value = basinSelector.value || 'WPAC';
        if (menuMonthSelector && monthSelector) menuMonthSelector.value = monthSelector.value || '7';
        if (menuYearSelector) {
            menuYearSelector.min = String(SIM_YEAR_MIN);
            menuYearSelector.max = String(SIM_YEAR_MAX);
            menuYearSelector.value = String(getActiveSimulationYear());
        }
    }

    function syncMainControlsFromMenu() {
        if (basinSelector && menuBasinSelector && !basinSelector.disabled) {
            basinSelector.value = menuBasinSelector.value;
        }
        if (monthSelector && menuMonthSelector && !monthSelector.disabled) {
            monthSelector.value = menuMonthSelector.value;
        }
        if (yearSelector && menuYearSelector && !yearSelector.disabled) {
            state.currentYear = normalizeSimulationYear(menuYearSelector.value || state.currentYear);
            yearSelector.value = String(state.currentYear);
            menuYearSelector.value = String(state.currentYear);
            localStorage.setItem('tcs_sim_year', String(state.currentYear));
        }
        if (!state.simulationInterval) {
            redrawIdleBasinPreview();
        }
    }

    function updateGameMenuState() {
        if (!menuStartButton && !menuStatusText) return;
        const canStart = !!state.world && !generateButton.disabled;
        const activeStorm = state.cyclone?.status === 'active';
        if (menuStartButton) {
            menuStartButton.disabled = !canStart;
            const startLabel = menuStartButton.querySelector('span');
            if (startLabel) {
                startLabel.innerHTML = activeStorm
                    ? '<i class="fa-solid fa-rotate-right mr-3"></i>Restart'
                    : '<i class="fa-solid fa-play mr-3"></i>Play';
            }
        }
        if (menuStatusText) {
            menuStatusText.textContent = canStart ? (activeStorm ? 'Storm active' : 'Ready') : 'Loading';
            menuStatusText.className = `mt-1 text-xs font-mono uppercase tracking-[0.2em] ${canStart ? 'text-emerald-300' : 'text-amber-300'}`;
        }
    }

    function setMenuFeedbackType(type = 'bug') {
        menuFeedbackType = type === 'suggestion' ? 'suggestion' : 'bug';
        const activeClass = menuFeedbackType === 'bug'
            ? 'border-red-300/50 bg-red-950/30 text-red-100 hover:border-red-200'
            : 'border-emerald-300/50 bg-emerald-950/30 text-emerald-100 hover:border-emerald-200';
        const inactiveClass = 'border-white/12 bg-black/30 text-slate-200 hover:border-cyan-300/60 hover:text-cyan-100';
        if (menuFeedbackBugButton) {
            menuFeedbackBugButton.className = `menu-button rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${menuFeedbackType === 'bug' ? activeClass : inactiveClass}`;
        }
        if (menuFeedbackSuggestionButton) {
            menuFeedbackSuggestionButton.className = `menu-button rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${menuFeedbackType === 'suggestion' ? activeClass : inactiveClass}`;
        }
        if (menuFeedbackTitle) {
            menuFeedbackTitle.placeholder = menuFeedbackType === 'bug' ? 'BUG TITLE...' : 'SUGGESTION TITLE...';
        }
        if (menuFeedbackDetails) {
            menuFeedbackDetails.placeholder = menuFeedbackType === 'bug'
                ? 'WHAT BROKE, WHAT WERE YOU DOING, AND WHAT SHOULD HAVE HAPPENED...'
                : 'WHAT SHOULD BE ADDED OR CHANGED...';
        }
        if (menuFeedbackStatus) {
            menuFeedbackStatus.textContent = menuFeedbackType === 'bug' ? 'Bug report' : 'Suggestion';
            menuFeedbackStatus.className = `mt-1 text-[10px] font-mono uppercase tracking-[0.18em] ${menuFeedbackType === 'bug' ? 'text-red-200' : 'text-emerald-200'}`;
        }
    }

    function buildMenuFeedbackBody(title, details) {
        const cyclone = state.cyclone || {};
        const structure = cyclone.stormStructure || {};
        const activeStorm = cyclone.status === 'active';
        const stormLine = activeStorm
            ? `${cyclone.name || cyclone.investDisplayId || cyclone.investId || 'Unnamed'} / ${Math.round(Number(cyclone.intensity || 0))} kt / ${Math.round(Number(cyclone.pressure || 0)) || '--'} hPa`
            : 'No active storm';
        const positionLine = activeStorm
            ? `${formatLatitude(Number(cyclone.lat || 0))}, ${formatLongitude(Number(cyclone.lon || 0))}`
            : '--';
        const issueType = menuFeedbackType === 'bug' ? 'Bug report' : 'Suggestion';
        const cleanDetails = details.trim() || '_No details entered._';
        return [
            `### ${issueType}`,
            cleanDetails,
            '',
            '### Game Context',
            `- Build: Alpha 1.0.3.17`,
            `- Page: ${window.location.href}`,
            `- Basin: ${basinSelector?.value || cyclone.basin || 'WPAC'}`,
            `- Month: ${monthSelector?.value || state.currentMonth || '--'}`,
            `- Year: ${getActiveSimulationYear(cyclone)}`,
            `- Storm: ${stormLine}`,
            `- Position: ${positionLine}`,
            `- Sim hour: T+${Math.round(Number(cyclone.age || 0))}h`,
            `- Core stage: ${structure.coreStageStatus || structure.eyeStatus || 'N/A'}`,
            `- Browser: ${navigator.userAgent}`,
            '',
            '### Player Title',
            title.trim()
        ].join('\n');
    }

    function sendMenuFeedbackToGitHub() {
        const title = (menuFeedbackTitle?.value || '').trim();
        const details = (menuFeedbackDetails?.value || '').trim();
        if (!title) {
            if (menuFeedbackStatus) {
                menuFeedbackStatus.textContent = 'Title required';
                menuFeedbackStatus.className = 'mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-amber-200';
            }
            menuFeedbackTitle?.focus();
            playError();
            return;
        }
        const prefix = menuFeedbackType === 'bug' ? '[Bug]' : '[Suggestion]';
        const labels = menuFeedbackType === 'bug' ? 'bug' : 'enhancement';
        const params = new URLSearchParams({
            title: `${prefix} ${title}`,
            body: buildMenuFeedbackBody(title, details),
            labels
        });
        const issueUrl = `${GITHUB_ISSUE_URL}?${params.toString()}`;
        const opened = window.open(issueUrl, '_blank');
        if (opened) {
            opened.opener = null;
        } else {
            window.location.href = issueUrl;
        }
        if (menuFeedbackStatus) {
            menuFeedbackStatus.textContent = opened ? 'GitHub draft opened' : 'Redirecting to GitHub';
            menuFeedbackStatus.className = 'mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200';
        }
        playClick();
    }

    function updateMenuLofiStatus(text) {
        if (menuLofiStatus) menuLofiStatus.textContent = text;
    }

    function shuffleMenuLofi(forceNew = false) {
        if (!menuLofiAudio || menuLofiStations.length === 0) return;
        let nextIndex = Math.floor(Math.random() * menuLofiStations.length);
        if (forceNew && menuLofiStations.length > 1 && nextIndex === currentMenuLofiIndex) {
            nextIndex = (nextIndex + 1) % menuLofiStations.length;
        }

        currentMenuLofiIndex = nextIndex;
        const station = menuLofiStations[nextIndex];
        menuLofiAudio.loop = true;
        menuLofiAudio.src = station.src;
        menuLofiAudio.volume = 0.36;
        menuLofiAudio.load();
        if (menuLofiTitle) menuLofiTitle.textContent = station.title;
        if (menuLofiStationLabel) menuLofiStationLabel.textContent = station.label || 'Storm Radio';
        updateMenuLofiStatus(forceNew ? 'Loading' : 'Ready');
        if (forceNew) {
            menuLofiAudio.play()
                .then(() => updateMenuLofiStatus('Playing'))
                .catch(() => updateMenuLofiStatus('Ready'));
        }
    }

    function showMainMenu() {
        if (!gameIntroOverlay || !mainMenuScene || !introScene) return;
        clearTimeout(introMenuTimer);
        syncMenuControlsFromMain();
        updateGameMenuState();
        setMenuFeedbackType(menuFeedbackType);
        if (currentMenuLofiIndex < 0) shuffleMenuLofi(false);
        gameIntroOverlay.classList.remove('game-shell-hidden');
        introScene.classList.add('hidden');
        mainMenuScene.classList.remove('hidden');
        mainMenuScene.classList.add('flex');
        localStorage.setItem('tcs_intro_seen', 'true');
    }

    function hideGameMenu() {
        if (!gameIntroOverlay) return;
        gameIntroOverlay.classList.add('game-shell-hidden');
        if (menuLofiAudio && !menuLofiAudio.paused) {
            menuLofiAudio.pause();
            updateMenuLofiStatus('Paused');
        }
        clearTimeout(introMenuTimer);
    }

    function showGameIntro() {
        if (!gameIntroOverlay || !introScene || !mainMenuScene) return;
        syncMenuControlsFromMain();
        updateGameMenuState();
        gameIntroOverlay.classList.remove('game-shell-hidden');
        introScene.classList.remove('hidden');
        mainMenuScene.classList.add('hidden');
        mainMenuScene.classList.remove('flex');
        const hasSeenIntro = localStorage.getItem('tcs_intro_seen') === 'true';
        introMenuTimer = setTimeout(showMainMenu, hasSeenIntro ? 1200 : 3200);
    }

    let radarCanvas, radarCtx;
    if (savedSiteName) siteNameInput.value = savedSiteName;
    if (savedSiteLon) siteLonInput.value = savedSiteLon;
    if (savedSiteLat) siteLatInput.value = savedSiteLat;
    if (mpNameInput) mpNameInput.value = savedMpName || `Tracker${Math.floor(Math.random() * 90 + 10)}`;
    if (mpHostInput) mpHostInput.value = savedMpHost || '127.0.0.1';
    if (mpPortInput) mpPortInput.value = String(state.multiplayer.port || 37219);
    if (yearSelector) {
        yearSelector.min = String(SIM_YEAR_MIN);
        yearSelector.max = String(SIM_YEAR_MAX);
        yearSelector.value = String(state.currentYear);
    }
    generateButton.disabled = true;
    // --- 初始化与设置 ---

    function getEnglishCategoryName(knots, isExtra, isSub, basin) {
        if (basin === 'MED') {
            if (isExtra) return "POST-TROPICAL MEDICANE";
            if (isSub) return "SUBTROPICAL MEDICANE";
            if (knots < 34) return "MEDITERRANEAN LOW";
            if (knots < 64) return "MEDICANE";
            return "INTENSE MEDICANE";
        }
        if (isExtra) return "EXTRATROPICAL CYCLONE";
        if (isSub) return "SUBTROPICAL STORM";
        if (knots < 34) return "TROPICAL DEPRESSION";
        if (knots < 64) return "TROPICAL STORM";
        let term = "TYPHOON"; // 默认西太 (WPAC)
    
        // 美洲/大西洋 -> 飓风
        if (['EPAC', 'NATL', 'SATL', 'FICT', 'FICT2'].includes(basin)) {
            term = "HURRICANE";
        } 
        // 印度洋/南半球 -> 气旋
        else if (['SHEM', 'SIO', 'NIO', 'RED', 'REDG'].includes(basin)) {
            term = "CYCLONE";
        }

        // 2. 拼接等级
        if (knots < 83) return `${term} (CAT 1)`;
        if (knots < 96) return `${term} (CAT 2)`;
        if (knots < 113) return `${term} (CAT 3)`;
    
        return `SUPER ${term} (CAT ${knots < 137 ? '4' : '5'})`;
    }

    function getNextInvestNumber(basin = 'WPAC') {
        const key = basin || 'WPAC';
        const next = state.nextInvestNumbers[key] ?? 90;
        state.nextInvestNumbers[key] = next >= 99 ? 90 : next + 1;
        return next;
    }

    function assignInvestDesignation(cyclone, basin = 'WPAC') {
        if (!cyclone) return;
        cyclone.basin = basin;
        if (!cyclone.investNumber) {
            cyclone.investNumber = getNextInvestNumber(basin);
        }
        cyclone.investId = buildInvestId(basin, cyclone.investNumber);
        cyclone.investDisplayId = buildInvestDisplayId(basin, cyclone.investNumber);
        cyclone.investStatus = cyclone.investStatus || 'open';
        cyclone.investOpenedHour = cyclone.investOpenedHour ?? cyclone.age ?? 0;
        cyclone.modelGuidanceAvailable = true;
    }

    function getInvestLabel(cyclone) {
        const displayId = cyclone?.investDisplayId
            || (cyclone?.investNumber ? buildInvestDisplayId(cyclone.basin, cyclone.investNumber) : '')
            || cyclone?.investId
            || '';
        return displayId ? `INVEST ${displayId}` : 'INVEST';
    }

    function getMultiplayerApi() {
        return window.stormIncDesktop?.multiplayer || null;
    }

    function getMultiplayerName() {
        return (mpNameInput?.value || 'Tracker').trim().slice(0, 24) || 'Tracker';
    }

    function getMultiplayerPort() {
        const parsed = parseInt(mpPortInput?.value || '37219', 10);
        return Number.isFinite(parsed) ? Math.min(65535, Math.max(1024, parsed)) : 37219;
    }

    function getMultiplayerRemoteCyclone() {
        return state.multiplayer?.remoteCyclone || null;
    }

    function appendMultiplayerMessage(entry) {
        if (!mpChatLog) return;
        const row = document.createElement('div');
        const time = new Date(entry.time || Date.now());
        const stamp = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

        if (entry.kind === 'chat') {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'text-slate-600';
            timeSpan.textContent = stamp;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-cyan-300 font-bold';
            nameSpan.textContent = ` ${entry.from || 'Player'}: `;
            const textSpan = document.createElement('span');
            textSpan.className = 'text-slate-200';
            textSpan.textContent = entry.text || '';
            row.append(timeSpan, nameSpan, textSpan);
        } else {
            row.className = 'text-slate-500 italic';
            row.textContent = `${stamp} ${entry.text || ''}`;
        }

        mpChatLog.appendChild(row);
        while (mpChatLog.children.length > 80) {
            mpChatLog.removeChild(mpChatLog.firstChild);
        }
        mpChatLog.scrollTop = mpChatLog.scrollHeight;
    }

    function updateMultiplayerPanel() {
        const supported = !!getMultiplayerApi();
        const mp = state.multiplayer;

        if (multiplayerButton) {
            multiplayerButton.classList.toggle('text-cyan-400', supported && mp.connected);
            multiplayerButton.classList.toggle('border-cyan-400/50', supported && mp.connected);
        }

        if (mpStatusText) {
            if (!supported) {
                mpStatusText.textContent = 'Desktop multiplayer unavailable';
                mpStatusText.className = 'text-[9px] font-mono text-red-400 uppercase tracking-widest';
            } else if (mp.mode === 'host') {
                mpStatusText.textContent = `Hosting on port ${mp.port}`;
                mpStatusText.className = 'text-[9px] font-mono text-emerald-300 uppercase tracking-widest';
            } else if (mp.mode === 'client') {
                mpStatusText.textContent = `Joined ${mp.address || 'room'}`;
                mpStatusText.className = 'text-[9px] font-mono text-cyan-300 uppercase tracking-widest';
            } else {
                mpStatusText.textContent = 'Offline';
                mpStatusText.className = 'text-[9px] font-mono text-slate-500 uppercase tracking-widest';
            }
        }

        if (mpPeerCount) {
            const count = mp.mode === 'host' ? mp.peers.length : (mp.connected ? 1 : 0);
            mpPeerCount.textContent = `${count} peer${count === 1 ? '' : 's'}`;
        }

        if (mpRoomAddress) {
            if (mp.mode === 'host') {
                mpRoomAddress.textContent = `Give people this address: ${mp.address || '127.0.0.1'}:${mp.port}`;
            } else if (mp.mode === 'client') {
                mpRoomAddress.textContent = `Connected to ${mp.address || mpHostInput?.value || 'host'}:${mp.port}`;
            } else {
                mpRoomAddress.textContent = supported ? 'Start hosting or join a room.' : 'Use the Windows desktop app for multiplayer.';
            }
        }

        const remote = mp.remoteCyclone;
        if (mpRemoteAge) {
            mpRemoteAge.textContent = remote ? `T+${remote.age || 0}H` : '--';
        }
        if (mpRemoteSummary) {
            if (remote) {
                const name = (remote.displayName || remote.name || remote.basin || 'STORM').toUpperCase();
                const pressure = remote.pressure ? `${remote.pressure} hPa` : '-- hPa';
                mpRemoteSummary.textContent = `${name} ${Math.round(remote.intensity || 0)}KT ${pressure} @ ${Number(remote.lat || 0).toFixed(1)}, ${Number(remote.lon || 0).toFixed(1)}`;
            } else {
                mpRemoteSummary.textContent = mp.mode === 'client' ? 'Waiting for host storm data.' : 'Host a running simulation to sync storm data.';
            }
        }
    }

    function applyMultiplayerStatus(status) {
        if (!status) return;
        state.multiplayer.mode = status.mode || 'offline';
        state.multiplayer.connected = !!status.connected;
        state.multiplayer.address = status.mode === 'host'
            ? `${status.address || '127.0.0.1'}`
            : (status.host || state.multiplayer.address || '');
        state.multiplayer.port = status.port || state.multiplayer.port || 37219;
        state.multiplayer.peers = status.peers || [];
        if (state.multiplayer.mode === 'offline') {
            state.multiplayer.remoteCyclone = null;
            requestRedraw();
        }
        updateMultiplayerPanel();
    }

    function buildMultiplayerSnapshot() {
        if (!state.cyclone || !state.cyclone.track || state.cyclone.track.length === 0) return null;
        const basin = state.cyclone.basin || basinSelector.value || 'WPAC';
        const cycloneNum = String(state.simulationCount).padStart(2, '0');
        const centerEnvP = getPressureAt(state.cyclone.lon, state.cyclone.lat, state.pressureSystems);
        const pressure = Math.round(windToPressure(state.cyclone.intensity, state.cyclone.circulationSize, basin, centerEnvP));
        const track = state.cyclone.track.slice(-180).map(point => [
            Number(point[0].toFixed(2)),
            Number(point[1].toFixed(2)),
            Math.round(point[2] || 0),
            !!point[3],
            !!point[4],
            Math.round(point[5] || 0),
            !!point[6]
        ]);

        return {
            basin,
            name: state.cyclone.name || '',
            displayName: getCycloneHeadlineName(state.cyclone, cycloneNum),
            status: state.cyclone.status || 'active',
            age: state.cyclone.age || 0,
            month: state.currentMonth,
            year: state.currentYear,
            lon: Number(state.cyclone.lon.toFixed(2)),
            lat: Number(state.cyclone.lat.toFixed(2)),
            intensity: Math.round(state.cyclone.intensity || 0),
            pressure,
            category: getCycloneCategoryLabel(state.cyclone, getCategory(state.cyclone.intensity, state.cyclone.isTransitioning, state.cyclone.isExtratropical, state.cyclone.isSubtropical)),
            track
        };
    }

    function broadcastMultiplayerState(force = false) {
        const api = getMultiplayerApi();
        if (!api || state.multiplayer.mode !== 'host' || !state.multiplayer.connected) return;
        const snapshot = buildMultiplayerSnapshot();
        if (!snapshot) return;

        const shouldSendOnCycle = snapshot.age % 6 === 0;
        const snapshotKey = `${snapshot.status}:${snapshot.age}:${snapshot.intensity}:${snapshot.lat}:${snapshot.lon}:${snapshot.track.length}`;
        if (!force && (!shouldSendOnCycle || state.multiplayer.lastSnapshotKey === snapshotKey)) return;

        state.multiplayer.lastSnapshotKey = snapshotKey;
        api.sendState({ snapshot }).catch(error => {
            appendMultiplayerMessage({ kind: 'system', text: `Sync failed: ${error.message || error}`, time: Date.now() });
        });
    }

    function handleMultiplayerEvent(event) {
        if (!event) return;
        if (event.kind === 'status') {
            applyMultiplayerStatus(event);
            return;
        }
        if (event.kind === 'chat') {
            appendMultiplayerMessage(event);
            return;
        }
        if (event.kind === 'system') {
            appendMultiplayerMessage(event);
            return;
        }
        if (event.kind === 'state') {
            state.multiplayer.remoteCyclone = event.snapshot || null;
            updateMultiplayerPanel();
            requestRedraw();
        }
    }

    function getCycloneHeadlineName(cyclone, fallbackNumber) {
        if (cyclone?.name) return cyclone.name.toUpperCase();
        if (cyclone?.investId || cyclone?.investDisplayId) return getInvestLabel(cyclone);
        return `SYSTEM ${fallbackNumber}`;
    }

    function getCycloneStatusText(cyclone, peakWindSoFar = 0, cycloneNum = '01') {
        if (!cyclone) return '--';
        if ((cyclone.isInvest || (!cyclone.named && peakWindSoFar < 34 && cyclone.investStatus !== 'upgraded')) && (cyclone.investId || cyclone.investDisplayId)) {
            return getInvestLabel(cyclone);
        }

        const stormName = cyclone.name ? cyclone.name.toUpperCase() : 'UNKNOWN';
        if (peakWindSoFar >= 34 || cyclone.named) {
            if (cyclone.intensity >= 34) {
                return cyclone.isExtratropical ? `EX-${stormName}` : stormName;
            }
            if (cyclone.isExtratropical) return `EX-${stormName}`;
            if (cyclone.isSubtropical) return `SD ${stormName}`;
            return `TD ${stormName}`;
        }

        if (cyclone.isExtratropical) return `EX ${cycloneNum}`;
        if (cyclone.isSubtropical) return `SD ${cycloneNum}`;
        return `TD ${cycloneNum}`;
    }

    function getCycloneCategoryLabel(cyclone, category) {
        if (cyclone?.isInvest) return 'Invest Disturbance';
        if (cyclone?.basin === 'MED') {
            if (cyclone.isExtratropical) return 'Post-Tropical Medicane';
            if (cyclone.isSubtropical) return 'Subtropical Medicane';
            if ((cyclone.intensity || 0) < 34) return 'Mediterranean Low';
            if ((cyclone.intensity || 0) < 64) return 'Medicane';
            return 'Intense Medicane';
        }
        return category?.name || '--';
    }

    // [新增] 初始化卫星云图 WebGL 上下文
    initSatelliteView('satCanvas');

    function setupCanvases() {
        // A. SVG 重置 (保持不变)
        mapContainer.select("svg").remove();
        mapSvg = mapContainer.insert("svg", ":first-child")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("z-index", "10")
            .style("pointer-events", "none"); 
        
        // B. 投影更新
        const { width, height } = mapContainer.node().getBoundingClientRect();
        const selectedCenter = getBasinViewCenter(basinSelector?.value || 'WPAC');
        let initLon = selectedCenter.lon;
        let initLat = selectedCenter.lat;
        if (typeof state !== 'undefined' && state.siteLon != null && state.siteLat != null) {
            initLon = state.siteLon;
            initLat = state.siteLat;
        } else if (typeof savedSiteLon !== 'undefined' && savedSiteLon) {
            // 兜底：如果 state 还没初始化，尝试读取顶部的全局变量
            initLon = parseFloat(savedSiteLon);
            initLat = parseFloat(savedSiteLat);
        }
        mapProjection = d3.geoEquirectangular()
            .scale(height / (20 * Math.PI / 180))
            .translate([width / 2, height / 2])
            .center([initLon, initLat]);
        if (mapProjection.precision) {
            mapProjection.precision(getPerformanceProfile().mobile ? 4.2 : 3.1);
        }

        if (!document.getElementById('interaction-fix-style')) {
            const style = document.createElement('style');
            style.id = 'interaction-fix-style';
            style.textContent = `
                /* 允许以下特定图层响应鼠标 */
                .track-interaction-layer, 
                .layer-pressure-handles, 
                .layer-ui,
                .layer-ui rect,
                .pressure-handle { 
                    pointer-events: auto !important; 
                    cursor: pointer;
                }
                
                /* 确保遮罩层本身虽然透明但能被点击 */
                .interaction-overlay {
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(style);
        }

        // C. WebGL Canvas 初始化 (单例模式)
        // 只有当 radarRenderer 不存在时才创建，防止重复初始化导致 WebGL 上下文丢失
        radarCanvas = document.getElementById('radar-canvas-layer');
        if (radarCanvas) {
            // [修复核心 3]：双重保险，强制雷达 Canvas 穿透
            radarCanvas.style.pointerEvents = 'none'; 
            
            if (!radarRenderer) {
                radarCanvas.width = 256; 
                radarCanvas.height = 256;
                radarCanvas.style.opacity = "0.65";
                radarRenderer = new RadarRenderer(radarCanvas);
            }
            if (!dopplerRenderer) {
                dopplerRenderer = new DopplerRenderer(radarCanvas);
            }
        }

        // D. Overlay Canvas 初始化 (单例模式)
        if (!radarOverlayCanvas) {
            radarOverlayCanvas = document.getElementById('radar-overlay-layer');
            // 如果 HTML 里没写，动态创建
            if (!radarOverlayCanvas) {
                radarOverlayCanvas = document.createElement('canvas');
                radarOverlayCanvas.id = 'radar-overlay-layer';
                radarOverlayCanvas.className = "absolute top-0 left-0 w-full h-full pointer-events-none z-30 hidden";
                document.getElementById('map-container').appendChild(radarOverlayCanvas);
            }
            radarOverlayCtx = radarOverlayCanvas.getContext('2d');
        }
        
        // 确保 Overlay 尺寸匹配屏幕
        if (radarOverlayCanvas) {
            radarOverlayCanvas.style.pointerEvents = 'none';
            radarOverlayCanvas.width = width;
            radarOverlayCanvas.height = height;
        }
    }
        
    // --- 初始化流程 ---
    
    // 1. 先加载地图数据
    function redrawIdleBasinPreview() {
        if (!mapSvg || !mapProjection || !state.world || state.cyclone?.status === 'active') return;
        syncFictioniaTerrainMode(basinSelector?.value || 'WPAC');
        const { width, height } = mapContainer.node().getBoundingClientRect();
        const center = getBasinViewCenter(basinSelector?.value || 'WPAC');
        mapProjection.rotate([0, 0]).center([center.lon, center.lat]).translate([width / 2, height / 2]);
        drawMap(mapSvg, mapProjection, state.world, { status: null, track: [] }, {
            pressureSystems: state.pressureSystems,
            showPressureField: state.showPressureField,
            showHumidityField: state.showHumidityField,
            showPathForecast: state.showPathForecast,
            showWindRadii: state.showWindRadii,
            siteName: state.siteName,
            siteLon: state.siteLon,
            siteLat: state.siteLat,
            showPathPoints: state.showPathPoints,
            showWindField: state.showWindField,
            showSteeringCurrents: state.showSteeringCurrents,
            remoteCyclone: getMultiplayerRemoteCyclone(),
            performanceProfile: getPerformanceProfile(),
            basin: basinSelector?.value || 'WPAC'
        });
    }

    d3.json("js/world-f.json").then(data => {
        state.world = addCustomMapsToWorld(topojson.feature(data, data.objects.collection));
        
        // 2. 数据加载完，建立图层和投影
        setupCanvases();
        if (mapProjection && mapProjection.precision) {
            mapProjection.precision(getPerformanceProfile().mobile ? 4.2 : 3.1); // 值越大越快，0.1 是平衡点
        }
        // 3. 加载地形数据 (纹理)
        console.log("Loading Terrain Data...");
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = './js/elevation_1080x540.png';
        
        img.onload = () => {
            // A. JS 逻辑用的地形数据 (异步)
            initTerrainSystem(img.src, state.world).then(() => {
                console.log("Terrain Logic Ready.");
                generateButton.disabled = false;
                updateGameMenuState();
            });
            
            // B. WebGL 渲染用的地形纹理 (同步上传)
            // 此时 setupCanvases 已经执行过，radarRenderer 一定存在
            if (radarRenderer) {
                radarRenderer.loadTerrainTexture(img);
                console.log("WebGL Terrain Texture Loaded.");
            }
            if (dopplerRenderer) {
                dopplerRenderer.loadTerrainTexture(img);
                console.log("Doppler Terrain Texture Loaded.");
            }
        };

        // 4. 绘制初始地图 (不需要等图片加载完，先画出来)
        drawMap(mapSvg, mapProjection, state.world, {status: null, track: []}, {
            pressureSystems: state.pressureSystems,
            showPressureField: state.showPressureField,
            showHumidityField: state.showHumidityField,
            showPathForecast: state.showPathForecast,
            showWindRadii: state.showWindRadii,
            siteName: state.siteName,
            siteLon: state.siteLon,
            siteLat: state.siteLat,
            showPathPoints: state.showPathPoints,
            showWindField: state.showWindField,
            showSteeringCurrents: state.showSteeringCurrents,
            remoteCyclone: getMultiplayerRemoteCyclone(),
            performanceProfile: getPerformanceProfile(),
            basin: basinSelector?.value || 'WPAC'
        });
    });
    // 封装折叠/展开函数
    function toggleLeftPanel() {
        if (!leftContent) return;
        
        // 播放音效
        isLeftPanelCollapsed ? playToggleOn() : playToggleOff();
        
        isLeftPanelCollapsed = !isLeftPanelCollapsed;

        if (isLeftPanelCollapsed) {
            // 收缩
            leftContent.style.width = '0px';
            leftContent.style.opacity = '0';
            leftContent.style.paddingRight = '0'; 
            // 可选：添加一个小的提示音或视觉反馈
        } else {
            // 展开
            leftContent.style.width = ''; // 恢复 CSS 默认宽度
            leftContent.style.opacity = '100';
            leftContent.style.paddingRight = ''; 
        }
    }

    function updateTabUI() {
        [tabKt, tabHpa].forEach(btn => {
            btn.classList.remove('bg-cyan-600', 'text-white');
            btn.classList.add('text-slate-400');
        });
        const activeBtn = chartMode === 'kt' ? tabKt : tabHpa;
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-cyan-600', 'text-white');
    }

    function downloadMapImage(elementId, filename = 'cyclone_map.png') {
        const captureElement = document.getElementById(elementId);
        if (!captureElement) {
            console.error(`无法找到元素 #${elementId} 进行截图。`);
            alert("截图失败：未找到地图元素。");
            return;
        }

        // 1. 准备数据
        // A. 基础统计
        let peakWind = 0;
        let minPressure = 1010;
        const currentBasin = basinSelector.value || 'WPAC';
        const basinMap = { 'WPAC': 'WP', 'EPAC': 'EP', 'NATL': 'AL', 'MED': 'ME', 'FICT': 'FI', 'FICT2': 'FI', 'RED': 'RS', 'REDG': 'RS', 'NIO': 'IO', 'SHEM': 'SH', 'SIO': 'SH', 'SATL': 'SL' };
        const basinCode = basinMap[currentBasin] || 'XX';
        
        // 气旋编号 (如果没有 finalStats，使用当前计数)
        const cycloneNum = state.lastFinalStats ? state.lastFinalStats.number.split(' ')[1] : String(state.simulationCount).padStart(2, '0');
        const stormName = `${basinCode} ${cycloneNum}`;

        // B. 遍历轨迹获取极值
        if (state.cyclone && state.cyclone.track && state.cyclone.track.length > 0) {
            state.cyclone.track.forEach(p => {
                if (p[2] > peakWind) peakWind = p[2];
                let p_val;
                if (p[10] !== undefined) {
                    p_val = p[10];
                } else {
                    // 兼容旧数据
                    const envP = getPressureAt(p[0], p[1], state.pressureSystems);
                    p_val = windToPressure(p[2], p[5] || 300, currentBasin, envP);
                }

                if (p_val < minPressure) minPressure = p_val;
            });
        }

        // C. 计算日期范围 (MM/DD)
        const currentYear = getActiveSimulationYear(state.cyclone);
        // 模拟开始日期 (当月1号)
        const startDate = new Date(Date.UTC(currentYear, state.currentMonth - 1, 1));
        
        // 模拟结束日期 = 开始日期 + 气旋总寿命(小时)
        const totalHours = state.cyclone.age || 0;
        const endDate = new Date(startDate.getTime() + totalHours * 3600 * 1000);

        // 格式化日期函数 (07/15)
        const fmtDate = (date) => {
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            return `${m}/${d}`;
        };
        const startYear = startDate.getUTCFullYear();
        const endYear = endDate.getUTCFullYear();
        const dateRangeStr = startYear === endYear
            ? `${startYear} ${fmtDate(startDate)} ~ ${fmtDate(endDate)}`
            : `${startYear} ${fmtDate(startDate)} ~ ${endYear} ${fmtDate(endDate)}`;


        // 2. 执行截图
        html2canvas(captureElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#111827', // 地图背景色
            logging: false
        }).then(canvas => {
            const ctx = canvas.getContext('2d');

            // --- 绘制 UI 面板 ---
            const panelX = 20;
            const panelY = 20;
            const panelWidth = 340;
            const panelHeight = 110;
            const radius = 12;

            ctx.save();
            // 绘制半透明圆角矩形背景
            ctx.fillStyle = 'rgba(17, 24, 39, 0.85)'; // 深色半透明
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; // 淡淡的边框
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.roundRect(panelX, panelY, panelWidth, panelHeight, radius);
            ctx.fill();
            ctx.stroke();

            // --- 绘制文字内容 ---
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // 1. 标题行：编号 + 日期
            // 编号 (白色, 大号)
            ctx.font = 'bold 24px "JetBrains Mono", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(stormName, panelX + 20, panelY + 20);

            // 日期 (灰色, 小号, 紧跟在编号后面或右对齐)
            const nameWidth = ctx.measureText(stormName).width;
            ctx.font = '16px "JetBrains Mono", monospace';
            ctx.fillStyle = '#9ca3af'; // text-gray-400
            ctx.fillText(dateRangeStr, panelX + 20 + nameWidth + 15, panelY + 26);

            // 2. 数据行：强度 + 气压
            // 分割线
            ctx.beginPath();
            ctx.moveTo(panelX + 20, panelY + 55);
            ctx.lineTo(panelX + panelWidth - 20, panelY + 55);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.stroke();

            // 强度 (MAX ...)
            ctx.font = 'bold 20px "JetBrains Mono", monospace';
            
            // "MAX" 标签
            ctx.fillStyle = '#facc15'; // text-yellow-400
            ctx.fillText("MAX", panelX + 20, panelY + 70);
            
            // 数值
            const labelWidth = ctx.measureText("MAX ").width;
            ctx.fillStyle = '#ffffff';
            const windText = `${Math.round(peakWind)} KT`;
            ctx.fillText(windText, panelX + 20 + labelWidth, panelY + 70);

            // 气压 (MIN ...)
            const windTotalWidth = labelWidth + ctx.measureText(windText).width;
            const gap = 20; // 间距
            
            // "MIN" 标签
            ctx.fillStyle = '#22d3ee'; // text-cyan-400
            const pressureX = panelX + 20 + windTotalWidth + gap;
            ctx.fillText("MIN", pressureX, panelY + 70);
            
            // 数值
            const pLabelWidth = ctx.measureText("MIN ").width;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${Math.round(minPressure)} hPa`, pressureX + pLabelWidth, panelY + 70);

            ctx.restore();

            // --- 绘制底部水印 (保持不变) ---
            const disclaimerText = "GENERATED BY TCS-SIM | NOT REAL EVENT";
            ctx.font = '12px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText(disclaimerText, panelX + 300, panelY + 125);

            // --- 导出 ---
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.error('html2canvas 截图失败:', err);
            alert("生成图像时出错。详情请查看控制台。");
        });
    }

    function downloadHistoryTrack() {
        if (state.selectedHistoryTrackData) {
            const blob = new Blob([state.selectedHistoryTrackData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // 尝试从第一行解析出名称来命名文件
            const fileNameMatch = state.selectedHistoryTrackData.split('\n')[0].match(/^(\S+), (\S+)/);
            const fileName = fileNameMatch ? `${fileNameMatch[1]}${fileNameMatch[2]}.txt` : 'history_track.txt';
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            alert("没有可下载的历史轨迹数据。");
        }
    }
    // --- 辅助函数 ---
    const GAME_SAVE_PATCH_VERSION = 'Alpha 1.0.3.17';
    const GAME_SAVE_STORAGE_KEY = 'tcs_game_saves_v1';
    const MAX_GAME_SAVE_SLOTS = 8;

    function cloneSerializable(value, fallback = null) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_error) {
            return fallback;
        }
    }

    function getGameSaveSlots() {
        try {
            const parsed = JSON.parse(localStorage.getItem(GAME_SAVE_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed.filter(slot => slot && slot.id && slot.state?.cyclone) : [];
        } catch (_error) {
            return [];
        }
    }

    function persistGameSaveSlots(slots) {
        localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(slots.slice(0, MAX_GAME_SAVE_SLOTS)));
    }

    function cleanCycloneForSave(cyclone) {
        const copy = { ...(cyclone || {}) };
        delete copy.satelliteCache;
        return cloneSerializable(copy, {});
    }

    function getSaveTitle(cyclone = state.cyclone) {
        const fallbackNumber = String(state.simulationCount || 1).padStart(2, '0');
        const basin = cyclone?.basin || basinSelector?.value || 'WPAC';
        const name = getCycloneHeadlineName(cyclone, fallbackNumber);
        const age = Math.max(0, Math.round(Number(cyclone?.age || 0)));
        return `${basin} ${name} T+${age}H`;
    }

    function buildGameSaveSnapshot(source = 'manual') {
        if (!state.cyclone || !Array.isArray(state.cyclone.track) || state.cyclone.track.length === 0) {
            return null;
        }

        const cyclone = cleanCycloneForSave(state.cyclone);
        return {
            id: `save-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            schemaVersion: 1,
            patchVersion: GAME_SAVE_PATCH_VERSION,
            source,
            title: getSaveTitle(cyclone),
            savedAt: new Date().toISOString(),
            state: {
                cyclone,
                pressureSystems: cloneSerializable(state.pressureSystems, { upper: [], lower: [] }),
                pressureHistory: cloneSerializable(state.pressureHistory, []),
                frontalZone: cloneSerializable(state.frontalZone, {}),
                pathForecasts: cloneSerializable(state.pathForecasts, []),
                currentMonth: state.currentMonth,
                currentYear: state.currentYear,
                simulationSpeed: state.simulationSpeed,
                wasRunning: !!state.simulationInterval && !state.isPaused,
                isPaused: !!state.isPaused,
                showIntensityChart: !!state.showIntensityChart,
                showPressureField: !!state.showPressureField,
                showHumidityField: !!state.showHumidityField,
                showPathForecast: !!state.showPathForecast,
                showWindRadii: !!state.showWindRadii,
                showPathPoints: !!state.showPathPoints,
                showSatelliteInset: !!state.showSatelliteInset,
                showWindField: !!state.showWindField,
                showSteeringCurrents: !!state.showSteeringCurrents,
                GlobalTemp: state.GlobalTemp,
                GlobalShear: state.GlobalShear,
                siteName: state.siteName,
                siteLon: state.siteLon,
                siteLat: state.siteLat,
                customLon: state.customLon,
                customLat: state.customLat,
                siteHistory: cloneSerializable(state.siteHistory, []),
                impactState: cloneSerializable(state.impactState, createImpactState()),
                warningAdvisory: cloneSerializable(state.warningAdvisory, { active: [], signature: '', issuedHour: null }),
                currentSiteData: cloneSerializable(state.currentSiteData, null),
                hasAlerted: !!state.hasAlerted,
                hasTriggeredCat1News: !!state.hasTriggeredCat1News,
                hasTriggeredCat5News: !!state.hasTriggeredCat5News,
                lastWarningBannerSignature: state.lastWarningBannerSignature || '',
                lastParBannerSignature: state.lastParBannerSignature || '',
                lastInvestBannerSignature: state.lastInvestBannerSignature || '',
                nextNameIndex: state.nextNameIndex,
                nextPagasaNameIndex: state.nextPagasaNameIndex,
                nextInvestNumbers: cloneSerializable(state.nextInvestNumbers, {}),
                simulationCount: state.simulationCount,
                lastBasin: state.lastBasin || cyclone.basin || basinSelector?.value || 'WPAC',
                lastFinalStats: cloneSerializable(state.lastFinalStats, null),
                isSiteSelected: !!state.isSiteSelected
            }
        };
    }

    function saveCurrentGame(source = 'manual', quiet = false) {
        const snapshot = buildGameSaveSnapshot(source);
        if (!snapshot) {
            if (!quiet) alert('Start or load a storm before saving.');
            return null;
        }

        try {
            const slots = getGameSaveSlots().filter(slot => slot.id !== snapshot.id);
            slots.unshift(snapshot);
            persistGameSaveSlots(slots);
            renderSaveSlots();
            if (!quiet) {
                document.getElementById('status').textContent = `SAVE CREATED: ${snapshot.title}`;
            }
            return snapshot;
        } catch (error) {
            console.error('Unable to save game:', error);
            if (!quiet) alert('Unable to save. Browser storage may be full.');
            return null;
        }
    }

    function renderSaveSlots() {
        if (!saveSlotList) return;
        const slots = getGameSaveSlots();
        saveSlotList.innerHTML = '';

        if (slots.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'border border-white/10 bg-white/5 p-4 text-center text-xs font-mono text-slate-500 uppercase tracking-widest';
            empty.textContent = 'No saves yet';
            saveSlotList.appendChild(empty);
            return;
        }

        slots.forEach(slot => {
            const row = document.createElement('div');
            row.className = 'grid gap-3 border border-white/10 bg-white/5 p-3 sm:grid-cols-[1fr_auto] sm:items-center';

            const info = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'text-sm font-bold text-white';
            title.textContent = slot.title || 'Unnamed save';
            const meta = document.createElement('div');
            meta.className = 'mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-500';
            const date = slot.savedAt ? new Date(slot.savedAt).toLocaleString() : 'Unknown time';
            meta.textContent = `${slot.patchVersion || 'unknown'} | ${date}`;
            info.append(title, meta);

            const actions = document.createElement('div');
            actions.className = 'flex flex-wrap gap-2';
            [
                ['load', 'Load', 'bg-cyan-900/50 hover:bg-cyan-800 text-cyan-100 border-cyan-500/30'],
                ['export', 'Export', 'bg-emerald-900/45 hover:bg-emerald-800 text-emerald-100 border-emerald-500/30'],
                ['delete', 'Delete', 'bg-red-950/55 hover:bg-red-900 text-red-100 border-red-500/30']
            ].forEach(([action, label, classes]) => {
                const button = document.createElement('button');
                button.className = `border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition ${classes}`;
                button.dataset.saveAction = action;
                button.dataset.saveId = slot.id;
                button.textContent = label;
                actions.appendChild(button);
            });

            row.append(info, actions);
            saveSlotList.appendChild(row);
        });
    }

    function openSaveManager() {
        renderSaveSlots();
        saveModal?.classList.remove('hidden');
    }

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function exportSaveSlot(saveId) {
        const slot = getGameSaveSlots().find(item => item.id === saveId);
        if (!slot) return;
        const safeTitle = (slot.title || 'storm-inc-save').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        downloadJson(slot, `${safeTitle || 'storm-inc-save'}-${GAME_SAVE_PATCH_VERSION}.json`);
    }

    function deleteSaveSlot(saveId) {
        const slots = getGameSaveSlots().filter(slot => slot.id !== saveId);
        persistGameSaveSlots(slots);
        renderSaveSlots();
    }

    function importGameSaveFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(String(reader.result || ''));
                if (!imported?.state?.cyclone?.track?.length) {
                    throw new Error('Invalid save file.');
                }
                imported.id = `import-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                imported.importedAt = new Date().toISOString();
                imported.title = imported.title || getSaveTitle(imported.state.cyclone);
                imported.patchVersion = imported.patchVersion || GAME_SAVE_PATCH_VERSION;
                const slots = getGameSaveSlots();
                slots.unshift(imported);
                persistGameSaveSlots(slots);
                renderSaveSlots();
            } catch (error) {
                console.error('Unable to import save:', error);
                alert('That save file could not be imported.');
            }
        };
        reader.readAsText(file);
    }

    function restoreGameSave(saveId) {
        const slot = getGameSaveSlots().find(item => item.id === saveId);
        if (!slot?.state?.cyclone?.track?.length) return;

        const saved = slot.state;
        if (state.simulationInterval) {
            clearInterval(state.simulationInterval);
            state.simulationInterval = null;
        }

        selectedHistoryPointIndex = -1;
        state.selectedHistoryCyclone = null;
        state.cyclone = cloneSerializable(saved.cyclone, {});
        state.pressureSystems = cloneSerializable(saved.pressureSystems, { upper: [], lower: [] });
        state.pressureHistory = cloneSerializable(saved.pressureHistory, []);
        state.frontalZone = cloneSerializable(saved.frontalZone, {});
        state.pathForecasts = cloneSerializable(saved.pathForecasts, []);
        state.currentMonth = Number(saved.currentMonth || state.cyclone.currentMonth || 7);
        state.currentYear = normalizeSimulationYear(saved.currentYear || state.cyclone.currentYear || currentCalendarYear);
        state.simulationSpeed = Number(saved.simulationSpeed || state.simulationSpeed || 200);
        state.showIntensityChart = saved.showIntensityChart !== false;
        state.showPressureField = !!saved.showPressureField;
        state.showHumidityField = !!saved.showHumidityField;
        state.showPathForecast = !!saved.showPathForecast;
        state.showWindRadii = !!saved.showWindRadii;
        state.showPathPoints = !!saved.showPathPoints;
        state.showSatelliteInset = saved.showSatelliteInset !== false;
        state.showWindField = !!saved.showWindField;
        state.showSteeringCurrents = !!saved.showSteeringCurrents;
        state.GlobalTemp = Number(saved.GlobalTemp || state.GlobalTemp || 289);
        state.GlobalShear = Number(saved.GlobalShear || state.GlobalShear || 100);
        state.siteName = saved.siteName || '';
        state.siteLon = saved.siteLon ?? null;
        state.siteLat = saved.siteLat ?? null;
        state.customLon = saved.customLon ?? null;
        state.customLat = saved.customLat ?? null;
        state.siteHistory = cloneSerializable(saved.siteHistory, []);
        state.impactState = cloneSerializable(saved.impactState, createImpactState());
        state.warningAdvisory = cloneSerializable(saved.warningAdvisory, { active: [], signature: '', issuedHour: null });
        state.currentSiteData = cloneSerializable(saved.currentSiteData, null);
        state.hasAlerted = !!saved.hasAlerted;
        state.hasTriggeredCat1News = !!saved.hasTriggeredCat1News;
        state.hasTriggeredCat5News = !!saved.hasTriggeredCat5News;
        state.lastWarningBannerSignature = saved.lastWarningBannerSignature || '';
        state.lastParBannerSignature = saved.lastParBannerSignature || '';
        state.lastInvestBannerSignature = saved.lastInvestBannerSignature || '';
        state.nextNameIndex = Number(saved.nextNameIndex || 0);
        state.nextPagasaNameIndex = Number(saved.nextPagasaNameIndex || 0);
        state.nextInvestNumbers = cloneSerializable(saved.nextInvestNumbers, {});
        state.simulationCount = Number(saved.simulationCount || state.simulationCount || 1);
        state.lastBasin = saved.lastBasin || state.cyclone.basin || 'WPAC';
        state.lastFinalStats = cloneSerializable(saved.lastFinalStats, null);
        state.isSiteSelected = !!saved.isSiteSelected;
        state.cyclone.currentMonth = state.currentMonth;
        state.cyclone.currentYear = state.currentYear;
        syncFictioniaTerrainMode(state.cyclone.basin || state.lastBasin || 'WPAC');

        const active = state.cyclone.status === 'active';
        state.isPaused = active ? !saved.wasRunning : false;
        if (!state.pathForecasts.length && active) {
            state.pathForecasts = generatePathForecasts(state.cyclone, state.pressureSystems, checkLandWrapper, state.GlobalTemp, state.GlobalShear);
        }

        if (basinSelector) basinSelector.value = state.cyclone.basin || state.lastBasin || 'WPAC';
        if (monthSelector) monthSelector.value = String(state.currentMonth);
        if (yearSelector) yearSelector.value = String(state.currentYear);
        if (globalTempSlider) globalTempSlider.value = String(state.GlobalTemp);
        if (globalTempValue) globalTempValue.textContent = `${state.GlobalTemp}K`;
        if (globalShearSlider) globalShearSlider.value = String(state.GlobalShear);
        if (globalShearValue) globalShearValue.textContent = `${state.GlobalShear}`;
        if (siteNameInput) siteNameInput.value = state.siteName || '';
        if (siteLonInput) siteLonInput.value = state.siteLon ?? '';
        if (siteLatInput) siteLatInput.value = state.siteLat ?? '';
        if (customLonInput) customLonInput.value = state.customLon ?? '';
        if (customLatInput) customLatInput.value = state.customLat ?? '';
        if (showPathPointsCheckbox) showPathPointsCheckbox.checked = state.showPathPoints;

        monthSelector.disabled = active;
        if (yearSelector) yearSelector.disabled = active;
        basinSelector.disabled = active;
        globalTempSlider.disabled = active;
        globalShearSlider.disabled = active;
        siteNameInput.disabled = active;
        customLonInput.disabled = active;
        customLatInput.disabled = active;
        siteLonInput.disabled = active;
        siteLatInput.disabled = active;

        setupCanvases();
        document.getElementById('initial-message').classList.add('hidden');
        document.getElementById('simulation-output').classList.remove('hidden');
        syncSatelliteInsetVisibility(active && state.showSatelliteInset);
        document.getElementById('info-panel').classList.remove('hidden');
        document.getElementById('map-info-box').classList.toggle('hidden', !active);
        bestTrackContainer.classList.add('hidden');
        saveModal?.classList.add('hidden');
        hideGameMenu();

        generateButton.innerHTML = '<span class="relative z-10 flex items-center justify-center gap-2"><i class="fa-solid fa-power-off"></i> RESTART</span>';
        pauseButton.disabled = !active;
        pauseButton.innerHTML = state.isPaused ? '<i class="fa-solid fa-play text-xs"></i>' : '<i class="fa-solid fa-pause text-xs"></i>';
        updateToggleButtonVisual(togglePressureButton, state.showPressureField);
        updateToggleButtonVisual(toggleHumidityButton, state.showHumidityField);
        updateToggleButtonVisual(toggleWindFieldButton, state.showWindField);
        updateToggleButtonVisual(toggleWindRadiiButton, state.showWindRadii);
        updateToggleButtonVisual(togglePathButton, state.showPathForecast);
        updateToggleButtonVisual(toggleSteeringButton, state.showSteeringCurrents);
        updateStateSiteData();
        updateInfoPanel();
        updateMapInfoBox();
        updateImpactPanel();
        updateInvestPanel();
        updateWarningPanel();
        updateGameMenuState();
        document.getElementById('status').textContent = `LOADED SAVE: ${slot.title || getSaveTitle(state.cyclone)}`;

        if (active) {
            requestRedraw();
            if (!state.isPaused) {
                state.simulationInterval = setInterval(updateSimulation, state.simulationSpeed);
            }
        } else {
            drawFinalPath(mapSvg, mapProjection, state.cyclone, state.world, tooltip, state.siteName, state.siteLon, state.siteLat, state.showPathPoints, state.lastFinalStats, basinSelector.value, state.pressureSystems, state.showWindField);
        }

        if (state.showIntensityChart && state.cyclone.track?.length > 1) {
            forecastContainer.classList.remove('hidden');
            setTimeout(() => drawHistoricalIntensityChart(chartContainer, state.cyclone.track, tooltip, chartMode, basinSelector.value), 0);
        }
    }

    function updateToggleButtonVisual(button, isActive) {
        if (!button) return;
        if (isActive) {
            // 高亮状态: 更亮的背景, 亮青色文字, 青色边框
            button.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-600', 'hover:text-cyan-400');
            button.classList.add('bg-slate-700', 'text-cyan-400', 'border-cyan-500', 'shadow-md', 'shadow-cyan-900/20');
        } else {
            // 默认状态: 深色背景, 灰色文字
            button.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-600', 'hover:text-cyan-400');
            button.classList.remove('bg-slate-700', 'text-cyan-400', 'border-cyan-500', 'shadow-md', 'shadow-cyan-900/20');
        }
    }

    function changeSimulationSpeed(newInterval) {
        state.simulationSpeed = newInterval;
        
        // 更新状态栏显示（可选，给你一个视觉反馈）
        const speedMap = { 50: 'MAX (3x)', 100: 'FAST (2x)', 200: 'NORMAL (1x)' };
        const speedText = speedMap[newInterval] || `${newInterval}ms`;
        
        // 如果当前正在运行（非暂停，且已启动），立即应用新速度
        if (state.simulationInterval && !state.isPaused && state.cyclone.status === 'active') {
            clearInterval(state.simulationInterval);
            state.simulationInterval = setInterval(updateSimulation, state.simulationSpeed);
            // 临时显示速度提示
            const originalStatus = document.getElementById('status').textContent;
            document.getElementById('status').textContent = `SPEED CHANGED: ${speedText}`;
            setTimeout(() => {
                // 如果还在运行，恢复原始状态文本
                if(state.simulationInterval) document.getElementById('status').textContent = "模拟进行中...";
            }, 1000);
        }
    }

function getAtcfTypeCode(windKts, isExtratropical, isSubtropical, isInvest = false) {
        if (isInvest) {
            return windKts >= 24 ? 'DB' : 'LO';
        }
        if (isSubtropical) {
            if (windKts < 34) return 'SD';
            return 'SS';
        }
        if (isExtratropical) return 'EX';
        if (windKts >= 130) return 'ST';
        if (windKts >= 64) return 'TY';
        if (windKts >= 34) return 'TS';
        if (windKts >= 24) return 'TD';
        if (windKts > 0) return 'DB';
        return 'LO';
    }

    function formatBestTrack(track, cycloneInfo, simulationCount) {
        const basinMap = { 'WPAC': 'WP', 'EPAC': 'EP', 'NATL': 'AL', 'MED': 'ME', 'FICT': 'FI', 'FICT2': 'FI', 'RED': 'RS', 'REDG': 'RS', 'NIO': 'IO', 'SHEM': 'SH', 'SIO': 'SH', 'SATL': 'SL' };
        const basin = basinMap[cycloneInfo.basin] || 'WP';
        const cycloneNum = String(simulationCount).padStart(2, '0');
        const investNum = String(cycloneInfo.investNumber || 90).padStart(2, '0');
        const startDate = new Date(Date.UTC(cycloneInfo.year, cycloneInfo.month - 1, 1));

        return track.map((point, index) => {
            const currentDate = new Date(startDate);
            currentDate.setUTCHours(currentDate.getUTCHours() + index * 3);

            const dateString = `${currentDate.getUTCFullYear()}${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}${String(currentDate.getUTCDate()).padStart(2, '0')}${String(currentDate.getUTCHours()).padStart(2, '0')}`;
            const lat = `${Math.round(point[1] * 10)}N`;
            const normalizedLon = ((point[0] + 540) % 360) - 180;
            const lonValue = Math.abs(normalizedLon);
            const lonHemi = normalizedLon < 0 ? 'W' : 'E';
            const lon = `${Math.round(lonValue * 10)}${lonHemi}`;
            const vmax = Math.round(point[2]);
            const circulationSize = point[5]; 
            let mslp;
            if (point[10] !== undefined && point[10] !== null) {
                mslp = point[10];
            } else {
                const circulationSize = point[5] || 300;
                const envP = getPressureAt(point[0], point[1], state.pressureSystems);
                mslp = Math.round(windToPressure(vmax, circulationSize, cycloneInfo.basin, envP));
            }
            
            const isInvestPoint = !!point[17];
            const trackNum = isInvestPoint && cycloneInfo.investNumber ? investNum : cycloneNum;
            const type = getAtcfTypeCode(vmax, point[4], point[6], isInvestPoint);

            return [
                basin.padEnd(2, ' '), trackNum.padStart(3, ' '), ` ${dateString}`, ' 00', ' BEST', '   0',
                lat.padStart(6, ' '), lon.padStart(7, ' '), String(vmax).padStart(4, ' '),
                String(mslp).padStart(5, ' '), ` ${type}`,
            ].join(',');
        }).join('\n');
    }

    function drawRadarScope() {
        // 1. 基础检查
        if ((!state.radarMode && !state.dopplerMode) || !state.siteLon || !state.siteLat) {
            if (radarCanvas) radarCanvas.classList.add('hidden');
            if (radarOverlayCanvas) radarOverlayCanvas.classList.add('hidden');
            return;
        }
        if (!radarRenderer || !dopplerRenderer) return;
        radarCanvas.classList.remove('hidden');
        radarOverlayCanvas.classList.remove('hidden');

        // 2. 确定位置 (UI 层需要全屏分辨率)
        const { width, height } = mapContainer.node().getBoundingClientRect();
        if (radarOverlayCanvas.width !== width) {
            radarOverlayCanvas.width = width;
            radarOverlayCanvas.height = height;
        }

        const centerProj = mapProjection([state.siteLon, state.siteLat]);
        if (!centerProj) return;
        const [cx, cy] = centerProj;

        // 计算半径
        const refPoint = mapProjection([state.siteLon + (460 / 111), state.siteLat]);
        const radiusPx = Math.abs(refPoint[0] - cx);

        // ============================
        // A. 调用 WebGL 渲染 (极速)
        // ============================
        // WebGL 不需要擦除，它每一帧都是重画覆盖
        // 我们只需要更新 Canvas 的 CSS 位置，让它正好对准雷达区域
        
        // 技巧：我们不全屏渲染 WebGL，而是把 WebGL Canvas 作为一个小贴纸，定位到雷达区域
        const size = radiusPx * 2;
        radarCanvas.style.width = `${size}px`;
        radarCanvas.style.height = `${size}px`;
        radarCanvas.style.left = `${cx - radiusPx}px`;
        radarCanvas.style.top = `${cy - radiusPx}px`;
        const activeCyclone = (state.cyclone && state.cyclone.status === 'active') ? state.cyclone : null;
        if (state.dopplerMode) {
            // 多普勒模式：渲染径向速度
            dopplerRenderer.render(state, 256, 256);
            radarCanvas.style.opacity = "0.75"; // 多普勒模式稍微不透明一点，以便看清颜色
        } else if (state.radarMode) {
            // 基本反射率模式
            const rawHum = calculateBackgroundHumidity(
                state.siteLon, 
                state.siteLat, 
                state.pressureSystems, 
                state.currentMonth, 
                activeCyclone, 
                state.GlobalTemp
            );
            const normalizedHum = rawHum / 100.0;
            radarRenderer.render(state, 256, 256, normalizedHum);
            radarCanvas.style.opacity = "0.65";
        }

        // ============================
        // B. 绘制 UI (扫描线) - 使用 2D Canvas
        // ============================
        const ctx = radarOverlayCtx;
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        
        // 裁剪区域 (只在圆内显示扫描线)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
        ctx.clip(); // 限制绘制区域

        // 圆圈
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2); 
        ctx.stroke();
        
        ctx.restore();
    }
    // --- UI更新函数 ---
    // [新增] 显示突发新闻 Banner
    function triggerNewsBanner(headlineHTML, subText, currentAge, currentMonth, type = 'ORANGE') {
        const container = document.getElementById('news-feed-container');
        if (!container) return;

        if (type === 'ORANGE') {
            playUpgradeSound(); // 升级台风：播放悦耳的 4 音符两遍
        } else if (type === 'RED') {
            playAlert(); // 进入警戒区：播放原本的空灵警报音
        } else if (type === 'PURPLE') {
            playCat5Sound();
        } else {
            playClick(); // 默认回退
        }

        // 1. 计算时间字符串
        const currentYear = getActiveSimulationYear(state.cyclone);
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        const currentDate = new Date(startDate.getTime() + currentAge * 3600 * 1000);
        
        const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getUTCDate()).padStart(2, '0');
        const h = String(currentDate.getUTCHours()).padStart(2, '0');
        const y = currentDate.getUTCFullYear();
        const dateStr = `${y} ${m}/${d} ${h}Z`;

        // 2. 设定颜色主题
        let themeColor = '#ea580c'; // 默认橙色 (Typhoon Upgrade)
        let borderColor = 'border-[#ea580c]';
        
        if (type === 'RED') { // 红色 (警报/进入范围)
            themeColor = '#dc2626'; 
            borderColor = 'border-[#dc2626]';
        }

        else if (type === 'PURPLE') {
            themeColor = '#a855f7'; // Purple-500 (亮紫色)
            borderColor = 'border-[#a855f7]';
        }

        // 3. 创建 DOM 元素
        const newsItem = document.createElement('div');
        // 初始状态：translate-x-full (在屏幕右侧外)
        newsItem.className = `transform translate-x-full transition-transform duration-500 ease-out flex flex-col items-end font-mono shadow-2xl pointer-events-auto`;
        
        // 构建内部 HTML (保持之前的 Newsletter 风格)
        newsItem.innerHTML = `
            <div class="text-white px-6 py-2 flex items-center gap-3 shadow-lg" style="background-color: ${themeColor}">
                <h2 class="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none drop-shadow-md text-right">
                    ${headlineHTML}
                </h2>
                <div class="w-2 h-6 bg-white animate-pulse"></div>
            </div>
            <div class="bg-black/90 text-slate-300 px-6 py-1.5 border-r-4 ${borderColor} flex justify-between items-center gap-4 min-w-[300px] shadow-lg w-full">
                <span class="text-[10px] md:text-xs font-mono text-orange-400">
                    ${dateStr}
                </span>
                <span class="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-400 text-right">
                    ${subText}
                </span>
            </div>
        `;

        // 4. 插入容器 (Append 实现向下堆叠)
        container.appendChild(newsItem);

        // 5. 触发进场动画 (需要下一帧执行，否则 transition 不生效)
        requestAnimationFrame(() => {
            newsItem.classList.remove('translate-x-full');
        });

        // 6. 设置自动销毁
        // 停留 6 秒后滑出
        setTimeout(() => {
            newsItem.classList.add('translate-x-full');
            
            // 等待滑出动画结束后(500ms)，从 DOM 中移除
            setTimeout(() => {
                if (newsItem.parentNode) {
                    newsItem.parentNode.removeChild(newsItem);
                }
            }, 500); // 对应 duration-500
        }, 6000);
    }

    function updateImpactPanel() {
        if (damageCounter) {
            damageCounter.textContent = formatDamage(state.impactState?.damageUsd || 0);
        }
        if (deathCounter) {
            deathCounter.textContent = `${Math.max(0, Math.floor(state.impactState?.deaths || 0)).toLocaleString()}`;
        }
        if (rainRateCounter) {
            rainRateCounter.textContent = `${Math.round(state.cyclone?.rainRateMmHr || 0)} mm/h`;
        }
        if (stormRainCounter) {
            stormRainCounter.textContent = formatRain(state.cyclone?.rainTotalMm || 0);
        }
        if (cityRainCounter) {
            const maxRain = state.impactState?.maxRainMm || 0;
            const maxRainCity = state.impactState?.maxRainCity ? ` ${state.impactState.maxRainCity}` : '';
            cityRainCounter.textContent = `${formatRain(maxRain)}${maxRainCity}`;
        }
        if (surgeCounter) {
            surgeCounter.textContent = formatSurge(state.impactState?.maxSurgeM || 0);
        }
        if (ohcCounter) {
            ohcCounter.textContent = `${Math.round(state.cyclone?.ohcKjCm2 || 0)} kJ/cm2`;
        }
        if (parStatus) {
            if (state.cyclone?.basin === 'WPAC' && state.cyclone?.inPAR) {
                const localName = state.cyclone.pagasaName ? state.cyclone.pagasaName.toUpperCase() : 'MONITORED';
                parStatus.textContent = `${localName} IN PAR`;
                parStatus.classList.remove('text-slate-400');
                parStatus.classList.add('text-cyan-300');
            } else {
                parStatus.textContent = state.cyclone?.basin === 'WPAC' ? 'OUTSIDE PAR' : '--';
                parStatus.classList.add('text-slate-400');
                parStatus.classList.remove('text-cyan-300');
            }
        }
        if (sttCounter) {
            const sttCode = state.cyclone?.shortTermTrendCode || 'S';
            sttCounter.textContent = state.cyclone?.shortTermTrendLabel || 'S0.0/06H';
            sttCounter.className = `font-mono font-bold text-sm leading-tight ${
                sttCode === 'I' ? 'text-emerald-200' : (sttCode === 'W' ? 'text-red-200' : 'text-fuchsia-100')
            }`;
        }
        if (sttDelta) {
            sttDelta.textContent = state.cyclone?.shortTermTrendText || 'STEADY';
        }
        if (shearCounter) {
            const shearKt = Math.round(state.cyclone?.totalShearKt || 0);
            const effectiveShear = Math.round(state.cyclone?.effectiveShearKt || shearKt);
            shearCounter.textContent = `${shearKt} kt`;
            shearCounter.title = `Effective shear ${effectiveShear} kt`;
        }
        if (shearMeta) {
            const shearClass = state.cyclone?.shearClass || 'LIGHT';
            const shearDir = Number(state.cyclone?.shearDirectionDeg || 0);
            const tendency = Number(state.cyclone?.shearTendencyKt || 0);
            const trend = Math.abs(tendency) < 0.4 ? 'steady' : (tendency > 0 ? 'rising' : 'falling');
            shearMeta.textContent = `${shearClass} ${directionToCompass(shearDir)} ${trend}`;
        }
        const structure = state.cyclone?.stormStructure || {};
        const eyeMaturity = Math.max(0, Math.min(100, Math.round(Number(structure.eyeMaturity || 0) * 100)));
        const bandingMaturity = Math.max(0, Math.min(100, Math.round(Number(structure.bandingMaturity || 0) * 100)));
        if (eyeStatusCounter) {
            eyeStatusCounter.textContent = structure.eyeStatus || 'NO EYE';
            eyeStatusCounter.className = `font-mono font-bold text-sm leading-tight ${
                eyeMaturity >= 65 ? 'text-cyan-100' : (eyeMaturity >= 20 ? 'text-sky-200' : 'text-slate-300')
            }`;
        }
        if (eyeMaturityCounter) {
            eyeMaturityCounter.textContent = `${eyeMaturity}% CORE`;
        }
        if (bandingStatusCounter) {
            bandingStatusCounter.textContent = structure.bandingStatus || 'RAGGED BANDS';
            bandingStatusCounter.className = `font-mono font-bold text-sm leading-tight ${
                bandingMaturity >= 65 ? 'text-sky-100' : (bandingMaturity >= 25 ? 'text-blue-200' : 'text-slate-300')
            }`;
        }
        if (bandingMaturityCounter) {
            bandingMaturityCounter.textContent = `${bandingMaturity}% CURVE`;
        }
        const spinRate = Math.round(Number(structure.eyewallSpinRateDegHr || 0));
        const spinPeriod = Number(structure.eyewallRotationPeriodMin || 0);
        const mesoCount = Math.round(Number(structure.mesovortexCount || 0));
        const polygonal = Math.round(Number(structure.polygonalEyeScore || 0) * 100);
        const hotTowerCount = Math.round(Number(structure.hotTowerCount || 0));
        const moatScore = Math.round(Number(structure.moatScore || 0) * 100);
        if (eyewallSpinCounter) {
            eyewallSpinCounter.textContent = spinRate > 0 ? `${spinRate} deg/h` : '--';
            eyewallSpinCounter.className = `font-mono font-bold text-sm leading-tight ${
                spinRate >= 320 ? 'text-cyan-100' : (spinRate >= 120 ? 'text-sky-200' : 'text-slate-300')
            }`;
        }
        if (eyewallPeriodCounter) {
            eyewallPeriodCounter.textContent = spinPeriod > 0 ? `${Math.round(spinPeriod)} MIN LAP` : '--';
        }
        if (mesovortexCounter) {
            mesovortexCounter.textContent = mesoCount > 0 ? `${mesoCount} VORT` : '0 VORT';
            mesovortexCounter.className = `font-mono font-bold text-sm leading-tight ${
                mesoCount >= 5 ? 'text-rose-100' : (mesoCount > 0 ? 'text-pink-200' : 'text-slate-300')
            }`;
        }
        if (coreStageCounter) {
            coreStageCounter.textContent = mesoCount > 0 ? `${polygonal}% POLY` : (structure.coreStageStatus || 'CORE BUILDING');
        }
        if (hotTowerCounter) {
            hotTowerCounter.textContent = hotTowerCount > 0 ? `${hotTowerCount} HOT` : '0 HOT';
            hotTowerCounter.className = `font-mono font-bold text-sm leading-tight ${
                hotTowerCount >= 5 ? 'text-orange-100' : (hotTowerCount > 0 ? 'text-amber-200' : 'text-slate-300')
            }`;
        }
        if (moatCounter) {
            moatCounter.textContent = `${moatScore}% MOAT`;
        }
        updateInvestPanel();
    }

    function updateInvestPanel() {
        const cyclone = state.cyclone || {};
        const label = (cyclone.investId || cyclone.investDisplayId) ? getInvestLabel(cyclone) : '--';
        const chance48 = Math.round(cyclone.formationChance48h || 0);
        const chance7 = Math.round(cyclone.formationChance7d || 0);
        const category = classifyInvestChance(chance7);
        const category48 = classifyInvestChance(chance48);
        const organization = Math.round((cyclone.investOrganization || 0) * 100);
        const convection = Math.round((cyclone.investConvectivePulse || 0) * 100);
        const llc = Math.round((cyclone.investLowLevelCenter || 0) * 100);
        const disturbanceType = cyclone.investDisturbanceType || (cyclone.isInvest ? 'TROPICAL WAVE' : '--');
        const llcLabel = cyclone.investLowLevelCenterLabel || 'OPEN WAVE';
        const convTrend = cyclone.investConvectionTrend || 'PULSING';

        if (investIdCounter) {
            investIdCounter.textContent = label;
            investIdCounter.classList.toggle('text-slate-400', label === '--');
        }
        if (investChance48Counter) {
            investChance48Counter.textContent = `${chance48}%`;
            investChance48Counter.style.color = category48.color;
        }
        if (investChance7Counter) {
            investChance7Counter.textContent = `${chance7}%`;
            investChance7Counter.style.color = category.color;
        }
        if (investOrgCounter) {
            investOrgCounter.textContent = `${organization}%`;
            investOrgCounter.style.color = cyclone.closedLow ? '#67e8f9' : '#e2e8f0';
        }
        if (investCategoryCounter) {
            investCategoryCounter.textContent = category.label.toUpperCase();
            investCategoryCounter.style.color = category.color;
        }
        if (investOutlookSwatch) {
            investOutlookSwatch.style.backgroundColor = category.color;
            investOutlookSwatch.style.boxShadow = `0 0 14px ${category.color}88`;
        }
        if (investOutlookBar) {
            investOutlookBar.style.width = `${Math.max(0, Math.min(100, chance7))}%`;
            investOutlookBar.style.background = `linear-gradient(90deg, ${category48.color}, ${category.color})`;
        }
        if (investStructureCounter) {
            investStructureCounter.textContent = `${disturbanceType} / ${llcLabel}`;
            investStructureCounter.title = `${disturbanceType}; low-level center ${llc}%`;
        }
        if (investSatelliteCounter) {
            investSatelliteCounter.textContent = `${convTrend} ${convection}%`;
            investSatelliteCounter.title = `Convective pulse ${convection}%; outflow ${Math.round((cyclone.investOutflowQuality || 0) * 100)}%`;
        }
    }

    function refreshInvestOutlook(force = false) {
        updateInvestPanel();
        if (!state.cyclone || state.cyclone.status !== 'active') return;

        const currentHour = state.cyclone.age || 0;
        const isAdvisoryCycle = currentHour % 6 === 0;
        if (!force && !isAdvisoryCycle) return;
        if (!state.cyclone.investId && !state.cyclone.investDisplayId) return;

        const label = getInvestLabel(state.cyclone);
        const category = classifyInvestChance(state.cyclone.formationChance7d || 0);
        const statusKey = state.cyclone.isInvest ? category.code : (state.cyclone.investStatus || 'closed').toUpperCase();
        const signature = `${label}:${statusKey}:${!!state.cyclone.isInvest}`;
        if (state.lastInvestBannerSignature === signature) return;

        state.lastInvestBannerSignature = signature;
        if (state.cyclone.isInvest) {
            const headlineHTML = `TWO: <span class="text-white text-base align-middle not-italic ml-2 font-bold">${label} MONITORED</span>`;
            const type = state.cyclone.investDisturbanceType || 'DISTURBANCE';
            const llc = state.cyclone.investLowLevelCenterLabel || 'OPEN WAVE';
            const subText = `${category.label.toUpperCase()} DEVELOPMENT - ${Math.round(state.cyclone.formationChance48h || 0)}% / ${Math.round(state.cyclone.formationChance7d || 0)}% - ${type} / ${llc}`;
            triggerNewsBanner(headlineHTML, subText, currentHour, state.currentMonth, category.code === 'HIGH' ? 'RED' : 'ORANGE');
            return;
        }

        if (state.cyclone.investStatus === 'upgraded') {
            const headlineHTML = `${label} <span class="text-white text-base align-middle not-italic ml-2 font-bold">UPGRADED</span>`;
            const subText = state.cyclone.named ? 'TROPICAL STORM ADVISORIES BEGIN' : 'CLOSED LOW FORMED - DEPRESSION MONITORED';
            triggerNewsBanner(headlineHTML, subText, currentHour, state.currentMonth, 'ORANGE');
        }
    }

    function updateWarningPanel() {
        if (!warningList) return;

        const warnings = state.warningAdvisory?.active || [];
        if (warningCycle) {
            warningCycle.textContent = state.warningAdvisory?.issuedHour != null ? `T+${state.warningAdvisory.issuedHour}h` : '--';
        }

        if (warnings.length === 0) {
            warningList.innerHTML = '<div class="text-slate-600 uppercase tracking-widest">No active watches or warnings</div>';
            return;
        }

        warningList.innerHTML = warnings.slice(0, 5).map(warning => `
            <div class="flex items-center justify-between gap-2 bg-white/5 border border-white/5 px-2 py-1">
                <span class="truncate" style="color:${warning.color}">${warning.shortLabel}</span>
                <span class="text-slate-200 truncate text-right">${warning.city}</span>
                <span class="shrink-0 text-[10px] text-slate-500">${Math.round(warning.wind || 0)}KT/${Math.round(warning.hours)}H</span>
            </div>
        `).join('');
    }

    function refreshWarningAdvisory(force = false) {
        if (!state.cyclone || state.cyclone.status !== 'active') {
            state.warningAdvisory = { active: [], signature: '', issuedHour: null };
            updateWarningPanel();
            return;
        }

        const currentHour = state.cyclone.age || 0;
        const isAdvisoryCycle = currentHour % 6 === 0;
        if (!force && !isAdvisoryCycle) return;

        const nextAdvisory = buildWarningAdvisory(state.cyclone, state.pathForecasts, state.warningAdvisory);
        nextAdvisory.issuedHour = currentHour;
        state.warningAdvisory = nextAdvisory;
        updateWarningPanel();

        if (!nextAdvisory.changed || nextAdvisory.active.length === 0) return;
        if (state.lastWarningBannerSignature === nextAdvisory.signature) return;

        state.lastWarningBannerSignature = nextAdvisory.signature;
        const topWarning = nextAdvisory.active[0];
        const affectedCount = nextAdvisory.active.length;
        const headlineHTML = `TCV UPDATE: <span class="text-white text-base align-middle not-italic ml-2 font-bold">${topWarning.label.toUpperCase()} ISSUED</span>`;
        const isExtremeWind = topWarning.code === 'EW_WARNING' || topWarning.code === 'EW_WATCH';
        const bannerType = topWarning.priority >= 6 ? 'PURPLE' : (topWarning.priority >= 4 ? 'RED' : 'ORANGE');
        const subText = isExtremeWind
            ? `${Math.round(topWarning.wind || 0)}KT EXTREME WIND THREAT - ${affectedCount} AREA${affectedCount === 1 ? '' : 'S'}`
            : `${affectedCount} ACTIVE WATCH/WARNING AREA${affectedCount === 1 ? '' : 'S'}`;
        triggerNewsBanner(headlineHTML, subText, currentHour, state.currentMonth, bannerType);
    }

    function updatePagasaNaming() {
        if (!state.cyclone || state.cyclone.status !== 'active' || state.cyclone.basin !== 'WPAC') {
            return;
        }

        const wasInPAR = !!state.cyclone.inPAR;
        const nowInPAR = pointInPAR(state.cyclone.lon, state.cyclone.lat);
        state.cyclone.inPAR = nowInPAR;

        if (!nowInPAR) return;

        if (!state.cyclone.pagasaName && state.cyclone.intensity >= 25 && !state.cyclone.isExtratropical) {
            state.cyclone.pagasaName = getPagasaName(state.nextPagasaNameIndex, 1);
            state.nextPagasaNameIndex++;
            state.cyclone.parEnteredHour = state.cyclone.age || 0;
        }

        const localName = state.cyclone.pagasaName || 'MONITORED SYSTEM';
        const signature = `${localName}:${state.cyclone.parEnteredHour ?? state.cyclone.age}`;
        if (!wasInPAR && state.lastParBannerSignature !== signature) {
            state.lastParBannerSignature = signature;
            const headlineHTML = `PAGASA: <span class="text-white text-base align-middle not-italic ml-2 font-bold">${localName.toUpperCase()} ENTERED PAR</span>`;
            triggerNewsBanner(headlineHTML, 'SEVERE WEATHER BULLETIN DOMAIN', state.cyclone.age || 0, state.currentMonth, 'ORANGE');
        }
    }

    function updateInfoPanel() {
        const cat = getCategory(state.cyclone.intensity, state.cyclone.isTransitioning, state.cyclone.isExtratropical, state.cyclone.isSubtropical);
        document.getElementById('simulationTime').textContent = `SIM T+${state.cyclone.age} 小时`;
        document.getElementById('latitude').textContent = formatLatitude(state.cyclone.lat);
        document.getElementById('longitude').textContent = formatLongitude(state.cyclone.lon);
        document.getElementById('intensity').textContent = `${knotsToKph(state.cyclone.intensity)} kph (${knotsToMph(state.cyclone.intensity)} mph)`;
        const centerEnvP = getPressureAt(state.cyclone.lon, state.cyclone.lat, state.pressureSystems);
        const centralPressure = windToPressure(state.cyclone.intensity, state.cyclone.circulationSize, state.cyclone.basin, centerEnvP);
        document.getElementById('pressure').textContent = `${centralPressure.toFixed(0)} hPa`;
        document.getElementById('category').textContent = getCycloneCategoryLabel(state.cyclone, cat);
        document.getElementById('ace').textContent = state.cyclone.ace.toFixed(2);
        document.getElementById('direction').textContent = `${directionToCompass(state.cyclone.direction)}`;
        document.getElementById('speed').textContent = `${state.cyclone.speed.toFixed(0)} kts`;
        const isLand = state.cyclone.isLand || false;
        const currentSST = getSST(state.cyclone.lat, state.cyclone.lon, state.currentMonth, state.GlobalTemp);
        const basin = basinSelector.value || 'WPAC'; // 默认西太
        const cycloneNum = String(state.simulationCount).padStart(2, '0');
        const intensity = state.cyclone.intensity;
        const isExtra = state.cyclone.isExtratropical;
        const isSub = state.cyclone.isSubtropical;
        let effectiveHumidity = 75;
        let peakWindSoFar = 0;
        if (state.cyclone.track) {
            state.cyclone.track.forEach(p => {
                if (p[2] > peakWindSoFar) peakWindSoFar = p[2];
            });
        }
        
        // 直接使用气旋对象里的名字，不再重新查表
        const stormName = state.cyclone.name ? state.cyclone.name.toUpperCase() : "UNKNOWN";
        let statusText = "";

        // 判定逻辑：只要巅峰风速达到过 34kt，或者已经获得命名(named标志位)
        if (peakWindSoFar >= 34 || state.cyclone.named) {
            // 已获得命名
            if (state.cyclone.intensity >= 34) {
                // 当前仍是风暴级以上 -> 显示名字 (或 EX-名字)
                if (state.cyclone.isExtratropical) statusText = `EX-${stormName}`;
                else statusText = stormName;
            } else {
                // 当前已减弱为低压，但保留名字 -> 显示 TD 名字
                if (state.cyclone.isExtratropical) statusText = `EX-${stormName}`; 
                else if (state.cyclone.isSubtropical) statusText = `SD ${stormName}`;
                else statusText = `TD ${stormName}`;
            }
        } else {
            // 尚未获得命名 -> 显示编号 (TD 01)
            if (state.cyclone.isExtratropical) statusText = `EX ${cycloneNum}`;
            else if (state.cyclone.isSubtropical) statusText = `SD ${cycloneNum}`;
            else statusText = `TD ${cycloneNum}`;
        }
        statusText = getCycloneStatusText(state.cyclone, peakWindSoFar, cycloneNum);
        document.getElementById('status').textContent = statusText;

        if (state.cyclone && state.pressureSystems) {
            const samplingRadiusDeg = state.cyclone.circulationSize * 0.005;
            let envHumiditySum = 0;
            let minEnvHumidity = 60;
            const samplePoints = 12;

            for (let i = 0; i < samplePoints; i++) {
                const angleRad = (i / samplePoints) * 2 * Math.PI;
                // 计算采样点
                const sampleLon = state.cyclone.lon + samplingRadiusDeg * Math.cos(angleRad) / Math.cos(state.cyclone.lat * Math.PI / 180);
                const sampleLat = state.cyclone.lat + samplingRadiusDeg * Math.sin(angleRad);
                
                // 计算该点的背景湿度 (传入 globalTemp 计算 SST)
                const val = calculateBackgroundHumidity(
                    sampleLon, 
                    sampleLat, 
                    state.pressureSystems, 
                    state.currentMonth, 
                    state.cyclone,
                    state.GlobalTemp
                );
                
                envHumiditySum += val;
                
                if (val < minEnvHumidity) {
                    minEnvHumidity = val;
                }
            }
            
            const avgEnvHumidity = envHumiditySum / samplePoints;

            // B. 加权计
            effectiveHumidity = (minEnvHumidity * 0.4) + (avgEnvHumidity * 0.6);
        }

        // 3. 调用 updateSatelliteView (传入计算好的 effectiveHumidity)
        updateSatelliteView(
            state.cyclone.intensity, 
            state.cyclone.age, 
            state.cyclone.lat, 
            state.cyclone.isExtratropical, 
            state.cyclone.isSubtropical,
            isLand,
            currentSST,
            effectiveHumidity,
            state.cyclone.stormStructure || {},
            effectiveHumidity // <--- 使用加权后的湿度
        );
        
        if (state.cyclone.age % 6 === 0) {
            // 给 GPU 一点时间完成渲染 (虽然 snapshot() 会强制 render，但微任务队列更稳妥)
            // 由于这是在循环中，我们直接同步调用即可，WebGL 是同步提交指令的
            
            const snapshotData = getSatelliteSnapshot();
            
            if (snapshotData) {
                // 初始化存储数组
                if (!state.cyclone.satelliteCache) state.cyclone.satelliteCache = [];
                
                // 避免重复存储 (如果暂停/继续可能导致重复)
                const existingEntry = state.cyclone.satelliteCache.find(s => s.age === state.cyclone.age);
                if (!existingEntry) {
                    state.cyclone.satelliteCache.push({
                        age: state.cyclone.age,
                        img: snapshotData, // Base64 字符串
                        timestamp: Date.now() // 可选：记录真实生成时间
                    });
                }
            }
        }
    }

    function updateMapInfoBox() {
        const cat = getCategory(state.cyclone.intensity, state.cyclone.isTransitioning, state.cyclone.isExtratropical, state.cyclone.isSubtropical);
        document.getElementById('map-info-time').textContent = `T+${state.cyclone.age}h`;
document.getElementById('map-info-intensity').textContent = `${state.cyclone.isInvest ? 'INVEST' : cat.shortName} - ${state.cyclone.intensity.toFixed(0)}KT`;
        const centerEnvP = getPressureAt(state.cyclone.lon, state.cyclone.lat, state.pressureSystems);
        const pVal = windToPressure(state.cyclone.intensity, state.cyclone.circulationSize, state.cyclone.basin, centerEnvP);
        
        document.getElementById('map-info-movement').textContent = `${pVal.toFixed(0)}hPa ${directionToCompass(state.cyclone.direction)} ${state.cyclone.speed.toFixed(0)}KT`;
    }
    
    function updateStateSiteData() {
        if (state.siteLon != null && state.siteLat != null) {
            
            // 1. 获取原始风场
            // 注意：即使气旋未生成，这里也能算出背景风场
            let vec = getWindVectorAt(state.siteLon, state.siteLat, state.currentMonth, state.cyclone, state.pressureSystems);
            
            // ... (中间的陆地摩擦逻辑保持不变) ...
            if (state.world) {
                const isLand = state.world.features.some(feature => d3.geoContains(feature, [state.siteLon, state.siteLat]));
                if (isLand) {
                    vec.magnitude *= 0.78;
                    vec.u *= 0.78;
                    vec.v *= 0.78;
                } else {
                    // 近岸判定 (复用之前的逻辑)
                    const nearThreshold = 0.1; // 约50km
                    const isNearShore = state.world.features.some(feature => {
                        const geometry = feature.geometry;
                        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
                        return polygons.some(poly => poly.some(ring => ring.some(vertex => {
                            let dx = Math.abs(vertex[0] - state.siteLon);
                            if (dx > 180) dx = 360 - dx; 
                            const dy = Math.abs(vertex[1] - state.siteLat);
                            return dx < nearThreshold && dy < nearThreshold;
                        })));
                    });

                    if (isNearShore) {
                        vec.magnitude *= 0.89; 
                        vec.u *= 0.89;
                        vec.v *= 0.89;
                    }
                }
            }
            
            const speedKt = Math.round(vec.magnitude + Math.random());

            // 3. 计算风向字符串
            const flowAngleMath = Math.atan2(-vec.v, vec.u) * (180 / Math.PI);
            let windDir = (flowAngleMath + 250) % 360;
            if (windDir < 0) windDir += 360;
            const dirText = directionToCompass(windDir);

            // [新增] 计算雷达反射率并判断天气图标
            const dbz = calculateRadarDbz(state.siteLon, state.siteLat, state);
            const rainAtSite = state.cyclone?.status === 'active'
                ? estimateRainAtPoint(state.cyclone, state.siteLon, state.siteLat)
                : { rateMmHr: 0 };
            const siteWater = state.cyclone?.status === 'active'
                ? estimateRainEnhancedSurge(state.cyclone, { lon: state.siteLon, lat: state.siteLat }, speedKt, rainAtSite.rateMmHr * 3)
                : { totalWaterM: 0 };
            
            let weatherIcon = '<i class="fa-solid fa-sun text-yellow-500"></i>'; // 默认晴天
            const isNight = false; // 简化的昼夜逻辑，你可以扩展它

            // 简单的天气判定逻辑
            if (dbz >= 50) {
                weatherIcon = '<i class="fa-solid fa-cloud-bolt text-yellow-500"></i>';
            } else if (dbz >= 35) {
                weatherIcon = '<i class="fa-solid fa-cloud-showers-heavy text-blue-500"></i>'; // 大雨
            } else if (dbz >= 15) {
                weatherIcon = '<i class="fa-solid fa-cloud-rain text-blue-400"></i>'; // 中雨
            } else if (dbz >= 5) {
                weatherIcon = '<i class="fa-solid fa-cloud text-slate-400"></i>'; // 阴天/多云
            } else {
                weatherIcon = '<i class="fa-solid fa-sun text-yellow-500"></i>';
            }

            // 构建包含 HTML 的 Label
            // 使用 span 调整间距
            const label = `${weatherIcon} <span style="margin-left:2px;">${dirText}</span> / ${speedKt}KT`;
            let localPressure = 1010; // 默认值
            // 1. 获取当前模拟时间的 UTC 小时数
            // state.cyclone.age 是模拟开始后的累计小时数
            // 假设模拟通常从 00Z 或 06Z 开始并不重要，关键是相对变化
            const currentSimHour = (state.cyclone && state.cyclone.age) ? state.cyclone.age : 0;
            
            // 2. 计算当地平太阳时 (LMT)
            // 经度每 15 度相差 1 小时
            const localHour = (currentSimHour + state.siteLon / 15) % 24;

            // 3. 计算半日潮 (Semi-diurnal Tide)
            // 规律：每天有两个高点 (10:00, 22:00) 和两个低点 (04:00, 16:00)
            // 使用余弦波模拟：Cos((Hour - 10) / 12 * 2π)
            // 当 Hour=10 时，Cos(0)=1 (最高)；当 Hour=16 时，Cos(π)=-1 (最低)
            
            // 振幅纬度修正：赤道最强 (~1.6 hPa)，两极最弱 (~0 hPa)
            const latFactor = Math.max(0, Math.cos(state.siteLat * Math.PI / 180));
            const tideAmplitude = 1.6 * latFactor; 
            
            const diurnalBias = tideAmplitude * Math.cos(((localHour - 10) / 12) * 2 * Math.PI);

            // 4. 叠加微小随机噪声 (模拟测量误差/微湍流)
            const microNoise = (Math.random() - 0.5) * 0.2;
            const Pn = getPressureAt(state.siteLon, state.siteLat, state.pressureSystems);
            if (state.cyclone && state.cyclone.status === 'active') {
                const distKm = calculateDistance(state.cyclone.lat, state.cyclone.lon, state.siteLat, state.siteLon);
                const Rm = 10 + state.cyclone.circulationSize * 0.25;
                const centerEnvP = getPressureAt(state.cyclone.lon, state.cyclone.lat, state.pressureSystems);
                const Pc = windToPressure(state.cyclone.intensity, state.cyclone.circulationSize, basinSelector.value, centerEnvP);
    
                // 基础气压 (Holland 模型)
                const baseP = Pc + (Pn - Pc) * Math.exp(-Rm / Math.max(1, distKm));
                
                // 叠加潮汐修正
                localPressure = baseP + diurnalBias + microNoise;
            } else {
                localPressure = Pn + diurnalBias + microNoise;
            }

            // 4. 更新 State
            state.currentSiteData = {
                u: vec.u,
                v: vec.v,
                magnitude: vec.magnitude,
                displaySpeed: speedKt,
                label: label, // 现在这是 HTML 字符串
                dbz: dbz,     // 保存 dBZ 数值备用
                rainRateMmHr: rainAtSite.rateMmHr || 0,
                floodLevelM: siteWater.totalWaterM || 0,
                pressure: localPressure,
                isSelected: state.isSiteSelected
            };
        } else {
            state.currentSiteData = null;
        }
    }

    // --- 核心模拟循环 ---

    function updateSimulation() {
        if (state.cyclone.status !== 'active') {
            clearInterval(state.simulationInterval);
            state.simulationInterval = null;
            state.isPaused = false;
            
            // --- 变量统一区域 (彻底解决命名混乱) ---
            const basinId = basinSelector.value || 'WPAC'; // 下拉菜单的值 (用于查名字表), 例如 "WPAC"
            const cycloneInfo = {
                basin: basinId,
                month: state.currentMonth,
                year: state.currentYear,
                investNumber: state.cyclone.investNumber
            };
            
            // 生成最佳路径文本
            const bestTrackText = formatBestTrack(state.cyclone.track, cycloneInfo, state.simulationCount);
            
            // 解析简写代码 (用于显示编号), 例如 "WP"
            const firstLine = bestTrackText.split('\n')[0];
            const basinCode = firstLine.split(',')[0].trim(); 
            const cycloneNumStr = String(state.simulationCount).padStart(2, '0');
            
            // -------------------------------------

            // 1. 遍历轨迹计算极值 (Peak Wind & Min Pressure)
            let peakWind = 0;
            let minPressure = 9999;
            state.cyclone.track.forEach(point => {
                const intensity = point[2];
                let pressure;
                if (point[10] !== undefined && point[10] !== null) {
                    pressure = point[10];
                } else {
                    // 兼容旧存档的回退逻辑 (只有读取旧版存档时才会执行这里)
                    const circulationSize = point[5] || 300;
                    // 注意：事后反算无法获取当时的环境气压，只能用默认值，这是造成不一致的根源
                    // 但对于新模拟，point[10] 一定存在，所以不会进这里
                    pressure = Math.round(windToPressure(intensity, circulationSize, basinId)); 
                }

                if (intensity > peakWind) peakWind = intensity;
                if (pressure < minPressure) minPressure = pressure;
            });

            // 2. 获取名字 (使用 basinId 查表)
            const cycloneNum = String(state.simulationCount).padStart(2, '0');
            const stormName = state.cyclone.name ? state.cyclone.name.toUpperCase() : "UNKNOWN";
            let statusText = "";

            // 逻辑与 updateInfoPanel 完全一致
            if (peakWind >= 34 || state.cyclone.named) {
                if (state.cyclone.intensity >= 34) {
                    if (state.cyclone.isExtratropical) statusText = `EX-${stormName}`;
                    else statusText = stormName;
                } else {
                    if (state.cyclone.isExtratropical) statusText = `EX-${stormName}`;
                    else if (state.cyclone.isSubtropical) statusText = `SD ${stormName}`;
                    else statusText = `TD ${stormName}`;
                }
            } else {
                if (state.cyclone.isExtratropical) statusText = `EX ${cycloneNum}`;
                else if (state.cyclone.isSubtropical) statusText = `SD ${cycloneNum}`;
                else statusText = `TD ${cycloneNum}`;
            }
            // 更新 UI
            statusText = getCycloneStatusText(state.cyclone, peakWind, cycloneNum);
            document.getElementById('status').textContent = statusText;
            document.getElementById('map-info-box').classList.add('hidden');
            
            // 重置按钮状态
            pauseButton.disabled = true;
            pauseButton.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
            monthSelector.disabled = false;
            if (yearSelector) yearSelector.disabled = false;
            basinSelector.disabled = false;
            globalTempSlider.disabled = false;
            globalShearSlider.disabled = false;
            siteNameInput.disabled = false;
            customLonInput.disabled = false;
            customLatInput.disabled = false;
            siteLonInput.disabled = false;
            siteLatInput.disabled = false;
            updateGameMenuState();

            // 4. 创建最终统计对象 (使用 basinCode 组合编号, 如 "WP 01")
            const finalNumberLabel = (state.cyclone.investStatus !== 'upgraded' && (state.cyclone.investDisplayId || state.cyclone.investId))
                ? (state.cyclone.investDisplayId || state.cyclone.investId)
                : `${basinCode} ${cycloneNumStr}`;
            const finalStats = {
                number: finalNumberLabel,
                peakWind: Math.round(peakWind),
                minPressure: Math.round(minPressure),
                ace: state.cyclone.ace.toFixed(2),
                damage: formatDamage(state.impactState?.damageUsd || 0),
                deaths: Math.floor(state.impactState?.deaths || 0),
                maxRain: formatRain(state.impactState?.maxRainMm || 0),
                maxSurge: formatSurge(state.impactState?.maxSurgeM || 0)
            };
            state.lastFinalStats = finalStats;

            // 5. 绘图
            // 注意：这里传给 drawFinalPath 的是 basinId (selector value)，因为它可能需要用来确定颜色逻辑等
            drawFinalPath(mapSvg, mapProjection, state.cyclone, state.world, tooltip, state.siteName, state.siteLon, state.siteLat, state.showPathPoints, finalStats, basinId, state.pressureSystems, state.showWindField);
            requestRedraw();
            
            if (state.showIntensityChart) {
                forecastContainer.classList.remove('hidden');
            }
            setTimeout(() => {
                drawHistoricalIntensityChart(chartContainer, state.cyclone.track, tooltip);
            }, 0);

            bestTrackData.value = bestTrackText;
            bestTrackContainer.classList.remove('hidden');
            copyTrackButton.textContent = "复制数据";

            // 6. 保存历史记录
            try {
                const totalHours = state.cyclone.age;
                const peakIntensityKt = Math.round(peakWind);
                
                // 历史列表显示的名称
                const seasonStamp = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
                const historyName = `${seasonStamp} ${statusText} (${finalNumberLabel}) - T+${totalHours}h, Peak ${peakIntensityKt}kt`;
                const cycloneClone = { ...state.cyclone };
                const satCacheRef = cycloneClone.satelliteCache;
                delete cycloneClone.satelliteCache;
                const cycloneDataDeep = JSON.parse(JSON.stringify(cycloneClone));
                if (satCacheRef) {
                    cycloneDataDeep.satelliteCache = satCacheRef;
                }
                state.history.push({ 
                    name: historyName, 
                    cycloneData: cycloneDataDeep,
                    atcfData: bestTrackText,
                    pressureHistory: JSON.parse(JSON.stringify(state.pressureHistory || [])),
                    siteHistory: JSON.parse(JSON.stringify(state.siteHistory || [])),
                    impactState: JSON.parse(JSON.stringify(state.impactState || createImpactState())),
                    warningAdvisory: JSON.parse(JSON.stringify(state.warningAdvisory || { active: [] }))
                });
                broadcastMultiplayerState(true);
                state.simulationCount++;
            } catch (e) {
                console.error("无法保存历史记录:", e);
            }
            return;
        }        // [修改] 传递 GlobalTemp 到模型
        const wasNamed = state.cyclone.named;
        const wasInvest = !!state.cyclone.isInvest;
        const previousInvestStatus = state.cyclone.investStatus;
        state.pressureSystems = updatePressureSystems(state.pressureSystems, state.cyclone.currentMonth, state.GlobalTemp, state.GlobalShear);
        state.frontalZone = updateFrontalZone(state.pressureSystems, state.currentMonth, state.GlobalTemp, state.GlobalShear);
        state.cyclone = updateCycloneState(state.cyclone, state.pressureSystems, state.frontalZone, state.world, state.currentMonth, state.GlobalTemp, state.GlobalShear, state.nextNameIndex, getActiveNameLists());
        updatePagasaNaming();
        refreshInvestOutlook(wasInvest !== !!state.cyclone.isInvest || previousInvestStatus !== state.cyclone.investStatus);
        updateImpactState(state.impactState, state.cyclone);
        state.cyclone.currentMonth = state.currentMonth;
        state.cyclone.currentYear = state.currentYear;
        if (state.cyclone.status === 'active') {
            // 为了节省内存，我们只存 keyframe (比如对应 track 的每一个点)
            // 假设 updateTimer 触发 track 更新时刻：
            
            // 深拷贝当前的气压系统状态 (非常关键！必须切断引用)
            const snapshot = {
                age: state.cyclone.age, // 时间戳，用于对齐
                month: state.cyclone.currentMonth, // 记录当时的月份(影响SST等)
                // 只存 lower 层即可，因为天气图主要画地面场
                lower: JSON.parse(JSON.stringify(state.pressureSystems.lower || [])),
                upper: JSON.parse(JSON.stringify(state.pressureSystems.upper || [])) // 如果以后要画高空图也可以存
            };
            
            // 存入历史数组
            state.pressureHistory.push(snapshot);
        }
        if (!wasNamed && state.cyclone.named) {
            state.nextNameIndex++;
            console.log("Name assigned. Next name index:", state.nextNameIndex);
        }

        if (!state.hasTriggeredCat1News && state.cyclone.intensity >= 64 && !state.cyclone.isExtratropical) {
            state.hasTriggeredCat1News = true; // 锁定，防止重复触发
            
            // 获取名字 (如果没有名字显示编号)
            const cycloneNum = String(state.simulationCount).padStart(2, '0');
            const displayName = getCycloneHeadlineName(state.cyclone, cycloneNum);
            const currentBasinId = basinSelector.value; 

            let stormTerm = "HURRICANE";
            if (currentBasinId === 'WPAC') stormTerm = "TYPHOON";
            else if (currentBasinId === 'MED') stormTerm = "MEDICANE";
            else if (['NIO', 'SIO', 'SHEM'].includes(currentBasinId)) { stormTerm = "CAT-1 CYCLONE"; }
            
            // 构建 HTML 标题
            const headlineHTML = `${displayName} <span class="text-black/50 text-base align-middle not-italic ml-2 font-bold">HAS BECOME A ${stormTerm}</span>`;

            // [修改] 调用新函数，类型为 ORANGE
            triggerNewsBanner(headlineHTML, "BREAKING NEWSLETTER", state.cyclone.age, state.currentMonth, 'ORANGE');
        }
        
        if (!state.hasTriggeredCat5News && state.cyclone.intensity >= 137 && !state.cyclone.isExtratropical) {
            state.hasTriggeredCat5News = true;
            
            const cycloneNum = String(state.simulationCount).padStart(2, '0');
            const displayName = getCycloneHeadlineName(state.cyclone, cycloneNum);
            const currentBasinId = basinSelector.value;

            // 术语区分：西太叫“超强台风”，其他叫“五级飓风”
            let statusTerm = "CATEGORY 5 HURRICANE";
            if (currentBasinId === 'WPAC') {
                statusTerm = "CAT-5 SUPER TYPHOON";
            } else if (currentBasinId === 'MED') {
                statusTerm = "RARE MAJOR MEDICANE";
            }

            // 构建标题 HTML (紫色高亮风格)
            // 注意：这里使用 font-black 加粗，让 Cat 5 看起来更具压迫感
            const headlineHTML = `${displayName} <span class="text-black/60 text-base align-middle not-italic ml-2 font-black">ACHIEVED ${statusTerm} STATUS</span>`;

            // 调用新闻条 (类型为 PURPLE)
            triggerNewsBanner(headlineHTML, "EXTREME INTENSITY ALERT", state.cyclone.age, state.currentMonth, 'PURPLE');
        }

        if (state.siteLon != null && state.siteLat != null) {
            const dist = calculateDistance(state.cyclone.lat, state.cyclone.lon, state.siteLat, state.siteLon);
            
            // 阈值：400km
            if (dist <= 400 && state.cyclone.intensity >= 34) {
                // 只有当之前没有报警过时，才播放
                if (!state.hasAlerted) {
                    playAlert(); // 播放空灵科技音效
                    state.hasAlerted = true; // 锁定，防止下一帧重复播放
                    
                    // 可选：在控制台或界面给出一个小的视觉提示
                    console.log(`Alert: Cyclone entered 400km radius (${Math.round(dist)}km)`);
const cycloneNum = String(state.simulationCount).padStart(2, '0');
                    const displayName = getCycloneHeadlineName(state.cyclone, cycloneNum);
                    const siteName = state.siteName ? state.siteName.toUpperCase() : "OBSERVATION POST";

                    // 构建标题 HTML (红色警报风格)
                    const headlineHTML = `ALERT: <span class="text-white text-base align-middle not-italic ml-2 font-bold">${displayName} ENTERED 400KM WARNING RANGE</span>`;
                    
                    // 调用函数，类型为 RED
                    triggerNewsBanner(headlineHTML, `THREAT TO ${siteName}`, state.cyclone.age, state.currentMonth, 'RED');
                }
            } else {
                // 如果气旋离开了 800km 范围，重置标志
                // 这样如果它回头再次进入，会再次报警
                state.hasAlerted = false; 
            }
        }

        updateInfoPanel();
        updateMapInfoBox();
        updateImpactPanel();
        updateStateSiteData();

        // 存入历史 (保持原有逻辑，因为这里是随时间推进的)
        if (state.currentSiteData) {
            const currentHour = state.cyclone.age;
            const lastEntry = state.siteHistory[state.siteHistory.length - 1];
            if (!lastEntry || lastEntry.hour !== currentHour) {
                 state.siteHistory.push({
                    hour: currentHour,
                    // 核心数据
                    wind: state.currentSiteData.displaySpeed,
                    pressure: state.currentSiteData.pressure,
                    // 矢量分量 (用于反推风向)
                    u: state.currentSiteData.u,
                    v: state.currentSiteData.v,
                    // 天气数据
                    dbz: state.currentSiteData.dbz,
                    rainRateMmHr: state.currentSiteData.rainRateMmHr || 0,
                    floodLevelM: state.currentSiteData.floodLevelM || 0,
                    // 记录当时的站点位置，以防用户后来改了位置导致数据错位
                    lat: state.siteLat,
                    lon: state.siteLon
                });
            }
        }

        drawMap(mapSvg, mapProjection, state.world, state.cyclone, {
            pathForecasts: state.pathForecasts,
            warnings: state.warningAdvisory.active,
            pressureSystems: state.pressureSystems,
            showPressureField: state.showPressureField,
            showHumidityField: state.showHumidityField,
            showPathForecast: state.showPathForecast,
            showWindRadii: state.showWindRadii,
            siteName: state.siteName,
            siteLon: state.siteLon,
            siteLat: state.siteLat,
            showPathPoints: state.showPathPoints,
            showWindField: state.showWindField,
            showSteeringCurrents: state.showSteeringCurrents,
            month: state.currentMonth,
            siteHistory: state.siteHistory,
            siteData: state.currentSiteData,
            remoteCyclone: getMultiplayerRemoteCyclone(),
            performanceProfile: getPerformanceProfile(),
            basin: state.cyclone?.basin || basinSelector.value || 'WPAC',
            onSiteClick: () => { 
                state.isSiteSelected = !state.isSiteSelected;
                requestRedraw();
            }
        });
        
        if (state.cyclone.age % 3 === 0 && state.cyclone.age > 0) {
             const forecasts = generatePathForecasts(state.cyclone, state.pressureSystems, checkLandWrapper, state.GlobalTemp, state.GlobalShear);
             state.pathForecasts = forecasts;
             if (state.cyclone.age % 6 === 0 && state.cyclone.age > 0) {
                 if (!state.cyclone.forecastLogs) state.cyclone.forecastLogs = {};
                 state.cyclone.forecastLogs[state.cyclone.age] = JSON.parse(JSON.stringify(forecasts));
             }
        }
        refreshWarningAdvisory();
        broadcastMultiplayerState();
        if (state.cyclone.track.length > 3) {
            generateJTWCButton.classList.remove('hidden');
        }
    }

    function startSimulation() {
        playStart();
        hideGameMenu();
        selectedHistoryPointIndex = -1;
        if (state.simulationInterval) clearInterval(state.simulationInterval);
        state.isPaused = false;
        state.hasAlerted = false;
        state.hasTriggeredCat1News = false;
        state.hasTriggeredCat5News = false;
        state.siteHistory = []; 
        state.impactState = createImpactState();
        state.warningAdvisory = { active: [], signature: '', issuedHour: null };
        state.lastWarningBannerSignature = '';
        state.lastParBannerSignature = '';
        state.lastInvestBannerSignature = '';
        updateImpactPanel();
        updateInvestPanel();
        updateWarningPanel();
        state.pressureHistory = [];
        state.isSiteSelected = false;
        state.selectedHistoryCyclone = null;
        if (!state.world) return;
        resetSatelliteParams();
        setupCanvases();
        document.getElementById('initial-message').classList.add('hidden');
        document.getElementById('simulation-output').classList.remove('hidden');
        document.getElementById('info-panel').classList.remove('hidden');
        syncSatelliteInsetVisibility(state.showSatelliteInset);
        const newsContainer = document.getElementById('news-feed-container');
        if (newsContainer) {
            newsContainer.innerHTML = ''; // 直接清空所有子元素
        }
        forecastContainer.classList.add('hidden');
        document.getElementById('map-info-box').classList.remove('hidden');
        bestTrackContainer.classList.add('hidden');
        
        // [UI修复] 使用 innerHTML 设置带图标的按钮，保持风格一致
        generateButton.innerHTML = '<span class="relative z-10 flex items-center justify-center gap-2"><i class="fa-solid fa-power-off"></i> RESTART</span>';
        pauseButton.disabled = false;
        // [UI修复] 设置为暂停图标
        pauseButton.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
        
        const selectedBasin = basinSelector.value;
        syncFictioniaTerrainMode(selectedBasin);
        if (!state.lastBasin || state.lastBasin !== selectedBasin) {
            const list = getActiveNameList(selectedBasin);
            state.nextNameIndex = Math.floor(Math.random() * list.length);
        }
        state.lastBasin = selectedBasin;
        state.currentMonth = parseInt(monthSelector.value, 10);
        state.currentYear = normalizeSimulationYear(yearSelector?.value || state.currentYear);
        if (yearSelector) {
            yearSelector.value = String(state.currentYear);
            localStorage.setItem('tcs_sim_year', String(state.currentYear));
        }
        monthSelector.disabled = true;
        if (yearSelector) yearSelector.disabled = true;
        basinSelector.disabled = true;
        // [修改] 禁用设置滑块
        globalTempSlider.disabled = true;
        globalShearSlider.disabled = true;
        siteNameInput.disabled = true;
        customLonInput.disabled = true;
        customLatInput.disabled = true;
        siteLonInput.disabled = true;
        siteLatInput.disabled = true;
        settingsMenu.classList.add('hidden'); // [修改] 开始模拟时隐藏菜单

        // [修改] 传递 GlobalTemp 到模型
        state.cyclone = initializeCyclone(state.world, state.currentMonth, selectedBasin, state.GlobalTemp, state.GlobalShear, state.customLon, state.customLat); 
        state.cyclone.currentYear = state.currentYear;
        assignInvestDesignation(state.cyclone, selectedBasin);
        state.cyclone.track.push([
            state.cyclone.lon,
            state.cyclone.lat,
            state.cyclone.intensity,
            false,
            false,
            state.cyclone.circulationSize,
            state.cyclone.isSubtropical,
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            null,
            state.cyclone.ohcKjCm2 || 0,
            0,
            'none',
            state.cyclone.investId || '',
            state.cyclone.formationChance48h || 0,
            state.cyclone.formationChance7d || 0,
            !!state.cyclone.isInvest
        ]);
        state.pressureSystems = initializePressureSystems(state.cyclone, state.currentMonth, state.GlobalTemp, state.GlobalShear);
        state.frontalZone = updateFrontalZone(state.pressureSystems, state.currentMonth, state.GlobalTemp, state.GlobalShear);
        
        state.pathForecasts = generatePathForecasts(state.cyclone, state.pressureSystems, checkLandWrapper, state.GlobalTemp, state.GlobalShear);
        broadcastMultiplayerState(true);
        refreshInvestOutlook(true);
        refreshWarningAdvisory(true);
        updateToggleButtonVisual(togglePressureButton, state.showPressureField);
        updateToggleButtonVisual(toggleWindRadiiButton, state.showWindRadii);
        updateToggleButtonVisual(togglePathButton, state.showPathForecast);
        updateToggleButtonVisual(toggleSteeringButton, state.showSteeringCurrents);
        state.simulationInterval = setInterval(updateSimulation, state.simulationSpeed);
        updateGameMenuState();
    }
    
    function togglePause() {
        if (!state.cyclone.status || state.cyclone.status !== 'active') {
            playError(); // [新增] 如果无法暂停（未激活），播放错误音
            return;
        }
        playClick();
        state.isPaused = !state.isPaused;
        if (state.isPaused) {
            clearInterval(state.simulationInterval);
            state.simulationInterval = null;
            // [UI修复] 暂停状态显示播放图标
            pauseButton.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
            document.getElementById('status').textContent = "模拟已暂停";
            requestRedraw();
        } else {
            state.simulationInterval = setInterval(updateSimulation, state.simulationSpeed);
            // [UI修复] 运行状态显示暂停图标
            pauseButton.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
            updateInfoPanel();
        }
    }

    let redrawPending = false;

    function requestRedraw() {
        if (redrawPending) return;
        redrawPending = true;
        requestAnimationFrame(() => {
            redrawPending = false;
            performRedraw();
        });
    }

    function performRedraw() {
        // 1. 确保在重绘前更新站点数据
        updateStateSiteData();
        // 2. 【核心】检查气旋状态，控制显示标志
        const isCycloneActive = state.cyclone && state.cyclone.status === 'active';
        const onSiteClickCallback = () => {
            state.isSiteSelected = !state.isSiteSelected;
            requestRedraw();
        };
        if (state.world && mapSvg) {
            if (isCycloneActive || !state.cyclone.track || state.cyclone.track.length < 2) {
        // 如果模拟结束，强制隐藏所有气旋相关的动态元素
                const forecasts = isCycloneActive ? state.pathForecasts : [];
                const showRadii = isCycloneActive && state.showWindRadii;
                const showForecast = isCycloneActive && state.showPathForecast;
                const showWindField = isCycloneActive && state.showWindField;
                const showPressure = isCycloneActive && state.showPressureField;
                const showHumidity = isCycloneActive && state.showHumidityField;
                const siteDataToPass = state.currentSiteData;
    
                drawMap(mapSvg, mapProjection, state.world, state.cyclone, {
                    pathForecasts: forecasts,
                    warnings: state.warningAdvisory.active,
                    pressureSystems: state.pressureSystems,
                    showPressureField: showPressure,
                    showHumidityField: showHumidity,
                    showPathForecast: showForecast,
                    showWindRadii: showRadii,
                    siteName: state.siteName,
                    siteLon: state.siteLon,
                    siteLat: state.siteLat,
                    showPathPoints: state.showPathPoints,
                    showWindField: showWindField,
                    showSteeringCurrents: isCycloneActive && state.showSteeringCurrents,
                    month: state.currentMonth,
                    siteHistory: state.siteHistory,
                    siteData: siteDataToPass,
                    remoteCyclone: getMultiplayerRemoteCyclone(),
                    performanceProfile: getPerformanceProfile(),
                    basin: state.cyclone?.basin || basinSelector.value || 'WPAC',
                    onSiteClick: onSiteClickCallback,
                    isPaused: state.isPaused,
                    // [新增] 删除回调
                    onSystemRemove: (systemData) => {
                        // 1. 确认是手动系统
                        if (!systemData.isManual) return;

                        // 2. 从 lower 和 upper 层中移除
                        // 我们通过 isManual 标记来查找，确保删干净
                        const removeManual = (list) => {
                            const idx = list.findIndex(s => s.isManual);
                            if (idx !== -1) list.splice(idx, 1);
                        };

                        if (state.pressureSystems.lower) removeManual(state.pressureSystems.lower);
                        if (state.pressureSystems.upper) removeManual(state.pressureSystems.upper);

                        playToggleOff(); // 播放删除音效
                        requestRedraw();
                    }
                });
            } else {
                const siteDataToPass = state.currentSiteData ? { 
                    ...state.currentSiteData, 
                    label: null 
                } : null;
                drawFinalPath(
                    mapSvg, mapProjection, state.cyclone, state.world, tooltip, 
                    state.siteName, state.siteLon, state.siteLat, 
                    state.showPathPoints, state.lastFinalStats, basinSelector.value, 
                    state.pressureSystems, state.showWindField,
                    // [新增] 传入站点相关参数
                    state.currentMonth, state.siteHistory, siteDataToPass, onSiteClickCallback
                );
            }
        }
    }

    function initMusicPlaylist() {
        if (!musicListContainer) return;
        musicListContainer.innerHTML = ''; // 清空现有内容

        musicTracks.forEach((filename, index) => {
            // 1. 提取显示名称 (移除 .mp4 后缀)
            const displayName = filename.replace(/\.mp4$/i, '').replace(/_/g, ' '); // 同时把下划线替换为空格，好看一点

            // 2. 创建列表项
            const li = document.createElement('li');
            li.className = "flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-all border border-transparent hover:bg-white/5 hover:border-white/10 group";
            
            // 3. 内部 HTML 结构
            li.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <i class="fa-solid fa-play text-[10px] text-slate-600 group-hover:text-cyan-400 transition-colors status-icon"></i>
                    <span class="text-xs font-mono text-slate-400 group-hover:text-white truncate transition-colors">${displayName}</span>
                </div>
                <div class="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-0 active-indicator shadow-[0_0_5px_cyan]"></div>
            `;

            // 4. 点击事件
            li.addEventListener('click', () => {
                playSelectedTrack(filename, index);
            });

            musicListContainer.appendChild(li);
        });
    }

    // [函数] 播放指定音轨
    function playSelectedTrack(filename, index) {
        // 如果点击的是当前正在播放的，且正在播放中，则暂停
        if (currentTrackIndex === index && !bgmAudio.paused) {
            bgmAudio.pause();
            updateMusicUI(index, false);
            return;
        }

        // 切换源并播放
        // 假设音乐文件在根目录或特定目录下，如果在 js 同级需调整路径，例如 `audio/${filename}`
        bgmAudio.src = filename; 
        bgmAudio.volume = bgmVolumeSlider ? bgmVolumeSlider.value : 0.4;
        
        bgmAudio.play().then(() => {
            currentTrackIndex = index;
            updateMusicUI(index, true);
        }).catch(err => {
            console.error("播放失败:", err);
        });
    }

    // [函数] 更新播放列表 UI 状态 (高亮当前项)
    function updateMusicUI(activeIndex, isPlaying) {
        const items = musicListContainer.querySelectorAll('li');
        
        items.forEach((item, idx) => {
            const icon = item.querySelector('.status-icon');
            const text = item.querySelector('span');
            const indicator = item.querySelector('.active-indicator');

            if (idx === activeIndex) {
                // 激活状态样式
                item.classList.add('bg-white/10', 'border-cyan-500/30');
                text.classList.replace('text-slate-400', 'text-cyan-400');
                indicator.classList.remove('opacity-0');
                
                if (isPlaying) {
                    icon.className = "fa-solid fa-pause text-[10px] text-cyan-400 status-icon";
                    // 主按钮高亮
                    musicButton.classList.add('text-cyan-400', 'border-cyan-500');
                } else {
                    icon.className = "fa-solid fa-play text-[10px] text-cyan-400 status-icon";
                    musicButton.classList.remove('text-cyan-400', 'border-cyan-500');
                }
            } else {
                // 重置其他项
                item.classList.remove('bg-white/10', 'border-cyan-500/30');
                text.classList.replace('text-cyan-400', 'text-slate-400');
                indicator.classList.add('opacity-0');
                icon.className = "fa-solid fa-play text-[10px] text-slate-600 group-hover:text-cyan-400 transition-colors status-icon";
            }
        });
    }

    // [初始化]
    initMusicPlaylist();
    updateMultiplayerPanel();
    const multiplayerApi = getMultiplayerApi();
    if (multiplayerApi) {
        multiplayerApi.onEvent(handleMultiplayerEvent);
        multiplayerApi.getStatus().then(applyMultiplayerStatus).catch(() => {});
    } else if (mpChatInput) {
        appendMultiplayerMessage({ kind: 'system', text: 'Multiplayer is available in the Windows desktop app.', time: Date.now() });
    }

    // --- 事件监听器 ---
    if (introContinueButton) introContinueButton.addEventListener('click', () => {
        playClick();
        showMainMenu();
    });
    if (introSkipButton) introSkipButton.addEventListener('click', () => {
        playClick();
        showMainMenu();
    });
    if (gameMenuButton) gameMenuButton.addEventListener('click', () => {
        playClick();
        showMainMenu();
    });
    if (menuCloseButton) menuCloseButton.addEventListener('click', () => {
        playClick();
        hideGameMenu();
    });
    if (menuResumeButton) menuResumeButton.addEventListener('click', () => {
        playClick();
        hideGameMenu();
    });
    if (menuStartButton) menuStartButton.addEventListener('click', () => {
        if (generateButton.disabled) {
            playError();
            return;
        }
        syncMainControlsFromMenu();
        startSimulation();
    });
    if (menuMultiplayerButton) menuMultiplayerButton.addEventListener('click', () => {
        hideGameMenu();
        multiplayerButton?.click();
    });
    if (menuSettingsButton) menuSettingsButton.addEventListener('click', () => {
        hideGameMenu();
        settingsMenu.classList.remove('hidden');
        playClick();
    });
    if (menuHelpButton) menuHelpButton.addEventListener('click', () => {
        hideGameMenu();
        helpButton?.click();
    });
    if (menuFeedbackBugButton) menuFeedbackBugButton.addEventListener('click', () => {
        playClick();
        setMenuFeedbackType('bug');
    });
    if (menuFeedbackSuggestionButton) menuFeedbackSuggestionButton.addEventListener('click', () => {
        playClick();
        setMenuFeedbackType('suggestion');
    });
    if (menuFeedbackSendButton) menuFeedbackSendButton.addEventListener('click', sendMenuFeedbackToGitHub);
    if (menuLofiButton) menuLofiButton.addEventListener('click', () => {
        playClick();
        shuffleMenuLofi(true);
    });
    if (menuLofiAudio) {
        menuLofiAudio.addEventListener('play', () => updateMenuLofiStatus('Playing'));
        menuLofiAudio.addEventListener('pause', () => updateMenuLofiStatus('Paused'));
        menuLofiAudio.addEventListener('error', () => updateMenuLofiStatus('Unavailable'));
    }
    [menuBasinSelector, menuMonthSelector, menuYearSelector].forEach((control) => {
        if (!control) return;
        control.addEventListener('change', () => {
            syncMainControlsFromMenu();
            updateGameMenuState();
        });
    });

    generateButton.addEventListener('click', startSimulation);
    pauseButton.addEventListener('click', togglePause);
    showGameIntro();

    if (multiplayerButton && multiplayerPanel) {
        multiplayerButton.addEventListener('click', () => {
            playClick();
            multiplayerPanel.classList.toggle('hidden');
        });
    }
    if (mpCloseButton && multiplayerPanel) {
        mpCloseButton.addEventListener('click', () => multiplayerPanel.classList.add('hidden'));
    }
    if (mpHostButton) {
        mpHostButton.addEventListener('click', async () => {
            const api = getMultiplayerApi();
            if (!api) return;
            const name = getMultiplayerName();
            const port = getMultiplayerPort();
            localStorage.setItem('tcs_mp_name', name);
            localStorage.setItem('tcs_mp_port', String(port));
            try {
                const status = await api.startHost({ name, port });
                applyMultiplayerStatus(status);
                broadcastMultiplayerState(true);
            } catch (error) {
                appendMultiplayerMessage({ kind: 'system', text: `Host failed: ${error.message || error}`, time: Date.now() });
            }
        });
    }
    if (mpConnectButton) {
        mpConnectButton.addEventListener('click', async () => {
            const api = getMultiplayerApi();
            if (!api) return;
            const name = getMultiplayerName();
            const host = (mpHostInput?.value || '127.0.0.1').trim();
            const port = getMultiplayerPort();
            localStorage.setItem('tcs_mp_name', name);
            localStorage.setItem('tcs_mp_host', host);
            localStorage.setItem('tcs_mp_port', String(port));
            try {
                const status = await api.connect({ name, host, port });
                applyMultiplayerStatus(status);
            } catch (error) {
                appendMultiplayerMessage({ kind: 'system', text: `Join failed: ${error.message || error}`, time: Date.now() });
            }
        });
    }
    if (mpDisconnectButton) {
        mpDisconnectButton.addEventListener('click', async () => {
            const api = getMultiplayerApi();
            if (!api) return;
            const status = await api.disconnect();
            applyMultiplayerStatus(status);
        });
    }
    const sendMultiplayerChat = async () => {
        const api = getMultiplayerApi();
        const text = (mpChatInput?.value || '').trim();
        if (!api || !text) return;
        mpChatInput.value = '';
        try {
            const status = await api.sendChat({ text });
            applyMultiplayerStatus(status);
        } catch (error) {
            appendMultiplayerMessage({ kind: 'system', text: `Send failed: ${error.message || error}`, time: Date.now() });
        }
    };
    if (mpSendButton) {
        mpSendButton.addEventListener('click', sendMultiplayerChat);
    }
    if (mpChatInput) {
        mpChatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMultiplayerChat();
            }
        });
    }

    downloadTrackButton.addEventListener('click', () => {
        const text = bestTrackData.value;
        if (!text) {
            alert("没有可用于命名的轨迹数据。");
            return;
        }

        const basinMap = { 'WPAC': 'WP', 'EPAC': 'EP', 'NATL': 'AL', 'MED': 'ME', 'FICT': 'FI', 'FICT2': 'FI', 'RED': 'RS', 'REDG': 'RS', 'NIO': 'IO', 'SHEM': 'SH', 'SIO': 'SH', 'SATL': 'SL' };
        const basin = basinMap[basinSelector.value] || 'WP';
        const year = state.currentYear;
        const month = String(state.currentMonth).padStart(2, '0');
        const firstLine = text.split('\n')[0];
        const cycloneNum = firstLine ? firstLine.split(',')[1].trim() : '01';
        const filename = `map_${basin}${cycloneNum}_${year}${month}.png`;

        downloadMapImage('map-container', filename);
    });

    downloadHistoryTrackButton.addEventListener('click', downloadHistoryTrack);

    if (saveGameButton) {
        saveGameButton.addEventListener('click', () => {
            playClick();
            saveCurrentGame();
        });
    }
    if (loadGameButton) {
        loadGameButton.addEventListener('click', () => {
            playClick();
            openSaveManager();
        });
    }
    if (saveCurrentGameButton) {
        saveCurrentGameButton.addEventListener('click', () => {
            playClick();
            saveCurrentGame();
        });
    }
    if (refreshSaveListButton) {
        refreshSaveListButton.addEventListener('click', () => {
            playClick();
            renderSaveSlots();
        });
    }
    if (closeSaveModal) {
        closeSaveModal.addEventListener('click', () => saveModal?.classList.add('hidden'));
    }
    if (importSaveButton) {
        importSaveButton.addEventListener('click', () => saveImportInput?.click());
    }
    if (saveImportInput) {
        saveImportInput.addEventListener('change', (event) => {
            importGameSaveFile(event.target.files?.[0]);
            event.target.value = '';
        });
    }
    if (saveSlotList) {
        saveSlotList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-save-action]');
            if (!button) return;
            const saveId = button.dataset.saveId;
            if (button.dataset.saveAction === 'load') restoreGameSave(saveId);
            if (button.dataset.saveAction === 'export') exportSaveSlot(saveId);
            if (button.dataset.saveAction === 'delete') deleteSaveSlot(saveId);
        });
    }

    // [新增] 设置菜单事件监听器
    settingsButton.addEventListener('click', () => {
        playClick();
        settingsMenu.classList.toggle('hidden');
        syncCustomNameListEditor();
    });

    if (saveNameListButton) {
        saveNameListButton.addEventListener('click', () => {
            const basin = basinSelector?.value || 'WPAC';
            const parsedNames = parseNameListText(customNameListInput?.value || '');
            if (parsedNames.length < 4) {
                if (nameListStatus) {
                    nameListStatus.textContent = 'Add at least 4 names';
                    nameListStatus.className = 'mt-2 text-[9px] font-mono uppercase tracking-wider text-red-300';
                }
                playError();
                return;
            }
            state.customNameLists = { ...(state.customNameLists || {}), [basin]: parsedNames };
            saveJsonMap(CUSTOM_NAME_LISTS_KEY, state.customNameLists);
            state.nextNameIndex = state.nextNameIndex % parsedNames.length;
            syncCustomNameListEditor();
            playClick();
        });
    }

    if (resetNameListButton) {
        resetNameListButton.addEventListener('click', () => {
            const basin = basinSelector?.value || 'WPAC';
            const updated = { ...(state.customNameLists || {}) };
            delete updated[basin];
            state.customNameLists = updated;
            saveJsonMap(CUSTOM_NAME_LISTS_KEY, state.customNameLists);
            state.nextNameIndex = state.nextNameIndex % getActiveNameList(basin).length;
            syncCustomNameListEditor();
            playClick();
        });
    }

    if (yearSelector) {
        const syncYearFromInput = () => {
            state.currentYear = normalizeSimulationYear(yearSelector.value || state.currentYear);
            yearSelector.value = String(state.currentYear);
            localStorage.setItem('tcs_sim_year', String(state.currentYear));
            if (state.cyclone) {
                state.cyclone.currentYear = state.currentYear;
            }
            if (!state.simulationInterval) {
                requestRedraw();
            }
        };

        yearSelector.addEventListener('change', syncYearFromInput);
        yearSelector.addEventListener('blur', syncYearFromInput);
    }

    globalTempSlider.addEventListener('input', (e) => {
        state.GlobalTemp = parseInt(e.target.value, 10);
        globalTempValue.textContent = `${state.GlobalTemp}K`;
    });

    globalShearSlider.addEventListener('input', (e) => {
        state.GlobalShear = parseInt(e.target.value, 10);
        globalShearValue.textContent = `${state.GlobalShear}`;
    });

    historyButton.addEventListener('click', () => {
        playClick();
        historyList.innerHTML = '';
        if (state.history.length === 0) {
            historyList.innerHTML = '<li class="text-gray-400 p-2">尚无历史模拟记录。</li>';
        } else {
            [...state.history].reverse().forEach((item, index) => {
                const li = document.createElement('li');
                li.textContent = item.name; 
                li.className = 'text-white font-medium py-2 px-3 rounded-md cursor-pointer hover:bg-gray-700 transition-colors';
                li.dataset.historyIndex = state.history.length - 1 - index; 
                historyList.appendChild(li);
            });
        }
        historyModal.classList.remove('hidden');
        historyBestTrackContainer.classList.add('hidden'); // [新增] 默认隐藏ATCF显示区域
        state.selectedHistoryTrackData = ''; // [新增] 清空选中数据
    });

    closeHistoryModal.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });

    // 历史列表项点击事件
    historyList.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'LI' && e.target.dataset.historyIndex) {
            const index = parseInt(e.target.dataset.historyIndex, 10);
            const historyItem = state.history[index];
            if (!historyItem) return;
            selectedHistoryPointIndex = -1;
            const selectedCyclone = historyItem.cycloneData;
            selectedCyclone.pressureHistory = historyItem.pressureHistory || [];
            selectedCyclone.siteHistory = historyItem.siteHistory || [];
            state.currentYear = getActiveSimulationYear(selectedCyclone);
            state.currentMonth = selectedCyclone.currentMonth || state.currentMonth;
            if (yearSelector) yearSelector.value = String(state.currentYear);
            state.selectedHistoryCyclone = selectedCyclone;
            state.impactState = historyItem.impactState || createImpactState();
            state.warningAdvisory = historyItem.warningAdvisory || { active: [], signature: '', issuedHour: null };
            updateImpactPanel();
            updateWarningPanel();

            if (state.simulationInterval) {
                clearInterval(state.simulationInterval);
                state.simulationInterval = null;
            }
            state.isPaused = false;
            pauseButton.disabled = true;

            // historyModal.classList.add('hidden'); // 不关闭模态框，而是更新模态框内容
            document.getElementById('initial-message').classList.add('hidden');
            document.getElementById('simulation-output').classList.remove('hidden');
            bestTrackContainer.classList.add('hidden');
            
            drawFinalPath(mapSvg, mapProjection, selectedCyclone, state.world, tooltip, null, null, null, state.showPathPoints, null, basinSelector.value);
            if (state.showIntensityChart) {
                forecastContainer.classList.remove('hidden');
            }
            drawHistoricalIntensityChart(chartContainer, selectedCyclone.track, tooltip);

            let peak = { intensity: 0 };
            selectedCyclone.track.forEach(p => {
                if(p[2] > peak.intensity) {
                    peak = { lon: p[0], lat: p[1], intensity: p[2], isT: p[3], isE: p[4], circulationSize: p[5] || 300, isS: p[6], pressure: p[10] };
                }
            });
            const peakCat = getCategory(peak.intensity, peak.isT, peak.isE, peak.isS);
            
            document.getElementById('status').textContent = `查看历史: ${historyItem.name}`;
            document.getElementById('simulationTime').textContent = `总时长: ${selectedCyclone.age} 小时`;
            document.getElementById('latitude').textContent = formatLatitude(peak.lat);
            document.getElementById('longitude').textContent = formatLongitude(peak.lon);
            document.getElementById('intensity').textContent = `${knotsToKph(peak.intensity)} kph (${knotsToMph(peak.intensity)} mph)`;
            let displayP = peak.pressure;
            if (displayP === undefined || displayP === null) {
                const basin = selectedCyclone.basin || state.cyclone.basin || 'WPAC';
                displayP = Math.round(windToPressure(peak.intensity, peak.circulationSize, basin));
            }
            document.getElementById('pressure').textContent = `${displayP} hPa`;
            document.getElementById('category').textContent = peakCat.name;
            document.getElementById('ace').textContent = selectedCyclone.ace.toFixed(2);
            document.getElementById('direction').textContent = "N/A";
            document.getElementById('speed').textContent = "N/A";

            // [新增] 显示历史ATCF数据
            historyBestTrackData.value = historyItem.atcfData;
            historyBestTrackContainer.classList.remove('hidden');
            state.selectedHistoryTrackData = historyItem.atcfData; // [新增] 保存到state中，以便下载
        }
    });

    // [新增] 实测站点输入框事件监听器
    siteNameInput.addEventListener('input', (e) => {
        state.siteName = e.target.value;
        localStorage.setItem('tcs_site_name', state.siteName);
        requestRedraw();
    });
    siteLonInput.addEventListener('input', (e) => {
        const lon = parseFloat(e.target.value);
        state.siteLon = isNaN(lon) ? null : lon;
        localStorage.setItem('tcs_site_lon', e.target.value);
        requestRedraw();
    });
    siteLatInput.addEventListener('input', (e) => {
        const lat = parseFloat(e.target.value);
        state.siteLat = isNaN(lat) ? null : lat;
        localStorage.setItem('tcs_site_lat', e.target.value);
        requestRedraw();
    });

    const savedShowPoints = localStorage.getItem('tcs_show_points');

    if (showPathPointsCheckbox) {
        // A. 初始化状态
        if (savedShowPoints !== null) {
            // 有记录：覆盖 DOM 和 State
            const isChecked = savedShowPoints === 'true';
            showPathPointsCheckbox.checked = isChecked;
            state.showPathPoints = isChecked; 
        } else {
            // 无记录：同步 State
            state.showPathPoints = showPathPointsCheckbox.checked;
        }

        // B. 监听变更 (使用 'change' 事件更稳妥)
        showPathPointsCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            state.showPathPoints = isChecked; 
            localStorage.setItem('tcs_show_points', isChecked);
            
            if (typeof playClick === 'function') playClick();

            if (state.cyclone.status === 'active') {
                 requestRedraw();
            } else {
                 drawFinalPath(mapSvg, mapProjection, state.cyclone, state.world, tooltip, state.siteName, state.siteLon, state.siteLat, state.showPathPoints, state.lastFinalStats, basinSelector.value, state.pressureSystems, state.showWindField);
            } 
        });
    }

    // [新增] 自定义生成点事件监听器
    customLonInput.addEventListener('input', (e) => {
        const lon = parseFloat(e.target.value);
        if (!isNaN(lon)) {
            state.customLon = lon;
        } else {
            state.customLon = null;
        }
    });
    customLatInput.addEventListener('input', (e) => {
        const lat = parseFloat(e.target.value);
        if (!isNaN(lat)) {
            state.customLat = lat;
        } else {
            state.customLat = null;
        }
    });
    basinSelector.addEventListener('change', () => {
        syncCustomNameListEditor();
        redrawIdleBasinPreview();
    });
    syncCustomNameListEditor();

    copyTrackButton.addEventListener('click', () => {
        bestTrackData.select();
        document.execCommand('copy');
        copyTrackButton.textContent = "已复制!";
    });

    // 在 DOMContentLoaded 内定义通用处理函数
    const toggleState = (key, btnId, callback) => {
        state[key] = !state[key];
        const btn = document.getElementById(btnId);
        updateToggleButtonVisual(btn, state[key]);
        if (state[key]) {
            playToggleOn();
        } else {
            playToggleOff();
        }
        if (callback) callback(state[key]); // 比如处理图例显示
        requestRedraw();
    };

    // 绑定事件时：
    document.getElementById('togglePressureButton').onclick = () => toggleState('showPressureField', 'togglePressureButton');
    document.getElementById('toggleHumidityButton').onclick = () => toggleState('showHumidityField', 'toggleHumidityButton');
    document.getElementById('toggleWindFieldButton').onclick = () => toggleState('showWindField', 'toggleWindFieldButton');
    document.getElementById('toggleSteeringButton').onclick = () => toggleState('showSteeringCurrents', 'toggleSteeringButton');
    document.getElementById('togglePathButton').onclick = () => toggleState('showPathForecast', 'togglePathButton');

    // 对于带图例的特殊处理 (Wind Radii)
    document.getElementById('toggleWindRadiiButton').onclick = () => toggleState('showWindRadii', 'toggleWindRadiiButton', (isShow) => {
        const legend = document.getElementById('wind-radii-legend');
        if (isShow) {
            legend.classList.remove('hidden');
            setTimeout(() => legend.setAttribute('data-show', 'true'), 10);
        } else {
            legend.setAttribute('data-show', 'false');
            setTimeout(() => legend.classList.add('hidden'), 300);
        }
    });

    musicButton.onclick = (e) => {
        e.stopPropagation();
        playClick(); // 播放音效
        
        // 切换菜单显示
        const isHidden = musicMenu.classList.contains('hidden');
        
        // 关闭其他菜单 (如 Settings) 以防重叠
        if (settingsMenu) settingsMenu.classList.add('hidden');
        
        if (isHidden) {
            musicMenu.classList.remove('hidden');
        } else {
            musicMenu.classList.add('hidden');
        }
    };

    // [事件监听] 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        if (musicMenu && !musicMenu.contains(e.target) && !musicButton.contains(e.target)) {
            musicMenu.classList.add('hidden');
        }
    });

    // [事件监听] 音量滑块
    if (bgmVolumeSlider) {
        bgmVolumeSlider.addEventListener('input', (e) => {
            bgmAudio.volume = e.target.value;
        });
    }
    
    // [新增] 地图双击事件：生成手动高压
    mapContainer.on("dblclick", (event) => {
        // 1. 只有打开气压场时才允许操作
        if (!state.showPressureField) return;
        
        // 2. 获取鼠标位置的经纬度
        const [mouseX, mouseY] = d3.pointer(event);
        const coords = mapProjection.invert([mouseX, mouseY]);
        if (!coords) return;
        const [lon, lat] = coords;

        // 3. 检查是否已经存在手动高压 (限制最多 1 个)
        // 我们检查 lower 层即可
        const existingIndex = state.pressureSystems.lower.findIndex(s => s.isManual);

        if (existingIndex === -1) {
            // --- 生成新系统 ---
            const newSystem = {
                type: 'high',
                x: lon, 
                y: lat,
                sigmaX: 5,        // [要求] x=5 (大小)
                sigmaY: 3,        // [要求] y=3
                baseSigmaX: 5,    // 记录基准大小以便呼吸动画
                strength: 8,      // [要求] strength=8
                baseStrength: 8,
                velocityX: 0,     // 默认静止，可被 updatePressureSystems 推着走
                velocityY: 0,
                isManual: true,   // [标记] 这是手动生成的
                noiseLayers: []
            };

            // 同时推送到 upper 和 lower 层以符合双层架构
            const lowerSys = JSON.parse(JSON.stringify(newSystem));
            const upperSys = JSON.parse(JSON.stringify(newSystem));
            upperSys.strength = 8; // 上层稍微强一点

            state.pressureSystems.lower.push(lowerSys);
            state.pressureSystems.upper.push(upperSys);

            playClick(); // 播放音效
            requestRedraw();
        } else {
            // 如果已经存在一个，这里的逻辑是“再双击H按钮删除”，
            // 但如果用户双击地图空白处，是否要移动它？
            // 按照您的要求，这里什么都不做，或者您也可以选择移动它。
            // 暂且留空，严格遵守“双击H按钮删除”。
            console.log("Manual High already exists. Double click the 'H' marker to remove.");
        }
    });

    let resizeRedrawTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeRedrawTimer);
        resizeRedrawTimer = setTimeout(() => {
        if (state.world) {
            setupCanvases();
             if (state.cyclone.status) {
                 updateStateSiteData();
                 drawMap(mapSvg, mapProjection, state.world, state.cyclone, {
                     pathForecasts: state.pathForecasts,
                     warnings: state.warningAdvisory.active,
                     pressureSystems: state.pressureSystems,
                     showPressureField: state.showPressureField,
                     showHumidityField: state.showHumidityField,
                     showPathForecast: state.showPathForecast,
                     showWindRadii: state.showWindRadii,
                     siteName: state.siteName,
                     siteLon: state.siteLon,
                     siteLat: state.siteLat,
                     showPathPoints: state.showPathPoints,
                     showWindField: state.showWindField,
                     showSteeringCurrents: state.showSteeringCurrents,
                     month: state.currentMonth,
                     siteHistory: state.siteHistory,
                     siteData: state.currentSiteData,
                     remoteCyclone: getMultiplayerRemoteCyclone(),
                     performanceProfile: getPerformanceProfile(),
                     basin: state.cyclone?.basin || basinSelector.value || 'WPAC',
                     onSiteClick: () => {
                         state.isSiteSelected = !state.isSiteSelected;
                         requestRedraw();
                     }
                 });
             }
             if (state.cyclone.status && state.cyclone.status !== 'active') {
                 drawHistoricalIntensityChart(chartContainer, state.cyclone.track, tooltip);
             }
        }
        }, 120);
    });

    window.addEventListener('cycloneTrackClick', (e) => {
        selectedHistoryPointIndex = e.detail.index;

        // 激活 JTWC 按钮
        generateJTWCButton.classList.remove('hidden');

        // 可选：给个按钮高亮动画
        generateJTWCButton.classList.add('ring-2', 'ring-red-500');
        setTimeout(() => generateJTWCButton.classList.remove('ring-2', 'ring-red-500'), 300);
    });

    mapContainer.node().addEventListener('click', (e) => {
        // 如果点击的是 SVG 背景或容器本身（而不是上面的 UI 按钮）
        if (e.target.tagName === 'svg' || e.target.id === 'map-container') {
            const jtwcActionButton = document.getElementById('jtwcActionButton');
            if (jtwcActionButton) jtwcActionButton.classList.add('hidden');
            selectedHistoryPointIndex = -1; // 确保你有这个变量的访问权限
        
            // 还要清除地图上的选中圆圈
            const interactionLayer = mapSvg.select(".track-interaction-layer");
            if (!interactionLayer.empty()) {
                interactionLayer.select(".selected-circle").style("opacity", 0);
            }
            requestRedraw();
        }
    });

    window.addEventListener('cycloneTrackDeselect', () => {
        if (generateJTWCButton) {
            generateJTWCButton.classList.add('hidden');
        }
    });

    // 绑定 JTWC 按钮点击事件
    const SATELLITE_PRODUCT_CATALOG = [
        { key: 'VIS', label: 'Visible', signal: 'Low cloud swirl and exposed center fixes.' },
        { key: 'IR', label: 'IR Window', signal: 'Cold cloud tops and CDO coverage.' },
        { key: 'BD', label: 'Dvorak BD', signal: 'Pattern T-number and eye temperature contrast.' },
        { key: 'WV', label: 'Water Vapor', signal: 'Dry slots, outflow channels, and upper lows.' },
        { key: 'RGB', label: 'RGB Composite', signal: 'Day/night cloud phase and structure split.' },
        { key: 'MW37', label: '37GHz Microwave', signal: 'Low-level rainband and eyewall arcs.' },
        { key: 'MW89', label: '89GHz Microwave', signal: 'Deep convective ring and hot towers.' },
        { key: 'SSMIS', label: 'SSMIS Pass', signal: 'Polar microwave eye, moat, and inner-core fixes.' },
        { key: 'GPM', label: 'GPM Rain', signal: 'Eyewall rain rates and hot tower bursts.' },
        { key: 'GLM', label: 'GLM Lightning', signal: 'Overshooting tops and explosive convection bursts.' },
        { key: 'AMV', label: 'AMV Winds', signal: 'Cloud-tracked outflow and steering-level wind.' },
        { key: 'SCAT', label: 'Scatterometer', signal: 'Surface wind field and closed circulation.' },
        { key: 'SAR', label: 'SAR TC Winds', signal: 'High-resolution ocean surface wind streaks.' },
        { key: 'ADT', label: 'ADT', signal: 'Objective IR intensity estimate.' },
        { key: 'HISA', label: 'HISA', signal: 'Microwave Vmax/MSLP/radii estimate.' },
        { key: 'MTCSWA', label: 'MTCSWA', signal: 'Multi-source surface wind analysis.' },
        { key: 'eTRaP', label: 'eTRaP Rain', signal: 'Satellite rainfall ensemble and totals.' }
    ];

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const getAnalysisKey = (cyclone, targetHour) => {
        const first = cyclone?.track?.[0] || [];
        const starter = `${Number(first[0] || 0).toFixed(1)},${Number(first[1] || 0).toFixed(1)}`;
        const id = cyclone?.name || cyclone?.investId || cyclone?.investDisplayId || `SIM${state.simulationCount}`;
        return `${getActiveSimulationYear(cyclone)}:${cyclone?.basin || 'WPAC'}:${id}:${starter}:${targetHour}`;
    };

    function getTargetStructure(cyclone) {
        return cyclone?.stormStructure || {};
    }

    function buildSatelliteDiagnostics(cyclone, trackPoint, targetHour) {
        const intensity = Number(trackPoint?.[2] || cyclone?.intensity || 0);
        const pressure = Number.isFinite(Number(trackPoint?.[10]))
            ? Number(trackPoint[10])
            : windToPressure(intensity, Number(trackPoint?.[5] || cyclone?.circulationSize || 300), cyclone?.basin || 'WPAC');
        const structure = getTargetStructure(cyclone);
        const banding = Math.round(Number(structure.bandingMaturity || 0) * 100);
        const eye = Math.round(Number(structure.eyeMaturity || 0) * 100);
        const cold = Math.round(Number(structure.coldCloudShield || 0) * 100);
        const burst = Math.round(Number(structure.convectiveBurstiness || 0) * 100);
        const mw = Math.round(Number(structure.microwaveRingScore || 0) * 100);
        const outflow = Math.round(Number(structure.outflowChannels || 0) * 100);
        const spin = Math.round(Number(structure.eyewallSpinRateDegHr || 0));
        const meso = Math.round(Number(structure.mesovortexCount || 0));
        const towers = Math.round(Number(structure.hotTowerCount || 0));
        const moat = Math.round(Number(structure.moatScore || 0) * 100);
        const integrity = Math.round(Number(structure.eyewallIntegrity || 0) * 100);
        const confidence = Math.max(18, Math.min(98, Math.round((banding + eye + mw + Math.max(cold, burst) + outflow + integrity) / 6)));
        const scene = String(structure.satelliteScene || structure.shapeFamily || 'open-wave').replace(/-/g, ' ').toUpperCase();
        const rows = SATELLITE_PRODUCT_CATALOG.map(product => {
            let value = '--';
            if (product.key === 'VIS') value = scene;
            if (product.key === 'IR') value = `CDO ${cold}%`;
            if (product.key === 'BD') value = `T${Math.max(1, Math.min(8, intensity / 18 + eye / 130)).toFixed(1)}`;
            if (product.key === 'WV') value = `OUTFLOW ${outflow}%`;
            if (product.key === 'RGB') value = `BANDING ${banding}%`;
            if (product.key === 'MW37') value = `LOW RING ${Math.max(banding, mw)}%`;
            if (product.key === 'MW89') value = `DEEP RING ${mw}%`;
            if (product.key === 'SSMIS') value = moat > 0 ? `MOAT ${moat}%` : `CORE ${integrity}%`;
            if (product.key === 'GPM') value = `${Math.round(Number(cyclone?.rainRateMmHr || 0))} mm/h + ${towers} HOT`;
            if (product.key === 'GLM') value = towers >= 4 ? `ACTIVE ${towers}` : `SPARSE ${towers}`;
            if (product.key === 'AMV') value = `${outflow}% OUTFLOW`;
            if (product.key === 'SCAT') value = intensity >= 34 ? `CLOSED ${Math.max(35, banding)}%` : `OPEN ${100 - banding}%`;
            if (product.key === 'SAR') value = `${Math.round(intensity)} kt VMAX`;
            if (product.key === 'ADT') value = `${Math.round(intensity + (eye - 45) * 0.04)} kt`;
            if (product.key === 'HISA') value = `${Math.round(intensity)} kt / ${Math.round(pressure)} hPa`;
            if (product.key === 'MTCSWA') value = `${Math.round(intensity * 0.86)}-${Math.round(intensity * 1.08)} kt`;
            if (product.key === 'eTRaP') value = `${Math.round(Number(cyclone?.rainRateMmHr || 0))} mm/h`;
            return { ...product, value };
        });
        return { scene, confidence, targetHour, rows, summary: `${scene} / eye ${eye}% / ${spin}deg/h spin / ${meso} meso / ${towers} hot towers / microwave ${mw}%` };
    }

    function buildReconReanalysis(cyclone, trackPoint, targetHour) {
        const structure = getTargetStructure(cyclone);
        const baseWind = Number(trackPoint?.[2] || cyclone?.intensity || 0);
        const size = Number(trackPoint?.[5] || cyclone?.circulationSize || 300);
        const basin = cyclone?.basin || basinSelector.value || 'WPAC';
        const pressure = Number.isFinite(Number(trackPoint?.[10])) ? Number(trackPoint[10]) : windToPressure(baseWind, size, basin);
        const reconWind = Math.max(15, Math.round((baseWind + Number(structure.eyeMaturity || 0) * 4 + Number(structure.microwaveRingScore || 0) * 5 + Number(structure.convectiveBurstiness || 0) * 3 - Number(structure.asymmetry || 0) * 2.5) / 5) * 5);
        const reconPressure = Math.round(pressure - (reconWind - baseWind) * 0.85 - Number(structure.eyeMaturity || 0) * 3);
        const category = getCategory(reconWind, false, cyclone?.isExtratropical, cyclone?.isSubtropical);
        return {
            issued: new Date().toISOString(),
            targetHour,
            vmax: reconWind,
            mslp: reconPressure,
            category: category.shortName,
            fix: `${formatLatitude(Number(trackPoint?.[1] || cyclone?.lat || 0))} ${formatLongitude(Number(trackPoint?.[0] || cyclone?.lon || 0))}`,
            method: 'SFMR + dropsonde + microwave reanalysis',
            notes: `Recon estimate only. Player analysis remains unchanged. Satellite support: ${buildSatelliteDiagnostics(cyclone, trackPoint, targetHour).summary}.`
        };
    }

    generateJTWCButton.addEventListener('click', () => {
        console.log("JTWC Button Clicked");
        const targetCyclone = state.selectedHistoryCyclone || state.cyclone;
        
        let renderIndex = selectedHistoryPointIndex;
        if (renderIndex === -1) {
            if (targetCyclone && targetCyclone.track.length > 0) {
                renderIndex = targetCyclone.track.length - 1;
                if (!state.isPaused && state.simulationInterval && !state.selectedHistoryCyclone) {
                    togglePause(); 
                }
            } else {
                return;
            }
        }

        if (renderIndex === -1 || !targetCyclone) return;

        playClick();
        jtwcModal.classList.remove('hidden');
        
        // --- 1. 构建 Tab 界面结构 (增加 64KT 按钮) ---
        jtwcOutput.innerHTML = `
            <div class="flex h-[640px] w-full bg-slate-950 text-slate-100">
                <div class="w-52 flex-shrink-0 border-r border-cyan-400/25 bg-slate-950 p-3 flex flex-col gap-2">
                    <div class="px-2 pb-2 border-b border-white/10">
                        <div class="text-[10px] font-black tracking-[0.28em] text-cyan-300">ICWC</div>
                        <div class="text-[11px] font-mono text-slate-400 uppercase mt-1">Forecast Desk</div>
                    </div>

                    <button id="jtwc-tab-graphic" class="icwc-tab is-active"><i class="fa-solid fa-map-location-dot"></i><span>Warning Graphic</span></button>
                    <button id="jtwc-tab-spaghetti" class="icwc-tab"><i class="fa-solid fa-route"></i><span>Spaghetti</span></button>
                    <button id="jtwc-tab-models" class="icwc-tab"><i class="fa-solid fa-layer-group"></i><span>Model Fields</span></button>

                    <div class="mt-2 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Hazards</div>
                    <button id="jtwc-tab-prob34" class="icwc-tab"><i class="fa-solid fa-wind"></i><span>Wind Prob 34kt</span></button>
                    <button id="jtwc-tab-prob64" class="icwc-tab"><i class="fa-solid fa-burst"></i><span>Wind Prob 64kt</span></button>

                    <div class="mt-2 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Analysis</div>
                    <button id="jtwc-tab-satellite" class="icwc-tab"><i class="fa-solid fa-satellite"></i><span>Satellite</span></button>
                    <button id="jtwc-tab-analysis" class="icwc-tab"><i class="fa-solid fa-clipboard-list"></i><span>Analysis Desk</span></button>
                    <button id="jtwc-tab-phase" class="icwc-tab"><i class="fa-solid fa-diagram-project"></i><span>Phase Space</span></button>
                    <button id="jtwc-tab-station" class="icwc-tab"><i class="fa-solid fa-tower-cell"></i><span>Station Obs</span></button>
                    <button id="jtwc-tab-synoptic" class="icwc-tab"><i class="fa-solid fa-chart-area"></i><span>Synoptic Chart</span></button>
                </div>

                <div id="jtwc-content-area" class="flex-1 bg-slate-900 flex items-center justify-center overflow-auto p-4 relative">
                    <div id="jtwc-loading" class="hidden absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10 text-cyan-300 font-bold pointer-events-none">
                        GENERATING...
                    </div>
                </div>
            </div>
        `;

        const contentArea = document.getElementById('jtwc-content-area');
        const tabGraphic = document.getElementById('jtwc-tab-graphic');
        const tabProb34 = document.getElementById('jtwc-tab-prob34');
        const tabProb64 = document.getElementById('jtwc-tab-prob64');
        const tabSpaghetti = document.getElementById('jtwc-tab-spaghetti');
        const tabModels = document.getElementById('jtwc-tab-models');
        const tabSatellite = document.getElementById('jtwc-tab-satellite');
        const tabAnalysis = document.getElementById('jtwc-tab-analysis');
        const tabStation = document.getElementById('jtwc-tab-station');
        const tabSynoptic = document.getElementById('jtwc-tab-synoptic');
        const tabPhase = document.getElementById('jtwc-tab-phase');
        const loadingNode = document.getElementById('jtwc-loading');
        
        let currentCanvas = null;
        let currentMode = 'GRAPHIC'; // 用于保存文件名

        const syncTimelineButton = () => {
            const timelineButton = document.getElementById('saveTimelineVideo');
            if (!timelineButton) return;
            const canRenderTimeline = currentMode === 'GRAPHIC' || currentMode === 'SYNOPTIC';
            timelineButton.classList.toggle('hidden', !canRenderTimeline);
        };

        const setCurrentMode = (mode) => {
            currentMode = mode;
            syncTimelineButton();
        };

        const showLoading = () => {
            contentArea.innerHTML = ''; 
            loadingNode.classList.remove('hidden'); 
            contentArea.appendChild(loadingNode); 
        };

        const updateTabStyles = (activeTab) => {
            [tabGraphic, tabSpaghetti, tabModels, tabProb34, tabProb64, tabSatellite, tabAnalysis, tabPhase, tabStation, tabSynoptic].forEach(tab => {
                if (tab === activeTab) {
                    tab.className = "icwc-tab is-active";
                } else {
                    tab.className = "icwc-tab";
                }
            });
        };

        // --- 2. 定义渲染函数 ---
        
        const showGraphic = () => {
            updateTabStyles(tabGraphic);
            setCurrentMode('GRAPHIC');
            showLoading(); 

            setTimeout(() => {
                const canvas = renderJTWCStyle(targetCyclone, renderIndex, state.world);
                canvas.className = "max-w-full max-h-full shadow-lg border border-gray-200"; 
                contentArea.innerHTML = ''; 
                contentArea.appendChild(canvas); 
                currentCanvas = canvas;
            }, 10);
        };

        // 通用概率图渲染函数
        const showProb = (threshold) => {
            const activeTab = threshold === 64 ? tabProb64 : tabProb34;
            updateTabStyles(activeTab);
            setCurrentMode(threshold === 64 ? 'PROB64' : 'PROB34');
            
            showLoading();

            setTimeout(() => {
                if (typeof renderProbabilitiesStyle === 'function') {
                    // 传入 threshold 参数
                    const canvas = renderProbabilitiesStyle(targetCyclone, renderIndex, state.world, threshold);
                    canvas.className = "max-w-full max-h-full shadow-lg border border-gray-200";
                    contentArea.innerHTML = ''; 
                    contentArea.appendChild(canvas);
                    currentCanvas = canvas;
                } else {
                    contentArea.innerText = "Error: renderProbabilitiesStyle not imported.";
                }
            }, 50); 
        };

        // B. Phase Space 页面
        const renderCanvasProduct = (canvas, toolbarHtml = '') => {
            canvas.className = "max-w-full max-h-full object-contain shadow-2xl border border-cyan-400/25 bg-black";
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            contentArea.innerHTML = `
                <div class="w-full h-full flex flex-col gap-3">
                    ${toolbarHtml}
                    <div id="icwc-product-host" class="flex-1 min-h-0 flex items-center justify-center overflow-hidden"></div>
                </div>
            `;
            document.getElementById('icwc-product-host')?.appendChild(canvas);
            currentCanvas = canvas;
            syncTimelineButton();
        };

        const showSpaghettiModels = (filter = 'all') => {
            updateTabStyles(tabSpaghetti);
            setCurrentMode(`SPAGHETTI_${filter.toUpperCase()}`);
            showLoading();
            setTimeout(() => {
                const filters = [
                    { key: 'all', label: 'All' },
                    { key: 'global', label: 'Global' },
                    { key: 'hurricane', label: 'Hurricane' },
                    { key: 'diagnostic', label: 'HWDAT' },
                    { key: 'consensus', label: 'Consensus' }
                ];
                const toolbar = `
                    <div class="flex flex-wrap items-center justify-between gap-2 border border-cyan-400/20 bg-slate-950/80 p-2">
                        <div class="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-cyan-300">Spaghetti Guidance</div>
                        <div class="flex flex-wrap gap-1">
                            ${filters.map(item => `<button data-spaghetti-filter="${item.key}" class="px-2.5 py-1 border text-[10px] font-mono font-bold uppercase ${item.key === filter ? 'border-cyan-300 bg-cyan-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/50'}">${item.label}</button>`).join('')}
                        </div>
                    </div>
                `;
                renderCanvasProduct(renderSpaghettiStyle(targetCyclone, renderIndex, state.world, filter), toolbar);
                contentArea.querySelectorAll('[data-spaghetti-filter]').forEach(button => {
                    button.addEventListener('click', () => showSpaghettiModels(button.dataset.spaghettiFilter || 'all'));
                });
            }, 35);
        };

        const showModelFields = (modelName = 'GFS', productKey = 'mslp_wind') => {
            updateTabStyles(tabModels);
            setCurrentMode(`MODEL_${modelName}_${productKey}`.replace(/[^A-Z0-9_]/gi, '_').toUpperCase());
            showLoading();
            setTimeout(() => {
                const models = ['GFS', 'ECMWF', 'HAFS-A', 'HWRF', 'HMON', 'HWDAT'];
                const products = [
                    { key: 'mslp_wind', label: 'MSLP/Wind' },
                    { key: 'rain', label: 'Rain' },
                    { key: 'radar', label: 'Radar' },
                    { key: 'shear', label: 'Shear' },
                    { key: 'ohc', label: 'OHC' },
                    { key: 'height', label: '500mb' }
                ];
                const toolbar = `
                    <div class="grid gap-2 border border-cyan-400/20 bg-slate-950/80 p-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-cyan-300">Model Fields</div>
                            <div class="flex flex-wrap gap-1">
                                ${models.map(item => `<button data-model-name="${item}" class="px-2.5 py-1 border text-[10px] font-mono font-bold uppercase ${item === modelName ? 'border-cyan-300 bg-cyan-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/50'}">${item}</button>`).join('')}
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${products.map(item => `<button data-product-key="${item.key}" class="px-2.5 py-1 border text-[10px] font-mono font-bold uppercase ${item.key === productKey ? 'border-amber-300 bg-amber-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-300/50'}">${item.label}</button>`).join('')}
                        </div>
                    </div>
                `;
                renderCanvasProduct(renderModelFieldStyle(targetCyclone, renderIndex, state.world, { modelName, productKey }), toolbar);
                contentArea.querySelectorAll('[data-model-name]').forEach(button => {
                    button.addEventListener('click', () => showModelFields(button.dataset.modelName || 'GFS', productKey));
                });
                contentArea.querySelectorAll('[data-product-key]').forEach(button => {
                    button.addEventListener('click', () => showModelFields(modelName, button.dataset.productKey || 'mslp_wind'));
                });
            }, 35);
        };

        const finiteNumberOrNull = (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const getTrackPointHour = (index) => Math.max(0, index * 3);

        const getStationCoordinates = (trackPoint, existingRecord = null) => {
            const recordLon = finiteNumberOrNull(existingRecord?.lon);
            const recordLat = finiteNumberOrNull(existingRecord?.lat);
            const configuredLon = finiteNumberOrNull(state.siteLon);
            const configuredLat = finiteNumberOrNull(state.siteLat);
            const trackLon = finiteNumberOrNull(trackPoint?.[0]);
            const trackLat = finiteNumberOrNull(trackPoint?.[1]);
            const configuredLooksUnset = !existingRecord && configuredLon === 0 && configuredLat === 0;
            const hasConfiguredStation = configuredLon != null && configuredLat != null && !configuredLooksUnset;
            const fallbackLon = trackLon == null
                ? 0
                : ((((trackLon + 0.85) + 540) % 360) - 180);
            const fallbackLat = trackLat == null
                ? 0
                : trackLat + (trackLat < 0 ? -0.45 : 0.45);
            return {
                lon: recordLon ?? (hasConfiguredStation ? configuredLon : null) ?? fallbackLon,
                lat: recordLat ?? (hasConfiguredStation ? configuredLat : null) ?? fallbackLat
            };
        };

        const findStationRecord = (records, targetHour) => {
            if (!Array.isArray(records) || records.length === 0) return null;
            const usable = records
                .filter(record => Number.isFinite(Number(record?.hour)))
                .sort((a, b) => Number(a.hour) - Number(b.hour));
            const exact = usable.find(record => Number(record.hour) === targetHour);
            if (exact) return exact;
            const closest = usable.reduce((best, record) => {
                const distance = Math.abs(Number(record.hour) - targetHour);
                if (!best || distance < best.distance) return { record, distance };
                return best;
            }, null);
            return closest && closest.distance <= 6 ? closest.record : null;
        };

        const buildSyntheticStationRecord = (cyclone, trackIndex, stationLon, stationLat) => {
            const trackPoint = cyclone?.track?.[trackIndex];
            if (!trackPoint) return null;
            const hour = getTrackPointHour(trackIndex);
            const cycLon = Number(trackPoint[0] || 0);
            const cycLat = Number(trackPoint[1] || 0);
            const intensity = Math.max(0, Number(trackPoint[2] || 0));
            const size = Math.max(160, Number(trackPoint[5] || cyclone?.circulationSize || 320));
            const distKm = calculateDistance(cycLat, cycLon, stationLat, stationLon);
            const radiusScale = Math.max(70, size * 0.55);
            const influence = Math.exp(-distKm / radiusScale);
            const rainBand = Math.max(0, Math.cos(distKm / Math.max(65, size * 0.28)));
            const localWind = Math.max(3, 7 + intensity * influence * (0.62 + Math.min(0.22, size / 1800)));
            const angleToStation = Math.atan2(stationLat - cycLat, (stationLon - cycLon) * Math.cos(cycLat * Math.PI / 180));
            const rotationSign = cycLat < 0 ? 1 : -1;
            const flowAngle = angleToStation + rotationSign * Math.PI / 2;
            const u = Math.cos(flowAngle) * localWind;
            const v = Math.sin(flowAngle) * localWind;
            const centerPressure = Number.isFinite(Number(trackPoint[10]))
                ? Number(trackPoint[10])
                : windToPressure(intensity, size, cyclone?.basin || basinSelector.value);
            const ambientPressure = Math.max(1006, getPressureAt(stationLon, stationLat, state.pressureSystems || []));
            const pressure = centerPressure + (ambientPressure - centerPressure) * (1 - influence);
            const rainRateMmHr = Math.max(0, (intensity * 0.22 + rainBand * 18) * influence);
            const dbz = Math.max(0, Math.min(65, 6 + rainRateMmHr * 1.35 + intensity * 0.08));
            return {
                hour,
                wind: localWind,
                pressure,
                u,
                v,
                dbz,
                rainRateMmHr,
                floodLevelM: Math.max(0, rainRateMmHr * 0.018),
                lat: stationLat,
                lon: stationLon,
                synthetic: true
            };
        };

        const buildSyntheticStationHistory = (cyclone, targetIndex, stationLon, stationLat) => {
            if (!cyclone?.track?.length) return [];
            const limit = Math.min(targetIndex, cyclone.track.length - 1);
            const start = Math.max(0, limit - 24);
            const history = [];
            for (let i = start; i <= limit; i++) {
                const record = buildSyntheticStationRecord(cyclone, i, stationLon, stationLat);
                if (record) history.push(record);
            }
            return history;
        };

        const showPhaseSpace = () => {
            updateTabStyles(tabPhase);
            setCurrentMode('PHASE');
            currentCanvas = null;
            showLoading();

            setTimeout(() => {
                if (typeof renderPhaseSpace === 'function') {
                    const canvas = renderPhaseSpace(targetCyclone, state.GlobalTemp);
                    canvas.className = "max-w-full max-h-full shadow-lg border border-gray-800";
                    contentArea.innerHTML = '';
                    contentArea.appendChild(canvas);
                    currentCanvas = canvas;
                } else {
                    contentArea.innerText = "Module not loaded.";
                }
            }, 50);
        };

        tabPhase.onclick = showPhaseSpace;

        const showSatelliteImagery = () => {
            updateTabStyles(tabSatellite);
            setCurrentMode('SATELLITE');
            currentCanvas = null;
            contentArea.innerHTML = ''; // 清空区域

            // 1. 确定目标气旋和时间
            const targetPoint = targetCyclone.track[renderIndex];
            const targetAge = renderIndex * 3; // 假设每步3小时
        
            // 2. 在缓存中查找图片
            // 我们需要找到最接近 targetAge 的快照 (因为快照是每6小时存一张，而时间轴可能是每3小时)
            const cache = targetCyclone.satelliteCache || [];
        
            // 查找精确匹配或最近的匹配 (向后查找最近的过去图像)
            // 例如：如果是 T+9，我们显示 T+6 的图；如果是 T+12，显示 T+12 的图。
            let bestShot = cache.find(s => s.age === targetAge);
        
            if (!bestShot && cache.length > 0) {
                // 如果没有精确匹配，找最近的一个 (Fallback)
                bestShot = cache.reduce((prev, curr) => {
                    return (Math.abs(curr.age - targetAge) < Math.abs(prev.age - targetAge) ? curr : prev);
                });
            }

           // 3. 渲染 UI
            const container = document.createElement('div');
            container.className = "w-full h-full grid grid-cols-[minmax(0,1fr)_20rem] gap-3 bg-[#1a1a1a] p-3";
            const imageHost = document.createElement('div');
            imageHost.className = "relative min-w-0 min-h-0 flex items-center justify-center bg-black/50 border border-white/10";
            container.appendChild(imageHost);

            if (bestShot) {
                // A. 显示图片
                const img = document.createElement('img');
                img.src = bestShot.img;
                img.className = "w-full h-full shadow-lg border border-gray-800 object-contain";
                imageHost.appendChild(img);

                // B. 显示信息水印 (HTML覆盖层)
                const infoOverlay = document.createElement('div');
                infoOverlay.className = "absolute top-4 left-4 text-white/80 font-mono text-xs bg-black/50 p-2 rounded pointer-events-none";
            
                // 格式化时间戳
                const year = getActiveSimulationYear(targetCyclone);
                const month = (targetCyclone.currentMonth || 8) - 1;
                const d = new Date(Date.UTC(year, month, 1));
                d.setUTCHours(d.getUTCHours() + bestShot.age);
                const timeStr = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2,'0')}/${String(d.getUTCDate()).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}Z`;
            
                // 查找那一刻的强度 (用于显示)
                const trackData = targetCyclone.track.find((_, i) => i * 3 === bestShot.age) || targetPoint;
                const intensity = trackData ? trackData[2] : 0;

                let nameDisplay = "UNKNOWN";
                if (targetCyclone.name) {
                    nameDisplay = targetCyclone.name.toUpperCase();
                } else {
                    // 如果没有名字，尝试显示编号
                    // 注意：如果是正在进行的模拟，用 state.simulationCount
                    // 如果是历史记录，这可能不准确，但在没有存储 ID 的情况下这是最佳回退
                    const num = String(state.simulationCount).padStart(2, '0');
                    nameDisplay = `TD ${num}`;
                }

                infoOverlay.innerHTML = `
                    <div class="font-bold text-lg text-cyan-400">SATELLITE SNAPSHOT OF ${nameDisplay}</div>
                    <div>VALID: ${timeStr} (T+${bestShot.age}H)</div>
                    <div>INTENSITY: ${Math.round(intensity/5)*5} KT</div>
                    ${bestShot.age !== targetAge ? `<div class="text-yellow-400 mt-1">Note: Showing nearest img (Req: T+${targetAge}H)</div>` : ''}
                `;
                imageHost.appendChild(infoOverlay);

            } else {
               // C. 没有图片的空状态
                imageHost.innerHTML = `
                    <div class="text-center text-slate-500">
                        <i class="fa-solid fa-satellite-dish text-6xl mb-4 opacity-50"></i>
                        <p class="text-xl font-bold">NO IMAGERY AVAILABLE</p>
                        <p class="text-sm mt-2">Simulation hasn't generated satellite cache for T+${targetAge}H yet.</p>
                        <p class="text-xs text-slate-600 mt-1">Images are captured every 6 hours during simulation run.</p>
                    </div>
                `;
            }

            const diagnostics = buildSatelliteDiagnostics(targetCyclone, targetPoint, targetAge);
            const productPanel = document.createElement('div');
            productPanel.className = "min-w-0 overflow-y-auto bg-slate-950/95 border border-cyan-400/20 p-3 font-mono";
            productPanel.innerHTML = `
                <div class="flex items-start justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                    <div>
                        <div class="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Satellite Data Stack</div>
                        <div class="text-[9px] uppercase tracking-[0.18em] text-slate-500 mt-1">${escapeHtml(diagnostics.scene)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] uppercase tracking-[0.16em] text-slate-500">Confidence</div>
                        <div class="text-lg font-black text-white">${diagnostics.confidence}%</div>
                    </div>
                </div>
                <div class="space-y-1.5">
                    ${diagnostics.rows.map(row => `
                        <div class="border border-white/10 bg-white/[0.03] p-2">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-black text-cyan-100">${escapeHtml(row.label)}</span>
                                <span class="text-[10px] font-black text-amber-100">${escapeHtml(row.value)}</span>
                            </div>
                            <div class="mt-1 text-[8px] uppercase tracking-[0.12em] text-slate-500">${escapeHtml(row.signal)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(productPanel);
            contentArea.appendChild(container);
        };

        const showAnalysisDesk = () => {
            updateTabStyles(tabAnalysis);
            setCurrentMode('ANALYSIS');
            currentCanvas = null;
            const targetPoint = targetCyclone.track[renderIndex];
            const targetHour = getTrackPointHour(renderIndex);
            const key = getAnalysisKey(targetCyclone, targetHour);
            const existing = state.playerAnalyses[key] || {};
            const simWind = Math.round(Number(targetPoint?.[2] || targetCyclone.intensity || 0));
            const simPressure = Number.isFinite(Number(targetPoint?.[10]))
                ? Math.round(Number(targetPoint[10]))
                : windToPressure(simWind, Number(targetPoint?.[5] || targetCyclone.circulationSize || 300), targetCyclone.basin || 'WPAC');
            const simCategory = getCategory(simWind, false, targetCyclone.isExtratropical, targetCyclone.isSubtropical).shortName;
            const renderRecon = (recon) => recon ? `
                <div class="mt-3 border border-emerald-400/25 bg-emerald-950/20 p-3">
                    <div class="flex items-center justify-between gap-2">
                        <div class="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Recon Reanalysis</div>
                        <div class="text-[9px] font-mono text-slate-500">${escapeHtml(new Date(recon.issued).toUTCString().replace('GMT', 'Z'))}</div>
                    </div>
                    <div class="mt-3 grid grid-cols-4 gap-2 font-mono">
                        <div class="bg-black/35 border border-white/10 p-2"><div class="text-[9px] text-slate-500 uppercase">VMAX</div><div class="text-lg font-black text-white">${recon.vmax} kt</div></div>
                        <div class="bg-black/35 border border-white/10 p-2"><div class="text-[9px] text-slate-500 uppercase">MSLP</div><div class="text-lg font-black text-cyan-100">${recon.mslp} hPa</div></div>
                        <div class="bg-black/35 border border-white/10 p-2"><div class="text-[9px] text-slate-500 uppercase">Class</div><div class="text-lg font-black text-amber-100">${escapeHtml(recon.category)}</div></div>
                        <div class="bg-black/35 border border-white/10 p-2"><div class="text-[9px] text-slate-500 uppercase">Fix</div><div class="text-xs font-black text-slate-100">${escapeHtml(recon.fix)}</div></div>
                    </div>
                    <div class="mt-2 text-[10px] font-mono text-slate-300">${escapeHtml(recon.method)}</div>
                    <div class="mt-1 text-[10px] font-mono text-slate-500">${escapeHtml(recon.notes)}</div>
                </div>
            ` : `
                <div class="mt-3 border border-white/10 bg-white/[0.03] p-3 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
                    No recon reanalysis yet. Run recon to place an independent estimate below your analysis.
                </div>
            `;

            contentArea.innerHTML = `
                <div class="w-full h-full overflow-y-auto bg-slate-950 text-slate-100 p-4">
                    <div class="mb-3 flex items-center justify-between gap-3 border-b border-cyan-400/20 pb-3">
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Player Analysis Desk</div>
                            <div class="mt-1 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">T+${targetHour}H sim baseline: ${simWind} kt / ${simPressure} hPa / ${simCategory}</div>
                        </div>
                        <button id="runReconReanalysisButton" class="px-3 py-2 border border-emerald-400/35 bg-emerald-500/10 text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500/20 transition">
                            <i class="fa-solid fa-plane-up mr-2"></i>Run Recon
                        </button>
                    </div>
                    <div class="grid gap-3 md:grid-cols-[1fr_1.15fr]">
                        <div class="border border-cyan-400/20 bg-black/30 p-3">
                            <div class="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300 mb-3">Your Analysis</div>
                            <div class="grid grid-cols-2 gap-2">
                                <label class="text-[9px] uppercase tracking-[0.16em] text-slate-500">VMAX KT<input id="playerAnalysisVmax" type="number" min="0" max="220" value="${escapeHtml(existing.vmax ?? simWind)}" class="mt-1 w-full bg-black border border-white/15 px-2 py-2 text-sm text-white font-mono outline-none focus:border-cyan-400"></label>
                                <label class="text-[9px] uppercase tracking-[0.16em] text-slate-500">MSLP HPA<input id="playerAnalysisMslp" type="number" min="650" max="1035" value="${escapeHtml(existing.mslp ?? simPressure)}" class="mt-1 w-full bg-black border border-white/15 px-2 py-2 text-sm text-white font-mono outline-none focus:border-cyan-400"></label>
                            </div>
                            <label class="mt-2 block text-[9px] uppercase tracking-[0.16em] text-slate-500">Classification
                                <input id="playerAnalysisClass" value="${escapeHtml(existing.classification ?? simCategory)}" maxlength="28" class="mt-1 w-full bg-black border border-white/15 px-2 py-2 text-sm text-white font-mono outline-none focus:border-cyan-400 uppercase">
                            </label>
                            <label class="mt-2 block text-[9px] uppercase tracking-[0.16em] text-slate-500">Notes
                                <textarea id="playerAnalysisNotes" rows="8" class="mt-1 w-full bg-black border border-white/15 px-2 py-2 text-xs text-white font-mono outline-none focus:border-cyan-400 resize-none" placeholder="Write your own Dvorak, satellite, recon, or forecast reasoning...">${escapeHtml(existing.notes || '')}</textarea>
                            </label>
                            <button id="savePlayerAnalysisButton" class="mt-3 w-full py-2 border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 text-[10px] font-black uppercase tracking-[0.22em] hover:bg-cyan-500/20 transition">
                                Save Player Analysis
                            </button>
                            <div id="playerAnalysisSaveStatus" class="mt-2 text-[9px] font-mono uppercase tracking-[0.16em] text-slate-500">${existing.savedAt ? `Saved ${escapeHtml(new Date(existing.savedAt).toUTCString().replace('GMT', 'Z'))}` : 'Not saved yet'}</div>
                        </div>
                        <div class="border border-white/10 bg-black/25 p-3">
                            <div class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Independent Products</div>
                            <div class="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
                                ${buildSatelliteDiagnostics(targetCyclone, targetPoint, targetHour).rows.slice(0, 8).map(row => `
                                    <div class="border border-white/10 bg-white/[0.03] p-2">
                                        <div class="text-cyan-100 font-black">${escapeHtml(row.label)}</div>
                                        <div class="mt-1 text-amber-100">${escapeHtml(row.value)}</div>
                                    </div>
                                `).join('')}
                            </div>
                            ${renderRecon(existing.recon)}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('savePlayerAnalysisButton')?.addEventListener('click', () => {
                const record = {
                    ...(state.playerAnalyses[key] || {}),
                    vmax: Number(document.getElementById('playerAnalysisVmax')?.value || simWind),
                    mslp: Number(document.getElementById('playerAnalysisMslp')?.value || simPressure),
                    classification: String(document.getElementById('playerAnalysisClass')?.value || simCategory).toUpperCase(),
                    notes: String(document.getElementById('playerAnalysisNotes')?.value || ''),
                    savedAt: new Date().toISOString()
                };
                state.playerAnalyses = { ...(state.playerAnalyses || {}), [key]: record };
                saveJsonMap(PLAYER_ANALYSIS_KEY, state.playerAnalyses);
                const status = document.getElementById('playerAnalysisSaveStatus');
                if (status) status.textContent = `Saved ${new Date(record.savedAt).toUTCString().replace('GMT', 'Z')}`;
                playClick();
            });

            document.getElementById('runReconReanalysisButton')?.addEventListener('click', () => {
                const previous = state.playerAnalyses[key] || {};
                const recon = buildReconReanalysis(targetCyclone, targetPoint, targetHour);
                state.playerAnalyses = { ...(state.playerAnalyses || {}), [key]: { ...previous, recon } };
                saveJsonMap(PLAYER_ANALYSIS_KEY, state.playerAnalyses);
                playUpgradeSound();
                showAnalysisDesk();
            });
        };

        const showSynopticChart = () => {
            updateTabStyles(tabSynoptic);
            setCurrentMode('SYNOPTIC');
            currentCanvas = null;
            showLoading();

            // 1. 确定时间点
            const targetHour = getTrackPointHour(renderIndex);
            const isHistoryMode = !!state.selectedHistoryCyclone;
            
            let sourceSiteList = isHistoryMode ? (state.selectedHistoryCyclone.siteHistory || []) : state.siteHistory;
            const record = sourceSiteList.find(h => h.hour === targetHour);
            const sLon = record ? record.lon : state.siteLon;
            const sLat = record ? record.lat : state.siteLat;
            const sName = state.siteName || "STATION";

            let historySystem = null;
            
if (isHistoryMode) {
                // 历史模式：只读存档
                const pressureHistory = state.selectedHistoryCyclone.pressureHistory || [];
                // 精确查找
                const found = pressureHistory.find(h => h.age === targetHour);
                if (found) {
                    historySystem = { lower: found.lower, upper: found.upper };
                } else if (pressureHistory.length > 0) {
                    // 模糊查找 (fallback)
                    const closest = pressureHistory.reduce((prev, curr) => {
                        return (Math.abs(curr.age - targetHour) < Math.abs(prev.age - targetHour) ? curr : prev);
                    });
                    // 只接受误差在6小时内的
                    if (Math.abs(closest.age - targetHour) <= 6) {
                        historySystem = { lower: closest.lower, upper: closest.upper };
                    }
                }
            } else {
                // 实时模式：优先读全局 pressureHistory (模拟进行中)，或者直接读实时 pressureSystems (刚开始)
                if (state.pressureHistory && state.pressureHistory.length > 0) {
                    const found = state.pressureHistory.find(h => h.age === targetHour);
                    if (found) {
                        historySystem = { lower: found.lower, upper: found.upper };
                    }
                }
                
                // 兜底：如果还没生成历史 (Time=0)，直接用当前实时系统
                if (!historySystem) {
                    historySystem = state.pressureSystems;
                }
            }

            // 渲染检查
            if (!historySystem) {
                contentArea.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 font-bold">NO SYNOPTIC DATA FOUND</div>';
                return;
            }

            setTimeout(() => {
                if (typeof renderStationSynopticChart === 'function') {
                    const canvas = renderStationSynopticChart(
                        targetCyclone, 
                        renderIndex, 
                        state.world, 
                        historySystem,
                        sLon, sLat, sName
                    );
                    canvas.className = "max-w-full max-h-full shadow-lg border border-gray-800";
                    contentArea.innerHTML = '';
                    contentArea.appendChild(canvas);
                    currentCanvas = canvas;
                } else {
                    contentArea.innerText = "Module renderStationSynopticChart not loaded.";
                }
            }, 50);
        };

        // 绑定事件
        tabSynoptic.onclick = showSynopticChart;

        // C. [修复版] 站点数据视图：基于历史记录查表
        const showStationData = () => {
            updateTabStyles(tabStation);
            setCurrentMode('STATION');
            currentCanvas = null;
            contentArea.innerHTML = ''; 

            // 1. 计算目标时间
            // renderIndex 是轨迹点的索引，每步3小时
            const targetHour = getTrackPointHour(renderIndex);
            const isHistoryMode = !!state.selectedHistoryCyclone;
            let sourceList = [];
            if (isHistoryMode) {
                sourceList = state.selectedHistoryCyclone.siteHistory || [];
            } else {
                sourceList = state.siteHistory || [];
            }

            // 在确定的列表里查找记录
            const stationTrackPoint = targetCyclone.track[renderIndex];
            const savedRecord = findStationRecord(sourceList, targetHour);
            const stationCoords = getStationCoordinates(stationTrackPoint, savedRecord);
            let activeSourceList = Array.isArray(sourceList) ? sourceList : [];
            let record = savedRecord;
            if (!record) {
                activeSourceList = buildSyntheticStationHistory(targetCyclone, renderIndex, stationCoords.lon, stationCoords.lat);
                record = findStationRecord(activeSourceList, targetHour) || activeSourceList[activeSourceList.length - 1] || null;
            }

            // 3. 错误处理：如果没有记录（例如模拟未开始、未设置站点、或改了站点导致历史失效）
            if (!record) {
                contentArea.innerHTML = `
                    <div class="text-center text-slate-500 mt-20">
                        <i class="fa-solid fa-file-circle-xmark text-4xl mb-4 text-slate-300"></i>
                        <p class="font-bold">NO DATA RECORDED</p>
                        <p class="text-xs mt-2">No station measurements found for T+${targetHour}H.</p>
                        <p class="text-[10px] text-slate-400 mt-1">(Station monitoring might have been disabled)</p>
                    </div>
                `;
                return;
            }

            // 4. 解析记录的数据 (不再进行物理计算)
            const localWindKt = Math.round(record.wind);
            const localPressure = Math.round(record.pressure);
            
            // 恢复风向
            const flowAngleMath = Math.atan2(-record.v, record.u) * (180 / Math.PI);
            let windFromDir = (flowAngleMath + 270) % 360; 
            if (windFromDir < 0) windFromDir += 360;
            const localWindDirStr = directionToCompass(windFromDir);

            // 恢复天气状况 (基于 dBZ)
            const dbz = record.dbz || 0;
            let conditionText = "FAIR";
            let conditionClass = "text-slate-500";
            let iconClass = "fa-sun";

            if (dbz >= 50) { conditionText = "VIOLENT STORM"; conditionClass = "text-purple-600"; iconClass = "fa-cloud-bolt"; }
            else if (dbz >= 35) { conditionText = "HEAVY RAIN"; conditionClass = "text-blue-700"; iconClass = "fa-cloud-showers-heavy"; }
            else if (dbz >= 15) { conditionText = "MODERATE RAIN"; conditionClass = "text-blue-500"; iconClass = "fa-cloud-rain"; }
            else if (dbz >= 5) { conditionText = "OVERCAST"; conditionClass = "text-slate-600"; iconClass = "fa-cloud"; }

            // 计算气旋距离 (使用当时气旋的位置 vs 当时站点的位置)
            // 注意：targetCyclone.track[renderIndex] 是气旋当时的位置
            const p = targetCyclone.track[renderIndex];
            // record.lat/lon 是当时站点的位置 (如果按照上面的修改存了的话，否则用当前的 state.siteLat)
            const siteLatFixed = finiteNumberOrNull(record.lat) ?? finiteNumberOrNull(state.siteLat) ?? stationCoords.lat;
            const siteLonFixed = finiteNumberOrNull(record.lon) ?? finiteNumberOrNull(state.siteLon) ?? stationCoords.lon;
            
            const distKm = calculateDistance(p[1], p[0], siteLatFixed, siteLonFixed);
            const bearing = (Math.atan2(p[0] - siteLonFixed, p[1] - siteLatFixed) * 180 / Math.PI + 360) % 360;
            const dirCompass = directionToCompass(bearing);
            const bearingRad = Math.atan2(p[0] - siteLonFixed, p[1] - siteLatFixed);
            let bearingDeg = (bearingRad * 180 / Math.PI);
            if (bearingDeg < 0) bearingDeg += 360;
            const bearingStr = directionToCompass(bearingDeg);

            // 5. 渲染 HTML (保持原有样式)
            const siteName = state.siteName || (record.synthetic ? "ICWC AUTO STATION" : "UNNAMED STATION");
            const year = getActiveSimulationYear(targetCyclone);
            const monthIndex = (state.currentMonth || 8) - 1; 
            const simDate = new Date(Date.UTC(year, monthIndex, 1)); // 从当月1号开始
            simDate.setUTCHours(simDate.getUTCHours() + targetHour); // 加上累计小时数
            
            const dd = String(simDate.getUTCDate()).padStart(2, '0');
            const hh = String(simDate.getUTCHours()).padStart(2, '0');
            const validTimeStr = `${dd}/${hh}Z`; // 例如: 05/12Z
            const yyyyStr = simDate.getUTCFullYear();
            const mmStr = String(simDate.getUTCMonth() + 1).padStart(2, '0');
            const ddStr = String(simDate.getUTCDate()).padStart(2, '0');
            const hhStr = String(simDate.getUTCHours()).padStart(2, '0');
            const obsTimeCode = `${yyyyStr}${mmStr}${ddStr}${hhStr}`;

            // 2. 计算降水 (3小时累积估算)
            const precipVal = Number.isFinite(Number(record.rainRateMmHr))
                ? Math.max(0, Number(record.rainRateMmHr) * 3)
                : Math.max(0, (dbz - 12) * 2);
            const precipStr = precipVal.toFixed(1); // 保留1位小数 (8.6MM)

            // 3. 拼接最终字符串
            const rawObsText = `${obsTimeCode} ${localWindKt}KT ${localWindDirStr} ${localPressure}hPa ${precipStr}MM`;

contentArea.innerHTML = `
                <div class="bg-white p-6 shadow-sm border border-gray-200 w-full max-w-2xl font-mono h-full flex flex-col">
                    <div class="flex justify-between items-end mb-4 border-b pb-2">
                        <div>
                            <div class="text-[10px] text-gray-400 font-bold">STATION OBS</div>
                            <div class="text-2xl font-black">${siteName.toUpperCase()}</div>
                            <div class="text-[10px] text-gray-500 mt-1 flex gap-2">
                                <span><i class="fa-solid fa-location-dot"></i> ${siteLatFixed.toFixed(2)}N, ${siteLonFixed.toFixed(2)}E</span>
                                <span><i class="fa-solid fa-clock"></i> T+${targetHour}H</span>
                                ${record.synthetic ? '<span class="text-cyan-600"><i class="fa-solid fa-wand-magic-sparkles"></i> AUTO</span>' : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-black text-cyan-700">${validTimeStr}</div>
                            <div class="text-xs text-gray-400 font-bold">VALID TIME</div>
                            <button id="btn-show-obs-text" class="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-300 transition-colors">
                                <i class="fa-solid fa-file-code"></i> TEXT REPORT
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div id="panel-wind" class="bg-slate-50 p-3 border-2 border-transparent hover:border-cyan-400 cursor-pointer transition-all group relative">
                            <div class="text-[10px] text-slate-400 font-bold mb-1 group-hover:text-cyan-600">WIND (CLICK FOR CHART)</div>
                            <div class="flex items-baseline gap-2">
                                <div class="text-4xl font-black text-slate-800">${localWindKt}</div>
                                <div class="text-sm font-bold text-slate-500">KT</div>
                            </div>
                            <div class="text-xs font-bold text-slate-600 mt-1 flex items-center gap-1">
                                <i class="fa-solid fa-location-arrow transform rotate-[${windFromDir + 135}deg]"></i> 
                                ${localWindDirStr} <span class="text-[10px] text-slate-400 font-normal">(${Math.round(windFromDir)}°)</span>
                            </div>
                            <i class="fa-solid fa-chart-line absolute top-2 right-2 text-slate-200 group-hover:text-cyan-400"></i>
                        </div>

                        <div id="panel-pressure" class="bg-slate-50 p-3 border-2 border-transparent hover:border-yellow-400 cursor-pointer transition-all group relative">
                            <div class="text-[10px] text-slate-400 font-bold mb-1 group-hover:text-yellow-600">MSLP (CLICK FOR CHART)</div>
                            <div class="flex items-baseline gap-2">
                                <div class="text-4xl font-black text-slate-800">${localPressure}</div>
                                <div class="text-sm font-bold text-slate-500">hPa</div>
                            </div>
                            <div class="text-xs text-slate-400 mt-1">RECORDED</div>
                            <i class="fa-solid fa-chart-line absolute top-2 right-2 text-slate-200 group-hover:text-yellow-400"></i>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-center mb-4">
                        <div class="border p-2 rounded"><div class="text-[10px] text-gray-400">DIST</div><div class="font-bold">${Math.round(distKm)} KM</div></div>
                        <div class="border p-2 rounded"><div class="text-[10px] text-gray-400">COND</div><div class="font-bold ${conditionClass}"><i class="fa-solid ${iconClass}"></i> ${conditionText}</div></div>
                        <div class="border p-2 rounded">
                            <div class="text-[10px] text-gray-400">STORM BEARING</div>
                            <div class="font-bold text-[10px]">${bearingStr} (${Math.round(bearingDeg)}°)</div>
                        </div>
                    </div>

                    <div class="flex-1 border border-slate-100 bg-slate-50 rounded relative overflow-hidden">
                        <div id="station-chart-title" class="absolute top-2 left-2 text-[10px] font-bold text-slate-400 z-10">SELECT A PARAMETER ABOVE</div>
                        <div id="station-chart-view" class="w-full h-full"></div>
                    </div>
                </div>
            `;

            // 绑定点击事件
            const chartContainer = "#station-chart-view";
            const titleLabel = document.getElementById('station-chart-title');
            const panelWind = document.getElementById('panel-wind');
            const panelPressure = document.getElementById('panel-pressure');
            const historySlice = activeSourceList
                .filter(h => Number.isFinite(Number(h.hour)) && Number(h.hour) <= targetHour)
                .sort((a, b) => Number(a.hour) - Number(b.hour));

            // 默认显示 Wind
            drawStationGraph(chartContainer, historySlice, 'wind');
            titleLabel.textContent = "PAST WIND SPEED HISTORY";
            panelWind.classList.add('border-cyan-400', 'bg-cyan-50');

            panelWind.onclick = () => {
                drawStationGraph(chartContainer, historySlice, 'wind');
                titleLabel.textContent = "WIND SPEED HISTORY";
                // 更新高亮状态
                panelWind.classList.add('border-cyan-400', 'bg-cyan-50');
                panelPressure.classList.remove('border-yellow-400', 'bg-yellow-50');
            };

            panelPressure.onclick = () => {
                drawStationGraph(chartContainer, historySlice, 'pressure');
                titleLabel.textContent = "MSLP HISTORY";
                // 更新高亮状态
                panelPressure.classList.add('border-yellow-400', 'bg-yellow-50');
                panelWind.classList.remove('border-cyan-400', 'bg-cyan-50');
            };
            document.getElementById('btn-show-obs-text').onclick = () => {
                const container = document.querySelector(chartContainer);
                titleLabel.textContent = "FULL OBSERVATION LOG (CHRONOLOGICAL)";
                
                // 1. 准备基础日期参数
                const baseYear = getActiveSimulationYear(targetCyclone);
                const baseMonthIndex = (state.currentMonth || 8) - 1; 

                // 2. 遍历历史切片，生成每一行报文
                // historySlice 已经包含了从 T=0 到 当前时刻 的所有记录
                const logLines = historySlice.map(h => {
                    // A. 恢复时间
                    const tDate = new Date(Date.UTC(baseYear, baseMonthIndex, 1));
                    tDate.setUTCHours(tDate.getUTCHours() + h.hour);

                    const yyyy = tDate.getUTCFullYear();
                    const mm = String(tDate.getUTCMonth() + 1).padStart(2, '0');
                    const dd = String(tDate.getUTCDate()).padStart(2, '0');
                    const hh = String(tDate.getUTCHours()).padStart(2, '0');
                    const timeStr = `${yyyy}${mm}${dd}${hh}`;

                    // B. 恢复数据
                    const w = Math.round(h.wind);
                    const p = Math.round(h.pressure);

                    // 恢复风向字符串
                    const angleMath = Math.atan2(-h.v, h.u) * (180 / Math.PI);
                    let dirDeg = (angleMath + 270) % 360;
                    if (dirDeg < 0) dirDeg += 360;
                    const dirStr = directionToCompass(dirDeg);

                    // 恢复降水
                    const dVal = h.dbz || 0;
                    const prec = Number.isFinite(Number(h.rainRateMmHr))
                        ? Math.max(0, Number(h.rainRateMmHr) * 3).toFixed(1)
                        : Math.max(0, (dVal - 15) * 2).toFixed(1);

                    // C. 格式化单行 (使用 padEnd/padStart 对齐，让排版更整齐)
                    // 例如: 2026070106  12KT  NE   1008hPa  0.0MM
                    return `${timeStr}  ${String(w).padStart(3)}KT  ${dirStr.padEnd(3)}  ${p}hPa  ${prec.padStart(5)}MM`;
                }).join('\n'); // 用换行符连接

                // 3. 渲染到 Textarea (方便复制和滚动)
                container.innerHTML = `
                    <div class="w-full h-full p-2 bg-slate-50 border border-slate-200 rounded">
                        <textarea class="w-full h-full bg-transparent font-mono text-xs md:text-sm text-slate-700 resize-none focus:outline-none leading-relaxed p-2" readonly spellcheck="false">${logLines}</textarea>
                    </div>
                `;
                
                // 自动滚动到底部 (显示最新的一行)
                setTimeout(() => {
                    const textarea = container.querySelector('textarea');
                    if (textarea) textarea.scrollTop = textarea.scrollHeight;
                }, 10);
            };
        };

        // --- 3. 绑定事件 ---
        tabGraphic.onclick = showGraphic;
        tabSpaghetti.onclick = () => showSpaghettiModels('all');
        tabModels.onclick = () => showModelFields('GFS', 'mslp_wind');
        tabProb34.onclick = () => showProb(34);
        tabProb64.onclick = () => showProb(64);
        tabSatellite.onclick = showSatelliteImagery;
        tabAnalysis.onclick = showAnalysisDesk;
        tabStation.onclick = showStationData;

        const saveBtn = document.getElementById('saveJtwcImage');
        saveBtn.onclick = () => {

            if (currentMode === 'SATELLITE') {
                const name = targetCyclone.name || 'STORM';
                const timeTag = `T${renderIndex * 3}`;
                const imgElement = contentArea.querySelector('img');
                if (imgElement && imgElement.src) {
                    const link = document.createElement('a');
                    link.download = `SAT_${name}_${timeTag}.png`;
                    link.href = imgElement.src; // 直接获取 Base64 数据
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    alert("No image to save!");
                }
                return; // 结束执行
            }

            if (currentCanvas) {
                const link = document.createElement('a');
                const name = targetCyclone.name || 'STORM';
                // 使用 currentMode 来区分文件名
                link.download = `JTWC_${name}_${currentMode}_T${renderIndex * 3}.png`;
                link.href = currentCanvas.toDataURL();
                link.click();
            } else {
                alert("No image to save!");
            }
        };
        let timelineBtn = document.getElementById('saveTimelineVideo');
        if (!timelineBtn) {
            timelineBtn = document.createElement('button');
            timelineBtn.id = 'saveTimelineVideo';
            // 样式与 Save Image 按钮保持一致，放在它左边
            timelineBtn.className = "px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors flex items-center gap-2";
            timelineBtn.innerHTML = '<i class="fa-solid fa-film"></i> SAVE TIMELINE';
            
            // 将按钮插入到 saveBtn 的父容器中，并放在 saveBtn 之前
            if (saveBtn && saveBtn.parentNode) {
                // 如果父容器是 flex，这会让它排在左边
                saveBtn.parentNode.insertBefore(timelineBtn, saveBtn);
            }
        }
        syncTimelineButton();

        // 2. 绑定点击事件
        timelineBtn.onclick = async () => {
            // 仅支持 Graphic 和 Synoptic 模式
            if (currentMode !== 'GRAPHIC' && currentMode !== 'SYNOPTIC') {
                alert("Timeline video is only available for WARNING GRAPHIC and SYNOPTIC CHART tabs.");
                return;
            }

            // A. 准备数据
            const track = targetCyclone.track;
            if (!track || track.length === 0) return;

            // 筛选整点时刻 (00, 06, 12, 18Z)
            // 假设每个点间隔 3 小时 (0, 3, 6, 9...)
            // index % 2 === 0 即为 0, 6, 12... (对应索引 0, 2, 4...)
            const timelineIndices = track.map((_, i) => i).filter(i => (i * 3) % 6 === 0);
            
            if (timelineIndices.length === 0) {
                alert("Not enough track points for a timeline.");
                return;
            }

            // B. 准备录制环境
            const loadingBadge = document.createElement('div');
            loadingBadge.className = "fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-xl z-[9999] font-bold animate-pulse flex items-center gap-2";
            loadingBadge.innerHTML = '<i class="fa-solid fa-circle text-xs"></i> RECORDING TIMELINE...';
            document.body.appendChild(loadingBadge);

            timelineBtn.disabled = true;
            timelineBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESSING...';

            try {
                // 创建一个隐藏的画布用于录制
                // 分辨率设为 1600x1200 (与 Synoptic Chart 一致) 或 1200x900
                const recWidth = 1600;
                const recHeight = 1200;
                const canvas = document.createElement('canvas');
                canvas.width = recWidth;
                canvas.height = recHeight;
                const ctx = canvas.getContext('2d');

                // 设置背景色 (防止透明背景导致黑屏)
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, recWidth, recHeight);

                // 创建 MediaRecorder 流
                // 30fps，但在录制时我们通过控制"绘制间隔"来控制播放速度
                const stream = canvas.captureStream(30); 
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 36000000
                });

                const chunks = [];
                recorder.ondataavailable = e => chunks.push(e.data);
                recorder.start();

                // C. 逐帧绘制并录制
                // 我们希望视频里的播放速度是每帧约 0.5 秒 (2 FPS)
                // 技巧：绘制一帧 -> 等待 500ms -> 绘制下一帧 -> 等待...
                // 这样 MediaRecorder 录下来的就是慢速播放的视频
                
                for (let i = 0; i < timelineIndices.length; i++) {
                    const idx = timelineIndices[i];
                    const targetHour = idx * 3;
                    
                    // 更新进度提示
                    loadingBadge.innerHTML = `<i class="fa-solid fa-circle text-xs"></i> RECORDING FRAME ${i+1}/${timelineIndices.length}`;

                    let frameCanvas = null;

                    if (currentMode === 'GRAPHIC') {
                        // 渲染 Warning Graphic
                        if (typeof renderJTWCStyle === 'function') {
                            frameCanvas = renderJTWCStyle(targetCyclone, idx, state.world);
                        }
                    } else if (currentMode === 'SYNOPTIC') {
                        // 渲染 Synoptic Chart (需要复杂的查表逻辑)
                        const isHistoryMode = !!state.selectedHistoryCyclone;
                        let historySystem = null;

                        if (isHistoryMode) {
                            const pressureHistory = state.selectedHistoryCyclone.pressureHistory || [];
                            const found = pressureHistory.find(h => h.age === targetHour);
                            // 模糊查找范围放大一点防止丢帧
                            if (found) {
                                historySystem = { lower: found.lower, upper: found.upper };
                            } else if (pressureHistory.length > 0) {
                                const closest = pressureHistory.reduce((prev, curr) => 
                                    (Math.abs(curr.age - targetHour) < Math.abs(prev.age - targetHour) ? curr : prev)
                                );
                                if (Math.abs(closest.age - targetHour) <= 6) {
                                    historySystem = { lower: closest.lower, upper: closest.upper };
                                }
                            }
                        } else {
                            // 实时模式查表
                            if (state.pressureHistory) {
                                const found = state.pressureHistory.find(h => h.age === targetHour);
                                if (found) historySystem = { lower: found.lower, upper: found.upper };
                            }
                            if (!historySystem) historySystem = state.pressureSystems;
                        }

                        // 查找站点位置 (如果记录了)
                        const sourceList = isHistoryMode ? (state.selectedHistoryCyclone.siteHistory || []) : state.siteHistory;
                        const record = sourceList.find(h => h.hour === targetHour);
                        const sLon = record ? record.lon : state.siteLon;
                        const sLat = record ? record.lat : state.siteLat;
                        const sName = state.siteName || "STATION";

                        if (historySystem && typeof renderStationSynopticChart === 'function') {
                            frameCanvas = renderStationSynopticChart(
                                targetCyclone, 
                                idx, 
                                state.world, 
                                historySystem,
                                sLon, sLat, sName
                            );
                        }
                    }

                    // 将生成的帧绘制到录制画布上
                    if (frameCanvas) {
                        ctx.fillStyle = "white"; // 清除背景
                        ctx.fillRect(0, 0, recWidth, recHeight);
                        // 居中绘制 (保持比例)
                        const scale = Math.min(recWidth / frameCanvas.width, recHeight / frameCanvas.height);
                        const w = frameCanvas.width * scale;
                        const h = frameCanvas.height * scale;
                        const x = (recWidth - w) / 2;
                        const y = (recHeight - h) / 2;
                        ctx.drawImage(frameCanvas, x, y, w, h);
                    }

                    // **核心技巧**：等待 500ms，让 recorder "录制" 这一帧持续 0.5 秒
                    // 这样生成的视频就会自动动起来
                    await new Promise(r => setTimeout(r, 400)); 
                }

                // 结束录制
                recorder.stop();
                
                // 等待生成 Blob
                await new Promise(resolve => {
                    recorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const name = (targetCyclone.name || "STORM").toUpperCase();
                        a.download = `${name}_${currentMode}_TIMELINE.webm`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                });

            } catch (err) {
                console.error("Video generation failed:", err);
                alert("Failed to generate video. Check console for details.");
            } finally {
                // 清理 UI
                document.body.removeChild(loadingBadge);
                timelineBtn.disabled = false;
                timelineBtn.innerHTML = '<i class="fa-solid fa-film"></i> SAVE TIMELINE';
            }
        };

        showGraphic();
    });

    closeJtwcModal.addEventListener('click', () => jtwcModal.classList.add('hidden'));
    
    if (catButton && newsModal) {
        catButton.addEventListener('click', () => {
            if (!state.cyclone || !state.cyclone.track || state.cyclone.track.length < 2) {
                alert("no simulation found.");
                return;
            }

            if (typeof playClick === 'function') playClick();
        
            // 1. 显示模态框
            newsModal.classList.remove('hidden');

            // 2. 设置滚动新闻内容
            const ticker = document.getElementById('newsTicker');
            const cycloneNum = String(state.simulationCount).padStart(2, '0');
            const name = getCycloneHeadlineName(state.cyclone, cycloneNum);
            const catName = state.cyclone.isInvest ? 'INVEST DISTURBANCE' : getEnglishCategoryName(
                state.cyclone.intensity, 
                state.cyclone.isExtratropical, 
                state.cyclone.isSubtropical,
                basinSelector.value
            );
            const wind = Math.round(state.cyclone.intensity);
            const pressure = Math.round(windToPressure(state.cyclone.intensity, state.cyclone.circulationSize, basinSelector.value));

            let landfallAlert = "";
            
            // 检查是否有预测路径
            if (state.pathForecasts && state.pathForecasts.length > 0) {
                // 取第一条模型 (通常是共识或GFS)
                const forecastTrack = state.pathForecasts[0].track;
                let willLandfall = false;

                // 遍历预测点 (每点通常间隔6-12小时，覆盖未来72小时+)
                for (let i = 0; i < forecastTrack.length; i++) {
                    const p = forecastTrack[i];
                    // p[0] = lon, p[1] = lat
                    // 使用 terrain-data.js 里的 getLandStatus 检测
                    if (getLandStatus(p[0], p[1]).isLand) {
                        willLandfall = true;
                        break; // 只要有一点碰到陆地，就触发警报
                    }
                }

                if (willLandfall) {
                    landfallAlert = "AND FORECAST INDICATES LANDFALL IMMINENT IN THE NEXT 72 HOURS.";
                }
            }
        
            // 构建新闻字符串 (重复几次以填满屏幕)
            const newsItem = `UPDATED: ${catName} "${name}" LOCATED AT ${state.cyclone.lat.toFixed(1)}N ${state.cyclone.lon.toFixed(1)}E, MAX WINDS: ${Math.round(wind/5)*5} KT, MIN PRESSURE: ${pressure} HPA. ${landfallAlert}`;
            ticker.textContent = newsItem;

            // 3. 启动 Canvas 动画
            if (stopNewsAnimation) stopNewsAnimation(); // 清理旧的
            stopNewsAnimation = startNewsAnimation(
                newsCanvas, 
                state.world, 
                state.cyclone, 
                state.pathForecasts, 
                basinSelector.value,
                state.simulationCount,
                state.pressureSystems,
                state.currentMonth,
                state.GlobalTemp,
                state.GlobalShear
            );
        });

        const closeNews = () => {
            newsModal.classList.add('hidden');
            if (stopNewsAnimation) {
                stopNewsAnimation(); // 停止动画循环，节省性能
                stopNewsAnimation = null;
            }
        };

        closeNewsModal.addEventListener('click', closeNews);
    
        // 点击背景关闭
        newsModal.addEventListener('click', (e) => {
            if (e.target === newsModal) closeNews();
        });
    }

    document.addEventListener('keydown', (event) => {
        // [关键] 如果焦点在输入框或文本域内，不触发快捷键，防止打字冲突
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const menuVisible = gameIntroOverlay && !gameIntroOverlay.classList.contains('game-shell-hidden');
        if (menuVisible) {
            if (event.code === 'Escape') {
                event.preventDefault();
                hideGameMenu();
                return;
            }
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                if (mainMenuScene && !mainMenuScene.classList.contains('hidden')) {
                    menuStartButton?.click();
                } else {
                    showMainMenu();
                }
                return;
            }
        } else if (event.code === 'Escape' || event.code === 'KeyM') {
            event.preventDefault();
            showMainMenu();
            return;
        }

        // Space: 暂停/继续
        if (event.code === 'Space') {
            event.preventDefault(); // 防止滚动页面
            togglePause();
        }

        if (event.code === 'KeyF') {
            if (forecastContainer) {
                // 1. 切换状态
                state.showIntensityChart = !state.showIntensityChart;
                
                if (state.showIntensityChart) {
                    // A. 显示容器
                    forecastContainer.classList.remove('hidden');
                    
                    // B. [关键修复] 强制重绘图表
                    // 必须加 setTimeout，让浏览器先移除 hidden 类并计算出容器宽度后，再执行 D3 绘图
                    if (state.cyclone && state.cyclone.track && state.cyclone.track.length > 0) {
                        setTimeout(() => {
                            // 重新绘制，确保数据是最新的，且宽度计算正确
                            // 传入当前的 chartMode ('kt' 或 'hpa') 和 basinSelector，保证单位正确
                            drawHistoricalIntensityChart(
                                chartContainer, 
                                state.cyclone.track, 
                                tooltip, 
                                chartMode, 
                                basinSelector.value
                            );
                        }, 10);
                    }

                } else {
                    // C. 隐藏容器
                    forecastContainer.classList.add('hidden');
                }
                
                if (typeof playClick === 'function') playClick();
            }
        }

        // S: 开始 / 重启 (相当于点击 Generate 按钮)
        if (event.code === 'KeyS') {
            // 使用 click() 模拟点击，这样能同时触发音效、UI更新和模拟逻辑
            generateButton.click();
        }

        const toggleLegend = (elementId, show) => {
            const el = document.getElementById(elementId);
            if (!el) return;
            
            if (show) {
                el.classList.remove('hidden');
                // 使用 requestAnimationFrame 确保 remove hidden 后 transition 生效
                requestAnimationFrame(() => el.setAttribute('data-show', 'true'));
            } else {
                el.setAttribute('data-show', 'false');
                setTimeout(() => el.classList.add('hidden'), 300);
            }
        };

        // [优化] 统一更新 UI 状态 (状态改变后调用一次即可)
        const updateRadarUI = () => {
            toggleLegend('radar-legend', state.radarMode);
            toggleLegend('doppler-legend', state.dopplerMode);
            requestRedraw();
            console.log(`[Mode] Radar: ${state.radarMode}, Doppler: ${state.dopplerMode}`);
        };

        // 'R' 键：切换雷达 (如果多普勒开启，则强切回雷达)
        if (event.code === 'KeyR') {
            if (state.dopplerMode) {
                state.dopplerMode = false;
                state.radarMode = true;
            } else {
                state.radarMode = !state.radarMode;
            }
            updateRadarUI();
        }

        // 'D' 键：切换多普勒 (如果雷达开启，则强切回多普勒)
        if (event.code === 'KeyD') {
            if (state.radarMode) {
                state.radarMode = false;
                state.dopplerMode = true;
            } else {
                state.dopplerMode = !state.dopplerMode;
            }
            updateRadarUI();
        }
        // 1, 2, 3: 切换模拟速度 (如果你之前添加了这部分代码，请保留)
        if (event.key === '1') changeSimulationSpeed(50);
        if (event.key === '2') changeSimulationSpeed(200);
        if (event.key === '3') changeSimulationSpeed(600);

        if (event.code === 'KeyV') {
            toggleLeftPanel();
        }
    });

    tabKt.addEventListener('click', () => {
        chartMode = 'kt';
        updateTabUI();
        if (state.cyclone && state.cyclone.track) {
            drawHistoricalIntensityChart(chartContainer, state.cyclone.track, tooltip, 'kt', basinSelector.value);
        }
    });

    tabHpa.addEventListener('click', () => {
        chartMode = 'hpa';
        updateTabUI();
        if (state.cyclone && state.cyclone.track) {
            drawHistoricalIntensityChart(chartContainer, state.cyclone.track, tooltip, 'hpa', basinSelector.value);
        }
    });

    // 打开帮助面板
    helpButton.addEventListener('click', () => {
        playClick();
        helpModal.classList.remove('hidden');
        // 微小的延时以触发 CSS transition
        setTimeout(() => {
            helpModal.classList.remove('opacity-0');
            helpModal.querySelector('div').classList.remove('scale-95');
            helpModal.querySelector('div').classList.add('scale-100');
        }, 10);
    });

    // 关闭帮助面板
    function hideHelp() {
        helpModal.classList.add('opacity-0');
        helpModal.querySelector('div').classList.add('scale-95');
        helpModal.querySelector('div').classList.remove('scale-100');
        setTimeout(() => {
            helpModal.classList.add('hidden');
        }, 300);
    }

    closeHelpModal.addEventListener('click', () => {
        playClick(); // 可选：关闭音效
        hideHelp();
    });

    sfxButton.addEventListener('click', () => {
        const isMuted = toggleSFX();
    
        // 更新 UI 状态
        if (isMuted) {
            sfxIcon.classList.remove('fa-volume-high');
            sfxIcon.classList.add('fa-volume-xmark');
            sfxButton.classList.replace('text-cyan-400', 'text-slate-500');
        } else {
            sfxIcon.classList.remove('fa-volume-xmark');
            sfxIcon.classList.add('fa-volume-high');
            sfxButton.classList.replace('text-slate-500', 'text-cyan-400');
        }
    
        // 触发一个简短的点击音效（如果此时已开启）以反馈
        if (typeof playClick === 'function') playClick();
    });

    // 点击背景关闭
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            hideHelp();
        }
    });
});
