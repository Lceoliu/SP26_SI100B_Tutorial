import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArguments, formatCall, moveIngredient, recipes, recipeLines, items } from '../src/recipes.js';

test('function arguments preserve raw recipes and ingredient multiplicities', () => {
  const args = buildArguments(['paper', null, 'leather', 'paper', null, 'paper']);
  assert.equal(args.recipes.length, 7);
  assert.equal(args.recipes[1], 'book 1 paper paper paper leather');
  assert.deepEqual(args.ingredients, ['paper', 'leather', 'paper', 'paper']);
});
test('recipe errors are passed to Python, not pre-validated in JavaScript', () => {
  const custom = ['oak_planks 4 oak_log', 'book many paper', ''];
  assert.deepEqual(buildArguments(['oak_log'], custom).recipes, custom);
  assert.ok(formatCall(['oak_log'], custom).includes('book many paper'));
});
test('each call owns its argument arrays', () => {
  const args = buildArguments(['paper']);
  args.recipes.pop();
  assert.equal(recipeLines.length, 7);
});
test('all seven recipes have distinct multisets and drawable ingredients/results', () => {
  assert.equal(new Set(recipes.map(r => [...r.ingredients].sort().join(' '))).size, recipes.length);
  for (const recipe of recipes) {
    assert.ok(items[recipe.result]);
    recipe.ingredients.forEach(item => assert.ok(items[item]));
  }
});
test('call preview names the function and the two list arguments', () => {
  const preview = formatCall(['paper']);
  assert.ok(preview.startsWith('crafting('));
  assert.ok(preview.includes('recipes=['));
  assert.ok(preview.includes('ingredients=["paper"]'));
});
test('moving and swapping slots preserve the input multiset', () => {
  const grid = ['paper', 'leather', null, 'paper', 'paper', null, null, null, null];
  const moved = moveIngredient(grid, 0, 8);
  const swapped = moveIngredient(moved, 1, 8);
  assert.deepEqual(swapped.filter(Boolean).sort(), grid.filter(Boolean).sort());
  assert.equal(grid[0], 'paper');
});
