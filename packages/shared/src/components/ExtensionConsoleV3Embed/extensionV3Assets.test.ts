import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExtensionV3Document, extensionV3Paths } from './extensionV3Assets';

test('extension assets and basename use the installed extension namespace', () => {
  const paths = extensionV3Paths(
    '//console.test/whizard-telemetry/consolev3',
    'http://console.test',
  );
  assert.equal(paths.assets, '/extensions-static/whizard-telemetry/dist/v3dist/');
  assert.equal(paths.webPrefix, '/whizard-telemetry');
  assert.equal(paths.actionEvent, 'whizard-telemetry-console-v3-triggerAction');
  assert.throws(() =>
    extensionV3Paths('https://external.test/app/consolev3', 'http://console.test'),
  );
  assert.throws(() => extensionV3Paths('/app/not-v3', 'http://console.test'));
});

test('extension document uses its own manifest, locale map and the authenticated host data', () => {
  const html = buildExtensionV3Document(
    '/extensions-static/wiz/dist/v3dist/',
    {
      entrypoints: { main: { js: ['main.hash.js'], css: ['main.hash.css'] } },
    },
    { 'locale-zh.json': 'locale/zh.hash.json' },
    {
      user: { username: 'dedicated-fixture' },
      config: { webPrefix: '/wiz' },
    },
  );
  assert.match(html, /\/extensions-static\/wiz\/dist\/v3dist\/main.hash.js/);
  assert.match(html, /main.hash.css/);
  assert.match(html, /locale-zh.json/);
  assert.match(html, /dedicated-fixture/);
  assert.doesNotMatch(html, /nativeConsoleV3Bridge|deploymentEnhancement|vendor_library/);
});

test('inline bootstrap escapes script closing tags and rejects invalid asset paths', () => {
  const manifest = { entrypoints: { main: { js: ['main.js'] } } };
  const html = buildExtensionV3Document(
    '/extensions-static/wiz/dist/v3dist/',
    manifest,
    {},
    { title: '</script><img src=x>' },
  );
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.ok(!html.includes('<img src=x>'));
  assert.throws(() =>
    buildExtensionV3Document(
      '/extensions-static/wiz/dist/v3dist/',
      { entrypoints: { main: { js: ['../private.js'] } } },
      {},
      {},
    ),
  );
  assert.throws(() => buildExtensionV3Document('/extensions-static/wiz/dist/v3dist/', {}, {}, {}));
});

test('extension bootstrap re-encodes decoded annotations without mutating host state', () => {
  const annotations = { feature: 'true' };
  const config = { enabledExtensionModulesStatus: { wiz: { annotations } } };
  const html = buildExtensionV3Document(
    '/extensions-static/wiz/dist/v3dist/',
    { entrypoints: { main: { js: ['main.js'] } } },
    {},
    { ksConfig: config },
  );
  const data = JSON.parse(html.match(/window.globals=(.*?);<\/script>/)![1]);
  assert.deepEqual(
    JSON.parse(decodeURIComponent(data.ksConfig.enabledExtensionModulesStatus.wiz.annotations)),
    annotations,
  );
  assert.equal(config.enabledExtensionModulesStatus.wiz.annotations, annotations);
});
