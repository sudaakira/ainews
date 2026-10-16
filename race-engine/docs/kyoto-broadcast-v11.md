# Kyoto race broadcast v11 — 2026-10-17

## Revision

- Replaced the ~500-unit schematic with a metre-scale 2000m route. Kyoto inner A published constraints: lap1782.8m, final straight328.4m, width27–38m, relief3.1m. The start is217.2m before the goal on the SAME home straight. The goal no longer sits beyond the end of the course.
- Reconstructed the asymmetric plan: diagonal backstretch, different end curves, inner/outer split and merge, backstretch chute, dirt loop and infield pond. The sampled Bézier plan is calibrated to1782.8m; it is a reconstruction, not a survey-exact digital twin. Constant27m running width uses the lower official bound; varying width, outer-course surveyed distance and building details are not exact.
- JRA elevation profile: climb with about1100m remaining, crest around900–800m, descend towards600m. Turf, rails, horses and camera share the same height function. No exaggerated vertical scale.
- JSS40-inspired bridge-supported stalls, yellow numbers, protective white pads, open front grilles, paired doors, bridge supports and wheels. Model dimensions are a visual reconstruction, not manufacturer CAD.
- New metre-scale anatomical original cel horses with tapered faces, longer necks, narrow cannon bones, articulated knees/hocks, crouching jockeys, number/name saddlecloths and frame caps. Official Derby Stallion2 visuals are a design reference, not a source of game meshes/textures.
- Four cuts: side start /2C close / elevated forward diagonal on first5 at3–4C / true side close on first5 in final straight. Camera continues tracking the winning group after the line; all horses keep moving.
- Leftmost tracker number is the leader. Winning number gets a gold accent.
- Original illustrated announcer and Japanese text commentary. Reads visible order, gap and course section; captions held for readability. Winner appears only on actual crossing. This is text commentary, not synthesized audio.
- Only visual spacing changed to suit metre scale; forecast core, runner inputs, sampled finishing order and RNG unchanged.

## Sources inspected

JRA course data and plan/profile: https://www.jra.go.jp/facilities/race/kyoto/course/
JRA plan/profile image reproduced at https://note.com/keiba_kochan/n/nb0216bb89016 (official image endpoint returned403 in the authoring environment).
JSS manufacturer history and JSS40 photographs: https://j-s-s.jp/history.html
Official latest Derby Stallion2 cel-look race screen: https://www.gameaddict.co.jp/derbystallion2/

## Verification

`node race-engine/tests/smoke.mjs`: six race configurations with deterministic5000-draw checks, metric length and goal offset, rise/descent, four-cut geometry, left order, data-driven commentary, uninterrupted runout.
GitHub Actions browser release gate: 390×844,320×568,430×932,1280×800; actual WebGL, screenshots, goal behind horses, no gate at finish, active limb animation, pause/resume/reset, correct results. Publication follows passing checks.
