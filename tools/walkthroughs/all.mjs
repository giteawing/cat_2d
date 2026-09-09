// Runs every level walkthrough in a child process and summarises. Usage: node tools/walkthroughs/all.mjs
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => /^level\d+\.mjs$/.test(f)).sort();
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(dir, f)], { encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const line = out.split('\n').find((l) => l.startsWith('RESULT')) || out.split('\n').find((l) => l.startsWith('state complete')) || 'no result';
  const ok = /PASS|state complete/.test(line);
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${f}: ${line}`);
  if (!ok) console.log(out.split('\n').filter((l) => /✗|Error/.test(l)).join('\n'));
}
console.log(bad ? `${bad} walkthrough(s) failed` : 'all walkthroughs passed');
process.exit(bad ? 1 : 0);
