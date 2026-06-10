const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDirs = [path.join(root, 'src'), root];
const allowedExt = new Set(['.js', '.jsx', '.ts', '.tsx', '.md', '.html', '.css']);
const markerRegex = /Ã|Â|â|ð|�/g;

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      walk(full, files);
      continue;
    }
    const ext = path.extname(entry.name);
    if (allowedExt.has(ext)) files.push(full);
  }
  return files;
}

function countMarkers(text) {
  const m = text.match(markerRegex);
  return m ? m.length : 0;
}

const allFiles = walk(path.join(root, 'src'));
for (const extra of ['README.md', 'index.html']) {
  const p = path.join(root, extra);
  if (fs.existsSync(p)) allFiles.push(p);
}

let changed = 0;
for (const file of allFiles) {
  const original = fs.readFileSync(file, 'utf8');
  const before = countMarkers(original);
  if (before === 0) continue;

  const fixed = Buffer.from(original, 'latin1').toString('utf8');
  const after = countMarkers(fixed);

  if (after < before) {
    fs.writeFileSync(file, fixed, 'utf8');
    changed += 1;
    console.log(`fixed: ${path.relative(root, file)} (${before} -> ${after})`);
  }
}

console.log(`done, changed files: ${changed}`);
