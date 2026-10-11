// Gallop v6: ground-constrained, four-beat racehorse gait.
// +Z is forward; all joints rotate about X. Units match horse-v5.js.
// Hooves move relative to the torso during stance; swing is an arced recovery.
// Two-bone inverse kinematics prevents broken-looking limb lengths.
export function updateGallop(model,raceTime,visualTime,number){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const mix=(a,b,t)=>a+(b-a)*t;
 const blend=smooth((raceTime-.12)/1.25);
 const legs=model.legs;
 if(!blend){
  model.anim.position.y=0;model.anim.rotation.x=0;
  model.headRig.rotation.x=0;model.tailRig.rotation.x=0;model.tailRig.rotation.z=0;
  for(const leg of legs){leg.pivot.rotation.x=0;leg.knee.rotation.x=0;}
  return;
 }
 // At roughly 1.65 strides/sec the stride reads as a race gallop on mobile.
 // Every horse starts with a tiny phase offset to avoid mechanical synchronization.
 const phase=((visualTime*1.65+number*.011)%1+1)%1;
 const wrap=x=>(x%1+1)%1;
 // Four separate contacts: trailing hind, leading hind, trailing fore, leading fore.
 // In model order: fore(-), fore(+), hind(-), hind(+).
 const offsets=[.48,.66,.02,.19];
 const contact=.19;
 const ease=smooth;
 const contactPhases=[];
 function target(p,front){
  const span=front?.51:.54;
  const ankleY=-1.265;
  if(p<contact){
   const t=p/contact;
   // Foot is planted: relative motion comes from the torso advancing over it.
   return {z:mix(span,-span,t),y:ankleY,stance:true};
  }
  const t=(p-contact)/(1-contact);
  const lift=Math.pow(Math.sin(Math.PI*t),1.2)*(front?.49:.55);
  return {z:mix(-span,span,ease(t)),y:ankleY+lift,stance:false};
 }
 function ik(z,y,L1,L2,front){
  // +X rotation drives a downward limb backwards (-Z).
  // Fore knee bends rearward; hind hock bends forward.
  const distance=clamp(Math.hypot(z,y),.05,L1+L2-.005);
  const joint=(front?1:-1)*Math.acos(clamp((distance*distance-L1*L1-L2*L2)/(2*L1*L2),-1,1));
  const heading=Math.atan2(-z,-y);
  const hip=heading-Math.atan2(L2*Math.sin(joint),L1+L2*Math.cos(joint));
  return {hip:clamp(hip,-1.35,1.35),joint:clamp(joint,-2.0,2.0)};
 }
 let contacts=0;
 for(let i=0;i<legs.length;i++){
  const leg=legs[i],p=wrap(phase+offsets[i]);
  const point=target(p,leg.front);
  if(point.stance)contacts++;
  const solved=ik(point.z,point.y,leg.upper||.66,leg.lower||.68,leg.front);
  leg.pivot.rotation.x=mix(0,solved.hip,blend);
  leg.knee.rotation.x=mix(0,solved.joint,blend);
  contactPhases.push(p);
 }
 // Suspension is a short interval with all four hooves off the ground.
 // Pitch is tiny: a galloping horse flexes its back, not its whole torso like a seesaw.
 const airborne=contacts===0?1:0;
 const bodyWave=.5-.5*Math.cos(2*Math.PI*phase);
 const vertical=.025+.055*bodyWave+.090*airborne;
 model.anim.position.y=vertical*blend;
 model.anim.rotation.x=blend*(.052*Math.sin(2*Math.PI*phase-.75));
 model.headRig.rotation.x=blend*(-.075*Math.sin(2*Math.PI*phase-1.1));
 model.tailRig.rotation.x=blend*(.055*Math.sin(2*Math.PI*phase+.6));
 model.tailRig.rotation.z=blend*(.036*Math.sin(2*Math.PI*phase*.7+number));
 if(model.shadow)model.shadow.material.opacity=.18-.07*airborne;
}
