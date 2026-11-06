# @lp-labs/timecode-toolkit

Rational frame-rate timecode conversion. Exact integer-frame conversion for rational frame rates, including validated SMPTE 29.97/59.94 drop-frame.

## Install

```sh
npm install @lp-labs/timecode-toolkit
```

## Quick start

```js
import { framesToTimecode } from '@lp-labs/timecode-toolkit';
console.log(framesToTimecode(17982, { numerator: 30000, denominator: 1001 }, { dropFrame: true })); // 00:10:00;00
```

## Runtime exports

- `framesToTimecode`
- `timecodeToFrames`

The package supplies independent ESM and CommonJS builds, bundled declarations, and no runtime or peer dependencies.

## Complete public TypeScript declarations

```ts
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
export declare function framesToTimecode(
  frameNumber: number,
  rate: FrameRate,
  options?: TimecodeOptions,
): string;
export declare function timecodeToFrames(
  value: string,
  rate: FrameRate,
  options?: TimecodeOptions,
): number;
```

## Scope and limits

Converts safe non-negative integer frame indices to/from HH:MM:SS:FF labels. Non-drop mode supports integer frame rates from 1 through 120 and standard 24000/1001, 30000/1001, and 60000/1001 rates. Drop-frame mode is true label skipping for 30000/1001 (2 labels/minute) and 60000/1001 (4 labels/minute), except each tenth minute; skipped labels are rejected.

## Errors and bounds

Malformed labels/rates raise TypeError; out-of-range fields, dropped labels, mismatched separator/mode, unsupported rates, and unsafe indices raise RangeError.

## Customization

Use { numerator, denominator } for an exact rational rate. Set { dropFrame: true } only for the two listed drop-frame rates. Set rollover24Hours explicitly if timecode must wrap daily.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
