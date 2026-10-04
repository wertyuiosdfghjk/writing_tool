const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createLibrary } = require('./library.cjs');
(async () => {
  const directory = await fs.mkdtemp(path.join(__dirname, '.smoke-data/library-'));
  const legacy = { text: '第一章\n旧稿', paragraphs: [{ text: '第一章', type: 'chapter' }, { text: '旧稿', type: 'body' }], fontSize: 24 };
  await fs.writeFile(path.join(directory, 'manuscript.json'), JSON.stringify(legacy));
  const library = createLibrary(directory); const initial = await library.list();
  assert.equal(initial.books.length, 1);
  const first = await library.load(initial.books[0].id); assert.equal(first.text, legacy.text); assert.deepEqual(first.paragraphs, legacy.paragraphs);
  const second = await library.create('另一个故事');
  await Promise.all([library.save({ id: second.id, text: '独立正文', fontSize: 22 }), library.rename(first.id, '旧故事的新名字')]);
  const reopened = createLibrary(directory); assert.equal((await reopened.load(first.id)).text, legacy.text); assert.equal((await reopened.load(first.id)).title, '旧故事的新名字'); assert.equal((await reopened.load(second.id)).text, '独立正文');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'manuscript.json'), 'utf8')), legacy);
  await assert.rejects(library.rename(second.id, ' '));
  console.log('Passed: legacy migration, backup preservation, isolated books, rename, concurrent save, reload, title validation');
})();
