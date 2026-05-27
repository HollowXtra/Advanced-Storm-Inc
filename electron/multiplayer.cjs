const { BrowserWindow, ipcMain } = require('electron');
const crypto = require('node:crypto');
const nodeNet = require('node:net');
const os = require('node:os');

const DEFAULT_PORT = 37219;
const MAX_CHAT_LENGTH = 500;
const MAX_NAME_LENGTH = 24;
const MAX_LINE_LENGTH = 180000;

const session = {
  mode: 'offline',
  server: null,
  clients: new Map(),
  clientSocket: null,
  localName: 'Tracker',
  port: DEFAULT_PORT,
  host: '',
  peerId: '',
  lastState: null
};

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanName(value) {
  return cleanText(value, MAX_NAME_LENGTH) || 'Tracker';
}

function cleanPort(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PORT;
  return Math.min(65535, Math.max(1024, parsed));
}

function cleanHost(value) {
  return String(value || '127.0.0.1')
    .replace(/^tcp:\/\//i, '')
    .replace(/^ws:\/\//i, '')
    .replace(/^wss:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .trim() || '127.0.0.1';
}

function getLocalAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

function emitToRenderers(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('multiplayer:event', payload);
    }
  }
}

function writeLine(socket, payload) {
  if (!socket || socket.destroyed || !socket.writable) return false;
  try {
    socket.write(`${JSON.stringify(payload)}\n`);
    return true;
  } catch {
    return false;
  }
}

function attachJsonLines(socket, onMessage, onClose) {
  let buffer = '';

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    if (buffer.length > MAX_LINE_LENGTH) {
      buffer = '';
      return;
    }

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          onMessage(JSON.parse(line));
        } catch {
          writeLine(socket, { type: 'system', text: 'Dropped malformed multiplayer packet.', time: Date.now() });
        }
      }
      newlineIndex = buffer.indexOf('\n');
    }
  });

  socket.on('close', onClose);
  socket.on('error', () => {});
}

function broadcast(payload) {
  for (const peer of session.clients.values()) {
    writeLine(peer.socket, payload);
  }
}

function buildStatus(extra = {}) {
  const addresses = getLocalAddresses();
  return {
    kind: 'status',
    mode: session.mode,
    name: session.localName,
    host: session.host,
    port: session.port,
    address: addresses[0] || '127.0.0.1',
    addresses,
    clientCount: session.clients.size,
    peers: [...session.clients.values()].map(peer => ({ id: peer.id, name: peer.name })),
    connected: session.mode === 'host' || (session.mode === 'client' && !!session.clientSocket && !session.clientSocket.destroyed),
    ...extra
  };
}

function emitStatus(extra = {}) {
  const status = buildStatus(extra);
  emitToRenderers(status);
  return status;
}

function emitSystem(text) {
  emitToRenderers({ kind: 'system', text, time: Date.now() });
}

function stopSession({ quiet = false } = {}) {
  if (session.server) {
    for (const peer of session.clients.values()) {
      peer.socket.destroy();
    }
    session.clients.clear();
    session.server.close();
    session.server = null;
  }

  if (session.clientSocket) {
    session.clientSocket.destroy();
    session.clientSocket = null;
  }

  session.mode = 'offline';
  session.host = '';
  session.peerId = '';
  session.lastState = null;

  if (!quiet) {
    emitSystem('Multiplayer disconnected.');
    emitStatus();
  }
}

function handleHostClient(socket) {
  const peer = {
    id: makeId(),
    name: 'Connecting',
    socket
  };

  socket.setKeepAlive(true, 30000);
  session.clients.set(peer.id, peer);

  writeLine(socket, {
    type: 'welcome',
    id: peer.id,
    hostName: session.localName,
    time: Date.now()
  });

  if (session.lastState) {
    writeLine(socket, {
      type: 'state',
      from: session.localName,
      state: session.lastState,
      time: Date.now()
    });
  }

  attachJsonLines(socket, (message) => {
    if (message.type === 'hello') {
      peer.name = cleanName(message.name);
      const text = `${peer.name} joined the room.`;
      emitSystem(text);
      broadcast({ type: 'system', text, time: Date.now() });
      emitStatus();
      return;
    }

    if (message.type === 'chat') {
      const text = cleanText(message.text, MAX_CHAT_LENGTH);
      if (!text) return;
      const payload = { type: 'chat', from: peer.name, text, time: Date.now() };
      emitToRenderers({ kind: 'chat', from: peer.name, text, time: payload.time });
      broadcast(payload);
    }
  }, () => {
    const oldName = peer.name;
    session.clients.delete(peer.id);
    if (oldName && oldName !== 'Connecting') {
      const text = `${oldName} left the room.`;
      emitSystem(text);
      broadcast({ type: 'system', text, time: Date.now() });
    }
    emitStatus();
  });
}

async function startHost(options = {}) {
  stopSession({ quiet: true });

  session.mode = 'host';
  session.localName = cleanName(options.name);
  session.port = cleanPort(options.port);
  session.host = '';
  session.lastState = null;

  session.server = nodeNet.createServer(handleHostClient);

  await new Promise((resolve, reject) => {
    session.server.once('error', reject);
    session.server.listen(session.port, '0.0.0.0', () => {
      session.server.off('error', reject);
      session.port = session.server.address().port;
      resolve();
    });
  });

  const status = emitStatus({ connected: true });
  emitSystem(`Hosting multiplayer room on ${status.address}:${status.port}.`);
  return status;
}

async function connectToHost(options = {}) {
  stopSession({ quiet: true });

  session.mode = 'client';
  session.localName = cleanName(options.name);
  session.host = cleanHost(options.host);
  session.port = cleanPort(options.port);
  session.lastState = null;

  const socket = nodeNet.createConnection({ host: session.host, port: session.port });
  session.clientSocket = socket;
  socket.setKeepAlive(true, 30000);

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  writeLine(socket, { type: 'hello', name: session.localName, time: Date.now() });

  attachJsonLines(socket, (message) => {
    if (message.type === 'welcome') {
      session.peerId = message.id || '';
      emitSystem(`Connected to ${cleanName(message.hostName || 'host')}.`);
      emitStatus({ connected: true });
      return;
    }

    if (message.type === 'chat') {
      emitToRenderers({
        kind: 'chat',
        from: cleanName(message.from),
        text: cleanText(message.text, MAX_CHAT_LENGTH),
        time: Number(message.time) || Date.now()
      });
      return;
    }

    if (message.type === 'state' && message.state) {
      session.lastState = message.state;
      emitToRenderers({
        kind: 'state',
        from: cleanName(message.from || 'Host'),
        snapshot: message.state,
        time: Number(message.time) || Date.now()
      });
      return;
    }

    if (message.type === 'system') {
      emitSystem(cleanText(message.text, 160));
    }
  }, () => {
    if (session.mode !== 'client') return;
    session.mode = 'offline';
    session.clientSocket = null;
    emitSystem('Lost multiplayer connection.');
    emitStatus({ connected: false });
  });

  const status = emitStatus({ connected: true });
  emitSystem(`Joining multiplayer room at ${session.host}:${session.port}.`);
  return status;
}

function sendChat(options = {}) {
  const text = cleanText(options.text, MAX_CHAT_LENGTH);
  if (!text || session.mode === 'offline') {
    return buildStatus({ sent: false });
  }

  if (session.mode === 'host') {
    const payload = { type: 'chat', from: session.localName, text, time: Date.now() };
    emitToRenderers({ kind: 'chat', from: session.localName, text, time: payload.time });
    broadcast(payload);
    return buildStatus({ sent: true });
  }

  writeLine(session.clientSocket, { type: 'chat', text, time: Date.now() });
  return buildStatus({ sent: true });
}

function sendState(options = {}) {
  if (session.mode !== 'host' || !options.snapshot) {
    return buildStatus({ sent: false });
  }

  session.lastState = options.snapshot;
  broadcast({
    type: 'state',
    from: session.localName,
    state: session.lastState,
    time: Date.now()
  });
  return buildStatus({ sent: true });
}

function registerMultiplayerIpc() {
  ipcMain.handle('multiplayer:start-host', (_event, options) => startHost(options));
  ipcMain.handle('multiplayer:connect', (_event, options) => connectToHost(options));
  ipcMain.handle('multiplayer:disconnect', () => {
    stopSession();
    return buildStatus();
  });
  ipcMain.handle('multiplayer:send-chat', (_event, options) => sendChat(options));
  ipcMain.handle('multiplayer:send-state', (_event, options) => sendState(options));
  ipcMain.handle('multiplayer:get-status', () => buildStatus());
}

module.exports = {
  registerMultiplayerIpc,
  stopSession
};
