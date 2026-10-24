import '@fontsource/pixelify-sans/600.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import './style.css';
import { recipes, recipeLines, materials, items, buildArguments, formatCall, moveIngredient } from './recipes.js';
import { PythonRunner } from './python.js';

const uploadIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19h6V9h5l-8-8-8 8h5zM3 20h18v3H3z"/></svg>';
const arrowIcon = '<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M0 22h44V6l30 26-30 26V42H0z"/></svg>';
const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5h12l-6 7z"/></svg>';
const emptyIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 6h20v20H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/></svg>';

function icon(name) {
  const item = items[name];
  if (!item) return `<span class="unknown-item" aria-hidden="true">?</span>`;
  if (item.cube) {
    return `<span class="voxel" aria-hidden="true"><span class="voxel-top" style="background-image:url('./assets/${item.top}.png')"></span><span class="voxel-left" style="background-image:url('./assets/${item.side}.png')"></span><span class="voxel-right" style="background-image:url('./assets/${item.side}.png')"></span></span>`;
  }
  return `<img class="item-icon" src="./assets/${name}.png" alt="" draggable="false" />`;
}

document.querySelector('#app').innerHTML = `
  <header class="page-header">
    <h1><img src="./assets/crafting-table.png" alt="" />My Crafting</h1>
    <span class="course">SI100B / HW3</span>
  </header>
  <main class="workbench">
    <div class="program-bar">
      <button id="upload" class="bevel-button">${uploadIcon}<span>Upload Python</span></button>
      <input id="python-file" type="file" accept=".py" aria-label="Upload OJ Python file" hidden />
      <span id="filename">No file selected</span>
      <div id="python-status" role="status" class="runtime-status"><span class="status-dot"></span><span id="runtime-text">Loading Python…</span></div>
      <button id="retry" class="text-button" hidden>Retry Python</button>
    </div>
    <div class="work-area">
      <section class="materials" aria-labelledby="materials-heading">
        <h2 id="materials-heading">Materials</h2>
        <div id="palette" class="palette">${materials.map(name => `
          <button class="material" data-material="${name}" draggable="true" title="${name}: drag or click to add" aria-label="Add ${items[name].label}">
            <span class="item-slot">${icon(name)}</span><span class="item-label">${items[name].label}</span>
          </button>`).join('')}</div>
        <p class="material-help">Drag or click to add.<br> Click a slot to remove.</p>
      </section>
      <section class="crafting" aria-labelledby="crafting-heading">
        <h2 id="crafting-heading">Crafting</h2>
        <div class="craft-layout">
          <div id="grid" class="craft-grid" aria-label="Crafting grid">${Array.from({ length: 9 }, (_, i) => `<button class="grid-slot item-slot" data-slot="${i}" aria-label="Slot ${i + 1}: empty"></button>`).join('')}</div>
          <div class="craft-arrow">${arrowIcon}</div>
          <div class="result-area" aria-live="polite" aria-atomic="true">
            <div id="result-slot" class="result-slot item-slot">${emptyIcon}</div>
            <div id="result-name">Result</div>
          </div>
        </div>
        <div class="craft-controls"><button id="craft" class="bevel-button primary" disabled>Craft</button><button id="clear" class="bevel-button">Clear grid</button><span id="slot-count">0 / 9 slots</span></div>
        <p id="feedback" class="feedback" role="status">Upload your OJ .py file defining crafting(recipes, ingredients).</p>
        <section class="recipes" aria-labelledby="recipes-heading">
          <h2 id="recipes-heading">Recipes</h2>
          <div class="recipe-list">${recipes.map((recipe, index) => `<button class="recipe" data-recipe="${index}" aria-label="Load ${items[recipe.result].label} ingredients" title="${recipe.ingredients.join(' + ')} → ${recipe.count} ${recipe.result}"><span class="item-slot">${icon(recipe.result)}<span class="stack-count">${recipe.count}</span></span><span class="item-label">${items[recipe.result].label}</span></button>`).join('')}</div>
        </section>
      </section>
    </div>
    <details class="program-io" open>
      <summary>${chevron}<span>Function call</span></summary>
      <div class="terminals">
        <section class="terminal"><div class="terminal-heading"><h3>Arguments</h3><button id="copy-input" class="terminal-action">Copy</button></div><pre id="arguments" tabindex="0" aria-label="Python function call"></pre></section>
        <section class="terminal"><div class="terminal-heading"><h3>Return / exception</h3><span id="exit-status">Not run</span></div><pre id="return-value" tabindex="0" aria-label="Function return or exception"></pre><div id="stdout-panel" hidden><h3>stdout</h3><pre id="stdout" tabindex="0" aria-label="Program standard output"></pre></div><div id="stderr-panel" hidden><h3>stderr</h3><pre id="stderr" tabindex="0" aria-label="Program standard error"></pre></div></section>
      </div>
      <details class="recipe-editor"><summary>Edit recipe strings</summary><textarea id="recipe-lines" aria-label="Recipe strings" rows="7" spellcheck="false"></textarea><button id="reset-recipes" class="text-button">Reset recipes</button></details>
    </details>
  </main>
  <footer><span>Runs in your browser. Your Python file is not uploaded.</span><a href="./test_crafting.py" download>Local tester</a><a href="./credits.html" target="_blank" rel="noopener">Credits</a></footer>
`;

const $ = selector => document.querySelector(selector);
const slotButtons = [...document.querySelectorAll('[data-slot]')];
let grid = ['paper', 'paper', 'paper', 'leather', null, null, null, null, null];
let source = null;
let filename = '';
let busy = false;
let runtimeReady = false;
let dragSource = null;
let activeRecipes = [...recipeLines];
$('#recipe-lines').value = activeRecipes.join('\n');

function feedback(message, error = false) {
  $('#feedback').textContent = message;
  $('#feedback').classList.toggle('error', error);
}

function controls() {
  $('#craft').disabled = !busy && !(source !== null && runtimeReady && grid.some(Boolean));
  $('#craft').textContent = busy ? 'Stop' : 'Craft';
  for (const control of document.querySelectorAll('.material, .grid-slot, .recipe, #clear, #upload, #python-file, #recipe-lines, #reset-recipes')) control.disabled = busy;
  $('#copy-input').disabled = !grid.some(Boolean);
}

function invalidate() {
  $('#result-slot').innerHTML = emptyIcon;
  $('#result-slot').classList.remove('crafted', 'no-match');
  $('#result-name').textContent = 'Result';
  $('#stdout').textContent = '';
  $('#stdout-panel').hidden = true;
  $('#return-value').textContent = '';
  $('#stderr').textContent = '';
  $('#stderr-panel').hidden = true;
  $('#exit-status').textContent = 'Not run';
  feedback(!grid.some(Boolean) ? 'Add at least one ingredient.' : source === null ? 'Upload your OJ .py file defining crafting(recipes, ingredients).' : 'Ready to craft.');
}

function renderGrid() {
  grid.forEach((name, i) => {
    slotButtons[i].innerHTML = name ? icon(name) : '';
    slotButtons[i].draggable = Boolean(name);
    slotButtons[i].setAttribute('aria-label', `Slot ${i + 1}: ${name ? items[name].label + '. Click to remove' : 'empty'}`);
    slotButtons[i].title = name ? `${name} · Click to remove; drag to move` : 'Empty slot';
  });
  $('#slot-count').textContent = `${grid.filter(Boolean).length} / 9 slots`;
  $('#arguments').textContent = formatCall(grid, activeRecipes);
  invalidate();
  controls();
}

const runner = new PythonRunner((status, message) => {
  runtimeReady = status === 'ready';
  $('#python-status').dataset.state = status;
  $('#runtime-text').textContent = message;
  $('#retry').hidden = status !== 'error';
  controls();
});

$('#upload').addEventListener('click', () => $('#python-file').click());
$('#python-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!/\.py$/i.test(file.name)) {
    feedback('Choose a Python file ending in .py.', true);
    event.target.value = '';
    return;
  }
  try {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    source = text;
    filename = file.name;
    $('#filename').textContent = filename;
    $('#filename').title = filename;
    invalidate();
    if (!runtimeReady) runner.restart();
    controls();
  } catch (error) {
    feedback(`Could not read ${file.name}: ${error.message}`, true);
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
    if (empty === -1) return feedback('The grid is full. Remove an ingredient first.');
    grid[empty] = material.dataset.material;
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
    else grid[index] = dragSource.name;
    dragSource = null;
    renderGrid();
  });
}
document.addEventListener('dragend', () => {
  dragSource = null;
  slotButtons.forEach(slot => slot.classList.remove('drag-over'));
});

$('#clear').addEventListener('click', () => {
  grid.fill(null);
  document.querySelectorAll('.recipe').forEach(button => button.classList.remove('selected'));
  renderGrid();
});

document.querySelectorAll('.recipe').forEach(button => {
  button.addEventListener('click', () => {
    const recipe = recipes[Number(button.dataset.recipe)];
    grid = [...recipe.ingredients, ...Array(9 - recipe.ingredients.length).fill(null)];
    document.querySelectorAll('.recipe').forEach(other => other.classList.toggle('selected', other === button));
    renderGrid();
  });
});

$('#copy-input').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(formatCall(grid, activeRecipes));
    $('#copy-input').textContent = 'Copied';
    setTimeout(() => { $('#copy-input').textContent = 'Copy'; }, 1500);
  } catch (error) {
    feedback(`Copy failed: ${error.message}. Select the function call to copy it.`, true);
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
  feedback('Calling crafting(recipes, ingredients)…');
  $('#exit-status').textContent = 'Running';
  const started = performance.now();
  try {
    const result = await runner.run(source, buildArguments(grid, activeRecipes), filename);
    $('#stdout').textContent = result.stdout;
    $('#stdout-panel').hidden = !result.stdout;
    $('#return-value').textContent = result.display;
    $('#stderr').textContent = result.stderr;
    $('#stderr-panel').hidden = !result.stderr;
    $('#exit-status').textContent = `${result.exitCode ? 'Error' : result.kind === 'return' ? 'Returned' : 'Raised'} · ${Math.round(performance.now() - started)} ms`;
    if (result.exitCode !== 0) throw new Error('Python execution failed. See stderr below.');
    if (result.kind === 'ValueError' || result.kind === 'LookupError') {
      $('#result-slot').innerHTML = '<span class="none-mark" aria-hidden="true">×</span>';
      $('#result-slot').classList.add('no-match');
      $('#result-name').textContent = result.kind === 'LookupError' ? 'No match' : 'Invalid recipe';
      feedback(result.kind === 'LookupError' ? 'Your function raised LookupError.' : 'Your function raised ValueError.', result.kind === 'ValueError');
    } else {
      const [name, count] = result.value;
      $('#result-slot').innerHTML = `${icon(name)}<span class="stack-count">${count}</span>`;
      $('#result-slot').classList.add('crafted');
      $('#result-name').textContent = items[name]?.label || name;
      feedback('Return value from your function, not an OJ verdict.');
    }
  } catch (error) {
    if ($('#exit-status').textContent === 'Running') $('#exit-status').textContent = 'Stopped';
    feedback(error.message, true);
    $('.program-io').open = true;
  } finally {
    busy = false;
    controls();
  }
});

renderGrid();
document.querySelector('[data-recipe="1"]').classList.add('selected');
