// Tiny, escape-first highlighter for the Python snippets shown on the page:
// the crafting(...) call preview and repr() of a returned tuple.
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => entities[char]);
}

const token = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\s*=(?!=))|\b([A-Za-z_]\w*)(?=\()|\b([A-Z]\w*(?:Error|Exception))\b/g;
const kinds = ['str', 'num', 'kw', 'fn', 'exc'];

export function highlightPython(code) {
  let html = '';
  let last = 0;
  for (const match of String(code).matchAll(token)) {
    const kind = kinds[match.slice(1).findIndex(Boolean)];
    html += escapeHtml(code.slice(last, match.index));
    html += `<span class="tok-${kind}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(code.slice(last));
}
