// 01 — wavelength → RGB at the named spectral lines.
// Run: node examples/01-basic-wavelength.mjs
import { wavelengthToRGB, rgbToHex } from "../src/js/spectral-color.js";

// Print a colored swatch using a 24-bit-color ANSI escape (most terminals).
const swatch = ([r, g, b]) => {
  const to255 = (v) => Math.round(v * 255);
  return `\x1b[48;2;${to255(r)};${to255(g)};${to255(b)}m    \x1b[0m`;
};

const lines = [
  [380, "violet (gamut edge)"],
  [430, "violet"],
  [470, "blue"],
  [490, "cyan"],
  [520, "green"],
  [555, "peak-luminance green"],
  [580, "yellow"],
  [600, "orange"],
  [620, "red"],
  [680, "deep red"],
  [700, "red (gamut edge)"],
];

console.log("λ(nm)  swatch  hex       name");
for (const [l, name] of lines) {
  const c = wavelengthToRGB(l);
  console.log(`${String(l).padStart(4)}   ${swatch(c)}  ${rgbToHex(c)}   ${name}`);
}

// Same wavelength, two tone-mapping modes:
console.log("\nluminance mode (dim ends, bright green — real-prism look):");
for (const l of [400, 555, 700]) {
  console.log(`  ${l}nm  ${swatch(wavelengthToRGB(l, { luminance: true }))}  ${rgbToHex(wavelengthToRGB(l, { luminance: true }))}`);
}
