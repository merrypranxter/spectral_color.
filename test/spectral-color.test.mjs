import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cmfX, cmfY, cmfZ,
  wavelengthToRGB, spectrumToRGB, buildSpectralLUT,
  rgbToHex, wavelengthToU, indexToWavelength,
  LAMBDA_PEAK_Y,
} from "../src/js/spectral-color.js";
import {
  SODIUM, HeNe_LASER, GREEN_LASER, flatSpectrum, blackbodySpectrum,
} from "../src/js/light-sources.js";

const dominant = ([r, g, b]) => (r >= g && r >= b ? "r" : g >= b ? "g" : "b");

// --- Visual targets (the four the brief calls out) -------------------------

test("520nm reads green", () => {
  const c = wavelengthToRGB(520);
  assert.equal(dominant(c), "g", `520nm = ${rgbToHex(c)}`);
  assert.ok(c[1] > c[0] && c[1] > c[2]);
});

test("555nm is the luminance peak", () => {
  // ȳ peaks at 555nm by definition; the analytic fit peaks at ~554nm, so 555
  // sits within a hair of the global maximum and dominates everything outside
  // the immediate green neighborhood.
  let max = 0;
  for (let l = 380; l <= 700; l += 0.1) max = Math.max(max, cmfY(l));
  assert.ok(cmfY(LAMBDA_PEAK_Y) > 0.999 * max, "ȳ(555) should be ~the peak");
  for (let l = 380; l <= 700; l += 1) {
    if (Math.abs(l - LAMBDA_PEAK_Y) <= 6) continue;
    assert.ok(cmfY(LAMBDA_PEAK_Y) > cmfY(l), `ȳ(${l}) exceeded ȳ(555)`);
  }
  assert.equal(dominant(wavelengthToRGB(555)), "g");
});

test("700nm reads red", () => {
  const c = wavelengthToRGB(700);
  assert.equal(dominant(c), "r", `700nm = ${rgbToHex(c)}`);
  assert.ok(c[0] > c[2], "red end must not be blue-dominant");
});

test("violet end leans magenta (blue + red), not pure blue", () => {
  // True violet is out of sRGB gamut; the x̄ blue-lobe gives it a red lean.
  // The magenta is unambiguous around 400–430nm; 380 itself is deep blue-violet.
  const c = wavelengthToRGB(410);
  assert.ok(c[2] > 0.5, `410nm should be blue-strong: ${rgbToHex(c)}`);
  assert.ok(c[0] > 0.25, `410nm should carry red (magenta lean): ${rgbToHex(c)}`);
  assert.ok(c[1] < c[0] && c[1] < c[2], `410nm green should be lowest: ${rgbToHex(c)}`);
});

// --- Regression: the seed's z̄ fit leaked blue into the red end ------------

test("z̄ ≈ 0 above 580nm (no blue leak into orange/red)", () => {
  for (const l of [600, 620, 640, 660, 680, 700]) {
    assert.ok(cmfZ(l) < 0.02, `z̄(${l}) = ${cmfZ(l).toFixed(4)} leaks blue`);
  }
});

test("no red-end wavelength comes out blue-dominant", () => {
  for (let l = 600; l <= 700; l += 5) {
    const c = wavelengthToRGB(l);
    assert.notEqual(dominant(c), "b", `${l}nm = ${rgbToHex(c)} is blue-dominant`);
  }
});

// --- CMF sanity vs the tabulated CIE reference -----------------------------

test("CMFs are non-negative-ish and roughly track the table", () => {
  // Spot checks against docs/cie-1931-reference.md (analytic fit, loose tol).
  assert.ok(Math.abs(cmfZ(440) - 1.747) < 0.1, `z̄(440)=${cmfZ(440)}`);
  assert.ok(Math.abs(cmfY(500) - 0.323) < 0.05, `ȳ(500)=${cmfY(500)}`);
  assert.ok(cmfY(555) > 0.95 && cmfY(555) <= 1.001, `ȳ(555)=${cmfY(555)}`);
  assert.ok(cmfX(600) > 0.8, `x̄(600)=${cmfX(600)}`);
});

// --- LUT shape / WebGL-uploadability ---------------------------------------

test("buildSpectralLUT returns RGBA8 of the right size, opaque", () => {
  const lut = buildSpectralLUT(256);
  assert.ok(lut instanceof Uint8Array);
  assert.equal(lut.length, 256 * 4);
  for (let i = 0; i < 256; i++) assert.equal(lut[i * 4 + 3], 255, "alpha must be 255");
});

test("LUT endpoints map to 380 and 700nm", () => {
  assert.equal(indexToWavelength(0, 256), 380);
  assert.equal(indexToWavelength(255, 256), 700);
  assert.equal(wavelengthToU(380), 0);
  assert.equal(wavelengthToU(700), 1);
});

// --- Emission / continuous spectra (visual-targets §3) ---------------------

test("sodium lamp → yellow", () => {
  const c = spectrumToRGB(SODIUM);
  assert.ok(c[0] > 0.6 && c[1] > 0.5, `sodium = ${rgbToHex(c)}`);
  assert.ok(c[2] < c[0] && c[2] < c[1], "yellow has little blue");
});

test("HeNe laser → saturated red", () => {
  const c = spectrumToRGB(HeNe_LASER);
  assert.equal(dominant(c), "r", `HeNe = ${rgbToHex(c)}`);
});

test("green laser → green", () => {
  assert.equal(dominant(spectrumToRGB(GREEN_LASER)), "g");
});

test("flat spectrum → near-neutral white", () => {
  const [r, g, b] = spectrumToRGB(flatSpectrum());
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  assert.ok(spread < 0.2, `flat spectrum not neutral: ${rgbToHex([r, g, b])}`);
});

test("hotter blackbody is bluer than a cooler one", () => {
  const warm = spectrumToRGB(blackbodySpectrum(2700), { luminance: true });
  const cool = spectrumToRGB(blackbodySpectrum(9000), { luminance: true });
  const warmBR = warm[2] / Math.max(warm[0], 1e-6);
  const coolBR = cool[2] / Math.max(cool[0], 1e-6);
  assert.ok(coolBR > warmBR, "9000K should have a higher blue/red ratio than 2700K");
});

// --- API hygiene ------------------------------------------------------------

test("wavelengthToRGB clamps out-of-range input", () => {
  assert.deepEqual(wavelengthToRGB(300), wavelengthToRGB(380));
  assert.deepEqual(wavelengthToRGB(900), wavelengthToRGB(700));
});

test("all channels stay within [0,1]", () => {
  for (let l = 380; l <= 700; l += 1) {
    for (const v of wavelengthToRGB(l)) {
      assert.ok(v >= 0 && v <= 1, `channel out of range at ${l}nm: ${v}`);
    }
  }
});
