/**
 * Racehorse transverse gallop: four-beat footfall followed by one suspension.
 * Forward is +Z. Left/right is the horse's own side (-1/+1).
 *
 * Reference: https://motionzoo.net/horse-gallop-reference/
 * Purely visual: never alters progress, race RNG, prediction or finish order.
 */
export const GALLOP_BEATS=Object.freeze([
 {limb:'hind',lead:false,start:0.00,duration:.19},
 {limb:'hind',lead:true, start:.15,duration:.19},
 {limb:'front',lead:false,start:.31,duration:.19},
 {limb:'front',lead:true, start:.47,duration:.19}
]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const TAU=2*Math.PI;

/** Hoof-centre trajectory in metres relative to the anatomical joint.
 * During stance the hoof stays at turf height while the body travels over it.
 * During recovery it lifts/folds; NO cartoon extended-leg airborne pose.
 */
export function hoofTrajectory(phase,beatIndex){
 const beat=GALLOP_BEATS[beatIndex];
 const elapsed=((phase-beat.start)%1+1)%1;
 if(elapsed<beat.duration){
  const u=elapsed/beat.duration;
  return {z:mix(.62,-.62,u),height:.052,contact:true,beatIndex};
 }
 const u=(elapsed-beat.duration)/(1-beat.duration);
 // Toe-off -> fast folding -> active forward swing -> foreleg reach.
 // Keyframed curve avoids the former long, near-synchronous sine-like recovery.
 const keys=[
  [0,-.62,.052],[.16,-.36,.42],[.39,.04,.72],
  [.62,.36,.55],[.82,.62,.28],[1,.62,.052]
 ];
 let k=0;while(k<keys.length-2&&u>keys[k+1][0])k++;
 const x=keys[k],y=keys[k+1],t=smooth((u-x[0])/(y[0]-x[0]));
 return {z:mix(x[1],y[1],t),height:mix(x[2],y[2],t),contact:false,beatIndex};
}

/** Continuous planar two-bone IK. All angles are about local X.
 * Returns physically reachable angles, not independently oscillating sticks.
 * "down" is the positive vertical distance from joint to hoof centre.
 */
export function solveLegIK(upper,lower,forward,down,isFront){
 const min=Math.abs(upper-lower)+.001,max=upper+lower-.001;
 const dist=clamp(Math.hypot(forward,down),min,max);
 const dir=Math.atan2(forward,down);
 const alpha=Math.acos(clamp((upper*upper+dist*dist-lower*lower)/(2*upper*dist),-1,1));
 const kneeDirection=isFront?1:-1; // carpus forward, hind hock backward
 const thighAngle=dir+kneeDirection*alpha;
 const jointZ=upper*Math.sin(thighAngle),jointDown=upper*Math.cos(thighAngle);
 const shinAngle=Math.atan2(forward*dist/Math.max(.0001,Math.hypot(forward,down))-jointZ,
                            down*dist/Math.max(.0001,Math.hypot(forward,down))-jointDown);
 return {hip:-thighAngle,knee:thighAngle-shinAngle,reach:dist};
}

/** Testable strike geometry for either lead. right=+1, left=-1. */
export function sampleGallop(phase,lead=1){
 const result=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const leading=side===lead;
  const beatIndex=front?(leading?3:2):(leading?1:0);
  result.push({...hoofTrajectory(phase,beatIndex),front,side,leading});
 }
 return result;
}

export function updateGallop(model,raceTime,visualTime,number,raceProgress=0,options={}){
 const active=smooth((raceTime-.09)/.74);
 const sprint=smooth((raceProgress-.77)/.18);
 const requestedLead=options.lead==='left'?-1:1;
 const speed=Number.isFinite(options.speedMps)?options.speedMps:15;
 const cadence=clamp(speed/7.4,1.70,2.45)*(1+.04*sprint);
 if(!model.gaitState||visualTime<model.gaitState.time-.001||raceTime<=0){
  model.gaitState={phase:((number*0.61803398875)%1+1)%1,time:visualTime,lead:requestedLead};
 }
 const state=model.gaitState;
 // The broadcast may run at 16x, but the horse should still visibly gallop
 // about two strides per wall-clock second; never multiply by playback rate.
 const elapsed=clamp(Number.isFinite(options.frameDt)
  ?(options.playing?options.frameDt:0):visualTime-state.time,0,.05);
 state.phase=(state.phase+elapsed*cadence)%1;
 state.time=visualTime;
 // Blend the limb timing across hand changes instead of popping on a new lead.
 state.lead=mix(state.lead,requestedLead,clamp(elapsed*3.0,0,1));
 const phase=state.phase;
 const flight=smooth((phase-.69)/.07)*(1-smooth((phase-.95)/.05));
 const bob=active*(.028*Math.cos(TAU*phase+.4)+.095*flight);
 const pitch=active*(.046*Math.sin(TAU*phase-1.0)-.023*flight);
 const roll=active*(.010*Math.sin(TAU*phase+.5)*state.lead);
 model.anim.position.y=bob;
 model.anim.rotation.set(pitch,0,roll);
 const left=sampleGallop(phase,-1),right=sampleGallop(phase,1);
 const rightWeight=(state.lead+1)/2;
 const stanceHeight=.052;
 for(let i=0;i<model.legs.length;i++){
  const leg=model.legs[i],a=left[i],b=right[i];
  const forward=mix(a.z,b.z,rightWeight);
  const lift=mix(a.height,b.height,rightWeight);
  const offset=leg.front?.09:-.08;
  const footZ=mix(offset,forward,active);
  const footY=mix(stanceHeight,lift,active);
  // Compensate pitch at the torso, and solve against track-relative ground.
  const localWorldY=footY-.12-bob;
  const localWorldZ=leg.pivot.position.z+footZ;
  const co=Math.cos(pitch),si=Math.sin(pitch);
  const targetY=localWorldY*co+localWorldZ*si;
  const targetZ=-localWorldY*si+localWorldZ*co;
  const down=leg.pivot.position.y-targetY;
  const dz=targetZ-leg.pivot.position.z;
  const solution=solveLegIK(leg.upper,leg.lower-.025,dz,down,leg.front);
  leg.pivot.rotation.set(solution.hip,0,0);
  leg.knee.rotation.set(solution.knee,0,0);
  // The foot follows the turf plane in stance rather than pitching with shin.
  if(leg.hoofRig){
   const stance=mix(a.contact?1:0,b.contact?1:0,rightWeight);
   const toe=(1-stance)*(.14+.12*sprint);
   leg.hoofRig.rotation.x=-solution.hip-solution.knee-pitch+toe;
  }
  // Narrow, anatomically plausible asymmetry in the frontal close-up.
  leg.pivot.rotation.z=active*.012*leg.side*Math.sin(TAU*phase+i*.7);
 }
 model.headRig.rotation.x=active*(-.022*Math.sin(TAU*phase-.72)+.014*flight);
 model.headRig.rotation.z=active*.007*Math.sin(TAU*phase+number*.14);
 model.headRig.position.y=2.03+active*.018*Math.sin(TAU*phase-1.25);
 model.tailRig.rotation.x=active*(.10*Math.sin(TAU*phase-1.0)-.08*sprint);
 model.tailRig.rotation.z=active*.075*Math.sin(TAU*phase*.7+number*.31);
 model.ears?.forEach((ear,i)=>{
  ear.rig.rotation.x=active*.05*Math.sin(TAU*phase-1.8+i*.6);
  ear.rig.rotation.z=-ear.side*.12+active*ear.side*.035*Math.sin(TAU*phase+.3);
 });
 model.maneStrands?.forEach(({rig,phase:lag},i)=>{
  rig.rotation.x=active*(.12*Math.sin(TAU*phase-.9-lag)-.06*sprint);
  rig.rotation.z=active*.05*Math.sin(TAU*phase-.6-lag+i*.2);
 });
 model.tailStrands?.forEach(({rig,phase:lag},i)=>{
  rig.rotation.x=active*(.13*Math.sin(TAU*phase-1.15-lag)-.07*sprint);
  rig.rotation.z=active*.13*Math.sin(TAU*phase*.8-lag+i*.3);
 });
 if(model.rider){
  model.rider.position.y=-bob*.52+active*.016*Math.sin(TAU*phase-.45);
  model.rider.rotation.x=active*(-.018-.035*sprint-.018*Math.sin(TAU*phase-1.1));
  model.rider.rotation.z=active*.008*Math.sin(TAU*phase+.5);
 }
 if(model.flutter)model.flutter.rotation.x=active*(.12+.13*sprint+.07*Math.sin(TAU*phase-1.2));
 if(model.shadow){
  model.shadow.material.opacity=.22-.075*flight*active;
  model.shadow.scale.x=.46-.045*flight*active;
 }
 model.gallopAudit={phase,lead:state.lead,flight,cadence,
  hoofs:model.legs.map((l,i)=>({side:l.side,front:l.front,hip:l.pivot.rotation.x,knee:l.knee.rotation.x})),
  beatOrder:GALLOP_BEATS.map(b=>b.limb+(b.lead?'-lead':'-outside'))};
}
