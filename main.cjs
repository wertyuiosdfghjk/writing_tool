const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.disableHardwareAcceleration();
let window;
let pendingWrite = Promise.resolve();
let allowClose = false;
const dataPath = () => path.join(app.getPath('userData'), 'manuscript.json');
ipcMain.handle('draft:load', async () => {
  try { return JSON.parse(await fs.readFile(dataPath(), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { text: '', fontSize: 22 }; throw error; }
});
ipcMain.handle('draft:save', async (_event, draft) => {
  if (typeof draft.text !== 'string' || !Number.isFinite(draft.fontSize)) throw new Error('Invalid draft');
  const snapshot = JSON.stringify({ text: draft.text, fontSize: Math.min(36, Math.max(16, draft.fontSize)) });
  const write = pendingWrite.catch(() => {}).then(async () => {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(dataPath() + '.tmp', snapshot, 'utf8');
    await fs.rename(dataPath() + '.tmp', dataPath());
  });
  pendingWrite = write;
  await write;
});
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
