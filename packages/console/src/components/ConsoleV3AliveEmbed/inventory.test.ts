import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const SRC_ROOT = join(__dirname, '..', '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      out.push(...walk(path));
      continue;
    }
    if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) {
      out.push(path);
    }
  }
  return out;
}

test('every consolev3 WujieReact embed keeps the sandbox alive', () => {
  const offenders: string[] = [];
  for (const file of walk(SRC_ROOT)) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('WujieReact') || !text.includes('name="consolev3"')) {
      continue;
    }
    if (!/\balive\b/.test(text)) {
      offenders.push(file.replace(`${SRC_ROOT}/`, ''));
    }
  }
  assert.deepEqual(offenders, []);
});
