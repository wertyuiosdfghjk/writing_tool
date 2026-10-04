const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
app.disableHardwareAcceleration();
let window;
let allowClose = false;
const { createLibrary } = require('./library.cjs');
const library = createLibrary(app.getPath('userData'));
ipcMain.handle('draft:load', (_event, id) => library.load(id));
ipcMain.handle('draft:save', (_event, draft) => library.save(draft));
ipcMain.handle('library:list', () => library.list());
ipcMain.handle('library:create', (_event, title) => library.create(title));
ipcMain.handle('library:rename', (_event, id, title) => library.rename(id, title));
ipcMain.on('draft:close-ready', () => { allowClose = true; window.close(); });
app.whenReady().then(() => {
  window = new BrowserWindow({ width: 1120, height: 820, minWidth: 520, minHeight: 420, backgroundColor: '#f5f0df', title: '写作工具', icon: path.join(__dirname, 'assets/app.ico'), autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  window.setMenu(null);
  window.loadFile('index.html');
  window.on('close', event => {
    if (!allowClose) { event.preventDefault(); window.webContents.send('draft:before-close'); }
  });
});
app.on('window-all-closed', () => app.quit());
