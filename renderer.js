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
const bookList = document.getElementById('book-list');
const bookTitle = document.querySelector('.app-name');
const libraryMessage = document.getElementById('library-message');
let activeBook = null;
let switchingBook = false;
const titleSavers = new Map();
const deleteDialog = document.getElementById('delete-dialog');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteCancel = document.getElementById('delete-cancel');
let deletingBook = null;
function closeBookMenus() {
  for (const menu of bookList.querySelectorAll('.book-menu')) menu.hidden = true;
  for (const trigger of bookList.querySelectorAll('.book-more')) trigger.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', event => { if (!event.target.closest('.book-options')) closeBookMenus(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && event.target.closest('.book-options')) { const trigger = event.target.closest('.book-options').querySelector('.book-more'); closeBookMenus(); trigger.focus(); }
});
deleteCancel.addEventListener('click', () => deleteDialog.close());
deleteConfirm.addEventListener('click', async () => {
  if (!deletingBook || deleteConfirm.disabled) return;
  deleteConfirm.disabled = deleteCancel.disabled = true;
  try {
    if (!await flushTitles()) throw new Error('书名未保存');
    await window.writer.remove(deletingBook.id); titleSavers.delete(deletingBook.id);
    if (activeBook?.id === deletingBook.id) { activeBook = null; clearTimeout(timer); timer = null; revision = savedRevision = 0; writingRange = null; }
    deleteDialog.close(); deletingBook = null; await refreshBooks(); libraryMessage.textContent = '';
    document.getElementById('new-book-button').focus();
  } catch { const error = document.getElementById('delete-error'); error.textContent = '删除失败，作品仍保留，请重试。'; error.hidden = false; }
  finally { deleteConfirm.disabled = deleteCancel.disabled = false; }
});
deleteDialog.addEventListener('cancel', event => { if (deleteConfirm.disabled) event.preventDefault(); });
async function flushTitles() {
  const results = await Promise.all(Array.from(titleSavers.values(), flush => flush()));
  return results.every(Boolean);
}
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
  return { id: activeBook?.id, text: paragraphs.map(p => p.text).join('\n'), paragraphs, fontSize: Number(slider.value) };
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
  if (!activeBook) return true;
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
  if (event.key === 'Escape' && document.activeElement.closest('#editor, #paragraph-menu, #paragraph-button')) { hideMenu(); if (homePage.hidden) editor.focus({ preventScroll: true }); }
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
    editor.contentEditable = 'false';
    if (!await save()) return;
    hideMenu(); workspace.hidden = true; homePage.hidden = false;
    toggle.hidden = true; document.querySelector('.size-control').hidden = true;
    homeButton.setAttribute('aria-current', 'page'); bookTitle.textContent = '写作工具'; await refreshBooks(); document.getElementById('new-book-button').focus();
  } finally { returningHome = false; if (homePage.hidden) editor.contentEditable = 'true'; }
});
async function refreshBooks() {
  if (!await flushTitles()) return;
  titleSavers.clear();
  const library = await window.writer.list(); bookList.replaceChildren();
  document.getElementById('library-empty').hidden = !!library.books.length;
  for (const book of library.books) {
    const card = document.createElement('article'); card.className = 'book-card'; card.dataset.bookId = book.id;
    const options = document.createElement('div'); options.className = 'book-options';
    const more = document.createElement('button'); more.className = 'book-more'; more.textContent = '⋯'; more.setAttribute('aria-label', '作品菜单'); more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
    const bookMenu = document.createElement('div'); bookMenu.className = 'book-menu'; bookMenu.setAttribute('role', 'menu'); bookMenu.hidden = true;
    const remove = document.createElement('button'); remove.textContent = '删除作品'; remove.className = 'delete-book'; remove.setAttribute('role', 'menuitem');
    more.addEventListener('click', () => { const open = bookMenu.hidden; closeBookMenus(); bookMenu.hidden = !open; more.setAttribute('aria-expanded', String(open)); if (open) remove.focus(); });
    remove.addEventListener('click', async () => {
      closeBookMenus(); if (!await flushTitles()) return;
      deletingBook = { id: book.id, title: book.title };
      document.getElementById('delete-description').textContent = '确定删除《' + book.title + '》吗？'; document.getElementById('delete-error').hidden = true;
      deleteDialog.showModal(); deleteCancel.focus();
    });
    bookMenu.append(remove); options.append(more, bookMenu); card.append(options);
    const form = document.createElement('form'); form.className = 'book-title-form';
    const input = document.createElement('input'); input.value = book.title; input.maxLength = 100; input.required = true; input.setAttribute('aria-label', '修改书名：' + book.title);
    form.append(input);
    let titleTimer, titleSaving = null, titleComposing = false;
    async function saveTitle() {
      clearTimeout(titleTimer);
      if (titleComposing) return false;
      if (titleSaving) { await titleSaving; return saveTitle(); }
      const value = input.value.trim();
      if (!value) { input.value = book.title; return true; }
      if (value === book.title) return true;
      titleSaving = (async () => {
        try {
          const renamed = await window.writer.rename(book.id, value); book.title = renamed.title;
          if (input.value.trim() === value && document.activeElement !== input) input.value = renamed.title;
          if (activeBook?.id === book.id) activeBook.title = renamed.title;
          libraryMessage.textContent = ''; setStatus('已自动保存'); return true;
        } catch { libraryMessage.textContent = '书名保存失败，请稍后重试'; setStatus('书名保存失败', true); titleTimer = setTimeout(saveTitle, 3000); return false; }
      })();
      try { return await titleSaving; } finally { titleSaving = null; }
    }
    titleSavers.set(book.id, saveTitle);
    input.addEventListener('input', () => { clearTimeout(titleTimer); setStatus('等待保存…'); if (!titleComposing) titleTimer = setTimeout(saveTitle, 600); });
    input.addEventListener('compositionstart', () => { titleComposing = true; clearTimeout(titleTimer); });
    input.addEventListener('compositionend', () => { titleComposing = false; titleTimer = setTimeout(saveTitle, 600); });
    input.addEventListener('blur', saveTitle);
    form.addEventListener('submit', event => { event.preventDefault(); if (!titleComposing) { saveTitle(); input.blur(); } });
    const details = document.createElement('div'); details.className = 'book-details';
    const time = document.createElement('span'); time.textContent = '最近写作 · ' + new Date(book.updatedAt).toLocaleDateString('zh-CN');
    const open = document.createElement('button'); open.className = 'open-book'; open.textContent = '继续写作 →';
    open.addEventListener('click', () => openBook(book.id));
    details.append(time, open); card.append(form, details); bookList.append(card);
  }
  const add = document.createElement('button'); add.id = 'new-book-button'; add.className = 'new-book-card'; add.setAttribute('aria-label', '新建作品'); add.title = '新建作品'; add.textContent = '+'; bookList.append(add);
}
async function openBook(id) {
  if (switchingBook) return; switchingBook = true;
  try {
    editor.contentEditable = 'false';
    if (!await flushTitles() || !await save()) return;
    const draft = await window.writer.load(id); activeBook = draft;
    renderDraft(draft); slider.value = draft.fontSize || 22; applySize(); revision = savedRevision = 0; writingRange = null;
    bookTitle.textContent = draft.title; bookTitle.title = draft.title;
    homePage.hidden = true; workspace.hidden = false; toggle.hidden = false;
    document.querySelector('.size-control').hidden = false; homeButton.removeAttribute('aria-current');
    document.getElementById('scroll-area').scrollTop = 0; document.body.classList.remove('drawer-open'); drawer.inert = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', '展开章节目录');
    editor.contentEditable = 'true'; editor.focus(); setStatus('已自动保存');
  } catch { libraryMessage.textContent = '无法打开作品，请重试'; }
  finally { switchingBook = false; if (homePage.hidden) editor.contentEditable = 'true'; }
}
bookList.addEventListener('click', async event => {
  const add = event.target.closest('#new-book-button'); if (!add || add.disabled) return;
  add.disabled = true;
  try {
    if (!await flushTitles()) return;
    const book = await window.writer.create('未命名作品'); await refreshBooks();
    const input = bookList.querySelector('[data-book-id="' + book.id + '"] input');
    if (input) { input.focus(); input.select(); }
    libraryMessage.textContent = '';
  } catch { libraryMessage.textContent = '创建失败，请稍后重试'; }
  finally { add.disabled = false; }
});
slider.addEventListener('input', () => { applySize(); if (loaded) changed(); });
window.addEventListener('resize', hideMenu);
document.getElementById('scroll-area').addEventListener('scroll', hideMenu);
window.addEventListener('blur', save);
window.writer.onClose(async () => { composing = false; if (await flushTitles() && await save()) window.writer.closeReady(); });
(async () => {
  try {
    await refreshBooks(); loaded = true; workspace.hidden = true; homePage.hidden = false; toggle.hidden = true;
    document.querySelector('.size-control').hidden = true; homeButton.setAttribute('aria-current', 'page');
    document.execCommand('defaultParagraphSeparator', false, 'div'); setStatus('已自动保存');
  } catch { setStatus('无法读取作品 · 请重新打开应用', true); }
})();
