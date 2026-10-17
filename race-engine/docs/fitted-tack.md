# Photo-guided racing saddle and saddlecloth

The saddlecloth is fitted to the barrel behind the shoulder, with its rear edge before the hip. The user's supplied side photograph is the placement reference: a small black racing saddle above the cloth, a large white number behind the boot, and the horse name along the lower rear part. The photograph is not redistributed.

`assets/racing-tack.js` samples the CC0 horse surface in its reference pose. The cloth spans z=+0.52 to −0.33 m; its reference hem is level at y=1.16 m. Its weights use only torso/back bones. The source coat's lower flank contains substantial thigh weights; copying those into a cloth stretches and folds the number when the hind leg comes forward. A hanging saddlecloth must move independently of that thigh.

A vertex-shader contact pass keeps the cloth outside moving upper-thigh capsules (0.19 m hip radius tapering to 0.155 m at the knee, plus 14 mm clearance). It runs on the GPU for every runner; the geometry remains shared. Inspection/raycast queries apply the same displacement. This is a lightweight contact approximation, not a fabric simulation. The lower hem has outward ease; it is not required to lie against every coat vertex.

The compact black racing saddle has a 0.48 m seat from z=0 to +0.48 m, raised pommel/cantle, short flaps, piping, girth and stirrup leathers. Its seat and bars are 0.18 m farther forward than the previous fit; the cloth moves forward 0.09 m to remain centered on the barrel. The stirrup bars lie at z=+0.36 m near the withers. Feet use the actual deformed forward bar position, rather than a rearward offset from the saddle center. This places the feet about 0.37 m ahead of the old position, folds the knees forward, and brings the jockey over the neck base. Rider and leather anchors use the actual deformed seat/flap vertices. The cloth is burgundy with white text, like the photograph. Both sides read normally, with the number and name behind the boot/girth. The floating horse-name cards and their connector arrows are removed from the renderer; the bottom running-order strip and commentary remain.

The number is centered above the name on the exposed side panel, with the forward saddle/boot area excluded from that print panel. The font increases from 280 px to 400 px (about 1.43×). Two-digit numbers have a 640 px width allowance instead of the previous 380 px squeeze. Both atlas halves use the same physical placement and ordinary reading direction.

Primary references examined:

- User-supplied side photograph of number 7, モンローウォーク: cloth/saddle/boot placement, proportions and lettering.
- JRA saddlecloth definition: https://www.jra.go.jp/kouza/yougo/w575.html — cloth worn under the saddle, printed horse number and name.
- JRA Facilities, racing saddlecloth production and finished examples: https://www.jra-f.co.jp/services/decken . Reference only; no photographs are redistributed.
- JRA Ritto training-centre brochure: https://www.jra.go.jp/facilities/tc/rittou/intro/pdf/pamphlet.pdf?version=2025 — racing saddles are smaller and lighter than general riding saddles.
- British Horse Society saddle fit: https://www.bhs.org.uk/horse-care-and-welfare/features/saddle-fit . Position relative to withers/shoulder and back.

Verification renders both sides, oblique and front views, both leads and six moving poses in the shared `gait-lab.html` module. The supplied number/name and a two-digit number with a long Japanese name are inspected separately. The browser gate verifies all mobile/desktop viewports, no floating name/arrow layer, torso-only cloth weights and contact clearance, plus the existing gait, camera, finishing order and run-out checks. Numerical checks supplement visual inspection. The post-deploy workflow captures the actual public URL for visual review.
