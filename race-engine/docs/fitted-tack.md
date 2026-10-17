# Fitted racing saddle and saddlecloth

The previous number cloth was a pair of flat planes at x=±0.39 m. It floated outside the narrower barrel. The saddle was a thin ellipsoid attached to a bone offset; measurements of the actual skinned back showed it was buried inside the horse. Increasing the texture resolution did not correct either placement.

`assets/racing-tack.js` samples the actual weighted torso mesh once during preload. The continuous left/right saddlecloth follows its back and flanks; the seat, raised pommel/cantle, short racing flaps, piping and encircling girth are separate visible geometry. All inherit barycentrically interpolated skin weights from the supporting torso. The cloth has approximately 13 mm rendering clearance to avoid intersecting the coarse polygonal coat; it is a fitted surface approximation, not a cloth-physics simulation. The rider's local seat frame is taken from an actual deformed saddle vertex each pose, rather than a guessed offset above a torso bone.

The texture uses separate left/right atlas regions. Both read normally; numbers occupy the rear part of each side behind the jockey's boot. The spine fold has no artificial border. Main race trajectory, prediction, finish order, gait and broadcast camera logic are unchanged.

Primary references examined:

- JRA saddlecloth definition: https://www.jra.go.jp/kouza/yougo/w575.html — cloth worn under the saddle, printed horse number and name.
- JRA Facilities, racing saddlecloth production and finished examples: https://www.jra-f.co.jp/services/decken . Reference only; no photographs are redistributed.
- JRA Ritto training-centre brochure: https://www.jra.go.jp/facilities/tc/rittou/intro/pdf/pamphlet.pdf?version=2025 — racing saddles are smaller and lighter than general riding saddles.
- British Horse Society saddle fit: https://www.bhs.org.uk/horse-care-and-welfare/features/saddle-fit . Position relative to withers/shoulder and back, no visible panel gap.

Visual verification uses the same horse/tack module in `gait-lab.html`, including the opposite side, oblique/front views, both leads and moving poses. A two-digit number and long Japanese name are also rendered on both sides. Browser checks sample actual deformed cloth-to-body clearance and verify that the rider frame coincides with the rendered seat. These supplement visual inspection; numeric checks alone do not certify the appearance. The public-page workflow captures the actual deployed URL after Pages deployment.
