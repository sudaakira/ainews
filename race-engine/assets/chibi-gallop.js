/** v15 sagittal horse gallop, not rotating stick legs. Pure render. */
import {sampleHorseGallop,STRIKES,HOOF_SOLE} from './equine-gallop-v15.js';
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
export const GALLOP_BEATS=STRIKES;
const STANDING_FORE=[
 {y:1.34,z:.48},{y:.99,z:.43},{y:.59,z:.49},{y:.18,z:.53},{y:HOOF_SOLE,z:.57}
];
const STANDING_HIND=[
 {y:1.37,z:-.69},{y:1.06,z:-.44},{y:.69,z:-.93},
 {y:.18,z:-.79},{y:HOOF_SOLE,z:-.77}
];
export function sampleGallop(phase,lead=1){
 return sampleHorseGallop(phase,lead===-1?'left':'right');
}
/**
 * The renderer passes wall-clock frameDt (not accelerated race delta).
 * Always uses Y/Z sagittal points; X stays fixed per leg. No sideways paddling.
 */
export function updateGallop(model,raceTime,visualTime,number,raceProgress=0,options={}){
 const active=smooth((raceTime-.08)/.78);
 const targetLead=options.lead==='left'?-1:1;
 const mps=Number.isFinite(options.speedMps)?options.speedMps:14;
 const cadence=clamp(mps/6.55,1.70,2.65);
 if(!model.gaitState||visualTime<model.gaitState.time-.002||raceTime<=0){
  model.gaitState={phase:(number*.61803398875)%1,lead:targetLead,time:visualTime};
 }
 const state=model.gaitState;
 const dt=clamp(Number.isFinite(options.frameDt)?
   (options.playing?options.frameDt:0):visualTime-state.time,0,.05);
 state.time=visualTime;state.phase=(state.phase+dt*cadence)%1;
 state.lead=mix(state.lead,targetLead,smooth(dt*4.5));
 const right=sampleHorseGallop(state.phase,'right');
 const left=sampleHorseGallop(state.phase,'left');
 const rt=(state.lead+1)/2;
 const audit=[];
 for(let i=0;i<4;i++){
  const leg=model.legs[i],stand=leg.front?STANDING_FORE:STANDING_HIND;
  const points=right[i].points.map((p,k)=>({
    y:mix(stand[k].y,mix(left[i].points[k].y,p.y,rt),active),
    z:mix(stand[k].z,mix(left[i].points[k].z,p.z,rt),active)
  }));
  model.setLegPose(leg,points);
  const contact=(rt>.5?right:left)[i].contact&&active>.8;
  const first=points[0],second=points[1];
  audit.push({
    side:leg.side,front:leg.front,contact,
    hip:Math.atan2(second.z-first.z,first.y-second.y),
    knee:Math.atan2(points[2].z-second.z,second.y-points[2].y),
    hoofY:points[4].y,hoofZ:points[4].z,
    joints:points.map(q=>({y:q.y,z:q.z}))
  });
 }
 const noHoofContact=active>.95&&audit.every(x=>!x.contact);
 const flight=smooth((state.phase-.68)/.09)*(1-smooth((state.phase-.95)/.05));
 const sprint=smooth((raceProgress-.76)/.20);
 const pitch=active*(.045*Math.sin(TAU*(state.phase-.11))-.013*flight);
 model.anim.position.y=active*(-.125+.045*Math.sin(TAU*(state.phase+.16))+.07*flight);
 model.anim.rotation.set(pitch,0,0);
 model.headRig.rotation.x=active*(-.027*Math.sin(TAU*(state.phase-.23))-.023*flight);
 model.headRig.rotation.z=0;
 model.headRig.position.y=2.03+.014*active*Math.sin(TAU*(state.phase-.3));
 model.tailRig.rotation.x=active*(.10*Math.sin(TAU*state.phase-.83)-.04*sprint);
 model.tailRig.rotation.z=active*.046*Math.sin(TAU*state.phase+.20);
 model.maneStrands?.forEach(({rig,phase:lag})=>{
   rig.rotation.x=.065*active*Math.sin(TAU*state.phase-.82-lag);
   rig.rotation.z=0;
 });
 model.tailStrands?.forEach(({rig,phase:lag})=>{
   rig.rotation.x=.11*active*Math.sin(TAU*state.phase-1.0-lag);
   rig.rotation.z=.045*active*Math.sin(TAU*state.phase-lag);
 });
 model.ears?.forEach(({rig,side})=>{
   rig.rotation.z=-side*.07;
   rig.rotation.x=.025*active*Math.sin(TAU*state.phase-.6);
 });
 if(model.rider){
  model.rider.position.y=-model.anim.position.y*.48+.017*active*Math.sin(TAU*state.phase+.1);
  model.rider.rotation.x=-pitch*.68-.015*active;
  model.rider.rotation.z=0;
 }
 if(model.shadow){
  model.shadow.material.opacity=.23-.09*flight;
  model.shadow.scale.x=.47-.035*flight;
 }
 model.gallopAudit={
  phase:state.phase,lead:state.lead,flight,noHoofContact,cadence,
  hoofs:audit,beatOrder:STRIKES.map(x=>x.front?'F':'H'),
  sampledFrom:'v15-sagittal-anatomical-contacts'
 };
}
