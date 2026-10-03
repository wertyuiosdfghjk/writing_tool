const { app, BrowserWindow } = require('electron');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, '.smoke-data'));
require('./main.cjs');
app.on('browser-window-created', (_event, win) => {
  win.hide();
  win.webContents.once('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        await window.writer.save({ text: '中文测试\\nA quiet story.', fontSize: 26 });
        const draft = await window.writer.load();
        if (draft.text !== '中文测试\\nA quiet story.' || draft.fontSize !== 26) throw new Error('Persistence mismatch');
        return { persisted: true, editor: !!document.getElementById('editor'), slider: !!document.getElementById('font-size') };
      })()`);
      console.log(JSON.stringify(result));
      app.exit(0);
    } catch (error) { console.error(error); app.exit(1); }
  });
});
setTimeout(() => { console.error('Startup timed out'); app.exit(1); }, 15000);
