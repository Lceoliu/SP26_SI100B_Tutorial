// Pixel-art status icons drawn from text grids ('#' = filled pixel).
// A one-pixel dark outline is added around the shape, like Minecraft item sprites,
// so the icon reads on both the light and the dark slot colours.
export const art = {
  // LookupError: a barrier-style "no entry" sign.
  noMatch: [
    '....####....',
    '..########..',
    '.###....###.',
    '.####....##.',
    '##.###....##',
    '##..###...##',
    '##...###..##',
    '##....###.##',
    '.##....####.',
    '.###....###.',
    '..########..',
    '....####....',
  ],
  // ValueError: an exclamation mark.
  invalid: [
    '....####....',
    '....####....',
    '....####....',
    '....####....',
    '....####....',
    '....####....',
    '.....##.....',
    '.....##.....',
    '............',
    '....####....',
    '....####....',
    '....####....',
  ],
  // Python error or stopped run: a cross.
  crash: [
    '##........##',
    '###......###',
    '.###....###.',
    '..###..###..',
    '...######...',
    '....####....',
    '....####....',
    '...######...',
    '..###..###..',
    '.###....###.',
    '###......###',
    '##........##',
  ],
};

const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function pixelIcon(rows, outline = '#1a1a1a') {
  const height = rows.length;
  const width = rows[0].length;
  const filled = (x, y) => rows[y]?.[x] === '#';
  let fill = '';
  let edge = '';
  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      const cell = `M${x + 1} ${y + 1}h1v1h-1z`;
      if (filled(x, y)) fill += cell;
      else if (neighbours.some(([dx, dy]) => filled(x + dx, y + dy))) edge += cell;
    }
  }
  return `<svg class="pixel-icon" viewBox="0 0 ${width + 2} ${height + 2}" shape-rendering="crispEdges" aria-hidden="true"><path fill="${outline}" d="${edge}"/><path fill="currentColor" d="${fill}"/></svg>`;
}
