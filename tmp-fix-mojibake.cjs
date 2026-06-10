const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.md', '.html', '.css']);
const replacePairs = [
  ['Ã¡','á'], ['Ã¢','â'], ['Ã£','ã'], ['Ã¤','ä'],
  ['Ã§','ç'], ['Ã©','é'], ['Ã¨','è'], ['Ãª','ê'], ['Ã«','ë'],
  ['Ã­','í'], ['Ã¬','ì'], ['Ã®','î'], ['Ã¯','ï'],
  ['Ã³','ó'], ['Ã²','ò'], ['Ã´','ô'], ['Ãµ','õ'], ['Ã¶','ö'],
  ['Ãº','ú'], ['Ã¹','ù'], ['Ã»','û'], ['Ã¼','ü'],
  ['Ã','Á'], ['Ã‚','Â'], ['Ãƒ','Ã'], ['Ã„','Ä'], ['Ã€','À'],
  ['Ã‡','Ç'], ['Ã‰','É'], ['ÃŠ','Ê'], ['Ã‹','Ë'],
  ['Ã','Í'], ['ÃŽ','Î'], ['Ã“','Ó'], ['Ã”','Ô'], ['Ã•','Õ'], ['Ãš','Ú'], ['Ãœ','Ü'],
  ['â€¢','•'], ['â€“','–'], ['â€”','—'], ['â€˜','‘'], ['â€™','’'], ['â€œ','“'], ['â€','”'], ['â€¦','…'],
  ['Â','']
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      walk(full, out);
      continue;
    }
    if (exts.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

const files = walk(path.join(root, 'src'));
for (const extra of ['README.md', 'index.html']) {
  const p = path.join(root, extra);
  if (fs.existsSync(p)) files.push(p);
}

let changed = 0;
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const original = text;

  text = text.replace(/^\uFEFF/, '');
  text = text.replace(/^ï»¿/, '');
  text = text.replace(/^ï¿½+/, '');

  for (const [from, to] of replacePairs) {
    text = text.split(from).join(to);
  }

  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  text = text.replace(/�/g, '');

  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8');
    changed += 1;
  }
}

console.log(`changed files: ${changed}`);
