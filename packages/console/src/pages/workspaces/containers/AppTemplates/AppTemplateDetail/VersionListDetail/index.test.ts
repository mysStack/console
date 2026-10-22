import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('wires the native app template version list with workspace permissions', () => {
  const sourcePath = [
    'packages/console/src/pages/workspaces/containers/AppTemplates/AppTemplateDetail',
    'VersionListDetail/index.tsx',
  ].join('/');
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.match(source, /import \{ VersionList \} from '@ks-console\/shared';/);
  assert.match(source, /<VersionList/);
  assert.match(source, /appKey: 'app-templates'/);
  assert.match(source, /create: 'create'/);
  assert.match(source, /onAddVersion=\{\(\) => setModalType\('upload'\)\}/);
});
