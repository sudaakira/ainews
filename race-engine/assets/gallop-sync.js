/**
 * Gallop ground-speed synchronisation and secondary motion (v20).
 *
 * Why this exists: the v19 sprint clip was authored at one ground speed.
 * Playing it at a fixed cadence while the simulated horse moves slower or
 * faster makes the stance hooves slide over the turf ("skating"). The
 * clip's own foot samples let us recover the speed it was authored for:
 *
 *   stance-foot ground speed in sprint-motion-v19.json (y near minimum,
 *   z travelled over the stance samples, metres after the clip scale):
 *     FL ≈ 17.3 m/s, FR ≈ 16.8 m/s, HL ≈ 16.1 m/s  (mean ≈ 16.7 m/s)
 *   clip duration 0.42 s  →  authored cadence ≈ 2.381 strides/s
 *   authored stride length ≈ 16.7 / 2.381 ≈ 7.03 m
 *
 * Keeping stride length constant and deriving cadence from the actual
 * ground speed (cadence = speed / strideLength) makes the stance hoof's
 * backward speed match the ground at every speed, not only near 17 m/s.
 * A real gallop stride does lengthen somewhat with speed; the residual
 * error of the constant-stride approximation stays within a few percent
 * across racing speeds and is far smaller than the old fixed-cadence
 * skating at low speed. Pure presentation: no race RNG or order imports.
 */
export const GALLOP_SYNC=Object.freeze({
 clipDuration:.42,
 authoredCadence:1/.42,
 authoredGroundSpeed:16.74,
 authoredStrideLength:7.03,
 flightStart:.78,
 minCadence:1.30,
 maxCadence:2.78
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TAU=Math.PI*2;
/** Strides per second for a horse covering the ground at speedMps. */
export function strideCadence(speedMps){
 const v=Number.isFinite(speedMps)&&speedMps>0?speedMps:GALLOP_SYNC.authoredGroundSpeed;
 return clamp(v/GALLOP_SYNC.authoredStrideLength,GALLOP_SYNC.minCadence,GALLOP_SYNC.maxCadence);
}
/** Implied stance-hoof speed of the clip at a given cadence (for audits). */
export function clipFootSpeed(cadence){return cadence*GALLOP_SYNC.authoredStrideLength}
/**
 * Secondary motion derived from the stride phase. Amplitudes are in
 * metres (bob) and radians (pitch / headNod / tailSway); drive is a
 * 0..1 rider-push pulse. The body rises into the gathered suspension
 * (clip flight interval .78–1.00) and settles over the hind stance;
 * the head counter-nods against the pitch, the tail streams with a
 * lagged sway, and the rider's push peaks as the horse extends.
 */
export function secondaryMotion(phase){
 const p=((phase%1)+1)%1;
 const bob=.030*Math.sin(TAU*(p-.60))+.008*Math.sin(2*TAU*(p-.60));
 const pitch=.021*Math.sin(TAU*(p-.47))+.006*Math.sin(2*TAU*(p-.30));
 const headNod=.052*Math.sin(TAU*(p-.74));
 const tailSway=.11*Math.sin(TAU*(p-.28));
 const tailSwayLag=.13*Math.sin(TAU*(p-.36));
 const drive=Math.pow(Math.max(0,Math.sin(TAU*(p-.83))),2);
 return {bob,pitch,headNod,tailSway,tailSwayLag,drive};
}
