import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function registry(namespace: object) {
  const source = readFileSync(__dirname + '/registry.ts', 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Promise,
    require(request: string) {
      assert.equal(request, '@kubed/icons');
      return namespace;
    },
  });
  return module.exports;
}

test('SDK registration preserves icon getters and does not evaluate unrelated icons', () => {
  let reads = 0;
  const icon = () => null;
  const namespace = Object.defineProperty({}, 'ExternalIcon', {
    enumerable: true,
    get: () => {
      reads++;
      return icon;
    },
  });
  const sdk = registry(namespace);
  sdk.registerIconNamespace(namespace);
  assert.equal(reads, 0);
  assert.equal(sdk.getIcon('ExternalIcon'), icon);
  assert.equal(sdk.getIcon('ExternalIcon'), icon);
  assert.equal(reads, 2);
  sdk.registerIconNamespace({ ExternalIcon: () => null });
  assert.equal(sdk.getIcon('ExternalIcon'), icon);
});

test('an icon load racing with SDK registration resolves without redefining module getters', async () => {
  const icon = () => null;
  const namespace = Object.defineProperties(
    {},
    {
      __esModule: { value: true },
      ExternalIcon: { enumerable: true, get: () => icon },
    },
  );
  const sdk = registry(namespace);
  let pending: Promise<void> | undefined;
  try {
    sdk.getIcon('ExternalIcon');
  } catch (value) {
    pending = value as Promise<void>;
  }
  assert.ok(pending instanceof Promise);
  sdk.registerIconNamespace(namespace);
  assert.equal(sdk.getIcon('ExternalIcon'), icon);
  await pending;
  assert.equal(sdk.getIcon('ExternalIcon'), icon);
});
