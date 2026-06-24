# Example 07 — uploading the LUT to WebGL and sampling it in a shader

`buildSpectralLUT()` returns a `Uint8Array` that is already in the exact layout
WebGL wants (`RGBA`, `UNSIGNED_BYTE`, width = size, height = 1). No conversion,
no flipping, no premultiply — upload it straight.

## 1. Upload the LUT (JS)

```js
import { buildSpectralLUT } from "../src/js/spectral-color.js";

function createSpectralLUT(gl, size = 256) {
  const lut = buildSpectralLUT(size); // Uint8Array, size*4 bytes
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    size, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, lut,
  );
  // LINEAR makes the spectrum interpolate smoothly between texels.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
```

Bind it to a sampler uniform before drawing:

```js
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, lutTex);
gl.uniform1i(gl.getUniformLocation(program, "u_spectralLUT"), 0);
```

## 2. Sample it (fragment shader)

Pull in `src/shaders/spectral-color.glsl` (your build step can `#include` or
string-concatenate it) and call the LUT sampler:

```glsl
uniform sampler2D u_spectralLUT;
varying vec2 v_uv;

void main() {
  // map screen x → wavelength 380..700
  float lambda = mix(380.0, 700.0, v_uv.x);
  gl_FragColor = vec4(wavelengthToRGB_LUT(u_spectralLUT, lambda), 1.0);
}
```

## 3. LUT vs. analytic — which to use?

| | `wavelengthToRGB_LUT(lut, λ)` | `wavelengthToRGB(λ)` |
|---|---|---|
| cost | one texture fetch | ~7 `exp` per pixel |
| precision | 8-bit, LINEAR-interpolated | full float |
| use when | shading lots of fragments (dispersion, rainbows) | you need exact values or have no texture slot free |

For the Color Lab generators (`prism_dispersion`, `rainbow_optics`, …) the LUT
path is the right default: build it once on the CPU, sample it everywhere.

## 4. Verifying GPU == CPU

`tools/parity-check.mjs` asserts the GLSL constants match the JS module. Run it
in CI so the shader can't silently drift from the reference implementation:

```sh
node tools/parity-check.mjs
```
