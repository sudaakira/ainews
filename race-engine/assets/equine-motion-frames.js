/**
 * Twelve 2D anatomical poses measured from Muybridge gallop photographs by
 * Eddy Boxerman, UBC (2002). Reference measurements, not copied footage.
 * https://www.hemispheregames.com/eddybox_cs_ubc/projects/533B/angles.txt
 * Angles are segment-relative, radians, starting from the +Z / horizontal
 * direction: [neck, head, LF(4), RF(4), LH(4), RH(4)].
 * Circular sequence rotated to begin with the first hindlimb strike.
 */
const PHOTO_ROWS = [
 [2.3562,1.51844,-1.483533,-.15708,-.191987,-.541053,-1.850053,-.855213,.41888,.453787,-1.343907,.750493,-.191987,.872667,-1.343907,.401427,-.47124,-.750493],
 [2.321293,1.535893,-1.291547,-.05236,-.226893,-.89012,-1.710427,-.715587,-.069813,.087267,-1.553347,1.291547,-.541053,1.0472,-1.291547,.401427,-.191987,-.47124],
 [2.14676,1.658067,-1.291547,.139627,-.087267,-.89012,-1.850053,-.296707,-.122173,0,-1.78024,1.640613,-1.064653,.99484,-1.431173,.41888,-.05236,.99484],
 [2.216573,1.588253,-1.25664,.244347,.296707,.226893,-1.500987,-.139627,-.226893,-.83776,-1.692973,1.36136,-.855213,1.134467,-1.867507,1.658067,-1.378813,1.15192],
 [2.181667,1.588253,-1.25664,-.122173,1.239187,.593413,-1.25664,-.034907,-.174533,-1.0472,-2.007133,1.640613,-1.815147,1.15192,-1.815147,1.710427,-1.431173,1.274093],
 [1.972227,1.797693,-1.291547,-.663227,1.710427,.645773,-1.291547,.191987,.017453,.017453,-2.111853,1.20428,-1.5708,.89012,-1.902413,1.640613,-1.88496,1.291547],
 [1.972227,1.72788,-1.291547,-1.343907,1.93732,.855213,-1.326453,-.122173,.907573,.57596,-2.007133,.488693,-1.09956,.820307,-2.007133,1.343907,-1.78024,1.309],
 [2.111853,1.658067,-1.5708,-1.51844,1.815147,.750493,-1.378813,-.453787,1.640613,.541053,-2.024587,.36652,-.715587,.349067,-2.25148,1.117013,-1.67552,.959933],
 [2.111853,1.745333,-1.640613,-1.483533,1.25664,.7854,-1.396267,-1.117013,2.14676,1.082107,-1.88496,.174533,-.436333,-.069813,-2.321293,.645773,-1.082107,.488693],
 [2.286387,1.605707,-1.72788,-1.082107,.610867,.506147,-1.605707,-1.291547,1.815147,1.15192,-1.5708,.558507,-.83776,.10472,-2.0944,.174533,-.57596,.20944],
 [2.548187,1.51844,-1.553347,-.7854,0,.05236,-1.745333,-1.326453,1.692973,.68068,-1.343907,.698133,-.767947,-.698133,-2.007133,.558507,-.62832,-.349067],
 [2.635453,1.378813,-1.67552,-.244347,-.122173,-.331613,-1.67552,-1.326453,1.36136,.488693,-1.117013,.436333,-.31416,-.087267,-1.692973,.750493,-.959933,-.645773]
];
export const EQUINE_FRAMES=Object.freeze([...PHOTO_ROWS.slice(8),...PHOTO_ROWS.slice(0,8)].map(row=>Object.freeze(row)));
export const EQUINE_BONE_LENGTHS=Object.freeze({
 front:Object.freeze([.440,.434,.287,.130]),
 hind:Object.freeze([.460,.434,.353,.135])
});
/** Cubic periodic interpolation with derivative continuity through loop seam. */
export function sampleEquineFrame(phase,lead='right'){
 const p=((phase%1)+1)%1,at=p*EQUINE_FRAMES.length,i=Math.floor(at);
 const t=at-i,t2=t*t,t3=t2*t,n=EQUINE_FRAMES.length;
 const prev=EQUINE_FRAMES[(i+n-1)%n],a=EQUINE_FRAMES[i],b=EQUINE_FRAMES[(i+1)%n],next=EQUINE_FRAMES[(i+2)%n];
 const result=a.map((v,k)=>.5*((2*v)+(-prev[k]+b[k])*t+
 (2*prev[k]-5*v+4*b[k]-next[k])*t2+
 (-prev[k]+3*v-3*b[k]+next[k])*t3));
 // Recorded poses are one lead. Mirror by exchanging left and right joints,
 // without changing sign of sagittal-plane angles.
 if(lead==='left')for(const [x,y] of [[2,6],[10,14]])for(let k=0;k<4;k++){
  [result[x+k],result[y+k]]=[result[y+k],result[x+k]];
 }
 return result;
}
/** 2D hoof endpoint, useful for ground clearance and automated audits. */
export function hoofEndpoint(angles,lengths,y,z){
 let sum=0;
 for(let i=0;i<4;i++){
  sum+=angles[i];
  z+=lengths[i]*Math.cos(sum);
  y+=lengths[i]*Math.sin(sum);
 }
 return {y,z};
}
