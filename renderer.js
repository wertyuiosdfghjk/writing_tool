const editor = document.getElementById('editor');
const slider = document.getElementById('font-size');
const output = document.getElementById('size-value');
const status = document.getElementById('save-state');
const toggle = document.getElementById('drawer-toggle');
const drawer = document.getElementById('drawer');
const list = document.getElementById('chapter-list');
const button = document.getElementById('paragraph-button');
const menu = document.getElementById('paragraph-menu');
const paper = document.querySelector('.paper');
const homeButton = document.getElementById('home-button');
const homePage = document.getElementById('home-page');
const workspace = document.querySelector('.workspace');
const continueButton = document.getElementById('continue-writing');
let writingRange = null;
let returningHome = false;
let revision = 0, savedRevision = 0, timer, loaded = false, composing = false, saving = null;
let target = null, savedRange = null;
const known = new WeakSet();
const validTypes = ['body', 'chapter', 'section'];
function setStatus(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function blocks() { return Array.from(editor.children); }
function paragraphText(node) { return node.innerText.replace(/\r/g, '').replace(/\n$/, ''); }
function normalize() {
  if (!editor.firstChild) { const p = document.createElement('div'); p.append(document.createElement('br')); editor.append(p); }
  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) { const p = document.createElement('div'); node.replaceWith(p); p.append(node); }
  }
  for (const p of blocks()) {
    if (!known.has(p)) { p.dataset.type = 'body'; known.add(p); }
    if (!validTypes.includes(p.dataset.type)) p.dataset.type = 'body';
  }
  editor.classList.toggle('empty', blocks().every(p => !paragraphText(p)));
}
function snapshot() {
  const paragraphs = blocks().map(p => ({ text: paragraphText(p), type: p.dataset.type || 'body' }));
  return { text: paragraphs.map(p => p.text).join('\n'), paragraphs, fontSize: Number(slider.value) };
}
function renderDraft(draft) {
  const paragraphs = Array.isArray(draft.paragraphs) && draft.paragraphs.length ? draft.paragraphs : (draft.text || '').split('\n').map(text => ({ text, type: 'body' }));
  editor.replaceChildren();
  for (const item of paragraphs) {
    const p = document.createElement('div'); p.dataset.type = validTypes.includes(item.type) ? item.type : 'body';
    p.textContent = item.text || ''; if (!p.textContent) p.append(document.createElement('br'));
    known.add(p); editor.append(p);
  }
  normalize(); renderOutline();
}
function renderOutline() {
  list.replaceChildren();
  for (const p of blocks()) {
    if (p.dataset.type === 'body') continue;
    const entry = document.createElement('button'); entry.className = 'chapter-entry ' + p.dataset.type;
    entry.textContent = paragraphText(p).trim() || (p.dataset.type === 'chapter' ? '未命名章' : '未命名节');
    entry.title = entry.textContent;
    entry.addEventListener('click', () => {
      p.scrollIntoView({ behavior: 'smooth', block: 'start' }); editor.focus({ preventScroll: true });
      const range = document.createRange(); range.selectNodeContents(p); range.collapse(true);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      for (const e of list.children) e.classList.toggle('active', e === entry);
    }); list.append(entry);
  }
  document.getElementById('chapter-empty').hidden = !!list.children.length;
}
function applySize() { document.documentElement.style.setProperty('--font-size', slider.value + 'px'); output.value = slider.value; hideMenu(); }
async function save() {
  clearTimeout(timer); timer = null;
  if (!loaded || composing) return false;
  if (saving) { try { await saving; } catch {} return save(); }
  if (revision === savedRevision) return true;
  const version = revision; setStatus('正在保存…'); saving = window.writer.save(snapshot());
  try { await saving; savedRevision = version; setStatus(revision === version ? '已自动保存' : '等待保存…'); return true; }
  catch { setStatus('保存失败 · 正文仍在，请稍后重试', true); timer = setTimeout(save, 3000); return false; }
  finally { saving = null; if (revision !== savedRevision && !timer) timer = setTimeout(save, 500); }
}
function changed() { revision++; setStatus('等待保存…'); clearTimeout(timer); timer = setTimeout(save, 500); }
function hideMenu() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); button.hidden = true; }
function placeButton(p) {
  target = p; const rect = p.getBoundingClientRect(), parent = paper.getBoundingClientRect();
  button.style.top = (rect.top - parent.top + 4) + 'px'; button.style.left = (rect.left - parent.left - 34) + 'px'; button.hidden = false;
}
function currentParagraph() {
  let node = window.getSelection()?.anchorNode;
  if (!node || !editor.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node && node.parentElement !== editor) node = node.parentElement;
  return node;
}
editor.addEventListener('input', () => { if (!composing) { normalize(); renderOutline(); } changed(); });
editor.addEventListener('compositionstart', () => { composing = true; });
editor.addEventListener('compositionend', () => { composing = false; normalize(); renderOutline(); changed(); });
editor.addEventListener('paste', event => {
  event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
});
editor.addEventListener('drop', event => event.preventDefault());
paper.addEventListener('mousemove', event => {
  if (!menu.hidden || composing) return;
  const rect = editor.getBoundingClientRect();
  if (event.clientX < rect.left - 40 || event.clientX > rect.left + 80) { button.hidden = true; return; }
  const p = blocks().find(p => { const r = p.getBoundingClientRect(); return event.clientY >= r.top && event.clientY < r.bottom; });
  if (p) placeButton(p);
});
paper.addEventListener('mouseleave', () => { if (menu.hidden && document.activeElement !== button) button.hidden = true; });
button.addEventListener('mousedown', event => { event.preventDefault(); const selection = window.getSelection(); savedRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null; });
button.addEventListener('click', () => {
  if (!target || !editor.contains(target)) return;
  menu.hidden = false; button.setAttribute('aria-expanded', 'true');
  const rect = button.getBoundingClientRect(); menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 210)) + 'px'; menu.style.top = Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 175)) + 'px';
  for (const item of menu.querySelectorAll('button')) item.setAttribute('aria-checked', String(item.dataset.type === target.dataset.type));
  menu.querySelector('[aria-checked="true"]').focus();
});
menu.addEventListener('click', event => {
  const item = event.target.closest('button[data-type]'); if (!item || !target || !editor.contains(target)) return;
  target.dataset.type = item.dataset.type; renderOutline(); changed(); hideMenu(); editor.focus({ preventScroll: true });
  if (savedRange && editor.contains(savedRange.startContainer)) { const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(savedRange); }
});
document.addEventListener('mousedown', event => { if (!menu.contains(event.target) && event.target !== button) hideMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { hideMenu(); if (homePage.hidden) editor.focus({ preventScroll: true }); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
  if (homePage.hidden && (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); const p = currentParagraph(); if (p) { placeButton(p); button.click(); } }
  if (editor.contains(event.target) && (event.ctrlKey || event.metaKey) && ['b','i','u'].includes(event.key.toLowerCase())) event.preventDefault();
  if (!menu.hidden && ['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); const items = Array.from(menu.querySelectorAll('button')); let i = items.indexOf(document.activeElement); items[(i + (event.key === 'ArrowDown' ? 1 : 2)) % 3].focus(); }
});
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? '收起章节目录' : '展开章节目录');
  drawer.inert = !open; document.body.classList.toggle('drawer-open', open); hideMenu();
});
homeButton.addEventListener('click', async () => {
  if (!loaded || !homePage.hidden || returningHome) return;
  returningHome = true;
  const selection = window.getSelection();
  writingRange = selection.rangeCount && editor.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : null;
  try {
    if (!await save()) return;
    hideMenu(); workspace.hidden = true; homePage.hidden = false;
    toggle.hidden = true; document.querySelector('.navigation-divider').hidden = true; document.querySelector('.size-control').hidden = true;
    homeButton.setAttribute('aria-current', 'page'); continueButton.focus();
  } finally { returningHome = false; }
});
continueButton.addEventListener('click', () => {
  homePage.hidden = true; workspace.hidden = false; toggle.hidden = false;
  document.querySelector('.navigation-divider').hidden = false; document.querySelector('.size-control').hidden = false;
  homeButton.removeAttribute('aria-current'); editor.focus({ preventScroll: true });
  if (writingRange && editor.contains(writingRange.startContainer)) { const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(writingRange); }
});
slider.addEventListener('input', () => { applySize(); if (loaded) changed(); });
window.addEventListener('resize', hideMenu);
document.getElementById('scroll-area').addEventListener('scroll', hideMenu);
window.addEventListener('blur', save);
window.writer.onClose(async () => { composing = false; if (await save()) window.writer.closeReady(); });
(async () => {
  try {
    const draft = await window.writer.load(); renderDraft(draft); slider.value = Math.min(36, Math.max(16, Number(draft.fontSize) || 22));
    applySize(); loaded = true; editor.contentEditable = 'true'; document.execCommand('defaultParagraphSeparator', false, 'div'); setStatus('已自动保存'); editor.focus();
  } catch { setStatus('无法读取正文 · 请重新打开应用', true); }
})();
