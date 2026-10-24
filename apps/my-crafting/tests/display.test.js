import test from 'node:test';
import assert from 'node:assert/strict';
import { countIngredients, formatCall } from '../src/recipes.js';
import { escapeHtml, highlightPython } from '../src/highlight.js';
import { art, pixelIcon } from '../src/pixel.js';

const stripTags = html => html.replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

test('recipe ingredient summary keeps first-seen order and multiplicities', () => {
  assert.deepEqual(countIngredients(['paper', 'paper', 'paper', 'leather']), [['paper', 3], ['leather', 1]]);
  assert.deepEqual(countIngredients([]), []);
});

test('highlighted call preview shows exactly the same text as the plain preview', () => {
  const custom = ['oak_planks 4 oak_log', 'book "1" <b>paper</b> & \\ leather', "it's"];
  const plain = formatCall(['paper', 'oak_log'], custom);
  assert.equal(stripTags(highlightPython(plain)), plain);
});

test('highlighting escapes markup from user-edited recipe strings', () => {
  const html = highlightPython(formatCall(['paper'], ['<img src=x onerror=alert(1)>']));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('highlighting marks strings, numbers, keywords, calls and exception names', () => {
  const html = highlightPython(`crafting(recipes=["book 1 paper"]) ('book', 1) LookupError`);
  for (const kind of ['fn', 'kw', 'str', 'num', 'exc']) assert.ok(html.includes(`tok-${kind}`), kind);
  assert.ok(html.includes('<span class="tok-str">&quot;book 1 paper&quot;</span>'));
});

test('pixel icons are square, outlined and colourable', () => {
  for (const rows of Object.values(art)) {
    assert.ok(rows.every(row => row.length === rows.length));
    const svg = pixelIcon(rows);
    assert.ok(svg.includes(`viewBox="0 0 ${rows.length + 2} ${rows.length + 2}"`));
    assert.ok(svg.includes('fill="currentColor"'));
    assert.ok(svg.includes('aria-hidden="true"'));
  }
});
