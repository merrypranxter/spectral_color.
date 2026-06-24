// spectral_color — wavelength → RGB via the CIE 1931 2° standard observer.
//
// Color-matching functions use the multi-lobe (piecewise-Gaussian) analytic fit
// from Wyman, Sloan & Shirley (2013), "Simple Analytic Approximations to the
// CIE XYZ Color Matching Functions", JCGT 2(2). Each lobe has independent left
// and right standard deviations, which is what lets the fit track the real CMFs
// without the spurious tails a symmetric Gaussian produces.
//
// NOTE: this replaces the symmetric-Gaussian fit shipped in the repo seed, whose
// z̄ term leaked blue into the 600–700nm region (turning reds magenta and 700nm
// purple). See AUDIT.md for the full diagnosis and before/after numbers.

export const LAMBDA_MIN = 380;
export const LAMBDA_MAX = 700;
export const LAMBDA_PEAK_Y = 555; // ȳ peaks here (brightest visible wavelength)

// Asymmetric Gaussian lobe: [alpha, mu, sigmaLeft, sigmaRight].
function lobe(x, alpha, mu, sLeft, sRight) {
  const t = (x - mu) / (x < mu ? sLeft : sRight);
  return alpha * Math.exp(-0.5 * t * t);
}

// Wyman/Sloan/Shirley 2013 multi-lobe coefficients.
const CMF_X = [
  [1.056, 599.8, 37.9, 31.0],
  [0.362, 442.0, 16.0, 26.7],
  [-0.065, 501.1, 20.4, 26.2],
];
const CMF_Y = [
  [0.821, 568.8, 46.9, 40.5],
  [0.286, 530.9, 16.3, 31.1],
];
const CMF_Z = [
  [1.217, 437.0, 11.8, 36.0],
  [0.681, 459.0, 26.0, 13.8],
];

const sumLobes = (table, l) =>
  table.reduce((acc, [a, m, sL, sR]) => acc + lobe(l, a, m, sL, sR), 0);

/** x̄(λ) — CIE 1931 2° color-matching function. */
export function cmfX(lambda) { return sumLobes(CMF_X, lambda); }
/** ȳ(λ) — CIE 1931 2° color-matching function (also the luminance response). */
export function cmfY(lambda) { return sumLobes(CMF_Y, lambda); }
/** z̄(λ) — CIE 1931 2° color-matching function. */
export function cmfZ(lambda) { return sumLobes(CMF_Z, lambda); }

/** XYZ tristimulus for monochromatic light at λ (nm). */
export function wavelengthToXYZ(lambda) {
  return [cmfX(lambda), cmfY(lambda), cmfZ(lambda)];
}

// CIE XYZ → linear sRGB (D65 white point).
const M_XYZ_TO_RGB = [
  [3.2406, -1.5372, -0.4986],
  [-0.9689, 1.8758, 0.0415],
  [0.0557, -0.2040, 1.0570],
];

export function xyzToLinearRGB(x, y, z) {
  return [
    M_XYZ_TO_RGB[0][0] * x + M_XYZ_TO_RGB[0][1] * y + M_XYZ_TO_RGB[0][2] * z,
    M_XYZ_TO_RGB[1][0] * x + M_XYZ_TO_RGB[1][1] * y + M_XYZ_TO_RGB[1][2] * z,
    M_XYZ_TO_RGB[2][0] * x + M_XYZ_TO_RGB[2][1] * y + M_XYZ_TO_RGB[2][2] * z,
  ];
}

/** sRGB opto-electronic transfer function (linear → gamma-encoded). */
export function srgbGamma(v) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Map an out-of-gamut linear RGB triple into [0,1]³ and gamma-encode it.
//
// 1. Soft-clip negatives by lifting every channel by the most-negative amount.
//    This desaturates toward white instead of hard-clamping to 0, which keeps
//    the hue of out-of-gamut spectral colors (the seed's stated requirement).
//    Monochromatic light is mostly outside sRGB, so this matters everywhere.
// 2. Normalize:
//      luminance:false (default) → divide by the brightest channel, so every
//        wavelength comes out at full saturation/brightness. Best for palettes,
//        LUTs and emission lines.
//      luminance:true → divide by max(channels, 1), preserving relative
//        luminance. Dim violet/red ends, bright green — a real prism / radiance
//        look. Best for "spectrum on black".
function tonemap(r, g, b, luminance) {
  const lift = Math.min(r, g, b, 0);
  r -= lift; g -= lift; b -= lift;

  let denom = Math.max(r, g, b);
  if (luminance) denom = Math.max(denom, 1);
  if (denom <= 0) denom = 1;

  return [
    srgbGamma(clamp01(r / denom)),
    srgbGamma(clamp01(g / denom)),
    srgbGamma(clamp01(b / denom)),
  ];
}

/**
 * Monochromatic wavelength → gamma-encoded sRGB, each channel in [0,1].
 * @param {number} lambda  wavelength in nm (clamped to 380–700)
 * @param {{luminance?: boolean}} [opts]
 *   luminance:false (default) → full-saturation palette color
 *   luminance:true            → luminance-weighted (dim ends, bright green)
 */
export function wavelengthToRGB(lambda, opts = {}) {
  const l = Math.max(LAMBDA_MIN, Math.min(LAMBDA_MAX, lambda));
  const [x, y, z] = wavelengthToXYZ(l);
  const [r, g, b] = xyzToLinearRGB(x, y, z);
  return tonemap(r, g, b, opts.luminance === true);
}

/**
 * Integrate an emission/reflectance spectrum to a single sRGB color.
 * @param {Array<{wavelength:number,intensity?:number}>} spectrum
 * @param {{luminance?: boolean}} [opts]  defaults to full-saturation (vivid).
 */
export function spectrumToRGB(spectrum, opts = {}) {
  let X = 0, Y = 0, Z = 0;
  for (const s of spectrum) {
    const w = s.intensity == null ? 1 : s.intensity;
    if (w === 0) continue;
    X += cmfX(s.wavelength) * w;
    Y += cmfY(s.wavelength) * w;
    Z += cmfZ(s.wavelength) * w;
  }
  const [r, g, b] = xyzToLinearRGB(X, Y, Z);
  return tonemap(r, g, b, opts.luminance === true);
}

/** Map a LUT/texture column index back to its wavelength. */
export function indexToWavelength(i, size) {
  return LAMBDA_MIN + (i / (size - 1)) * (LAMBDA_MAX - LAMBDA_MIN);
}

/** Map a wavelength to its normalized LUT coordinate u ∈ [0,1]. */
export function wavelengthToU(lambda) {
  return (lambda - LAMBDA_MIN) / (LAMBDA_MAX - LAMBDA_MIN);
}

/**
 * Bake a 1-D spectral LUT as RGBA8, ready to upload to WebGL with no further
 * processing (gl.RGBA / gl.UNSIGNED_BYTE, width=size, height=1).
 * @param {number} [size=256]
 * @param {{luminance?: boolean}} [opts]
 * @returns {Uint8Array} length size*4
 */
export function buildSpectralLUT(size = 256, opts = {}) {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const lambda = indexToWavelength(i, size);
    const [r, g, b] = wavelengthToRGB(lambda, opts);
    data[i * 4 + 0] = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }
  return data;
}

/** Convenience: [r,g,b] floats (0–1) → "#rrggbb". */
export function rgbToHex([r, g, b]) {
  const h = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
