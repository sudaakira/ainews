# Racing sprint revision (2026-10-17)

The v16 donor animation was not a convincing all-out racing stride. Its modest forelimb reach, relatively upright neck, and elevated rider were not fixed by playing the donor clip faster. This revision retains the CC0 mesh/skin but replaces both running clips, including the independent hoof IK bones. It is a constructed animation informed by references, **not measured motion capture**.

## References actually examined

- High-speed Thoroughbred study: Witte, Hirst & Wilson (2006), *Effect of speed on stride parameters in racehorses at gallop in field conditions*, Journal of Experimental Biology 209, 4389–4397. https://journals.biologists.com/jeb/article/209/21/4389/16347/Effect-of-speed-on-stride-parameters-in-racehorses . At 17 m/s: fore stance 76.7 ms, hind stance 93.6 ms, approximately 0.42 s stride. This informs the cadence, short support intervals and fore/hind stance travel, not a claim of exact reproduction.
- Actual fast racing breeze video: OBS April 2023, hip 103, https://obscatalog.com/apr/2023/103.mp4 . Viewed from front, oblique and side, with the side stride around 8 seconds examined frame by frame. Used to compare forelimb recovery, hindlimb extension, neck posture and the low racing seat. The video is reference-only; it is not distributed in this repository.
- University of Minnesota veterinary anatomy: https://vanat.ahc.umn.edu/gaits/transGallop.html . Four-beat transverse gallop, one gathered suspension, relatively rigid trunk. Racing is still a gallop; the important correction here is its high-speed racing execution, not a different name or a cheetah-like double-suspension gait.
- User's reference: https://motionzoo.net/horse-gallop-reference/ . Previous v16 review and the user-provided screenshots are recorded in [gallop-v16.md](gallop-v16.md).

## Implementation

- New `Sprint_Left` / `Sprint_Right`, 0.42-second cycles baked at 120 samples/cycle. Separate strike timing, long backward stance travel, folded recovery and forward reach. Radius, metacarpus, femur, tibia and metatarsus are solved as articulated segments, not resized cylinders. Forelimb attachment translates to represent scapular movement.
- Pastern/hoof orientation follows the recovering distal limb rather than always pointing down. Ground correction translates every skeleton root together: the source IK hoof bones are siblings of Body, not its descendants. Correcting Body alone deforms the legs and does not correctly position the soles.
- Deep forelimb recovery stays within the two-bone chain's inner and outer reach. The bake checks that the independent IK hoof stays connected to the distal limb, and browser checks measure those lower-limb-to-hoof links as well as parented bone lengths.
- Extended neck, compensated head angle, small trunk pitch, trailing tail; rider lowers the shoulders and absorbs saddle movement through articulated elbows/knees.
- Running cadence is approximately 2.2–2.65 Hz. Accelerated replay time remains separate from visible limb cadence, as before. This is not a physics simulation or exact world-space hoof lock at 8x playback.
- Saddlecloth is 1024×640 with a large white number and a separate full-width Japanese name strip. Screen-space leader labels carry number **and** full name, avoid rectangle overlap, and have guide lines to their horses. Labels do not change camera framing or race positions.
- Prediction, RNG, ranking, replay seeds and camera direction/cut logic are not changed by the motion revision. Concurrent camera changes from main are retained.

## Licence and rebuilding

Quaternius *Ultimate Animated Animals* Horse: CC0 1.0, https://quaternius.com/packs/ultimateanimatedanimals.html . Pinned source and source SHA256 are in [gallop-v16.md](gallop-v16.md). Same source mesh, skin and Idle clip; newly constructed running animation. No unlicensed video or motion data is embedded.

```sh
THREE_PACKAGE=/path/to/node_modules/three node race-engine/tools/prepare-sprint.mjs Horse.gltf race-engine/assets/models/horse-sprint-v19.glb race-engine/assets/models/sprint-motion-v19.json
```

## Visual verification

`gait-lab.html` uses the same model/controller as the full race, with both leads, side/oblique/front views, slow playback and phase stepping. Review the rendered silhouette and continuous playback, not only this document or numeric tests. During development, visual iterations corrected rearward-overfolded forelimbs, drooping head, tail direction, rider height and distal-hoof orientation. A browser check exposed the root-bone grounding error, which was corrected before release.

`tests/mobile-browser.mjs` captures both leads at six phases in three views, checks actual deformed hoof vertices and rigid limb lengths, and exercises the full race at four viewport sizes. `GAIT_ONLY=1` runs just the single-horse checks. The deployed-page workflow runs against the actual public URL and retains screenshots; its result, not a local preview alone, is the release confirmation. Mobile checks are browser emulation, not a physical-device claim.
