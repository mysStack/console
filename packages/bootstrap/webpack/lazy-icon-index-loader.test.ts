import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const loader = require('./lazy-icon-index-loader');
const filename = require.resolve('@kubed/icons');
const source = fs.readFileSync(filename, 'utf8');
const transformed = () => loader.call({ resourcePath: filename }, source);

function load(code: string, request: (id: string) => unknown) {
  const exports: Record<string | symbol, any> = {};
  vm.runInNewContext(code, { exports, require: request, Symbol });
  return exports;
}

test('all installed icon exports retain their values and default interop', () => {
  const cache = new Map<string, any>();
  const value = (id: string) => {
    if (!cache.has(id))
      cache.set(id, id.length % 2 ? { __esModule: true, default: { id } } : { id });
    return cache.get(id);
  };
  let eagerCalls = 0;
  let lazyCalls = 0;
  const eager = load(source, id => {
    eagerCalls++;
    return value(id);
  });
  const lazy = load(transformed(), id => {
    lazyCalls++;
    return value(id);
  });
  assert.equal(lazyCalls, 0);
  assert.ok(eagerCalls > 2000);
  assert.deepEqual(Object.keys(lazy), Object.keys(eager));
  for (const key of Object.keys(eager)) {
    assert.equal(lazy[key], eager[key], key);
    assert.equal(lazy[key], lazy[key], key);
  }
  assert.equal(lazy.__esModule, true);
});

test('SystemJS registration preserves lazy exports instead of reading every icon', () => {
  const system = require('systemjs').System;
  let calls = 0;
  const component = {};
  const icons = load(transformed(), () => {
    calls++;
    return { __esModule: true, default: component };
  });
  const id = 'test:lazy-icon-namespace';
  try {
    system.set(id, icons);
    assert.equal(calls, 0);
    assert.equal(system.get(id), icons);
    assert.ok(Object.keys(system.get(id)).length > 2000);
    assert.equal(calls, 0);
    assert.equal(system.get(id).Add, component);
    assert.equal(calls, 1);
  } finally {
    system.delete(id);
  }
});

test('the installed React icon keeps its identity, size and variant', () => {
  const originalRequire = createRequire(filename);
  const icons = load(transformed(), originalRequire);
  const original = require('@kubed/icons');
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  assert.equal(icons.Add, original.Add);
  assert.equal(icons.Add, icons.Add);
  const html = renderToStaticMarkup(React.createElement(icons.Add, { size: 24, variant: 'light' }));
  assert.match(html, /width="24"/);
  assert.match(html, /height="24"/);
  assert.match(html, /kubed-icon__light/);
});

test('a future index with new side effects fails the build instead of dropping them', () => {
  assert.throws(
    () => loader.call({}, source + '\nglobalThis.newSideEffect = true;'),
    /Unsupported icon index/,
  );
});

test('an incomplete export mapping fails the build', () => {
  assert.throws(
    () =>
      loader.call(
        {},
        'Object.defineProperty(exports,"NewIcon",{enumerable:true,get:function(){return missing.default;}});',
      ),
    /Unsupported icon index/,
  );
});
