// Minecraft recipe data, translated to the statement's item names.
// Single-slot shaped recipes are equivalent when position is ignored.
export const recipes = [
  { result: 'oak_planks', count: 4, ingredients: ['oak_log'] },
  { result: 'book', count: 1, ingredients: ['paper', 'paper', 'paper', 'leather'] },
  { result: 'sugar', count: 1, ingredients: ['sugar_cane'] },
  { result: 'bone_meal', count: 3, ingredients: ['bone'] },
  { result: 'blaze_powder', count: 2, ingredients: ['blaze_rod'] },
  { result: 'magma_cream', count: 1, ingredients: ['blaze_powder', 'slime_ball'] },
  { result: 'orange_dye', count: 2, ingredients: ['red_dye', 'yellow_dye'] },
];

export const materials = [
  'oak_log', 'paper', 'leather', 'sugar_cane', 'bone', 'blaze_rod',
  'blaze_powder', 'slime_ball', 'red_dye', 'yellow_dye', 'oak_planks', 'book',
];

export const items = {
  oak_log: { label: 'Oak log', cube: true, side: 'oak_log', top: 'oak_log_top' },
  oak_planks: { label: 'Oak planks', cube: true, side: 'oak_planks', top: 'oak_planks' },
  paper: { label: 'Paper' },
  leather: { label: 'Leather' },
  sugar_cane: { label: 'Sugar cane' },
  bone: { label: 'Bone' },
  blaze_rod: { label: 'Blaze rod' },
  blaze_powder: { label: 'Blaze powder' },
  slime_ball: { label: 'Slimeball' },
  red_dye: { label: 'Red dye' },
  yellow_dye: { label: 'Yellow dye' },
  book: { label: 'Book' },
  sugar: { label: 'Sugar' },
  bone_meal: { label: 'Bone meal' },
  magma_cream: { label: 'Magma cream' },
  orange_dye: { label: 'Orange dye' },
};

export const recipeLines = recipes.map(recipe =>
  [recipe.result, recipe.count, ...recipe.ingredients].join(' '));

export function buildArguments(grid, lines = recipeLines) {
  return { recipes: [...lines], ingredients: grid.filter(Boolean) };
}

export function formatCall(grid, lines = recipeLines) {
  const args = buildArguments(grid, lines);
  return `crafting(\n    recipes=[\n${args.recipes.map(line => `        ${JSON.stringify(line)}`).join(',\n')}\n    ],\n    ingredients=${JSON.stringify(args.ingredients)}\n)`;
}

// Group a recipe's ingredient list for display: [['paper', 3], ['leather', 1]].
export function countIngredients(list) {
  const counts = new Map();
  for (const name of list) counts.set(name, (counts.get(name) || 0) + 1);
  return [...counts];
}

export function moveIngredient(grid, from, to) {
  const next = [...grid];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
