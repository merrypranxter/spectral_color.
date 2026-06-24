// 06 — export the spectral bar and the naive-vs-spectral comparison as PNGs.
// Run: node examples/06-export-png.mjs   → writes into examples/out/
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSpectralLUT, wavelengthToRGB } from "../src/js/spectral-color.js";
import { naiveWavelengthToRGB } from "../src/js/naive-rainbow.js";
import { encodePNG } from "../tools/png.mjs";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(outDir, { recursive: true });

// (a) the raw 256×1 LUT, scaled up to a visible 512×64 strip.
function strip(width, height, colorAt) {
  const px = new Uint8Array(width * height * 4);
  for (let x = 0; x < width; x++) {
    const [r, g, b] = colorAt(x / (width - 1));
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      px[i] = Math.round(r * 255);
      px[i + 1] = Math.round(g * 255);
      px[i + 2] = Math.round(b * 255);
      px[i + 3] = 255;
    }
  }
  return encodePNG(width, height, px);
}

const lut = buildSpectralLUT(256);
writeFileSync(join(outDir, "lut-256x1.png"), encodePNG(256, 1, lut));

writeFileSync(
  join(outDir, "spectral-bar.png"),
  strip(512, 64, (t) => wavelengthToRGB(380 + t * 320)),
);
writeFileSync(
  join(outDir, "spectral-bar-luminance.png"),
  strip(512, 64, (t) => wavelengthToRGB(380 + t * 320, { luminance: true })),
);

// (b) stacked comparison: naive HSV on top, CIE spectral on the bottom.
function comparison(width, half) {
  const height = half * 2;
  const px = new Uint8Array(width * height * 4);
  for (let x = 0; x < width; x++) {
    const l = 380 + (x / (width - 1)) * 320;
    const top = naiveWavelengthToRGB(l);
    const bot = wavelengthToRGB(l);
    for (let y = 0; y < height; y++) {
      const [r, g, b] = y < half ? top : bot;
      const i = (y * width + x) * 4;
      px[i] = Math.round(r * 255);
      px[i + 1] = Math.round(g * 255);
      px[i + 2] = Math.round(b * 255);
      px[i + 3] = 255;
    }
  }
  return encodePNG(width, height, px);
}
writeFileSync(join(outDir, "naive-vs-spectral.png"), comparison(512, 40));

console.log("Wrote to examples/out/:");
console.log("  lut-256x1.png             raw LUT texture");
console.log("  spectral-bar.png          full-saturation bar");
console.log("  spectral-bar-luminance.png  luminance-weighted (real-prism) bar");
console.log("  naive-vs-spectral.png     HSV rainbow (top) vs CIE 1931 (bottom)");
