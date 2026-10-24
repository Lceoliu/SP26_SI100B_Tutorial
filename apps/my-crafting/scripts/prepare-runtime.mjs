import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'node_modules/pyodide');
const destination = path.join(root, 'public/python');
await mkdir(destination, { recursive: true });
const files = (await readdir(source)).filter(name =>
  /^(pyodide\.mjs|pyodide\.asm\.mjs|pyodide\.asm\.wasm|pyodide-lock\.json|python_stdlib\.zip|LICENSE)$/.test(name));
for (const name of files) await copyFile(path.join(source, name), path.join(destination, name));
console.log(`Local Python runtime: ${files.join(', ')}`);
