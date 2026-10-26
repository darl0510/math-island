import fs from 'fs';

const content = fs.readFileSync('sw.js', 'utf8');
const match = content.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
if (!match) {
  console.error('Cannot find STATIC_ASSETS');
  process.exit(1);
}

const assets = match[1]
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.startsWith("'"))
  .map(l => l.replace(/['",]/g, ''));

let missing = [];
for (const a of assets) {
  if (a === './') continue;
  const filePath = a.replace(/^\.\//, '');
  if (!fs.existsSync(filePath)) {
    missing.push(filePath);
  }
}

if (missing.length > 0) {
  console.error('Missing files:', missing);
  process.exit(1);
} else {
  console.log(`[PASS] All ${assets.length} precached assets verified on disk!`);
}
