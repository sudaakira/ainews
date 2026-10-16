/**
 * Anime gallop v4 kawaii — articulated four-leg silhouette with secondary motion.
 * Visual-only rig: reads visualTime and raceProgress, NEVER touches model speed,
 * race order, RNG, horseProgress, or prediction data.
 */
export function updateGallop(model,raceTime,visualTime,number,raceProgress=0){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>t*t*(3-2*t);
 const active=smooth(clamp((raceTime-.08)/.85,0,1));
 const sprint=smooth(clamp((raceProgress-.75)/.20,0,1));
 const legs=model.legs;
 if(active===0){
  model.anim.position.y=0;
  model.anim.rotation.set(0,0,0);
  model.headRig.rotation.set(0,0,0);
  model.tailRig.rotation.set(0,0,0);
  for(const leg of legs){leg.pivot.rotation.set(0,0,0);leg.knee.rotation.set(0,0,0);}
  if(model.rider){model.rider.position.y=0;model.rider.rotation.set(0,0,0);}
  model.ears?.forEach(e=>{e.rig.rotation.x=0;e.rig.rotation.z=-e.side*.16;});
  model.maneStrands?.forEach(x=>x.rig.rotation.set(0,0,0));
  model.tailStrands?.forEach(x=>x.rig.rotation.set(0,0,0));
  if(model.flutter)model.flutter.rotation.set(0,0,0);
  if(model.shadow)model.shadow.material.opacity=.20;
  return;
 }
 const phase=((visualTime*1.90+number*.014)%1+1)%1;
 // Eight distinct poses keep impact, suspension, stretching and recovery
 // readable in frontal 3/4 closeups, unlike the former five chunky poses.
 // Order of legs: near front, far front, near hind, far hind.
 const poses=[
  [0.000,[-.66,-.76,.60,.71],[.32,.42,-.80,-.93],.075,-.021,-.024],
  [.125,[-1.00,-.89,.88,.79],[.22,.30,-.44,-.58],.125,.014,.010],
  [.250,[-1.02,-.88,.55,.49],[.45,.57,-.64,-.72],.193,.058,.038],
  [.375,[-.30,-.18,-.31,-.25],[1.13,1.02,-1.37,-1.26],.225,.047,.054],
  [.500,[.42,.54,-.76,-.84],[.72,.63,-1.06,-.95],.143,-.012,-.022],
  [.625,[.70,.84,-.54,-.62],[.38,.26,-.78,-.84],.067,-.045,-.055],
  [.750,[.32,.24,.12,.02],[.85,.95,-1.06,-1.16],.037,-.039,-.043],
  [.875,[-.19,-.34,.40,.53],[.67,.58,-.91,-1.02],.065,-.016,-.037],
  [1.000,[-.66,-.76,.60,.71],[.32,.42,-.80,-.93],.075,-.021,-.024]
 ];
 let idx=0;
 while(idx<poses.length-2&&phase>=poses[idx+1][0])idx++;
 const a=poses[idx],b=poses[idx+1];
 const t=smooth(clamp((phase-a[0])/(b[0]-a[0]),0,1));
 const pi2=Math.PI*2;
 for(let i=0;i<legs.length;i++){
  const step=lerp(a[1][i],b[1][i],t);
  const bend=lerp(a[2][i],b[2][i],t);
  legs[i].pivot.rotation.x=step*active*(1+.08*sprint);
  legs[i].knee.rotation.x=bend*active*(1+.10*sprint);
  // Tiny opposite-plane offsets give the front view true spatial depth.
  legs[i].pivot.rotation.z=((i%2?-.055:.055)*Math.sin(phase*pi2+i*.26))*active;
 }
 const bounce=lerp(a[3],b[3],t);
 model.anim.position.y=bounce*.32*active*(1+.10*sprint);
 model.anim.rotation.x=lerp(a[4],b[4],t)*active;
 model.anim.rotation.z=(.013*Math.sin(pi2*phase+number*.38))*(1+.30*sprint)*active;
 const nod=lerp(a[5],b[5],t)*active;
 model.headRig.rotation.x=nod+.022*Math.sin(pi2*phase+.65)*active;
 model.headRig.rotation.z=.012*Math.sin(pi2*phase*.5+number)*active;
 // Slightly asymmetrical flops give each pony cute, alive-looking ears.
 // Phase follows screen time (not simulated 16x time), avoiding strobing.
 model.ears?.forEach((ear,i)=>{
  ear.rig.rotation.z=(-ear.side*.16+ear.side*.10*Math.sin(pi2*phase+ear.side*.7))*active;
  ear.rig.rotation.x=(.055+.065*sprint)*Math.sin(pi2*phase-1+i*.9)*active;
 });
 model.tailRig.rotation.x=(.12+.10*sprint)*Math.sin(pi2*phase-.6)*active;
 model.tailRig.rotation.z=(.105+.08*sprint)*Math.sin(pi2*phase*.75+number*.47)*active;
 // Hair and tail have slightly lagged secondary spring-like waves.
 model.maneStrands?.forEach(({rig,phase:offset},i)=>{
  rig.rotation.x=(-.18-.20*sprint+.11*Math.sin(phase*pi2-1.1+offset))*active;
  rig.rotation.z=.14*Math.sin(phase*pi2*.77+offset+i*.3)*active;
 });
 model.tailStrands?.forEach(({rig,phase:offset},i)=>{
  rig.rotation.x=(.10+.26*sprint)*Math.sin(phase*pi2-.90+offset)*active;
  rig.rotation.z=(.21+.1*sprint)*Math.sin(phase*pi2*.84+offset+i*.22)*active;
 });
 if(model.rider){
  const landing=smooth(clamp((bounce-.07)/.14,0,1));
  model.rider.position.y=(.018*Math.sin(pi2*phase*2+.3)+landing*.032)*active;
  model.rider.rotation.x=(-.030-.063*sprint+.024*Math.sin(pi2*phase+.48))*active;
  model.rider.rotation.z=.017*Math.sin(pi2*phase-.6)*active;
 }
 if(model.flutter){
  model.flutter.rotation.x=(.10+.22*sprint+.08*Math.sin(pi2*phase-1.4))*active;
  model.flutter.rotation.z=.08*Math.sin(pi2*phase*.7)*active;
 }
 if(model.shadow)
  model.shadow.material.opacity=.23-.095*clamp(bounce/.22,0,1);
}

