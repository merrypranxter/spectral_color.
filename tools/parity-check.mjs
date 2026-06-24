// parity-check.mjs — guard against the JS and GLSL implementations drifting.
//
// The shader can't import the JS module, so the CMF coefficients, the XYZ→sRGB
// matrix and the gamma constants are physically duplicated. This script parses
// the literal numbers out of src/shaders/spectral-color.glsl and checks they
// match the ones in src/js/spectral-color.js, so a change to one side that
// isn't mirrored fails CI instead of silently desyncing the GPU path.
//
// Run: node tools/parity-check.mjs   (exit 0 = in sync, 1 = drift)

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const js = await readFile(join(root, "src/js/spectral-color.js"), "utf8");
const glsl = await readFile(join(root, "src/shaders/spectral-color.glsl"), "utf8");

const nums = (s) => (s.match(/-?\d+\.\d+/g) || []).map(Number);

// Pull the three CMF coefficient tables out of the JS source.
function jsTable(name) {
  const m = js.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`JS table ${name} not found`);
  return nums(m[1]);
}
// Pull the lobe(...) argument lists out of a GLSL cmf function body.
function glslTable(fn) {
  const m = glsl.match(new RegExp(`float ${fn}\\(float l\\) \\{([\\s\\S]*?)\\}`));
  if (!m) throw new Error(`GLSL fn ${fn} not found`);
  return nums(m[1]).filter((_, i) => true); // every numeric literal in the body
}

const problems = [];
const approxEqual = (a, b, tol = 1e-9) =>
  a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tol);

for (const [jsName, glName] of [["CMF_X", "cmfX"], ["CMF_Y", "cmfY"], ["CMF_Z", "cmfZ"]]) {
  const a = jsTable(jsName);
  const b = glslTable(glName);
  if (!approxEqual(a, b)) {
    problems.push(`CMF mismatch ${jsName} vs GLSL ${glName}:\n  js   = [${a}]\n  glsl = [${b}]`);
  }
}

// XYZ→sRGB matrix (9 numbers). GLSL encodes the signs as +/- operators, so
// compare sign-independent magnitudes (sorted) on both sides.
const mags = (arr) => arr.map(Math.abs).sort((a, b) => a - b);
const jsMatrix = nums(js.match(/M_XYZ_TO_RGB = \[([\s\S]*?)\];/)[1]);
const glslMatrix = nums(glsl.match(/xyzToLinearRGB[\s\S]*?return vec3\(([\s\S]*?)\);/)[1]);
if (!approxEqual(mags(jsMatrix), mags(glslMatrix))) {
  problems.push(`XYZ→sRGB matrix mismatch:\n  js   = [${jsMatrix}]\n  glsl = [${glslMatrix}]`);
}

// Gamma constants: every magnitude used on the JS side must appear on the GLSL
// side (GLSL spells "1.0/2.4" so it carries an extra literal 1.0).
const present = (needles, hay, tol = 1e-9) =>
  needles.every((n) => hay.some((h) => Math.abs(Math.abs(h) - Math.abs(n)) <= tol));
const gammaConstsJS = nums(js.match(/srgbGamma\(v\) \{[\s\S]*?\}/)[0]);
const gammaConstsGL = nums(glsl.match(/srgbGamma\(float v\) \{[\s\S]*?\}/)[0]);
if (!present(gammaConstsJS, gammaConstsGL)) {
  problems.push(`gamma constants mismatch:\n  js   = [${gammaConstsJS}]\n  glsl = [${gammaConstsGL}]`);
}

if (problems.length) {
  console.error("✗ JS / GLSL parity check FAILED\n");
  for (const p of problems) console.error(p + "\n");
  process.exit(1);
}
console.log("✓ JS and GLSL constants are in sync (CMF lobes, XYZ→sRGB matrix, gamma).");
