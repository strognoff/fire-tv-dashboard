import fs from 'node:fs';
import path from 'node:path';

const pkgPath = path.resolve('package.json');
const raw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(raw);

const [major, minor, patch] = (pkg.version || '0.1.0').split('.').map(n => Number(n) || 0);
const next = `${major}.${minor}.${patch + 1}`;

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Version bumped to ${next}`);
