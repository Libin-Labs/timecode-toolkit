export interface FrameRate {
  numerator: number;
  denominator: number;
}
export interface TimecodeOptions {
  dropFrame?: boolean;
  rollover24Hours?: boolean;
}
export interface Timecode {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
}
const MAX_HOURS = 99_999;

function rateInfo(rate: FrameRate, dropFrame: boolean) {
  if (
    !rate ||
    !Number.isSafeInteger(rate.numerator) ||
    !Number.isSafeInteger(rate.denominator) ||
    rate.numerator <= 0 ||
    rate.denominator <= 0
  ) {
    throw new TypeError('Frame rate must use positive integer numerator and denominator.');
  }
  const nominal = Math.round(rate.numerator / rate.denominator);
  const exactRate = rate.numerator / rate.denominator;
  const standardFractionalRate =
    rate.denominator === 1_001 &&
    (rate.numerator === 24_000 || rate.numerator === 30_000 || rate.numerator === 60_000);
  if (
    nominal < 1 ||
    nominal > 120 ||
    (!standardFractionalRate && Math.abs(exactRate - nominal) > 0.01)
  )
    throw new RangeError('Unsupported frame rate.');
  let drop = 0;
  if (dropFrame) {
    if (rate.numerator === 30_000 && rate.denominator === 1_001) drop = 2;
    else if (rate.numerator === 60_000 && rate.denominator === 1_001) drop = 4;
    else throw new RangeError('Drop-frame supports only 30000/1001 or 60000/1001.');
  }
  return { nominal, drop };
}

export function framesToTimecode(
  frameNumber: number,
  rate: FrameRate,
  options: TimecodeOptions = {},
): string {
  if (!Number.isSafeInteger(frameNumber) || frameNumber < 0)
    throw new RangeError('Frame number must be a non-negative safe integer.');
  if (options.dropFrame !== undefined && typeof options.dropFrame !== 'boolean')
    throw new TypeError('dropFrame must be boolean.');
  if (options.rollover24Hours !== undefined && typeof options.rollover24Hours !== 'boolean')
    throw new TypeError('rollover24Hours must be boolean.');
  const { nominal, drop } = rateInfo(rate, options.dropFrame ?? false);
  if (options.rollover24Hours) {
    const dayFrames = nominal * 86_400 - drop * (1_440 - 144);
    frameNumber %= dayFrames;
  }
  let labelFrame = frameNumber;
  if (drop > 0) {
    const blockSize = nominal * 600 - drop * 9;
    const blocks = Math.floor(frameNumber / blockSize);
    let remainder = frameNumber % blockSize;
    labelFrame = blocks * nominal * 600;
    const fullMinute = nominal * 60;
    if (remainder >= fullMinute) {
      remainder -= fullMinute;
      labelFrame += fullMinute;
      for (let minute = 1; minute < 10; minute += 1) {
        labelFrame += drop;
        const minuteFrames = fullMinute - drop;
        if (remainder < minuteFrames) {
          labelFrame += remainder;
          remainder = 0;
          break;
        }
        remainder -= minuteFrames;
        labelFrame += minuteFrames;
      }
      if (remainder > 0) labelFrame += remainder;
    } else labelFrame += remainder;
  }
  const hours = Math.floor(labelFrame / (nominal * 3600));
  if (hours > MAX_HOURS) throw new RangeError('Timecode exceeds supported hours.');
  const minutes = Math.floor(labelFrame / (nominal * 60)) % 60;
  const seconds = Math.floor(labelFrame / nominal) % 60;
  const frames = labelFrame % nominal;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${drop ? ';' : ':'}${String(frames).padStart(2, '0')}`;
}

export function timecodeToFrames(
  value: string,
  rate: FrameRate,
  options: TimecodeOptions = {},
): number {
  const { nominal, drop } = rateInfo(rate, options.dropFrame ?? false);
  if (typeof value !== 'string' || value.length > 32)
    throw new TypeError('Timecode must be a string up to 32 characters.');
  if (options.dropFrame !== undefined && typeof options.dropFrame !== 'boolean')
    throw new TypeError('dropFrame must be boolean.');
  if (options.rollover24Hours !== undefined && typeof options.rollover24Hours !== 'boolean')
    throw new TypeError('rollover24Hours must be boolean.');
  const match = /^(\d{2,5}):([0-5]\d):([0-5]\d)([:;])(\d{2})(?![\s\S])/.exec(value);
  if (!match) throw new TypeError('Expected HH:MM:SS:FF or drop-frame HH:MM:SS;FF.');
  const [, hourText, minuteText, secondText, separator, frameText] = match;
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  const seconds = Number(secondText);
  const frames = Number(frameText);
  if (hours > MAX_HOURS || frames >= nominal)
    throw new RangeError('Timecode field is out of range.');
  if (options.rollover24Hours && hours >= 24)
    throw new RangeError('Rollover timecode labels must be within one 24-hour day.');
  if (drop > 0 !== (separator === ';'))
    throw new RangeError('Timecode separator does not match drop-frame mode.');
  if (drop > 0 && seconds === 0 && minutes % 10 !== 0 && frames < drop)
    throw new RangeError('Timecode names a dropped frame label.');
  const totalMinutes = hours * 60 + minutes;
  let result = (hours * 3600 + minutes * 60 + seconds) * nominal + frames;
  if (drop > 0) result -= drop * (totalMinutes - Math.floor(totalMinutes / 10));
  if (!Number.isSafeInteger(result))
    throw new RangeError('Frame number exceeds safe integer range.');
  return result;
}
