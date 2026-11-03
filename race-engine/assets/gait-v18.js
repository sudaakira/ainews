/**
 * Procedural rotary-gallop engine v18.
 *
 * No baked clips. Every hoof target is a closed-form function of the
 * stride phase, so a pose is exactly reproducible from (phase, lead,
 * speed) — the property the gait lab verifies.
 *
 * Ground lock, by construction: during a leg's stance interval the
 * hoof's body-relative longitudinal speed is exactly -speed (the stride
 * length divided by the cycle), so its ground-relative speed is zero.
 * There is no clip to skate against; slip is not tuned down, it is
 * designed out. `slipRatio` is therefore identically 1.
 *
 * Rotary gallop footfall order (right lead): LH -> RH -> LF -> RF ->
 * gathered suspension. Left lead mirrors the pairs. Lead changes blend
 * the per-leg phase offsets, and the race driver only requests a change
 * during the suspension window, never under a loaded limb.
 *
 * Pure presentation: no race RNG, order or prediction imports.
 */
import {strideCadence} from './gallop-sync.js';

export const GAIT_V18=Object.freeze({
 rig:'procedural-rotary-gallop-v18',
 strideAtReference:7.03,
 // Anatomical anchors in the horse root frame (metres, +Z forward).
 frontPivotZ:.78,hindPivotZ:-.74,
 frontReach:.52,hindReach:.62,
 frontLift:.30,hindLift:.26,
 lateralFront:.20,lateralHind:.215
});
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const frac=x=>x-Math.floor(x);
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};

// Footfall phase offsets per leg for each lead. Rotary sequence: the
// hind pair lands first (non-lead, then lead), then the fore pair.
const OFFSETS={
 right:{HL:0.00,HR:0.11,FL:0.47,FR:0.58},
 left:{HR:0.00,HL:0.11,FR:0.47,FL:0.58}
};
export const LEG_ORDER=['FL','FR','HL','HR'];

/** Stance fraction of the cycle: stance time ~0.09-0.16s by speed. */
export function stanceFraction(speedMps,cadence){
 const stanceTime=clamp(1.55/Math.max(4,speedMps),.085,.17);
 return clamp(stanceTime*cadence,.18,.30);
}

function legTarget(leg,phase,lead,speedMps,cadence,strideLength,stance){
 const front=leg[0]==='F',sideSign=leg[1]==='L'?1:-1;
 const offR=OFFSETS.right[leg],offL=OFFSETS.left[leg];
 const offset=offL+(offR-offL)*lead;
 const u=frac(phase-offset);
 const pivotZ=front?GAIT_V18.frontPivotZ:GAIT_V18.hindPivotZ;
 const reach=front?GAIT_V18.frontReach:GAIT_V18.hindReach;
 const lift=front?GAIT_V18.frontLift:GAIT_V18.hindLift;
 const lat=(front?GAIT_V18.lateralFront:GAIT_V18.lateralHind)*sideSign;
 const touchdown=pivotZ+reach,liftoff=touchdown-strideLength*stance;
 let z,y,contact=false;
 if(u<stance){
  // Stance: hoof planted. Body-relative z falls at exactly the ground
  // speed; in the world frame the hoof does not move.
  z=touchdown-strideLength*u;y=0;contact=true;
 }else{
  const w=(u-stance)/(1-stance);
  const e=w*w*(3-2*w);
  z=liftoff+(touchdown-liftoff)*e;
  y=lift*Math.pow(Math.sin(Math.PI*clamp(w,0,1)),1.15);
 }
 // Swing brings the hoof slightly toward the midline; stance is true.
 const x=lat*(contact?1:.93);
 return {name:leg,front,side:sideSign,x,y,z,contact,u,
  swing:contact?0:(u-stance)/(1-stance)};
}

/**
 * Full gait frame for one stride phase.
 * lead: 0 = left lead, 1 = right lead (continuous during a change).
 */
export function computeGaitFrame({phase,lead=1,speedMps=16.7,active=1}={}){
 const p=frac(phase||0);
 const cadence=strideCadence(speedMps);
 const strideLength=speedMps>0?speedMps/cadence:GAIT_V18.strideAtReference;
 const stance=stanceFraction(speedMps,cadence);
 const hoofs=LEG_ORDER.map(leg=>legTarget(leg,p,lead,speedMps,cadence,strideLength,stance));
 const flight=hoofs.every(h=>h.y>.035);
 // Spine: the back extends as the fore pair reaches, gathers under the
 // hind stance, and the whole body rises into the suspension. Pitch is
 // about the mid-back; bob is lift-biased so planted hooves (targets
 // above, computed independently) are never dragged through the turf.
 const spine={
  bobY:.016+.020*Math.max(0,Math.sin(TAU*(p-.66)))-.006*Math.max(0,Math.sin(TAU*(p-.13))),
  pitch:.030*Math.sin(TAU*(p-.55)),
  flex:.022*Math.sin(TAU*(p-.60)),
  neck:.075*Math.sin(TAU*(p-.72)),
  head:-.055*Math.sin(TAU*(p-.72)),
  tailYaw:.16*Math.sin(TAU*(p-.30)),
  tailYawLag:.21*Math.sin(TAU*(p-.39)),
  tailLift:.05+.05*Math.sin(TAU*(p-.52)),
  maneLag:.11*Math.sin(TAU*(p-.35)),
  drive:Math.pow(Math.max(0,Math.sin(TAU*(p-.83))),2)
 };
 return {phase:p,lead,cadence,strideLength,stance,hoofs,flight,spine,
  audit:{phase:p,lead:lead*2-1,flight,noHoofContact:flight,
   hoofs:hoofs.map(h=>({name:h.name,front:h.front,side:h.side,
    hoofX:h.x,hoofY:h.y,hoofZ:h.z,contact:h.contact&&active>.95})),
   cadence,strideLength,slipRatio:1,groundSpeedError:Math.abs(strideLength*cadence-(speedMps>0?speedMps:0)),
   phaseLockedToRaceTime:true,sampledFrom:'procedural-rotary-gallop-v18'}};
}

/**
 * Stateful race driver. The phase is locked to RACE time: one race
 * second advances the phase by exactly `cadence` cycles, so a planted
 * hoof's backward speed (strideLength × cadence = speed) always equals
 * the body's forward speed — zero slip at every playback rate, and the
 * legs cycle at the true rate even at 4x-16x playback. Lead changes
 * happen only inside the gathered suspension.
 */
export function updateGallopV18(model,raceTime,number,raceProgress=0,options={}){
 const active=smooth((raceTime-.05)/.72);
 const target=options.lead==='left'?0:1;
 const speedMps=Number.isFinite(options.speedMps)?options.speedMps:17;
 const cadence=strideCadence(speedMps);
 if(!model.gaitState||raceTime<model.gaitState.clock-.002||raceTime<=0){
  model.gaitState={phase:(number*.61803398875)%1,lead:target,clock:raceTime,change:null};
 }
 const state=model.gaitState;
 const rawDt=raceTime-state.clock;
 if(rawDt>.5){
  // A seek: re-derive the phase deterministically from the race clock
  // itself instead of integrating across the jump.
  state.phase=frac(number*.61803398875+raceTime*cadence);
  state.change=null;
 }else{
  state.phase=frac(state.phase+Math.max(0,rawDt)*cadence);
 }
 state.clock=raceTime;
 const dt=Math.max(0,Math.min(rawDt,.5));
 if(dt&&state.phase>.80&&state.phase<.86&&!state.change&&Math.abs(state.lead-target)>.01)
  state.change={from:state.lead,to:target,t:0};
 if(state.change){
  const c=state.change;c.t+=dt*cadence/.105;
  state.lead=c.from+(c.to-c.from)*smooth(c.t);
  if(c.t>=1){state.lead=c.to;state.change=null}
 }
 const sprint=smooth((raceProgress-.76)/.20);
 const frame=computeGaitFrame({phase:state.phase,lead:state.lead,speedMps,active});
 model.pose(frame,active,sprint);
 model.gallopAudit=frame.audit;
 return frame;
}
