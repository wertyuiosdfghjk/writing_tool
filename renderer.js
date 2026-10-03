const editor = document.getElementById('editor');
const slider = document.getElementById('font-size');
const output = document.getElementById('size-value');
const status = document.getElementById('save-state');
let revision = 0;
let savedRevision = 0;
let timer;
let loaded = false;
let composing = false;
let saving = null;
function setStatus(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function fit() { editor.style.height = '0px'; editor.style.height = Math.max(editor.scrollHeight, document.getElementById('scroll-area').clientHeight - 186, 420) + 'px'; }
function applySize() { document.documentElement.style.setProperty('--font-size', slider.value + 'px'); output.value = slider.value; fit(); }
async function save() {
  clearTimeout(timer);
  if (!loaded || composing) return false;
  if (saving) { await saving; return save(); }
  if (revision === savedRevision) return true;
  const version = revision;
  setStatus('正在保存…');
  saving = window.writer.save({ text: editor.value, fontSize: Number(slider.value) });
  try {
    await saving;
    savedRevision = version;
    setStatus(revision === version ? '已自动保存' : '等待保存…');
    return true;
  } catch { setStatus('保存失败 · 正文仍在，请稍后重试', true); timer = setTimeout(save, 3000); return false; }
  finally { saving = null; if (revision !== savedRevision && !timer) timer = setTimeout(save, 500); }
}
function changed() { revision++; setStatus('等待保存…'); clearTimeout(timer); timer = setTimeout(() => { timer = null; save(); }, 500); }
editor.addEventListener('input', () => { fit(); changed(); });
editor.addEventListener('compositionstart', () => { composing = true; });
editor.addEventListener('compositionend', () => { composing = false; changed(); });
slider.addEventListener('input', () => { applySize(); if (loaded) changed(); });
window.addEventListener('resize', fit);
window.addEventListener('blur', save);
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); } });
window.writer.onClose(async () => { composing = false; if (await save()) window.writer.closeReady(); });
(async () => {
  try {
    const draft = await window.writer.load();
    editor.value = typeof draft.text === 'string' ? draft.text : '';
    slider.value = Math.min(36, Math.max(16, Number(draft.fontSize) || 22));
    applySize(); loaded = true; editor.disabled = false; setStatus('已自动保存'); editor.focus();
  } catch { setStatus('无法读取正文 · 请重新打开应用', true); }
})();
