const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stormIncDesktop', {
  isDesktop: true,
  platform: process.platform,
  multiplayer: {
    startHost: (options) => ipcRenderer.invoke('multiplayer:start-host', options),
    connect: (options) => ipcRenderer.invoke('multiplayer:connect', options),
    disconnect: () => ipcRenderer.invoke('multiplayer:disconnect'),
    sendChat: (options) => ipcRenderer.invoke('multiplayer:send-chat', options),
    sendState: (options) => ipcRenderer.invoke('multiplayer:send-state', options),
    getStatus: () => ipcRenderer.invoke('multiplayer:get-status'),
    onEvent: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('multiplayer:event', listener);
      return () => ipcRenderer.removeListener('multiplayer:event', listener);
    }
  }
});
