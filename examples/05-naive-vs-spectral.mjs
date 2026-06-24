// 05 — naive HSV rainbow vs. CIE 1931 spectral color, side by side.
// Run: node examples/05-naive-vs-spectral.mjs
import { wavelengthToRGB, rgbToHex } from "../src/js/spectral-color.js";
import { naiveWavelengthToRGB } from "../src/js/naive-rainbow.js";

const bar = ([r, g, b]) => {
  const t = (v) => Math.round(v * 255);
  return `\x1b[48;2;${t(r)};${t(g)};${t(b)}m   \x1b[0m`;
};

console.log("λ(nm)  naive HSV         CIE 1931 spectral");
console.log("       (cartoon)        (physical)");
for (let l = 380; l <= 700; l += 20) {
  const n = naiveWavelengthToRGB(l);
  const s = wavelengthToRGB(l);
  console.log(
    `${String(l).padStart(4)}   ${bar(n)} ${rgbToHex(n)}    ${bar(s)} ${rgbToHex(s)}`,
  );
}

console.log(`
What to notice:
  • Violet end: naive HSV gives pure blue→magenta on the color wheel; the
    spectral version leans magenta only where x̄ actually has its blue lobe.
  • Green: naive HSV parks a huge flat green band; the spectral green is
    narrower and shifts yellow-green toward 555nm.
  • Brightness: every naive color is full-value. The spectral version (try
    { luminance: true }) is brightest at 555nm and dims toward both ends —
    which is what a real prism looks like.
`);
