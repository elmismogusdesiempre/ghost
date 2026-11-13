import test from 'node:test';
import assert from 'node:assert/strict';
import { horizontalOffset } from '../signal-eye.mjs';
test('eye represents the full ADC range horizontally, centered at midscale', () => {
  assert.equal(horizontalOffset(0), -115);
  assert.equal(horizontalOffset(2047.5), 0);
  assert.equal(horizontalOffset(4095), 115);
  assert.ok(horizontalOffset(1500) < horizontalOffset(2500));
});
test('missing or invalid samples center the eye and out-of-range values stay clipped', () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity, '2000']) assert.equal(horizontalOffset(value), 0);
  assert.equal(horizontalOffset(-500), -115);
  assert.equal(horizontalOffset(5000), 115);
});
