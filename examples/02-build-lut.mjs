// 02 — build the 256px LUT and inspect it.
// Run: node examples/02-build-lut.mjs
import { buildSpectralLUT, indexToWavelength } from "../src/js/spectral-color.js";

const SIZE = 256;
const lut = buildSpectralLUT(SIZE);

console.log(`LUT: ${lut.constructor.name}, ${lut.length} bytes (${SIZE}×1 RGBA8)\n`);
console.log("Every 16th texel:");
console.log("idx   λ(nm)   R    G    B    A");
for (let i = 0; i < SIZE; i += 16) {
  const l = indexToWavelength(i, SIZE).toFixed(0);
  const [r, g, b, a] = [lut[i * 4], lut[i * 4 + 1], lut[i * 4 + 2], lut[i * 4 + 3]];
  console.log(
    `${String(i).padStart(3)}   ${String(l).padStart(4)}   ` +
      `${String(r).padStart(3)}  ${String(g).padStart(3)}  ${String(b).padStart(3)}  ${a}`,
  );
}

// This Uint8Array is directly uploadable, no copy/convert needed:
//   const tex = gl.createTexture();
//   gl.bindTexture(gl.TEXTURE_2D, tex);
//   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
console.log("\nReady for gl.texImage2D(..., 256, 1, ..., gl.RGBA, gl.UNSIGNED_BYTE, lut)");
