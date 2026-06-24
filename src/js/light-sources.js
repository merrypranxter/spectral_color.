// light-sources.js — sampled spectra for the demo and examples.
//
// Each emission source is a list of { wavelength, intensity } lines you can feed
// straight to spectrumToRGB(). Continuous sources (blackbody, flat white) are
// generated as densely-sampled arrays over the visible band.

import { LAMBDA_MIN, LAMBDA_MAX } from "./spectral-color.js";

// --- Discrete emission line spectra (relative intensities) -----------------

/** Low-pressure sodium lamp — the classic monochromatic-yellow streetlight. */
export const SODIUM = [
  { wavelength: 589.0, intensity: 1.0 }, // D2
  { wavelength: 589.6, intensity: 0.9 }, // D1
];

/** Mercury vapor lamp — strong green + yellow doublet + violet lines. */
export const MERCURY = [
  { wavelength: 404.7, intensity: 0.4 },
  { wavelength: 435.8, intensity: 0.8 },
  { wavelength: 546.1, intensity: 1.0 },
  { wavelength: 577.0, intensity: 0.5 },
  { wavelength: 579.1, intensity: 0.5 },
];

/** Hydrogen Balmer series — the pink/magenta of a hydrogen discharge tube. */
export const HYDROGEN = [
  { wavelength: 410.2, intensity: 0.15 }, // Hδ
  { wavelength: 434.0, intensity: 0.25 }, // Hγ
  { wavelength: 486.1, intensity: 0.5 },  // Hβ
  { wavelength: 656.3, intensity: 1.0 },  // Hα
];

/** Neon sign — dense red/orange line cluster. */
export const NEON = [
  { wavelength: 585.2, intensity: 0.5 },
  { wavelength: 614.3, intensity: 0.7 },
  { wavelength: 640.2, intensity: 1.0 },
  { wavelength: 650.7, intensity: 0.8 },
  { wavelength: 692.9, intensity: 0.4 },
];

/** Single-line laser helpers. */
export const HeNe_LASER = [{ wavelength: 632.8, intensity: 1.0 }];
export const GREEN_LASER = [{ wavelength: 532.0, intensity: 1.0 }];
export const BLUE_LASER = [{ wavelength: 445.0, intensity: 1.0 }];

/** A single monochromatic line at any wavelength. */
export function laserLine(wavelength, intensity = 1) {
  return [{ wavelength, intensity }];
}

// --- Continuous spectra -----------------------------------------------------

/** Flat (equal-energy) spectrum over the visible band → neutral white. */
export function flatSpectrum(step = 5) {
  const out = [];
  for (let l = LAMBDA_MIN; l <= LAMBDA_MAX; l += step) {
    out.push({ wavelength: l, intensity: 1 });
  }
  return out;
}

/**
 * Planckian blackbody spectrum sampled over the visible band.
 * @param {number} tempK  color temperature in kelvin (e.g. 1900 candle,
 *                        2700 incandescent, 5778 sun, 6500 D65-ish, 10000 blue sky)
 * @param {number} [step=5]  sampling step in nm
 */
export function blackbodySpectrum(tempK, step = 5) {
  const h = 6.626e-34; // Planck
  const c = 2.998e8;   // speed of light
  const k = 1.381e-23; // Boltzmann
  const out = [];
  for (let l = LAMBDA_MIN; l <= LAMBDA_MAX; l += step) {
    const m = l * 1e-9; // nm → m
    // Planck spectral radiance (per wavelength); absolute scale is irrelevant
    // because spectrumToRGB normalizes.
    const rad = (2 * h * c * c) / (Math.pow(m, 5) * (Math.exp((h * c) / (m * k * tempK)) - 1));
    out.push({ wavelength: l, intensity: rad });
  }
  return out;
}

/** Gaussian emission bump (e.g. a phosphor or filtered band) centered at λ0. */
export function gaussianBand(center, width, step = 2) {
  const out = [];
  for (let l = LAMBDA_MIN; l <= LAMBDA_MAX; l += step) {
    const t = (l - center) / width;
    out.push({ wavelength: l, intensity: Math.exp(-0.5 * t * t) });
  }
  return out;
}

/** Named catalog for quick demo iteration. */
export const SOURCES = {
  "Sodium (589nm)": SODIUM,
  "Mercury vapor": MERCURY,
  "Hydrogen Balmer": HYDROGEN,
  "Neon": NEON,
  "HeNe laser (632.8nm)": HeNe_LASER,
  "Green laser (532nm)": GREEN_LASER,
  "Flat / equal-energy": flatSpectrum(),
  "Incandescent 2700K": blackbodySpectrum(2700),
  "Daylight 6500K": blackbodySpectrum(6500),
};
