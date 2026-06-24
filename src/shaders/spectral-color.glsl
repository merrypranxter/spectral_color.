// spectral_color — GPU-side wavelength → sRGB.
//
// EXACT port of src/js/spectral-color.js: same CIE 1931 2° multi-lobe
// (piecewise-Gaussian) CMF fit (Wyman, Sloan & Shirley 2013), same XYZ→sRGB
// matrix, same sRGB gamma, same soft-clip tonemap. Keep the two in sync — the
// constants are duplicated, not shared. tools/parity-check.mjs verifies they
// still agree.
//
// Works in GLSL ES 1.00 (WebGL1) and GLSL ES 3.00 (WebGL2).

// Asymmetric Gaussian lobe with independent left/right sigma.
float lobe(float l, float alpha, float mu, float sL, float sR) {
  float t = (l - mu) / (l < mu ? sL : sR);
  return alpha * exp(-0.5 * t * t);
}

float cmfX(float l) {
  return lobe(l,  1.056, 599.8, 37.9, 31.0)
       + lobe(l,  0.362, 442.0, 16.0, 26.7)
       + lobe(l, -0.065, 501.1, 20.4, 26.2);
}
float cmfY(float l) {
  return lobe(l, 0.821, 568.8, 46.9, 40.5)
       + lobe(l, 0.286, 530.9, 16.3, 31.1);
}
float cmfZ(float l) {
  return lobe(l, 1.217, 437.0, 11.8, 36.0)
       + lobe(l, 0.681, 459.0, 26.0, 13.8);
}

vec3 xyzToLinearRGB(float x, float y, float z) {
  return vec3(
     3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
     0.0557 * x - 0.2040 * y + 1.0570 * z
  );
}

float srgbGamma(float v) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * pow(v, 1.0 / 2.4) - 0.055;
}

// luminance == false → full-saturation palette color (default)
// luminance == true  → luminance-weighted (dim ends, bright green)
vec3 tonemap(vec3 c, bool luminance) {
  float lift = min(min(c.r, c.g), min(c.b, 0.0));
  c -= lift;
  float denom = max(max(c.r, c.g), c.b);
  if (luminance) denom = max(denom, 1.0);
  denom = max(denom, 1e-6);
  c = clamp(c / denom, 0.0, 1.0);
  return vec3(srgbGamma(c.r), srgbGamma(c.g), srgbGamma(c.b));
}

vec3 wavelengthToRGB(float lambda, bool luminance) {
  float l = clamp(lambda, 380.0, 700.0);
  return tonemap(xyzToLinearRGB(cmfX(l), cmfY(l), cmfZ(l)), luminance);
}

// Default overload: full-saturation palette color, matching the JS default.
vec3 wavelengthToRGB(float lambda) {
  return wavelengthToRGB(lambda, false);
}

// Sample a baked LUT (buildSpectralLUT) instead of recomputing per fragment.
// u = (lambda - 380) / 320.  Bind the LUT with LINEAR filtering for smoothness.
vec3 wavelengthToRGB_LUT(sampler2D lut, float lambda) {
  float u = (lambda - 380.0) / 320.0;
  return texture2D(lut, vec2(clamp(u, 0.0, 1.0), 0.5)).rgb;
}
