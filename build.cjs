const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const outputRoot = path.resolve(__dirname, '../output');
  const target = path.resolve(outputRoot, process.argv[2] || 'V1.0');
  if (!target.startsWith(outputRoot + path.sep)) throw new Error('Build target must be inside output');
  await fs.mkdir(target, { recursive: true });
  await fs.cp(path.join(__dirname, 'node_modules/electron/dist'), target, { recursive: true });
  const appDir = path.join(target, 'resources/app');
  await fs.mkdir(appDir, { recursive: true });
  for (const name of ['package.json', 'main.cjs', 'library.cjs', 'preload.cjs', 'index.html', 'style.css', 'renderer.js']) {
    await fs.copyFile(path.join(__dirname, name), path.join(appDir, name));
  }
  await fs.cp(path.join(__dirname, 'assets'), path.join(appDir, 'assets'), { recursive: true });
  await fs.rename(path.join(target, 'electron.exe'), path.join(target, '写作工具.exe'));
  const { rcedit } = await import('rcedit');
  await rcedit(path.join(target, '写作工具.exe'), {
    icon: path.join(__dirname, 'assets/app.ico'),
    'version-string': { ProductName: '写作工具', FileDescription: '写作工具' },
    'file-version': require('./package.json').version,
    'product-version': require('./package.json').version
  });
  console.log('App generated: ' + target);
})();
