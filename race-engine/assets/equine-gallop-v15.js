/**
 * Independent anatomical gallop controller — v15.
 * Four contacts in a transverse gallop; one flight interval.
 * Coordinates are sagittal (forward +Z, up +Y), never lateral paddling.
 * Independent staged hoof trajectories, haunch->stifle->hock and
 * shoulder->elbow->carpus. No circular leg swing or rotating stick chains.
 * Visual motion only. Does not touch race progression, RNG or result.
 *
 * Visual references:
 * https://motionzoo.net/horse-gallop-reference/
 * Muybridge, Animals in Motion — galloping horse.
 */
export const STRIKES=Object.freeze([
 Object.freeze({front:false,leading:false,start:0}),
 Object.freeze({front:false,leading:true,start:.16}),
 Object.freeze({front:true,leading:false,start:.33}),
 Object.freeze({front:true,leading:true,start:.49})
]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const TAU=2*Math.PI;
export const HOOF_SOLE=.055;
export const ANATOMY=Object.freeze({
 fore:Object.freeze({pivotY:1.34,pivotZ:.48,stance:.19}),
 hind:Object.freeze({pivotY:1.37,pivotZ:-.69,stance:.19})
});
export const SEGMENT_NAMES=Object.freeze({
 fore:Object.freeze(['shoulder-elbow','elbow-carpus','carpus-fetlock','pastern-hoof']),
 hind:Object.freeze(['hip-stifle','stifle-hock','hock-fetlock','pastern-hoof'])
});
function pointsFor(front,relative){
 const a=front?ANATOMY.fore:ANATOMY.hind;
 const contact=relative<a.stance;
 let dz,hoofY,roll=0;
 if(contact){
  // Turf stance: the planted hoof moves BACKWARDS relative to the moving torso.
  const u=smooth(relative/a.stance);
  dz=mix(.53,-.45,u);
  hoofY=HOOF_SOLE;
  roll=u;
 }else{
  // Early fold, tucked aerial recovery, reaching fore/underbody late.
  const u=smooth((relative-a.stance)/(1-a.stance));
  dz=mix(-.45,.53,smooth(u));
  hoofY=HOOF_SOLE+.68*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.70);
 }
 const hoofZ=a.pivotZ+dz;
 const pivot={y:a.pivotY,z:a.pivotZ};
 const fetlock={y:hoofY+.125,z:hoofZ+(front?-.018:.018)};
 const hoof={y:hoofY,z:hoofZ};
 let mid1,mid2;
 if(front){
  // Elbow stays below the shoulder; carpus comes under the chest in recovery.
  mid1={y:.99+.027*Math.sin(relative*TAU),z:a.pivotZ-.085+dz*.14};
  mid2={
   y:.58+(hoofY-HOOF_SOLE)*.55,
   z:hoofZ-.085+(contact?0:.11*Math.sin(Math.PI*smooth((relative-a.stance)/(1-a.stance))))
  };
 }else{
  // Hind stifle FORWARD, hock BACK: the characteristic horse Z profile.
  mid1={y:1.06,z:a.pivotZ+.25+.07*Math.sin(relative*TAU)};
  mid2={
   y:.69+(hoofY-HOOF_SOLE)*.30,
   z:clamp(hoofZ-.22,-1.04,-.52)
  };
 }
 return {points:[pivot,mid1,mid2,fetlock,hoof],contact,stage:relative,kind:front?'fore':'hind',roll};
}
/**
 * A rigid-body-compatible set of world-local anatomical points per limb.
 * Leg order is [left fore, right fore, left hind, right hind].
 * The lead only swaps temporal contacts; positions remain left/right offset.
 */
export function sampleHorseGallop(phase,lead='right'){
 const t=((phase%1)+1)%1,leadingSide=lead==='left'?-1:1;
 return [true,false].flatMap(front=>[-1,1].map(side=>{
  const isLead=side===leadingSide;
  const strike=STRIKES.find(b=>b.front===front&&b.leading===isLead);
  const relative=((t-strike.start)%1+1)%1;
  const leg=pointsFor(front,relative);
  return {...leg,side,leading:isLead,start:strike.start};
 }));
}
export function validateGallopSample(phase,lead='right'){
 const legs=sampleHorseGallop(phase,lead);
 const floorContacts=legs.filter(l=>l.contact);
 return {
  phase:((phase%1)+1)%1,lead,
  contacts:floorContacts.map(l=>(l.kind==='fore'?'F':'H')+(l.side===-1?'L':'R')),
  suspension:floorContacts.length===0,
  minFoot:Math.min(...legs.map(l=>l.points[4].y)),
  leftRightDistinct:Math.abs(legs[0].points[4].z-legs[1].points[4].z)+
    Math.abs(legs[2].points[4].z-legs[3].points[4].z)
 };
}
