const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('writer', {
  load: id => ipcRenderer.invoke('draft:load', id),
  list: () => ipcRenderer.invoke('library:list'),
  create: title => ipcRenderer.invoke('library:create', title),
  rename: (id, title) => ipcRenderer.invoke('library:rename', id, title),
  save: draft => ipcRenderer.invoke('draft:save', draft),
  onClose: callback => ipcRenderer.on('draft:before-close', callback),
  closeReady: () => ipcRenderer.send('draft:close-ready')
});
