import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appSource = readFileSync(join(__dirname, 'App.tsx'), 'utf8');
const terminalSource = readFileSync(join(__dirname, 'terminal.tsx'), 'utf8');

test('core providers create one QueryClient for their mounted lifetime', () => {
  for (const source of [appSource, terminalSource]) {
    assert.match(source, /const \[queryClient\] = useState[\s\S]*new QueryClient/);
    assert.doesNotMatch(source, /const queryClient = new QueryClient\(/);
  }
});
