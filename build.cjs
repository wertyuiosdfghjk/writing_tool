const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const target = path.resolve(__dirname, '../output', process.argv[2] || '写作工具');
  await fs.mkdir(target, { recursive: true });
  await fs.cp(path.join(__dirname, 'node_modules/electron/dist'), target, { recursive: true });
  const appDir = path.join(target, 'resources/app');
  await fs.mkdir(appDir, { recursive: true });
  for (const name of ['package.json', 'main.cjs', 'preload.cjs', 'index.html', 'style.css', 'renderer.js']) {
    await fs.copyFile(path.join(__dirname, name), path.join(appDir, name));
  }
  await fs.rename(path.join(target, 'electron.exe'), path.join(target, '写作工具.exe'));
  console.log('App generated: ' + target);
})();
