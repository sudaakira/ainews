/** Four broadcast cuts. The fourth camera stays side-on through the run-out. */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'start',until:.23,kicker:'01 / START',label:'スタート',side:44,height:18,ahead:0,fov:43}),
 Object.freeze({id:'second-turn',until:.52,kicker:'02 / CLOSE UP',label:'2コーナー',side:27,height:8,ahead:6,fov:43}),
 Object.freeze({id:'third-turn',until:.76,kicker:'03 / OVERHEAD',label:'3コーナー',side:37,height:65,ahead:0,fov:49}),
 Object.freeze({id:'straight',until:Infinity,kicker:'04 / SIDE VIEW',label:'最後の直線',side:58,height:7,ahead:0,fov:37})
]);
export function chooseRaceShot(progress,cuts=RACE_SHOT_LIST.map(s=>s.until)){
 const p=Number.isFinite(progress)?Math.max(0,progress):0;
 return RACE_SHOT_LIST[cuts.findIndex(x=>p<x)]||RACE_SHOT_LIST[3];
}
// Cut at the actual joins of the schematic Kyoto path, not arbitrary timers.
export function courseShotCuts(route,routeLength,config){
 if(config.venue!=='京都'||config.distance!==2000||config.surface!=='芝')
  return [.18,.52,.80,Infinity];
 const anchors=[{x:78,y:275},{x:575,y:137},{x:575,y:411}];
 return [...anchors.map((anchor,index)=>{
  let best=Infinity,progress=0;
  for(let i=1;i<1600;i++){
   const p=i/1600;
   if(p<[.12,.35,.61][index]||p>[.36,.65,.88][index])continue;
   const q=route.getPointAtLength(p*routeLength),d=(q.x-anchor.x)**2+(q.y-anchor.y)**2;
   if(d<best){best=d;progress=p;}
  }
  return progress;
 }),Infinity];
}
/** Pure camera geometry. +side is camera-side; offsetPoint's +lane is the
 * OPPOSITE side, where the finish board belongs. */
export function raceCameraPose({shot,progress,order,path,aspect=1}){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const full=shot.id==='start'||shot.id==='third-turn';
 const group=full?order:order.slice(0,shot.id==='straight'?3:5);
 const p=(group[0].p+group.at(-1).p)/2;
 let focus=path(p),side=shot.side,height=shot.height;
 if(shot.id==='straight'){
  // The horses keep running across and out of a fixed finishing frame.
  const t=clamp((progress-.93)/.055,0,1),s=t*t*(3-2*t),end=path(1);
  const finish={x:end.x-end.dx*5,y:end.y,z:end.z-end.dz*5,dx:end.dx,dz:end.dz};
  focus={x:focus.x*(1-s)+finish.x*s,y:focus.y*(1-s)+finish.y*s,
   z:focus.z*(1-s)+finish.z*s,dx:finish.dx,dz:finish.dz};
 }
 if(full){
  const spread=Math.abs(group[0].p-group.at(-1).p)*520+9;
  const fit=spread/(Math.max(.65,aspect)*2*Math.tan(shot.fov*Math.PI/360))+13;
  const scale=Math.max(1,fit/side);side*=scale;height*=Math.min(scale,1.6);
 }
 const point=(lateral,forward,y)=>({
  x:focus.x+focus.dz*lateral+focus.dx*forward,
  y:focus.y+y,z:focus.z-focus.dx*lateral+focus.dz*forward
 });
 return {position:point(side,shot.ahead,height),look:point(0,0,1.9),
  fov:shot.fov,forward:{x:focus.dx,z:focus.dz},side};
}

