const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
function createLibrary(directory) {
  const file = path.join(directory, 'library.json');
  let queue = Promise.resolve();
  const serial = operation => { const next = queue.catch(() => {}).then(operation); queue = next; return next; };
  async function write(library) {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(file + '.tmp', JSON.stringify(library), 'utf8');
    await fs.rename(file + '.tmp', file);
  }
  async function read() {
    try { return JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      let draft;
      try { draft = JSON.parse(await fs.readFile(path.join(directory, 'manuscript.json'), 'utf8')); }
      catch (legacyError) { if (legacyError.code !== 'ENOENT') throw legacyError; }
      const books = draft ? [{ id: randomUUID(), title: '未命名作品', ...draft, updatedAt: Date.now() }] : [];
      const library = { version: 1, activeId: books[0]?.id || null, books };
      await write(library); return library;
    }
  }
  function title(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) throw new Error('书名需要为 1–100 个字符');
    return value.trim();
  }
  return {
    list: () => serial(async () => { const library = await read(); return { activeId: library.activeId, books: library.books.map(b => ({ id: b.id, title: b.title, updatedAt: b.updatedAt })) }; }),
    load: id => serial(async () => { const library = await read(); const book = library.books.find(b => b.id === (id || library.activeId)); if (!book) throw new Error('作品不存在'); library.activeId = book.id; await write(library); return book; }),
    create: value => serial(async () => { const library = await read(); const book = { id: randomUUID(), title: title(value), text: '', paragraphs: [{ text: '', type: 'body' }], fontSize: 22, updatedAt: Date.now() }; library.books.push(book); await write(library); return book; }),
    rename: (id, value) => serial(async () => { const library = await read(); const book = library.books.find(b => b.id === id); if (!book) throw new Error('作品不存在'); book.title = title(value); await write(library); return book; }),
    remove: id => serial(async () => {
      const library = await read(); const index = library.books.findIndex(b => b.id === id);
      if (index === -1) throw new Error('作品不存在');
      library.books.splice(index, 1);
      if (library.activeId === id) library.activeId = library.books[0]?.id || null;
      await write(library);
    }),
    save: draft => serial(async () => {
      if (typeof draft.text !== 'string' || !Number.isFinite(draft.fontSize)) throw new Error('Invalid draft');
      const library = await read(); const book = library.books.find(b => b.id === draft.id); if (!book) throw new Error('作品不存在');
      const paragraphs = Array.isArray(draft.paragraphs) ? draft.paragraphs.map(p => { if (!p || typeof p.text !== 'string' || !['body','chapter','section'].includes(p.type)) throw new Error('Invalid paragraph'); return { text: p.text, type: p.type }; }) : undefined;
      Object.assign(book, { text: paragraphs ? paragraphs.map(p => p.text).join('\n') : draft.text, paragraphs, fontSize: Math.min(36, Math.max(16, draft.fontSize)), updatedAt: Date.now() });
      await write(library);
    })
  };
}
module.exports = { createLibrary };
