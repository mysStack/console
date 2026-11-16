import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '../../..');
const boundaries = require('./loading-boundaries')(root);
const transformers = require('./loading-imports-transformer')(root);
const routeLoader = require('./route-imports-loader');

function compile(source: string) {
  return ts.transpileModule(source, {
    fileName: root + '/packages/core/src/probe.tsx',
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
    transformers: { before: transformers },
  }).outputText;
}

test('shared aliases resolve to their original defining module', () => {
  const target = boundaries.shared.resolveExport(root + '/packages/shared/src/index.ts', 'request');
  const output = compile("import {request as send} from '@ks-console/shared'; send.get('/test');");
  assert.ok(output.includes(target.file));
  assert.ok(output.includes('send.get'));
  assert.ok(!output.includes("from '@ks-console/shared'"));
});

test('component namespaces and aliased icons use the actual installed modules', () => {
  const output = compile(
    "import {Sheet as Panels} from '@kubed/components'; import {Dashboard as HomeIcon} from '@kubed/icons'; console.log(Panels, HomeIcon);",
  );
  assert.match(output, /import \* as Panels from/);
  assert.ok(output.includes(boundaries.components.get('Sheet').file));
  assert.ok(output.includes(boundaries.icons.get('Dashboard').file));
  assert.match(output, /import HomeIcon from/);
});

test('type-only imports and exports produce no runtime dependencies', () => {
  const output = compile(
    "import type {FormattedNamespace} from '@ks-console/shared'; export type {FormattedNamespace};",
  );
  assert.ok(!output.includes('@ks-console/shared'));
});

test('route JSX imports become lazy while helper and namespace imports keep their uses', () => {
  const input =
    "import Page, {helper} from './Page'; import * as helpers from './helpers'; const page = <Page/>; helper(helpers.value);";
  const output = routeLoader.call(
    { resourcePath: root + '/packages/core/src/routes.tsx', rootContext: root, mode: 'production' },
    input,
  );
  assert.match(output, /React\.lazy/);
  assert.match(output, /import\("\.\/Page"\)/);
  assert.match(output, /import \{helper\} from/);
  assert.ok(output.includes("import * as helpers from './helpers'"));
});

test('route imports called as ordinary functions stay synchronous', () => {
  const input = "import Page from './Page'; const page = <Page/>; const result = Page();";
  assert.equal(
    routeLoader.call(
      {
        resourcePath: root + '/packages/core/src/routes.tsx',
        rootContext: root,
        mode: 'production',
      },
      input,
    ),
    input,
  );
});

test('development routes keep ordinary imports for hot module replacement', () => {
  const input = "import Page from './Page'; const page=<Page/>;";
  const output = routeLoader.call(
    {
      resourcePath: root + '/packages/core/src/routes.tsx',
      rootContext: root,
      mode: 'development',
    },
    input,
  );
  assert.equal(output, input);
});
