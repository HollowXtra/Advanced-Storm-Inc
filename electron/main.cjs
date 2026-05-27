const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { registerMultiplayerIpc, stopSession } = require('./multiplayer.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'storm-inc',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

const appRoot = path.resolve(__dirname, '..');
const iconPath = path.join(appRoot, 'build', 'icon.ico');
const isSmokeTest = process.env.STORM_INC_SMOKE_TEST === '1';
const isSimulationSmokeTest = process.env.STORM_INC_SIM_SMOKE_TEST === '1';

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('use-angle', 'd3d11');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.enceladuscat.storminc');
}

function isInsideAppRoot(filePath) {
  const relativePath = path.relative(appRoot, filePath);
  return relativePath === '' || (!!relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function resolveAppFile(url) {
  const parsedUrl = new URL(url);
  let routePath = decodeURIComponent(parsedUrl.pathname);

  if (routePath === '/' || routePath === '') {
    routePath = '/Storm_Inc/TCM.html';
  }

  const relativePath = routePath.replace(/^\/+/, '');
  const filePath = path.resolve(appRoot, relativePath);

  if (!isInsideAppRoot(filePath)) {
    return null;
  }

  return filePath;
}

function registerAppProtocol() {
  protocol.handle('storm-inc', (request) => {
    const filePath = resolveAppFile(request.url);

    if (!filePath) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'STORM_INC',
    backgroundColor: '#000000',
    icon: iconPath,
    autoHideMenuBar: true,
    fullscreenable: true,
    show: !isSmokeTest,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => {
    if (isSmokeTest) return;

    win.show();
    win.focus();
  });

  win.webContents.once('did-finish-load', async () => {
    if (!isSmokeTest) return;

    try {
      const result = await win.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const startedAt = Date.now();
          const runSimulationSmoke = ${JSON.stringify(isSimulationSmokeTest)};
          const smokeBasin = ${JSON.stringify(process.env.STORM_INC_SMOKE_BASIN || '')};
          const smokeYear = ${JSON.stringify(process.env.STORM_INC_SMOKE_YEAR || '')};
          const smokeErrors = [];
          window.addEventListener('error', (event) => smokeErrors.push(event.message || String(event.error || event)));
          window.addEventListener('unhandledrejection', (event) => smokeErrors.push(String(event.reason || event)));
          let clickedStart = false;

          const check = () => {
            const generateButton = document.getElementById('generateButton');
            const baseReady = document.title.includes('STORM_INC')
              && window.stormIncDesktop?.isDesktop === true
              && !!window.stormIncDesktop?.multiplayer
              && !!document.getElementById('map-container')
              && !!document.getElementById('satCanvas')
              && !!generateButton;

            if (runSimulationSmoke && baseReady && !clickedStart && generateButton && !generateButton.disabled) {
              if (smokeBasin) {
                const selector = document.getElementById('basinSelector');
                if (selector) selector.value = smokeBasin;
              }
              if (smokeYear) {
                const selector = document.getElementById('yearSelector');
                if (selector) selector.value = smokeYear;
              }
              clickedStart = true;
              generateButton.click();
            }

            const simulationReady = !runSimulationSmoke || (
              clickedStart
              && !document.getElementById('simulation-output')?.classList.contains('hidden')
              && !!document.getElementById('damageCounter')
              && !!document.getElementById('deathCounter')
              && !!document.getElementById('rainRateCounter')
              && !!document.getElementById('investIdCounter')
              && !!document.getElementById('yearSelector')
              && !!document.getElementById('multiplayerButton')
              && !!document.getElementById('mpChatInput')
              && !!document.querySelector('#basinSelector option[value="MED"]')
              && !!document.getElementById('ohcCounter')
              && !!document.getElementById('parStatus')
              && !!document.getElementById('toggleSteeringButton')
              && !!document.getElementById('warning-list')
              && document.querySelectorAll('.city-label').length > 0
              && document.querySelectorAll('.layer-cyclone circle').length > 0
            );

            const result = {
              title: document.title,
              hasDesktopBridge: window.stormIncDesktop?.isDesktop === true,
              hasMultiplayerBridge: !!window.stormIncDesktop?.multiplayer,
              hasMapContainer: !!document.getElementById('map-container'),
              hasSatelliteCanvas: !!document.getElementById('satCanvas'),
              hasGenerateButton: !!generateButton,
              clickedStart,
              hasDamageCounter: !!document.getElementById('damageCounter'),
              hasDeathCounter: !!document.getElementById('deathCounter'),
              hasRainCounter: !!document.getElementById('rainRateCounter'),
              hasInvestPanel: !!document.getElementById('investIdCounter') && !!document.getElementById('investChance7Counter'),
              hasYearSelector: !!document.getElementById('yearSelector'),
              selectedYear: document.getElementById('yearSelector')?.value || '',
              hasMultiplayerPanel: !!document.getElementById('multiplayerButton') && !!document.getElementById('mpChatInput'),
              hasMediterraneanBasin: !!document.querySelector('#basinSelector option[value="MED"]'),
              selectedBasin: document.getElementById('basinSelector')?.value || '',
              hasOhcCounter: !!document.getElementById('ohcCounter'),
              hasParStatus: !!document.getElementById('parStatus'),
              hasSteeringToggle: !!document.getElementById('toggleSteeringButton'),
              hasWarningPanel: !!document.getElementById('warning-list'),
              cityLabelCount: document.querySelectorAll('.city-label').length,
              cycloneIconCount: document.querySelectorAll('.layer-cyclone circle').length,
              smokeErrors
            };

            const ready = baseReady && simulationReady && smokeErrors.length === 0;

            if (ready || Date.now() - startedAt > 15000) {
              resolve({ ...result, ready });
              return;
            }

            setTimeout(check, 250);
          };

          check();
        });
      `);

      console.log(`STORM_INC_SMOKE_TEST=${JSON.stringify(result)}`);
      app.exit(result.ready ? 0 : 1);
    } catch (error) {
      console.error('STORM_INC_SMOKE_TEST_FAILED', error);
      app.exit(1);
    }
  });

  win.webContents.once('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (!isSmokeTest) return;

    console.error(`STORM_INC_SMOKE_TEST_LOAD_FAILED=${JSON.stringify({ errorCode, errorDescription, validatedURL })}`);
    app.exit(1);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('storm-inc://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const shouldToggleFullscreen = input.key === 'F11' || (input.alt && input.key === 'Enter');
    if (!shouldToggleFullscreen) return;

    win.setFullScreen(!win.isFullScreen());
    event.preventDefault();
  });

  win.loadURL('storm-inc://app/Storm_Inc/TCM.html');
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  registerMultiplayerIpc();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopSession({ quiet: true });
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
