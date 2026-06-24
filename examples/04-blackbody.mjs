// 04 — the Planckian locus: blackbody color vs temperature.
// Run: node examples/04-blackbody.mjs
import { spectrumToRGB, rgbToHex } from "../src/js/spectral-color.js";
import { blackbodySpectrum } from "../src/js/light-sources.js";

const swatch = ([r, g, b]) => {
  const t = (v) => Math.round(v * 255);
  return `\x1b[48;2;${t(r)};${t(g)};${t(b)}m      \x1b[0m`;
};

const temps = [
  [1500, "candle flame / embers"],
  [2700, "warm incandescent bulb"],
  [3400, "halogen"],
  [5000, "horizon daylight"],
  [5778, "the Sun (surface)"],
  [6500, "overcast daylight (~D65)"],
  [9000, "clear blue sky shadow"],
  [12000, "deep blue sky"],
];

console.log("As temperature climbs, color walks warm→neutral→cool (the Planckian locus):\n");
console.log("  T(K)   swatch  hex       description");
for (const [T, desc] of temps) {
  // luminance:true keeps the relative brightness so cool sources look dimmer in R.
  const c = spectrumToRGB(blackbodySpectrum(T), { luminance: true });
  console.log(`${String(T).padStart(6)}   ${swatch(c)}  ${rgbToHex(c)}   ${desc}`);
}
