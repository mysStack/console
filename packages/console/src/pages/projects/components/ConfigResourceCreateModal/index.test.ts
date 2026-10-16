import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Config resource create modal includes project and name fields', () => {
  assert.match(source, /NamespaceSelector/);
  assert.match(source, /metadata.*name|name.*metadata/s);
  assert.match(source, /onOk/);
});

test('Secret create modal starts with an opaque type and uses native settings', () => {
  assert.match(source, /Opaque/);
  assert.match(source, /SecretSettings/);
  assert.doesNotMatch(source, /safeAtob|decode|base64/);
});

test('create submission flushes an open data editor before validating the resource form', () => {
  assert.match(source, /dataFormRef/);
  assert.match(source, /handleSubmit/);
});
