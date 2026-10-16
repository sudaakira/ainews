/**
 * Pure cinematic photo-finish playback (not a betting/finish-order engine).
 * When the original runRace() concludes, celebrate its already decided
 * LIVE.rank by briefly stopping the frame at each of the three crossings.
 * At 16x those three arrivals would be otherwise visually simultaneous.
 * Times below are PRESENTATION times only — not claims of actual margins.
 */
export const PHOTO_PHASES=Object.freeze([
 Object.freeze({id:'first',start:0,end:.36,place:1,hold:true}),
 Object.freeze({id:'approach-second',start:.36,end:.73,place:2,hold:false}),
 Object.freeze({id:'second',start:.73,end:1.08,place:2,hold:true}),
 Object.freeze({id:'approach-third',start:1.08,end:1.48,place:3,hold:false}),
 Object.freeze({id:'third',start:1.48,end:1.84,place:3,hold:true}),
 Object.freeze({id:'result',start:1.84,end:Infinity,place:null,hold:false})
]);
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
export function photoPhase(elapsed){
 const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
 return PHOTO_PHASES.find(x=>t<x.end)||PHOTO_PHASES.at(-1);
}
export function photoHorseProgress(no,baseProgress,rank,elapsed){
 const place=rank.indexOf(no)+1;
 if(place<1||place>3)return baseProgress;
 if(place===1)return 1;
 const start=place===2?.36:1.08, end=place===2?.73:1.48;
 const t=cap((elapsed-start)/(end-start),0,1);
 const eased=t*t*(3-2*t);
 return Math.min(1,baseProgress+(1-baseProgress)*eased);
}
export function photoVisualTime(elapsed){
 // Holds are truly frozen even if 16x playback was chosen.
 let t=0;
 for(const phase of PHOTO_PHASES){
  if(phase.id==='result')break;
  if(phase.hold)continue;
  t+=Math.max(0,Math.min(elapsed,phase.end)-phase.start);
 }
 return t;
}
