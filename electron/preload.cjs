const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('stormIncDesktop', {
  isDesktop: true,
  platform: process.platform
});
