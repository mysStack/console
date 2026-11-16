import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const fromSource = createRequire(__dirname + '/index.tsx');
function loadingFrame(modal: boolean) {
  const module = { exports: {} as any };
  const source = readFileSync(__dirname + '/index.tsx', 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const frame = {
    contentWindow: {
      location: { origin: 'http://console.test' },
      document: { getElementById: () => null, documentElement: null, body: null },
    },
    dataset: {},
    style: { display: '' },
  };
  vm.runInNewContext(
    code +
      '\nexports.testPosition=positionFrame;exports.testActivate=activate;exports.expected=()=>expectedPath;exports.setFrame=(value,open)=>{frame=value;modalVisible=open;};',
    {
      module,
      exports: module.exports,
      URL,
      window: { location: { origin: 'http://console.test' } },
      require(name: string) {
        if (name === 'react') return { Component: class {}, createRef: () => ({ current: null }) };
        if (name === 'wujie-react') return { bus: {}, propTypes: {} };
        return fromSource(name);
      },
    },
  );
  module.exports.setFrame(frame, modal);
  return {
    position: module.exports.testPosition,
    activate: module.exports.testActivate,
    expected: module.exports.expected,
    frame,
  };
}
test('positioning a parked document tolerates the parser creating a new body', () => {
  const f = loadingFrame(false);
  assert.doesNotThrow(f.position);
  assert.equal(f.frame.style.display, 'none');
});
test('a pending modal tolerates the previous document disappearing during reload', () => {
  const f = loadingFrame(true);
  assert.doesNotThrow(f.position);
});

test('an owner protects its target route while the child is still loading', () => {
  const f = loadingFrame(false);
  f.activate(
    {
      props: { url: '/consolev3/workspace/clusters/host/projects/ns/deployments/web' },
      slot: {
        current: { getBoundingClientRect: () => ({ width: 100, height: 100, left: 0, top: 0 }) },
      },
    },
    true,
  );
  assert.equal(f.expected(), '/consolev3/workspace/clusters/host/projects/ns/deployments/web');
});
