import assert from 'node:assert/strict';
import test from 'node:test';
import { unitToNumber } from './unitToNumber';
test('monitoring quota quantities preserve decimal, binary and fractional units', () => {
  for (const [input, value] of [
    [undefined, 0],
    ['', 0],
    [2, 2],
    ['1k', 1000],
    ['2M', 2e6],
    ['1.5Gi', 1.5 * 1024 ** 3],
    ['250m', 0.25],
    ['1e3', 1000],
    ['3n', 3e-9],
  ] as const) {
    assert.ok(
      Math.abs(unitToNumber(input) - value) <=
        Number.EPSILON * Math.max(Math.abs(value), Number.MIN_VALUE),
    );
  }
  assert.ok(Number.isNaN(unitToNumber('invalid')));
});
