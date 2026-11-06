import test from 'node:test';
import assert from 'node:assert/strict';
import { framesToTimecode, timecodeToFrames } from '../dist/esm/index.js';

const fps2997 = { numerator: 30_000, denominator: 1_001 };
const fps5994 = { numerator: 60_000, denominator: 1_001 };

test('round-trips non-drop integer-rate frame labels', () => {
  assert.equal(framesToTimecode(90_061, { numerator: 25, denominator: 1 }), '01:00:02:11');
  assert.equal(timecodeToFrames('01:00:02:11', { numerator: 25, denominator: 1 }), 90_061);
});
test('matches known 29.97 drop-frame ten-minute boundary', () => {
  assert.equal(framesToTimecode(17_982, fps2997, { dropFrame: true }), '00:10:00;00');
  assert.equal(timecodeToFrames('00:10:00;00', fps2997, { dropFrame: true }), 17_982);
});
test('skips labels at the start of non-tenth drop-frame minutes', () => {
  assert.equal(framesToTimecode(1_800, fps2997, { dropFrame: true }), '00:01:00;02');
  assert.throws(() => timecodeToFrames('00:01:00;00', fps2997, { dropFrame: true }), RangeError);
  assert.equal(timecodeToFrames('00:01:00;02', fps2997, { dropFrame: true }), 1_800);
});
test('supports 59.94 drop-frame four-label skips', () => {
  assert.equal(framesToTimecode(35_964, fps5994, { dropFrame: true }), '00:10:00;00');
  assert.equal(framesToTimecode(3_600, fps5994, { dropFrame: true }), '00:01:00;04');
});
test('matches minute boundaries through repeated non-tenth drop cycles', () => {
  for (let minute = 0; minute <= 120; minute += 1) {
    const hours = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    const skipped = minute % 10 === 0 ? 0 : 2;
    const frame = minute * 30 * 60 + skipped - 2 * (minute - Math.floor(minute / 10));
    const label = `${hours}:${minutes}:00;${String(skipped).padStart(2, '0')}`;
    assert.equal(timecodeToFrames(label, fps2997, { dropFrame: true }), frame);
    assert.equal(framesToTimecode(frame, fps2997, { dropFrame: true }), label);
  }
});
test('makes 24-hour rollover opt-in and rejects labels outside rollover range', () => {
  const options = { dropFrame: true, rollover24Hours: true };
  const dayFrames = 30 * 86_400 - 2 * (1_440 - 144);
  assert.equal(framesToTimecode(dayFrames, fps2997, options), '00:00:00;00');
  assert.equal(framesToTimecode(dayFrames - 1, fps2997, options), '23:59:59;29');
  assert.equal(framesToTimecode(dayFrames, fps2997, { dropFrame: true }), '24:00:00;00');
  assert.throws(() => timecodeToFrames('24:00:00;00', fps2997, options), RangeError);
  assert.throws(() => framesToTimecode(1, fps2997, { rollover24Hours: 1 }), TypeError);
});
test('rejects mismatched separators and invalid rate/mode combinations', () => {
  assert.throws(() => timecodeToFrames('00:01:00;02', fps2997), RangeError);
  assert.throws(
    () => framesToTimecode(1, { numerator: 24, denominator: 1 }, { dropFrame: true }),
    RangeError,
  );
});
test('rejects malformed fields and unsafe frame indices', () => {
  assert.throws(
    () => timecodeToFrames('00:60:00:00', { numerator: 30, denominator: 1 }),
    TypeError,
  );
  assert.throws(
    () => timecodeToFrames('00:00:00:30', { numerator: 30, denominator: 1 }),
    RangeError,
  );
  assert.throws(() => framesToTimecode(-1, fps2997), RangeError);
});
