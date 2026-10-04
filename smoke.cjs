const { app, BrowserWindow } = require('electron');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, '.smoke-data'));
require('./main.cjs');
app.on('browser-window-created', (_event, win) => {
  win.hide();
  win.webContents.once('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        while (document.getElementById('editor').contentEditable !== 'true') await new Promise(r => setTimeout(r, 20));
        renderDraft({ text: '第一章 起点\\n第一节 清晨\\n正文内容' });
        if (blocks().length !== 3 || blocks().some(p => p.dataset.type !== 'body')) throw new Error('Legacy migration failed');
        const first = blocks()[0]; placeButton(first); button.click();
        menu.querySelector('[data-type="chapter"]').click();
        placeButton(blocks()[1]); button.click(); menu.querySelector('[data-type="section"]').click();
        if (list.children.length !== 2 || !list.children[1].classList.contains('section')) throw new Error('Outline failed');
        list.children[1].click();
        if (currentParagraph() !== blocks()[1]) throw new Error('Navigation failed');
        toggle.click(); if (!document.body.classList.contains('drawer-open') || drawer.inert) throw new Error('Drawer failed');
        toggle.click(); if (!drawer.inert) throw new Error('Drawer close failed');
        slider.value = 26; applySize(); changed(); await save();
        const draft = await window.writer.load();
        if (draft.paragraphs[0].type !== 'chapter' || draft.paragraphs[1].type !== 'section' || draft.fontSize !== 26) throw new Error('Persistence mismatch');
        renderDraft(draft); if (list.children.length !== 2 || paragraphText(blocks()[2]) !== '正文内容') throw new Error('Reload failed');
        editor.focus(); const range = document.createRange(); range.selectNodeContents(blocks()[0]); range.collapse(false); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        document.execCommand('insertParagraph'); normalize();
        if (blocks()[1].dataset.type !== 'body' || blocks()[0].dataset.type !== 'chapter') throw new Error('Enter type inheritance failed');
        renderDraft({ text: '' }); editor.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, '第一段\\n第二段\\n\\n第四段'); normalize();
        if (snapshot().text !== '第一段\\n第二段\\n\\n第四段') throw new Error('Multiline plain text failed: ' + snapshot().text);
        renderDraft(draft); toggle.click();
        return { persisted: true, migration: true, outline: true, navigation: true, drawer: true, enter: true };
      })()`);
      console.log(JSON.stringify(result));
      await require('node:fs/promises').writeFile(path.join(__dirname, '.smoke-data/result.json'), JSON.stringify(result));
      win.showInactive();
      await new Promise(resolve => setTimeout(resolve, 350));
      await require('node:fs/promises').writeFile(path.join(__dirname, '.smoke-data/chapters.png'), (await win.webContents.capturePage()).toPNG());
      app.exit(0);
    } catch (error) { console.error(error); await require('node:fs/promises').writeFile(path.join(__dirname, '.smoke-data/result.json'), JSON.stringify({ error: String(error) })); app.exit(1); }
  });
});
setTimeout(() => { console.error('Startup timed out'); app.exit(1); }, 15000);
