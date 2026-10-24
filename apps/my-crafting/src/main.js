import '@fontsource/pixelify-sans/600.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import './style.css';
import { recipes, recipeLines, materials, items, buildArguments, formatCall, moveIngredient, countIngredients } from './recipes.js';
import { highlightPython } from './highlight.js';
import { art, pixelIcon } from './pixel.js';
import { PythonRunner } from './python.js';

const uploadIcon = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path d="M7 1h2v1h1v1h1v1h1v1h1v1H10v5H6V6H3V5h1V4h1V3h1V2h1zM2 12h12v2H2z"/></svg>';
const chevron = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path d="M3 5h10v2h-1v1h-1v1h-1v1H9v1H7v-1H6V9H5V8H4V7H3z"/></svg>';
const arrowPath = 'M0 6h14V0h2v2h2v2h2v2h2v4h-2v2h-2v2h-2v2h-2v-6H0z';
const arrowSvg = `<svg viewBox="0 0 22 16" shape-rendering="crispEdges"><path d="${arrowPath}"/></svg>`;
const craftAnimationMs = 360;

function icon(name) {
  const item = items[name];
  if (!item) return `<span class="unknown-item" aria-hidden="true">?</span>`;
  if (item.cube) {
    return `<span class="voxel" aria-hidden="true"><span class="voxel-top" style="background-image:url('./assets/${item.top}.png')"></span><span class="voxel-left" style="background-image:url('./assets/${item.side}.png')"></span><span class="voxel-right" style="background-image:url('./assets/${item.side}.png')"></span></span>`;
  }
  return `<img class="item-icon" src="./assets/${name}.png" alt="" width="16" height="16" draggable="false" />`;
}

function recipeInputs(recipe) {
  return countIngredients(recipe.ingredients).map(([name, count]) =>
    `<span class="input"><span class="mini">${icon(name)}</span>${count > 1 ? `<span class="times">×${count}</span>` : ''}</span>`).join('');
}

function recipeDescription(recipe) {
  return countIngredients(recipe.ingredients).map(([name, count]) => `${count} ${items[name].label.toLowerCase()}`).join(', ');
}

document.querySelector('#app').innerHTML = `
  <header class="masthead">
    <img class="masthead-icon" src="./assets/crafting-table-128.png" alt="" width="64" height="64" />
    <div class="masthead-text">
      <h1>My Crafting</h1>
      <p class="tagline">Call your HW3 <code>crafting(recipes, ingredients)</code> on a 3×3 crafting grid.</p>
    </div>
    <span class="course-tag">SI100B HW3</span>
  </header>
  <main class="workbench gui-panel">
    <div class="toolbar">
      <div class="file-picker">
        <button id="upload" class="mc-button">${uploadIcon}<span>Upload .py file</span></button>
        <input id="python-file" type="file" accept=".py" aria-label="Upload OJ Python file" hidden />
        <div id="file-chip" class="file-chip" data-state="empty">
          <img class="file-glyph" src="./assets/paper.png" alt="" width="16" height="16" />
          <span class="file-text"><span id="filename">No file selected</span><span id="file-meta">Use the file you submit to OJ</span></span>
        </div>
      </div>
      <div class="runtime">
        <div id="python-status" role="status" class="runtime-status" data-state="loading"><span class="status-dot" aria-hidden="true"></span><span id="runtime-text">Loading Python…</span></div>
        <button id="retry" class="mc-button small" hidden>Retry Python</button>
      </div>
    </div>
    <div class="work-area">
      <section class="materials" aria-labelledby="materials-heading">
        <h2 id="materials-heading">Materials</h2>
        <div id="palette" class="palette">${materials.map(name => `
          <button class="material" data-material="${name}" draggable="true" title="${name}: drag or click to add" aria-label="Add ${items[name].label}">
            <span class="slot">${icon(name)}</span><span class="item-label">${items[name].label}</span>
          </button>`).join('')}</div>
        <p class="hint"><span class="hint-pointer">Drag or click to add. Click a slot, or drag it back here, to remove it.</span><span class="hint-touch">Tap a material to add it. Tap a slot to remove it.</span></p>
      </section>
      <section class="crafting" aria-labelledby="crafting-heading">
        <div class="section-head">
          <h2 id="crafting-heading">Crafting</h2>
          <span id="slot-count">0 / 9 slots</span>
        </div>
        <div class="craft-layout">
          <div id="grid" class="craft-grid" aria-label="Crafting grid">${Array.from({ length: 9 }, (_, i) => `<button class="grid-slot slot" data-slot="${i}" aria-label="Slot ${i + 1}: empty"></button>`).join('')}</div>
          <div id="craft-arrow" class="craft-arrow" data-state="idle" aria-hidden="true">${arrowSvg}<span class="arrow-fill">${arrowSvg}</span></div>
          <div class="result-area" aria-live="polite" aria-atomic="true">
            <div id="result-slot" class="result-slot slot" data-kind="idle"></div>
            <div id="result-name">Result</div>
            <div id="result-kind" class="badge" hidden></div>
          </div>
        </div>
        <div class="craft-controls">
          <button id="craft" class="mc-button primary" disabled>Craft</button>
          <button id="clear" class="mc-button">Clear grid</button>
        </div>
        <div class="feedback-row" data-tone="info">
          <p id="feedback" class="feedback" role="status">Upload your OJ .py file defining crafting(recipes, ingredients).</p>
          <a id="trace-link" class="trace-link" href="#stderr-panel" hidden>View traceback</a>
        </div>
        <section class="recipes" aria-labelledby="recipes-heading">
          <div class="section-head">
            <h2 id="recipes-heading">Recipes</h2>
            <span id="recipes-edited" class="edited-chip" hidden>Recipe strings edited</span>
          </div>
          <div class="recipe-list">${recipes.map((recipe, index) => `
            <button class="recipe" data-recipe="${index}" aria-pressed="false" aria-label="Load ${items[recipe.result].label} ingredients: ${recipeDescription(recipe)}" title="${recipe.ingredients.join(' + ')} → ${recipe.count} ${recipe.result}">
              <span class="slot">${icon(recipe.result)}<span class="stack-count">${recipe.count}</span></span>
              <span class="recipe-text"><span class="item-label">${items[recipe.result].label}</span><span class="recipe-inputs">${recipeInputs(recipe)}</span></span>
            </button>`).join('')}</div>
        </section>
      </section>
    </div>
    <details class="program-io" open>
      <summary>${chevron}<span>Function call</span></summary>
      <div class="terminals">
        <section class="terminal">
          <div class="terminal-heading"><h3>Arguments</h3><button id="copy-input" class="mc-button small">Copy</button></div>
          <pre id="arguments" tabindex="0" aria-label="Python function call"></pre>
        </section>
        <section id="return-terminal" class="terminal" data-kind="idle">
          <div class="terminal-heading"><h3>Return / exception</h3><span class="exit"><span id="exit-status" class="badge">Not run</span><span id="exit-time"></span></span></div>
          <pre id="return-value" tabindex="0" aria-label="Function return or exception"></pre>
          <div id="stdout-panel" class="stream" hidden><h3>stdout</h3><pre id="stdout" tabindex="0" aria-label="Program standard output"></pre></div>
          <div id="stderr-panel" class="stream stderr" hidden><h3>stderr</h3><pre id="stderr" tabindex="0" aria-label="Program standard error"></pre></div>
        </section>
      </div>
      <details class="recipe-editor">
        <summary>${chevron}<span>Edit recipe strings</span></summary>
        <p class="editor-note">Each line becomes one string in <code>recipes</code>, passed exactly as written. Break a line on purpose to check your ValueError.</p>
        <textarea id="recipe-lines" aria-label="Recipe strings" rows="7" spellcheck="false"></textarea>
        <button id="reset-recipes" class="mc-button small">Reset recipes</button>
      </details>
    </details>
  </main>
  <footer class="site-footer"><span>Runs in your browser. Your Python file is not uploaded.</span><span class="footer-links"><a href="./test_crafting.py" download>Local tester</a><a href="./credits.html" target="_blank" rel="noopener">Credits</a></span></footer>
`;

const $ = selector => document.querySelector(selector);
const slotButtons = [...document.querySelectorAll('[data-slot]')];
const recipeButtons = [...document.querySelectorAll('.recipe')];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let grid = ['paper', 'paper', 'paper', 'leather', null, null, null, null, null];
let source = null;
let filename = '';
let busy = false;
let runtimeState = 'loading';
let runtimeReady = false;
let hasResult = false;
let exitKind = 'idle';
let dragSource = null;
let activeRecipes = [...recipeLines];
$('#recipe-lines').value = activeRecipes.join('\n');

function feedback(message, tone = 'info') {
  $('#feedback').textContent = message;
  $('.feedback-row').dataset.tone = tone;
  $('#trace-link').hidden = true;
}

function idleHint() {
  if (!grid.some(Boolean)) return ['The grid is empty. Add at least one ingredient.', 'info'];
  if (source === null) return ['Upload the .py file you submit to OJ. It must define crafting(recipes, ingredients).', 'info'];
  if (runtimeState === 'loading') return ['Python is still loading. Craft unlocks when it is ready.', 'info'];
  if (runtimeState === 'error') return ['Python stopped. Press Retry Python to restart it.', 'error'];
  return ['Ready. Craft calls crafting() with the arguments shown under Function call.', 'info'];
}

function controls() {
  const craft = $('#craft');
  craft.disabled = !busy && !(source !== null && runtimeReady && grid.some(Boolean));
  craft.textContent = busy ? 'Stop' : 'Craft';
  craft.classList.toggle('stop', busy);
  for (const control of document.querySelectorAll('.material, .grid-slot, .recipe, #clear, #upload, #python-file, #recipe-lines, #reset-recipes')) control.disabled = busy;
  $('#copy-input').disabled = !grid.some(Boolean);
}

function setExit(kind, label, ms) {
  exitKind = kind;
  $('#return-terminal').dataset.kind = kind;
  $('#exit-status').textContent = label;
  $('#exit-time').textContent = ms === undefined ? '' : `${ms} ms`;
}

function setResult(kind, html = '', name = 'Result', badge = '') {
  $('#result-slot').dataset.kind = kind;
  $('#result-slot').innerHTML = html;
  $('#result-name').textContent = name;
  $('#result-kind').textContent = badge;
  $('#result-kind').dataset.kind = kind;
  $('#result-kind').hidden = !badge;
}

function setReturn(html, placeholder = false) {
  $('#return-value').innerHTML = placeholder ? `<span class="placeholder">${html}</span>` : html;
}

function invalidate() {
  hasResult = false;
  setResult('idle');
  $('#craft-arrow').dataset.state = 'idle';
  $('#stdout').textContent = '';
  $('#stdout-panel').hidden = true;
  setReturn('Press Craft to call your function.', true);
  $('#stderr').textContent = '';
  $('#stderr-panel').hidden = true;
  setExit('idle', 'Not run');
  feedback(...idleHint());
}

function selectRecipe(index) {
  recipeButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
}

function renderGrid() {
  grid.forEach((name, i) => {
    slotButtons[i].innerHTML = name ? icon(name) : '';
    slotButtons[i].draggable = Boolean(name);
    slotButtons[i].setAttribute('aria-label', `Slot ${i + 1}: ${name ? items[name].label + '. Click to remove' : 'empty'}`);
    slotButtons[i].title = name ? `${name} · Click to remove; drag to move` : 'Empty slot';
  });
  const filled = grid.filter(Boolean).length;
  $('#slot-count').textContent = `${filled} / 9 slots`;
  $('#grid').dataset.empty = String(filled === 0);
  $('#arguments').innerHTML = highlightPython(formatCall(grid, activeRecipes));
  $('#recipes-edited').hidden = activeRecipes.join('\n') === recipeLines.join('\n');
  invalidate();
  controls();
}

const runner = new PythonRunner((status, message) => {
  runtimeState = status;
  runtimeReady = status === 'ready';
  $('#python-status').dataset.state = status;
  $('#runtime-text').textContent = message;
  $('#retry').hidden = status !== 'error';
  controls();
  if (!busy && !hasResult) feedback(...idleHint());
});

$('#upload').addEventListener('click', () => $('#python-file').click());
$('#python-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!/\.py$/i.test(file.name)) {
    feedback('Choose a Python file ending in .py.', 'error');
    event.target.value = '';
    return;
  }
  try {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    source = text;
    filename = file.name;
    const lines = text.split('\n').length;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $('#filename').textContent = filename;
    $('#filename').title = filename;
    $('#file-meta').textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}, loaded ${time}`;
    $('#file-chip').dataset.state = 'loaded';
    invalidate();
    if (!runtimeReady) runner.restart();
    controls();
  } catch (error) {
    feedback(`Could not read ${file.name}: ${error.message}`, 'error');
  }
  // Re-selecting the same file after editing it must trigger another upload.
  event.target.value = '';
});

$('#retry').addEventListener('click', () => runner.restart());

$('#recipe-lines').addEventListener('input', event => {
  activeRecipes = event.target.value.replace(/\r/g, '').split('\n');
  renderGrid();
});
$('#reset-recipes').addEventListener('click', () => {
  activeRecipes = [...recipeLines];
  $('#recipe-lines').value = activeRecipes.join('\n');
  renderGrid();
});

for (const material of document.querySelectorAll('.material')) {
  material.addEventListener('click', () => {
    const empty = grid.indexOf(null);
    if (empty === -1) return feedback('The grid is full. Remove an ingredient first.', 'info');
    grid[empty] = material.dataset.material;
    selectRecipe(null);
    renderGrid();
  });
  material.addEventListener('dragstart', event => {
    dragSource = { name: material.dataset.material };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', material.dataset.material);
  });
}

for (const slot of slotButtons) {
  const index = Number(slot.dataset.slot);
  const remove = () => {
    if (busy) return;
    grid[index] = null;
    selectRecipe(null);
    renderGrid();
  };
  slot.addEventListener('click', remove);
  slot.addEventListener('contextmenu', event => { event.preventDefault(); remove(); });
  slot.addEventListener('keydown', event => {
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); }
  });
  slot.addEventListener('dragstart', event => {
    dragSource = { index };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', grid[index]);
  });
  slot.addEventListener('dragover', event => {
    if (busy || !dragSource) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = dragSource.index === undefined ? 'copy' : 'move';
    slot.classList.add('drag-over');
  });
  slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
  slot.addEventListener('drop', event => {
    event.preventDefault();
    slot.classList.remove('drag-over');
    if (busy || !dragSource) return;
    if (dragSource.index !== undefined) grid = moveIngredient(grid, dragSource.index, index);
    else {
      grid[index] = dragSource.name;
      selectRecipe(null);
    }
    dragSource = null;
    renderGrid();
  });
}

// Dragging an ingredient out of the grid and back onto the materials removes it.
const palette = $('#palette');
palette.addEventListener('dragover', event => {
  if (busy || dragSource?.index === undefined) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  palette.classList.add('drop-remove');
});
palette.addEventListener('dragleave', event => {
  if (!palette.contains(event.relatedTarget)) palette.classList.remove('drop-remove');
});
palette.addEventListener('drop', event => {
  event.preventDefault();
  palette.classList.remove('drop-remove');
  if (busy || dragSource?.index === undefined) return;
  grid[dragSource.index] = null;
  dragSource = null;
  selectRecipe(null);
  renderGrid();
});

document.addEventListener('dragend', () => {
  dragSource = null;
  slotButtons.forEach(slot => slot.classList.remove('drag-over'));
  palette.classList.remove('drop-remove');
});

$('#clear').addEventListener('click', () => {
  grid.fill(null);
  selectRecipe(null);
  renderGrid();
});

recipeButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    const recipe = recipes[index];
    grid = [...recipe.ingredients, ...Array(9 - recipe.ingredients.length).fill(null)];
    selectRecipe(index);
    renderGrid();
  });
});

$('#copy-input').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(formatCall(grid, activeRecipes));
    $('#copy-input').textContent = 'Copied';
    setTimeout(() => { $('#copy-input').textContent = 'Copy'; }, 1500);
  } catch (error) {
    feedback(`Copy failed: ${error.message}. Select the function call to copy it.`, 'error');
  }
});

$('#craft').addEventListener('click', async () => {
  if (busy) {
    runner.fail('Execution stopped.');
    return;
  }
  busy = true;
  invalidate();
  controls();
  feedback('Calling crafting(recipes, ingredients)…', 'running');
  setExit('running', 'Running');
  setReturn('Waiting for crafting() to return…', true);
  setResult('running', '', 'Crafting…');
  $('#craft-arrow').dataset.state = 'running';
  const started = performance.now();
  try {
    const timed = runner.run(source, buildArguments(grid, activeRecipes), filename)
      .then(result => ({ result, ms: Math.round(performance.now() - started) }));
    // Let the arrow finish one fill before the result appears (skipped with reduced motion).
    const [{ result, ms }] = await Promise.all([timed, sleep(reducedMotion.matches ? 0 : craftAnimationMs)]);
    hasResult = true;
    $('#stdout').textContent = result.stdout;
    $('#stdout-panel').hidden = !result.stdout;
    $('#stderr').textContent = result.stderr;
    $('#stderr-panel').hidden = !result.stderr;
    if (result.exitCode !== 0) {
      setExit('error', 'Error', ms);
      setReturn('No return value. Python raised an error; the traceback is under stderr.', true);
      setResult('error', pixelIcon(art.crash), 'No result', 'Error');
      $('#craft-arrow').dataset.state = 'idle';
      feedback('Python execution failed. Read the traceback under stderr.', 'error');
      $('#trace-link').hidden = false;
      $('.program-io').open = true;
    } else if (result.kind === 'ValueError' || result.kind === 'LookupError') {
      const lookup = result.kind === 'LookupError';
      setExit(result.kind, 'Raised', ms);
      setReturn(highlightPython(result.display));
      setResult(result.kind, pixelIcon(lookup ? art.noMatch : art.invalid), lookup ? 'No match' : 'Invalid recipe', result.kind);
      $('#craft-arrow').dataset.state = 'idle';
      feedback(`Your function raised ${result.kind}.`, result.kind);
    } else {
      const [name, count] = result.value;
      setExit('return', 'Returned', ms);
      setReturn(highlightPython(result.display));
      setResult('return', `${icon(name)}<span class="stack-count">${count}</span>`, items[name]?.label || name, 'Returned');
      $('#craft-arrow').dataset.state = 'done';
      feedback('Return value from your function, not an OJ verdict.', 'return');
    }
  } catch (error) {
    hasResult = true;
    if (exitKind === 'running') setExit('stopped', 'Stopped');
    setReturn('No return value. The run was stopped.', true);
    setResult('error', pixelIcon(art.crash), 'Stopped');
    $('#craft-arrow').dataset.state = 'idle';
    feedback(error.message, 'error');
    $('.program-io').open = true;
  } finally {
    busy = false;
    controls();
  }
});

renderGrid();
selectRecipe(1);
