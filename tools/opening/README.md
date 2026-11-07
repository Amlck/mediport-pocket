# Cinematic opening

`gate_opening.py` is the complete Blender scene for the cinematic opening, written as
code: geometry, materials, lights, camera and compositing. Nothing is hand-placed in a
`.blend` file, so a change is a diff and anyone can re-render.

- **Clip in the app:** `src/images/opening/cinematic.mp4`.
- **Flat lockup:** `src/app/lib/opening-cinematic.js` holds the final-frame logo and
  iris geometry exported by `--export-geometry`; `final-geometry.json` here is the
  current export. Re-export and update the constants whenever the camera, iris or
  timing changes. `tests/opening.test.mjs` checks that they agree.
- **Colours:** slate `#1e293b`, off-white `#f3f5f4`, cyan `#0891b2` (the icon's).

See the docstring at the top of `gate_opening.py` for the render commands. A draft
(360 × 640, 30 fps, 24 samples) takes about 30 minutes on four CPU cores; a final
render at 720 × 1280 and 60 fps takes a few hours.

The marble, haze and lighting are procedural. No third-party models, textures or
images are used.
