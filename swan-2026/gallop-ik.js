// Racehorse gallop v8 — hoof trajectories and two-link inverse kinematics.
// Model forward +Z, vertical +Y. The foreleg's carpus folds back,
// hind hock folds forward; foot positions are constrained to reachable targets.
export function updateGallop(model,raceTime,visualTime,number){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const mix=(a,b,t)=>a+(b-a)*t;
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const fract=x=>x-Math.floor(x);
 const tau=Math.PI*2;
 const active=smooth((raceTime-.12)/1.25);
 const legs=model.legs;
 if(!active){
  model.anim.position.y=0;model.anim.rotation.x=0;
  model.headRig.rotation.x=0;model.tailRig.rotation.x=0;model.tailRig.rotation.z=0;
  for(const l of legs){l.pivot.rotation.x=0;l.knee.rotation.x=0}
  return;
 }
 // 1.55 gallop cycles per real second. The hoof contacts are separated:
 // hind left, hind right, fore left, fore right, then suspension.
 // The visualTime is independent of 16x race clock so feet never strobe.
 const cycle=fract(visualTime*1.55+number*.013);
 const starts=[.36,.49,.02,.15]; // front L/R, hind L/R
 const duration=[.17,.17,.19,.19];
 const bodyPhase=tau*cycle;
 // The body moves over the planted forelegs; rise during gathered suspension.
 // A continuous wave avoids the abrupt 9cm teleport at "all hooves off".
 const lift=.032+.065*Math.pow(.5+.5*Math.sin(bodyPhase-1.2),2);
 const pitch=.035*Math.sin(bodyPhase+.35);
 model.anim.position.y=active*lift;
 model.anim.rotation.x=active*pitch;
 model.headRig.rotation.x=active*(-.045*Math.sin(bodyPhase-.55)-pitch*.55);
 model.tailRig.rotation.x=active*(.08*Math.sin(bodyPhase+.4));
 model.tailRig.rotation.z=active*(.035*Math.sin(bodyPhase*.7+number));
 let planted=0;
 function inverseKinematics(z,y,L1,L2,front){
  // Rotate (0,-L,0) about X: Z=-L*sin(angle).
  const r=clamp(Math.hypot(z,y),.12,L1+L2-.012);
  const bend=Math.acos(clamp((r*r-L1*L1-L2*L2)/(2*L1*L2),-1,1));
  // Carpal joint folds rearward; hock folds forward.
  const joint=front?bend:-bend;
  const base=Math.atan2(-z,-y);
  const hip=base-Math.atan2(L2*Math.sin(joint),L1+L2*Math.cos(joint));
  return [clamp(hip,-1.45,1.45),clamp(joint,-2.15,2.15)];
 }
 for(let i=0;i<4;i++){
  const leg=legs[i],front=leg.front;
  const p=fract(cycle-starts[i]+1);
  const duty=duration[i],stance=p<duty;
  if(stance)planted++;
  // z is the hoof position relative to the shoulder/hip. At touchdown
  // the hoof is forward, during stance the body passes over the hoof.
  // At recovery the leg folds then extends into the next landing.
  const span=front?.37:.39;
  let z,y;
  if(stance){
   const t=p/duty;
   z=mix(span,-span,t);
   // The planted hoof stays at the turf as the body rises and falls.
   y=-1.29-lift;
  }else{
   const t=(p-duty)/(1-duty);
   const ease=smooth(t);
   z=mix(-span,span,ease);
   y=-1.16+.31*Math.pow(Math.sin(Math.PI*t),1.45);
  }
  // The limbs are 1.34 units long. Prevent unreachable foot positions
  // instead of forcing extreme, dislocated-looking knee angles.
  const maxReach=(leg.upper||.66)+(leg.lower||.68)-.012;
  const dist=Math.hypot(z,y);
  if(dist>maxReach){z*=maxReach/dist;y*=maxReach/dist}
  const [hip,knee]=inverseKinematics(z,y,leg.upper||.66,leg.lower||.68,front);
  leg.pivot.rotation.x=active*hip;
  leg.knee.rotation.x=active*knee;
 }
 if(model.shadow)model.shadow.material.opacity=.15-(planted===0?.045:0);
}
