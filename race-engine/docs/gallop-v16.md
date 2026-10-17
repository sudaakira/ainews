# Gallop v16: asset, motion and visual acceptance

## What changed

V15 constructed each leg from endpoint cylinders whose lengths changed during the stride. V16 uses a continuous weighted horse mesh and an authored skeletal Gallop clip. The neck, head, torso, tail and four limbs belong to the same skeleton. A separately articulated racing rider follows the saddle and bit, bending knees and elbows rather than bouncing as a rigid object. Horse numbers, silks and frame caps remain per runner.

The model faces +Z. Each horse has its own skeleton, mixer and stride phase; the mesh geometry is shared. Eight original primitives are combined into two draws with vertex colours. The source left lead is retained; the right lead is reflected in bind-space/world-space and baked at 60 Hz, not obtained by negating Euler angles. Lead transitions occur in gathered suspension. Limb playback uses screen time, so 16x race playback does not become a 16x leg strobe. Prediction factors, random draws, race trajectories, finish ranking and four camera cuts are unchanged.

Contact correction moves the whole horse vertically using the deformed hoof soles. It preserves the gathered suspension arc and does not stretch limb bones. This is an illustrative authored animation, **not motion capture or a physically exact hoof-locking simulation**; accelerated race translation is intentionally separate from presentation cadence.

## Asset and licence

- Creator: **Quaternius**, *Ultimate Animated Animals*, Horse, July 2021 pack.
- Official source/licence declaration: https://quaternius.com/packs/ultimateanimatedanimals.html — **CC0 1.0** (model and animation).
- Original glTF mirror: https://github.com/agentkaerf/FreeModels/blob/db3df04d1e4714298a09510b26fb6de6645138a2/Ultimate%20Animated%20Animals%20-%20July%202021/glTF/Horse.gltf
- Original blob: `cc92939e01fab7bacadea3f440214b1fdcdd6ecf`.
- Original SHA256: `3deb61550dff1d2786d04b6e8559d63ad3907d6ab606ba28ce0af074ed96341b`.
- Converted `horse-v16.glb` SHA256: `0531ecd52c8f86bc723b749f997659b956567fb904a68376626b00e05f409dcf`.
- Licence text: [`../assets/models/CC0-1.0.txt`](../assets/models/CC0-1.0.txt).
- Three.js r160 core and three helper modules: MIT, [`../vendor/THREE-LICENSE.txt`](../vendor/THREE-LICENSE.txt). Helper imports are adjusted to same-origin relative URLs.

The Three.js ROME horse was evaluated but excluded because its asset licence is CC BY-NC-SA, unlike its code licence. No ROME model is shipped.

Rebuild from the pinned original file:

```sh
npm install --prefix /tmp/race-three three@0.160.0
node race-engine/tools/prepare-horse.mjs Horse.gltf \
  race-engine/assets/models/horse-v16.glb \
  race-engine/assets/models/horse-motion.json
```

## References inspected

- User-provided screenshots IMG_3029.jpeg and IMG_3019.jpeg; repository's v15 source and previous gait/camera changes.
- https://motionzoo.net/horse-gallop-reference/ — four-beat transverse gallop and gathered suspension. Its linked BBC video was identified; a playable BBC stream was not available in this environment.
- Eadweard Muybridge, *Animal Locomotion*, plate 626 (1887), Annie G galloping: actual sequential photographs, animated and examined frame by frame. Public-domain image mirror: https://dlab.epfl.ch/wikispeedia/wpcd/images/164/16484.gif
- https://journals.biologists.com/jeb/article/210/2/187/17107/Gait-characterisation-and-classification-in-horses — horse gait classification.

## Visual review procedure

Open [`../gait-lab.html`](../gait-lab.html): same model and controller as the race, left/right lead, side/oblique/front, 0.25x/0.5x/1x playback and manual phase control. The displayed hoof heights come from actual skinned vertices, not just theoretical joint angles.

Before integration: rendered 12 phases × 3 views × both leads; reviewed silhouettes, folded forelegs/hocks, absence of lateral scuttling, airborne gather, sole contact and seam continuity. Recorded continuous playback in all three views. Visual review led to corrections to rider torso proportions, knee/boot position, saddlecloth placement and the neck connection. Numerical checks supplement these renders; they are not the visual acceptance criterion.

`tests/mobile-browser.mjs` exercises the actual WebGL scene at 320, 390, 430 and 1280px, the four cuts, 17 runners, finish/rank, continued run-out, pause/resume/reset, plus actual deformed hoof vertices and fixed limb lengths. GitHub Actions retains screenshots for review. Mobile checks are browser viewport emulation, not a physical iPhone.

Local release check on 2026-10-17: all four viewport cases passed, including 17-runner WebGL, all cuts, finish ordering and uninterrupted run-out. The final single-horse browser check passed for both leads in all three views; these screenshots were reviewed alongside the continuous playback recording. To serve a local checkout, first copy the pinned Three.js core from `/tmp/race-three/node_modules/three/build/three.module.js` into `race-engine/vendor/three.module.js`; the Pages workflow performs this step automatically.
