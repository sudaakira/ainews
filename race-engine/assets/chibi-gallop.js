/**
 * Equine transverse gallop v14.
 * Joint-driven animation from 12 photographic key poses of a running horse,
 * rather than arbitrary circular IK hoof targets.
 * Measurements: https://www.hemispheregames.com/eddybox_cs_ubc/projects/533B/angles.txt
 * Camera reference: https://motionzoo.net/horse-gallop-reference/
 * No simulation order, horse speed, probability or race state is modified.
 */
import {sampleEquineFrame,hoofEndpoint,EQUINE_BONE_LENGTHS} from './equine-motion-frames.js';
export const GALLOP_BEATS=Object.freeze([
 {limb:'hind',lead:false,start:0},
 {limb:'hind',lead:true,start:2/12},
 {limb:'front',lead:false,start:4/12},
 {limb:'front',lead:true,start:7/12}
]);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
/** Diagnostic: real measured 4-joint pose and hoof clearance at any phase. */
export function sampleGallop(phase,lead=1){
 const p=sampleEquineFrame(phase,lead===-1?'left':'right');
 return [2,6,10,14].map((offset,i)=>{
  const front=i<2,angles=p.slice(offset,offset+4);
  const pos=hoofEndpoint(angles,front?EQUINE_BONE_LENGTHS.front:EQUINE_BONE_LENGTHS.hind,
    front?1.24:1.27,front?.38:-.66);
  return {front,side:i%2?1:-1,angles,hoofY:pos.y,hoofZ:pos.z};
 });
}
export function updateGallop(model,raceTime,visualTime,number,raceProgress=0,options={}){
 const active=smooth((raceTime-.08)/.85);
 const speed=Number.isFinite(options.speedMps)?options.speedMps:14;
 const cadence=clamp(speed/5.3,1.85,2.75);
 const targetLead=options.lead==='left'?-1:1;
 if(!model.gaitState||visualTime<model.gaitState.time-.001||raceTime<=0){
  model.gaitState={phase:(number*.61803398875)%1,time:visualTime,lead:targetLead};
 }
 const state=model.gaitState;
 const dt=clamp(Number.isFinite(options.frameDt)?
   (options.playing?options.frameDt:0):visualTime-state.time,0,.050);
 state.phase=(state.phase+dt*cadence)%1;
 state.time=visualTime;
 state.lead=lerp(state.lead,targetLead,smooth(dt*3));
 const right=sampleEquineFrame(state.phase,'right');
 const left=sampleEquineFrame(state.phase,'left');
 const blend=(state.lead+1)*.5;
 const pose=right.map((v,i)=>lerp(left[i],v,blend));
 const hoofs=[];
 for(let i=0;i<4;i++){
  const leg=model.legs[i],k=i===0?2:i===1?6:i===2?10:14;
  const angles=pose.slice(k,k+4);
  if(!leg.joints||leg.joints.length!==4){
   throw Error('Four-segment equine rig missing for horse '+number);
  }
  // Angles in the measured dataset are relative to the previous segment,
  // positive toward +Y from the +Z horizontal.
  for(let j=0;j<4;j++){
   leg.joints[j].rotation.x=-(j===0?lerp(-Math.PI/2,angles[j],active):angles[j]*active);
   leg.joints[j].rotation.y=0;
   leg.joints[j].rotation.z=0; // no lateral scuttling / crab-walk
  }
  const foot=hoofEndpoint(angles,leg.segmentLengths,leg.pivot.position.y,leg.pivot.position.z);
  hoofs.push({...foot,front:leg.front,side:leg.side,angles});
 }
 // The torso of a thoroughbred is relatively stiff (not cheetah flexion).
 // Track grounding comes from the measured foot heights; during the collected
 // suspension the lowest hoof is allowed to stay above the ground.
 const minFoot=Math.min(...hoofs.map(f=>f.y));
 const support=Math.min(.065,minFoot);
 const rootCompensation=-.085-support;
 const gallopPitch=.020*Math.cos(TAU*(state.phase-.13));
 const suspension=smooth((state.phase-.74)/.07)*(1-smooth((state.phase-.96)/.04));
 model.anim.position.y=lerp(0,rootCompensation+.022*suspension,active);
 model.anim.rotation.set(gallopPitch*active,0,0);
 model.headRig.rotation.x=active*(.040*Math.sin(TAU*(state.phase-.30))-.035*(pose[0]-2.25));
 model.headRig.position.y=2.03+.011*active*Math.cos(TAU*(state.phase-.20));
 model.headRig.rotation.z=0;
 model.tailRig.rotation.x=active*(.10*Math.sin(TAU*state.phase-1.1)-.04);
 model.tailRig.rotation.z=active*.04*Math.sin(TAU*state.phase+.4);
 model.maneStrands?.forEach(({rig,phase:lag})=>{
  rig.rotation.x=active*.07*Math.sin(TAU*state.phase-.8-lag);
  rig.rotation.z=0;
 });
 model.tailStrands?.forEach(({rig,phase:lag})=>{
  rig.rotation.x=active*.10*Math.sin(TAU*state.phase-1.0-lag);
  rig.rotation.z=active*.06*Math.sin(TAU*state.phase-lag);
 });
 model.ears?.forEach(({rig,side})=>{rig.rotation.x=active*.018*Math.sin(TAU*state.phase+.5);rig.rotation.z=-side*.07});
 if(model.rider){
  model.rider.position.y=-.40*model.anim.position.y+active*.008*Math.sin(TAU*state.phase+.2);
  model.rider.rotation.x=-.7*model.anim.rotation.x-.015*active;
  model.rider.rotation.z=0;
 }
 if(model.shadow){model.shadow.material.opacity=.22-.075*suspension;model.shadow.scale.x=.46-.022*suspension}
 model.gallopAudit={
  phase:state.phase,lead:state.lead,cadence,flight:suspension,
  hoofs:hoofs.map((f,i)=>({
   side:f.side,front:f.front,hip:-f.angles[0],knee:-f.angles[1],
   jointAngles:f.angles,hoofY:f.y+model.anim.position.y+.12,
   hoofZ:f.z
  })),
  sampledFrom:'measured-muybridge-12-frames',bodyPitch:model.anim.rotation.x
 };
}
