// Chibi sprite-like gallop v1.
// Deliberately uses five hand-shaped silhouette poses, smooth transitions,
// short chunky limbs, a grouped rear kick and compact front-leg recovery.
// It is stylized game animation, NOT a realistic biomechanical gait.
export function updateGallop(model,raceTime,visualTime,number,raceProgress=0){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const ease=t=>t*t*(3-2*t);
 const active=ease(clamp((raceTime-.09)/1.05,0,1));
 const sprint=ease(clamp((raceProgress-.77)/.2,0,1));
 const legs=model.legs;
 if(!active){
  model.anim.position.y=0;
  model.anim.rotation.x=0;
  model.headRig.rotation.x=0;
  model.tailRig.rotation.x=0;
  model.tailRig.rotation.z=0;
  for(const leg of legs){leg.pivot.rotation.x=0;leg.knee.rotation.x=0}
  if(model.rider){model.rider.position.y=0;model.rider.rotation.x=0}
  return;
 }
 const time=((visualTime*1.66+number*.013)%1+1)%1;
 // [cycle, 4 hips (fore L, fore R, hind L, hind R),
 // 4 knee bends, vertical bob, body pitch, head nod].
 const poses=[
  [0.00,[-.55,-.62,.54,.60],[.40,.48,-.78,-.86],.065,-.018,-.03],
  [.20,[-.92,-.82,.80,.71],[.22,.29,-.37,-.45],.125,.015,.025],
  [.40,[-.10,.01,-.22,-.15],[1.06,.96,-1.28,-1.18],.163,.037,.015],
  [.60,[.47,.58,-.52,-.63],[.53,.43,-.85,-.72],.086,-.007,-.025],
  [.80,[.21,.10,.20,.11],[.86,.78,-1.02,-1.13],.035,-.034,-.032],
  [1.00,[-.55,-.62,.54,.60],[.40,.48,-.78,-.86],.065,-.018,-.03]
 ];
 let idx=0;
 while(idx<poses.length-2&&time>=poses[idx+1][0])idx++;
 const a=poses[idx],b=poses[idx+1];
 const t=ease(clamp((time-a[0])/(b[0]-a[0]),0,1));
 for(let i=0;i<legs.length;i++){
  const hip=lerp(a[1][i],b[1][i],t);
  const knee=lerp(a[2][i],b[2][i],t);
  legs[i].pivot.rotation.x=hip*active*(1+.16*sprint);
  legs[i].knee.rotation.x=knee*active*(1+.10*sprint);
 }
 // Bounce provides the sense of takeoff. Subtle head motion
 // keeps the cute oversized face steady and recognizable.
 model.anim.position.y=lerp(a[3],b[3],t)*active;
 model.anim.rotation.x=lerp(a[4],b[4],t)*active;
 model.headRig.rotation.x=lerp(a[5],b[5],t)*active;
 model.tailRig.rotation.x=.10*Math.sin(time*Math.PI*2-.4)*active;
 model.tailRig.rotation.z=.043*Math.sin(time*Math.PI*2*.7+number)*active;
 // Final-straight visual surge only; no effect on horse speed or outcome.
 model.anim.rotation.z=.012*Math.sin(time*Math.PI*2+number)*active*(1+.3*sprint);
 if(model.rider){model.rider.position.y=.022*Math.sin(time*Math.PI*4+.3)*active;
  model.rider.rotation.x=-.016*sprint+.009*Math.sin(time*Math.PI*2)*active;}

 if(model.shadow)model.shadow.material.opacity=.20-.07*clamp((model.anim.position.y-.04)/.13,0,1);
}
