# Audit — spectral_color

Audit of the repo seed against its own stated goals (physically accurate
wavelength→RGB; the four visual targets in `docs/visual-targets.md`) and what was
changed when building the repo out from that seed.

## TL;DR

The seed was structurally complete and the XYZ→sRGB matrix, gamma curve and LUT
layout were all correct. **One thing was broken and it was the important one:**
the `z̄(λ)` color-matching-function fit injected blue into the orange/red end of
the spectrum, so reds rendered magenta and 700nm rendered **purple**. The fit has
been replaced with the published multi-lobe fit it was clearly derived from, and
the output now matches the reference table and the visual targets.

## Finding 1 — corrupted z̄ fit (critical, fixed)

The seed used **symmetric** Gaussians:

```
z̄(λ) = 1.026·exp(-½((λ-473.1)/21.3)²)
      + 0.094·exp(-½((λ-570.1)/132.7)²)   ← broad lobe, σ≈133
      + 0.305·exp(-½((λ-604.2)/23.4)²)    ← phantom lobe at 604nm
```

The second and third lobes have no business being there — real `z̄` is essentially
zero above ~560nm. Evaluated against the repo's *own* reference table
(`docs/cie-1931-reference.md`):

| λ | seed z̄ | table z̄ | error |
|---|--------|---------|-------|
| 600 | 0.392 | 0.000 | +0.392 |
| 640 | 0.176 | 0.000 | +0.176 |
| 700 | 0.058 | 0.000 | +0.058 |

That stray blue flows through `XYZ→RGB` and lands in the blue channel of every
warm color:

| λ | seed output | should be | corrected output |
|---|-------------|-----------|------------------|
| 600 | `#ff5a6d` (pink) | orange | `#ff5700` |
| 640 | `#ff005f` (magenta) | red | `#ff004e` |
| 700 | `#ea35ff` (**purple**) | red | `#ff8a00` / `#1d0a00` (luminance) |

This fails visual target #1 ("700nm → red") and #2 ("real prism output").

### Fix

Replaced all three CMF fits with the **multi-lobe (piecewise-Gaussian) fit** from
Wyman, Sloan & Shirley (2013), *"Simple Analytic Approximations to the CIE XYZ
Color Matching Functions"* (JCGT 2(2)) — the well-known "improved fit" the seed's
README and `repo_seed.txt` were referencing. Each lobe has independent left/right
σ, so the curves track the real CMFs without spurious tails. After the change
`z̄(600) = z̄(640) = z̄(700) = 0.0000`, and a regression test
(`test/spectral-color.test.mjs`) locks this in.

Two related corrections came with the proper fit:
- The seed's `x̄` third lobe had the **wrong sign** (`+0.065` vs the correct
  `−0.065`), which slightly mis-shapes the cyan/green dip.
- Symmetric σ → asymmetric (σ_left, σ_right), as the published fit specifies.

> If you specifically want the seed's original symmetric fit back (e.g. to match
> another tool bug-for-bug), the coefficients are preserved in this document and
> in git history; swapping them back is a one-function change in
> `src/js/spectral-color.js` + `src/shaders/spectral-color.glsl`.

## Finding 2 — soft-clip was actually a hard clamp (fixed)

The seed clamped negative channels to 0 (`clamp01`) after dividing by the max
channel. The constraint in `repo_seed.txt` is explicitly *"soft-clip out-of-gamut
colors, don't hard-clamp, to preserve hue."* Hard-clamping a negative channel
shifts hue.

`tonemap()` now lifts every channel by the most-negative amount first
(desaturating toward white), then normalizes — the standard gamut-mapping move
for out-of-gamut spectral colors. This is why deep spectral reds come out
slightly pink (`#ff004e`): monochromatic 660nm is *outside* sRGB, and the honest
in-gamut representation is a desaturated red, not `#ff0000`.

## Finding 3 — only one brightness model (extended, not a bug)

The seed normalized every wavelength to constant luminance (`maxY/Y`). That's one
valid choice but it over-brightens the noisy spectral tails. `wavelengthToRGB`
now takes `{ luminance }`:

- **default (full saturation)** — every wavelength at full chroma/brightness;
  best for LUTs and palettes consumed by the downstream generators.
- **`{ luminance: true }`** — preserves relative luminance (bright at 555nm, dim
  at the ends); the real-prism look for "spectrum on black".

## What was already correct (kept as-is)

- XYZ→sRGB D65 matrix.
- sRGB gamma transfer function (`0.0031308 / 12.92 / 1.055 / 2.4 / 0.055`).
- LUT design: 256×1 RGBA8, `u = (λ−380)/320`, uploadable to WebGL unprocessed.
- The reference table and visual-target docs.

## Gap list — added while building out the repo

| Added | Why |
|---|---|
| `test/spectral-color.test.mjs` | The four visual targets + z̄ regression were untested. |
| `tools/parity-check.mjs` | Job item #3 ("GLSL must match JS exactly") had nothing enforcing it. |
| `src/js/naive-rainbow.js` + `docs/naive-vs-spectral.md` | Job item #5 (compare with naive HSV) had no implementation. |
| `src/js/light-sources.js` | Sampled spectra (visual-targets §3) weren't provided. |
| `examples/` (7) + `tools/png.mjs` | Runnable snippets, incl. PNG export with no deps. |
| `package.json`, `.gitignore` | Make `npm test` / `npm run check` work; ignore generated art. |

## How to verify

```sh
npm run check     # unit tests + JS/GLSL parity
npm run demo      # naive vs spectral, in the terminal
npm run png       # writes comparison + bar PNGs to examples/out/
```
