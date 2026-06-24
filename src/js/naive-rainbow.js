// naive-rainbow.js — the "cartoon rainbow" everyone reaches for first.
//
// This is the WRONG way to turn a wavelength into a color, kept here only so the
// demo and docs can show it side-by-side with the physically-based version in
// spectral-color.js. It maps 380–700nm linearly onto an HSV hue sweep.
//
// Why it's wrong:
//   - Hue is spaced linearly in wavelength, but perceived color is not — the
//     greens get a huge, flat band and the cyans/yellows get crushed.
//   - Every color is fully saturated and full-value, so there is no luminance
//     structure (real spectra are brightest near 555nm and dim at the ends).
//   - It can never produce the magenta lean of true violet, because spectral
//     magenta comes from the x̄ lobe in the blue, which HSV has no notion of.

import { LAMBDA_MIN, LAMBDA_MAX } from "./spectral-color.js";

/** HSV (h in [0,360), s,v in [0,1]) → sRGB floats in [0,1]. */
export function hsvToRGB(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m];
}

/**
 * Naive wavelength → RGB. Linearly maps 380nm→violet(270°) ... 700nm→red(0°)
 * across the HSV hue wheel at full saturation and value.
 */
export function naiveWavelengthToRGB(lambda) {
  const l = Math.max(LAMBDA_MIN, Math.min(LAMBDA_MAX, lambda));
  const t = (l - LAMBDA_MIN) / (LAMBDA_MAX - LAMBDA_MIN); // 0..1
  const hue = 270 * (1 - t); // 270° (violet) → 0° (red)
  return hsvToRGB(hue, 1, 1);
}

/** Naive LUT, same RGBA8 layout as buildSpectralLUT for a fair comparison. */
export function buildNaiveLUT(size = 256) {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const lambda = LAMBDA_MIN + (i / (size - 1)) * (LAMBDA_MAX - LAMBDA_MIN);
    const [r, g, b] = naiveWavelengthToRGB(lambda);
    data[i * 4 + 0] = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }
  return data;
}
