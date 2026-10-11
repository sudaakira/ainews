// Ground-contact gait engine v3. No canned pose frames or independent leg sine waves.
// Each hoof follows a stance/swing trajectory, and a two-bone inverse-kinematics
// solution drives the hip and knee. Fore/hind timing is an asymmetrical gallop.
export function updateGallop(model,raceTime,visualTime,number){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const blend=smooth((raceTime-.12)/1.4);
 if(blend===0){
  model.anim.position.y=0;model.anim.rotation.x=0;
  model.headRig.rotation.x=0;model.tailRig.rotation.x=0;model.tailRig.rotation.z=0;
  for(const leg of model.legs){leg.pivot.rotation.x=0;leg.knee.rotation.x=0;}
  return;
 }
 // 1.25 strides/s, with the diagonal foreleg contact shortly after the leading hindleg.
 const stride=(visualTime*1.27+number*.023)%1;
 const wrap=v=>(v%1+1)%1;
 const stance=.47;
 // A hoof moves backwards relative to the body while grounded, then swings
 // forwards above the grass. This prevents the bicycle/paddling illusion.
 function hoofTrajectory(phase,front){
  const p=wrap(stride+phase);
  const reach=front?.57:.62;
  if(p<stance){
   const t=p/stance;
   return {z:reach*(1-2*t),y:-1.22+0.055*Math.sin(Math.PI*t)};
  }
  const t=(p-stance)/(1-stance);
  const eased=smooth(t);
  const height=(front?.44:.51)*Math.pow(Math.sin(Math.PI*t),1.2);
  return {z:-reach+2*reach*eased,y:-1.22+height};
 }
 // Angles for two segments hanging along -Y, where negative X rotation
 // reaches forward (+Z). Hind hock folds the opposite way to a fore knee.
 function solveIK(z,y,upper,lower,front){
  const d=clamp(Math.hypot(z,y),.08,upper+lower-.008);
  const cosine=clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1);
  const bend=(front?1:-1)*Math.acos(cosine);
  const theta=Math.atan2(-z,-y);
  const hip=theta-Math.atan2(lower*Math.sin(bend),upper+lower*Math.cos(bend));
  return [clamp(hip,-1.18,1.18),clamp(bend,-1.8,1.8)];
 }
 // Index order from model: fore-left, fore-right, hind-left, hind-right.
 // Asymmetric hoof contact: trailing hind, leading hind, trailing fore, leading fore.
 const phases=[.50,.58,.02,.13];
 let grounded=0;
 model.legs.forEach((leg,i)=>{
  const front=leg.front;
  const target=hoofTrajectory(phases[i],front);
  const [hip,knee]=solveIK(target.z,target.y,front?.64:.59,.70,front);
  leg.pivot.rotation.x=hip*blend;
  leg.knee.rotation.x=knee*blend;
  if(wrap(stride+phases[i])<stance)grounded++;
 });
 // The trunk pitches over the shoulder at touchdown and rises on push-off.
 // Keep motion restrained so the jockey remains in the saddle.
 const flight=grounded===0?1:0;
 const bounce=.025+.055*(1-Math.cos(2*Math.PI*stride))*.5+flight*.055;
 model.anim.position.y=bounce*blend;
 model.anim.rotation.x=blend*(.036*Math.sin(2*Math.PI*stride-.9));
 model.headRig.rotation.x=blend*(-.045*Math.sin(2*Math.PI*stride-1.25));
 model.tailRig.rotation.x=blend*(.08*Math.sin(2*Math.PI*stride+.3));
 model.tailRig.rotation.z=blend*(.045*Math.sin(2*Math.PI*stride*.6+number));
}
