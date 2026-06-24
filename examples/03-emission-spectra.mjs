// 03 — integrate real emission/continuous spectra to single colors.
// Run: node examples/03-emission-spectra.mjs
import { spectrumToRGB, rgbToHex } from "../src/js/spectral-color.js";
import { SOURCES } from "../src/js/light-sources.js";

const swatch = ([r, g, b]) => {
  const t = (v) => Math.round(v * 255);
  return `\x1b[48;2;${t(r)};${t(g)};${t(b)}m      \x1b[0m`;
};

console.log("source                     swatch  hex");
for (const [name, spectrum] of Object.entries(SOURCES)) {
  const c = spectrumToRGB(spectrum);
  console.log(`${name.padEnd(24)}  ${swatch(c)}  ${rgbToHex(c)}`);
}

// Mixing: combine two lasers by concatenating their line lists.
import { GREEN_LASER, HeNe_LASER } from "../src/js/light-sources.js";
const mix = spectrumToRGB([...GREEN_LASER, ...HeNe_LASER]);
console.log(`\nGreen + HeNe mixed          ${swatch(mix)}  ${rgbToHex(mix)} (→ yellowish)`);
