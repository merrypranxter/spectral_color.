// Browser demo for spectral_color. Renders, top to bottom:
//   1. spectrum on black     — luminance-weighted (real-prism look)
//   2. full-saturation bar    — what the LUT bakes
//   3. naive vs spectral      — HSV cartoon rainbow over CIE 1931
//   4. emission-source swatches
import { buildSpectralLUT, wavelengthToRGB, spectrumToRGB, rgbToHex } from "./spectral-color.js";
import { naiveWavelengthToRGB } from "./naive-rainbow.js";
import { SOURCES } from "./light-sources.js";

const LAMBDA_MIN = 380, LAMBDA_MAX = 700;
const xToLambda = (x, w) => LAMBDA_MIN + (x / (w - 1)) * (LAMBDA_MAX - LAMBDA_MIN);

// Fill a canvas column-by-column from a (t)→[r,g,b] function.
function paintColumns(canvas, colorAt, rows = null) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const cTop = colorAt(x / (w - 1), 0);
    const cBot = rows ? colorAt(x / (w - 1), 1) : cTop;
    for (let y = 0; y < h; y++) {
      const c = rows && y >= h / 2 ? cBot : cTop;
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(c[0] * 255);
      img.data[i + 1] = Math.round(c[1] * 255);
      img.data[i + 2] = Math.round(c[2] * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// 1. Spectrum on black (luminance-weighted).
paintColumns(
  document.getElementById("spectrum"),
  (t) => wavelengthToRGB(LAMBDA_MIN + t * (LAMBDA_MAX - LAMBDA_MIN), { luminance: true }),
);

// 2. Full-saturation LUT bar (rendered from the actual baked LUT).
const lut = buildSpectralLUT(256);
paintColumns(document.getElementById("bar"), (t) => {
  const i = Math.round(t * 255) * 4;
  return [lut[i] / 255, lut[i + 1] / 255, lut[i + 2] / 255];
});

// 3. Naive (top half) vs spectral (bottom half).
paintColumns(
  document.getElementById("compare"),
  (t, row) => {
    const l = LAMBDA_MIN + t * (LAMBDA_MAX - LAMBDA_MIN);
    return row === 0 ? naiveWavelengthToRGB(l) : wavelengthToRGB(l);
  },
  true,
);

// 4. Emission-source swatches.
const swatches = document.getElementById("swatches");
for (const [name, spectrum] of Object.entries(SOURCES)) {
  const c = spectrumToRGB(spectrum);
  const el = document.createElement("div");
  el.className = "swatch";
  el.innerHTML =
    `<span class="chip" style="background:${rgbToHex(c)}"></span>` +
    `<span class="label">${name}</span><span class="hex">${rgbToHex(c)}</span>`;
  swatches.appendChild(el);
}

// Hover readout on the spectrum: report wavelength + color under the cursor.
const readout = document.getElementById("readout");
const spectrum = document.getElementById("spectrum");
spectrum.addEventListener("mousemove", (e) => {
  const rect = spectrum.getBoundingClientRect();
  const lambda = xToLambda((e.clientX - rect.left) / rect.width * (spectrum.width - 1), spectrum.width);
  const c = wavelengthToRGB(lambda);
  readout.textContent = `${lambda.toFixed(1)} nm → ${rgbToHex(c)}`;
  readout.style.color = rgbToHex(wavelengthToRGB(lambda, { luminance: false }));
});
