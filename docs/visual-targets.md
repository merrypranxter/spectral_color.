# Visual Targets

## 1. Spectral Bar
256×1 strip: 380nm deep violet → 700nm red. Smooth, no banding. Green at 555nm is the brightest point.

## 2. Spectrum on Black
Full-screen horizontal gradient. The spectrum should look like a real prism output — not a naive rainbow gradient. The violet end leans magenta (blue+red) because true violet is out of sRGB gamut.

## 3. Sampled Spectra
White light (flat) → warm white. Sodium lamp (589nm spike) → bright yellow. Mercury (546nm, 578nm) → green-yellow. Laser (632.8nm HeNe) → saturated red.

## 4. LUT Texture
256×1 RGBA8. Uploadable as WebGL texture without further processing.

## 5. Comparison with Naive Rainbow
Side-by-side: naive HSV rainbow vs. CIE 1931 spectral color. Naive version is too saturated, has wrong green, missing magenta in the violet.
