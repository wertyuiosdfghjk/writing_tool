const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('writer', {
  load: () => ipcRenderer.invoke('draft:load'),
  save: draft => ipcRenderer.invoke('draft:save', draft),
  onClose: callback => ipcRenderer.on('draft:before-close', callback),
  closeReady: () => ipcRenderer.send('draft:close-ready')
});
