import {KYOTO_CUTS,runnerLane,kyotoOuterCourseOffset,KYOTO_INNER} from './kyoto-course.js?v=kyoto-v12';
/**
 * JRA-style, five-camera Kyoto broadcast, reconstructed from supplied JRA reference frames:
 * 01 Start gate, 02 first corner positioning, 03 third corner entry,
 * 04 fourth corner moves, 05 homestretch finish.
 * Track-side positions are outside the outermost turf rail at all cuts.
 */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'start',until:.075,kicker:'01 / START',label:'スタート',subjects:'all',side:29,ahead:32,height:8,fov:22}),
 Object.freeze({id:'first-corner',until:.29,kicker:'02 / POSITION',label:'1コーナー 位置どり',subjects:'pack',side:31,ahead:12,height:9,fov:26}),
 Object.freeze({id:'third-entry',until:.67,kicker:'03 / ATTACK ZONE',label:'3コーナー進入',subjects:'frontpack',side:34,ahead:58,height:9.5,fov:26}),
 Object.freeze({id:'fourth-turn',until:.84,kicker:'04 / THE MOVE',label:'4コーナー 仕掛け',subjects:'leaders',side:34,ahead:28,height:8,fov:21}),
 Object.freeze({id:'finish',until:Infinity,kicker:'05 / FINISH',label:'ゴール前',subjects:'finish',side:31,ahead:0,height:6.8,fov:21})
]);
export function chooseRaceShot(progress,cuts=RACE_SHOT_LIST.map(s=>s.until)){
 const p=Number.isFinite(progress)?Math.max(0,progress):0;
 return RACE_SHOT_LIST[cuts.findIndex(x=>p<x)]||RACE_SHOT_LIST[4];
}
export function courseShotCuts(route,routeLength,config){
 return config.venue==='京都'&&config.distance===2000&&config.surface==='芝'
   ? [...RACE_SHOT_LIST.map(s=>s.until)]
   : [.08,.30,.62,.84,Infinity];
}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function projectPoint(q,pos,look,fov,aspect){
 const vx=look.x-pos.x,vy=look.y-pos.y,vz=look.z-pos.z;
 const len=Math.hypot(vx,vy,vz),fx=vx/len,fy=vy/len,fz=vz/len;
 const rightX=-fz/Math.hypot(fx,fz),rightZ=fx/Math.hypot(fx,fz);
 const upX=-fy*rightZ,upY=Math.hypot(fx,fz),upZ=fy*rightX;
 const dx=q.x-pos.x,dy=q.y-pos.y,dz=q.z-pos.z;
 const depth=dx*fx+dy*fy+dz*fz;
 if(depth<.1)return {x:0,y:0,visible:false};
 const tan=Math.tan(fov*Math.PI/360);
 return {x:(dx*rightX+dz*rightZ)/(depth*tan*aspect),
  y:(dx*upX+dy*upY+dz*upZ)/(depth*tan),visible:true};
}
/** Shot-specific cast: all 17 at gate, front pack at corners, leaders at finish. */
function pickSubjects(shot,order,distance){
 if(shot.subjects==='all')return order.slice();
 const lead=order[0],gap=o=>(lead.p-o.p)*distance;
 if(shot.subjects==='pack')return order.slice(0,7).filter((o,i)=>i<6||gap(o)<=12);
 if(shot.subjects==='frontpack'){
  // Three-quarter entry from the outer rail: five foreground competitors.
  // The remaining pack is visible in depth behind, not framing the lens.
  const pack=order.slice(0,6).filter((o,i)=>i<5||gap(o)<=8);
  return pack.length>=5?pack:order.slice(0,5);
 }
 if(shot.subjects==='leaders'){
  const firstFive=order.slice(0,5);
  const pack=firstFive.filter((o,i)=>i<3||(i===3?gap(o)<=16:gap(o)<=10&&(firstFive[3].p-o.p)*distance<=2.6));
  return pack.length>=4?pack:firstFive.slice(0,4);
 }
 if(shot.subjects==='finish'){
  const threeOrFour=order.slice(0,4).filter((o,i)=>i<3||gap(o)<=6.5);
  return threeOrFour.length>=3?threeOrFour:order.slice(0,3);
 }
 return order.slice(0,5);
}
function frameBoundary(isGate,id){
 if(isGate)return {left:.055,right:.94,lower:.07,upper:.94};
 if(id==='first-corner')return {left:.06,right:.86,lower:.09,upper:.90};
 if(id==='third-entry')return {left:.08,right:.82,lower:.10,upper:.88};
 if(id==='fourth-turn')return {left:.08,right:.80,lower:.10,upper:.88};
 return {left:.10,right:.82,lower:.12,upper:.88};
}
export function raceCameraPose({shot,progress,order,path,aspect=1,clock=Infinity,direction='右',distance=2000,venue='京都'}){
 const lead=order?.[0];
 if(!lead)return {position:{x:0,y:9,z:40},look:{x:0,y:2,z:0},fov:39,side:40,subjects:[],lensShiftX:0,mode:'empty'};
 const isGate=shot.id==='start'&&clock<=1.8;
 const rightCircuit=direction!=='左',outsideSign=rightCircuit?-1:1;
 const group=isGate?order.slice():pickSubjects(shot,order,distance);
 const pCenter=isGate?0:group.reduce((sum,o,i)=>sum+o.p*(i===0?1.6:1),0)/(group.length+.6);
 const center=path(pCenter),field=group.map(o=>{
  const q=path(o.p),lane=runnerLane(o.no,order.length,progress);
  return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane,dx:q.dx,dz:q.dz,no:o.no,p:o.p};
 });
 const focus=isGate?{x:center.x,y:center.y,z:center.z}:{
  x:field.reduce((a,q)=>a+q.x,0)/field.length,
  y:field.reduce((a,q)=>a+q.y,0)/field.length,
  z:field.reduce((a,q)=>a+q.z,0)/field.length
 };
 // Unlike a game chase-camera, a real 3C outside camera waits ahead of
 // approaching horses, producing the foreshortened head-on TV perspective.
 // Track-local outside normal comes from the CAMERA station, not the pack.
 const inFront=shot.ahead||0;
 const cameraStation=path(pCenter+(isGate?0:inFront/distance));
 const groupBulge=venue==='京都'&&distance===2000?
  Math.max(0,...group.map(o=>-kyotoOuterCourseOffset(o.p))):0;
 const stationBulge=venue==='京都'&&distance===2000?
  Math.max(0,-kyotoOuterCourseOffset(pCenter+inFront/distance)):0;
 const half=venue==='京都'&&distance===2000?KYOTO_INNER.width/2:13.5;
 const outsideNeeded=Math.max(groupBulge,stationBulge)+half+15;
 const side=isGate?Math.max(shot.side,half+12):Math.max(shot.side||31,outsideNeeded);
 const a=Math.max(.48,Number(aspect)||1);
 const baseFov=shot.fov||28;
 const fov=isGate?(a>1.45?24:a<.85?51:38):
  a>1.45?Math.max(16,baseFov-5):a<.85?Math.min(38,baseFov+6):baseFov;
 const height=shot.height||8;
 const setPose=scale=>{
  let x,z;
  if(isGate){
   // Look almost straight back into the gates from the OUTSIDE: unlike the
   // old distant side-angle this shows the entire stall row across the image.
   x=focus.x+center.dx*inFront*scale+center.dz*outsideSign*side*scale;
   z=focus.z+center.dz*inFront*scale-center.dx*outsideSign*side*scale;
  }else{
   // Stationary trackside crane / telephoto on the outside rail.
   x=cameraStation.x+cameraStation.dz*outsideSign*side*scale;
   z=cameraStation.z-cameraStation.dx*outsideSign*side*scale;
  }
  return {position:{x,y:focus.y+height+Math.log2(scale)*.38,z},
   look:{x:focus.x,y:focus.y+(isGate?1.7:1.8),z:focus.z}};
 };
 const bounds=isGate?{left:.06,right:.95,lower:.14,upper:.90}:
  shot.id==='first-corner'?{left:.07,right:.86,lower:.11,upper:.90}:
  shot.id==='third-entry'?{left:.13,right:.80,lower:.11,upper:.88}:
  shot.id==='fourth-turn'?{left:.12,right:.79,lower:.11,upper:.88}:
  {left:.14,right:.80,lower:.13,upper:.88};
 const imagePoints=(pose)=>{
  const pixels=[];
  if(isGate){
   // Actual 17-wide stall row, including top beam, instead of the horse
   // silhouettes which compress the gate into a tiny dot.
   const origin=path(0),behind=3.7,span=order.length*.6+1.15;
   for(const lateral of [-span,span])for(const y of [.08,4.2])
    for(const forward of [-2.1,2.1])
     pixels.push(projectPoint({x:origin.x-origin.dx*behind+origin.dz*lateral+origin.dx*forward,
      y:origin.y+y,z:origin.z-origin.dz*behind-origin.dx*lateral+origin.dz*forward},
      pose.position,pose.look,fov,a));
  }else{
   for(const q of field)for(const front of [-2.35,2.7])
    for(const lateral of [-.82,.82])for(const y of [.14,3.0])
     pixels.push(projectPoint({x:q.x+q.dx*front-q.dz*lateral,
      y:q.y+y,z:q.z+q.dz*front+q.dx*lateral},
      pose.position,pose.look,fov,a));
  }
  return pixels;
 };
 // Zoom in to the actual competition, but back off only as much as needed
 // to keep the picture's selected 3–5 runners uncut.
 let scale=1,pose,raw;
 for(let i=0;i<35;i++){
  pose=setPose(scale);
  raw=imagePoints(pose).filter(p=>p.visible);
  if(raw.length!== (isGate?8:field.length*8)){scale*=1.13;continue}
  const xs=raw.map(p=>p.x),ys=raw.map(p=>p.y);
  const width=Math.max(...xs)-Math.min(...xs);
  const heightNdc=Math.max(...ys)-Math.min(...ys);
  if(width<=2*(bounds.right-bounds.left)&&heightNdc<=2*(bounds.upper-bounds.lower))break;
  scale*=1.08;
 }
 if(!raw?.length)throw new Error('No horse group visible to broadcast lens');
 const yCenter=(Math.max(...raw.map(p=>p.y))+Math.min(...raw.map(p=>p.y)))/2;
 // Keep horse bodies in the middle third rather than wasting 50% on sky.
 pose.look.y+=yCenter*.43-(isGate?.5:2.25);
 raw=imagePoints(pose).filter(p=>p.visible);
 let lensShiftX=0;
 if(isGate){
  // The user's reference shows the whole gate filling the width, not a
  // minuscule gate at x=5% with a field of empty turf to the right.
  const mid=(Math.max(...raw.map(p=>p.x))+Math.min(...raw.map(p=>p.x)))/2;
  lensShiftX=mid; // optical center x=.50
 }else{
  // Track direction determines where the 20% forward breathing space sits.
  // Direction is derived from the real camera projection, not guessed from
  // track handedness or the sign of its outside normal.
  const l=path(lead.p),lane=runnerLane(lead.no,order.length,progress);
  const p0={x:l.x-l.dz*lane,y:l.y+1.9,z:l.z+l.dx*lane};
  const ahead={x:p0.x+l.dx*8,y:p0.y,z:p0.z+l.dz*8};
  const advancingRight=projectPoint(ahead,pose.position,pose.look,fov,a).x>
   projectPoint(p0,pose.position,pose.look,fov,a).x;
  const edge=advancingRight?Math.max(...raw.map(p=>p.x)):Math.min(...raw.map(p=>p.x));
  const target=advancingRight?bounds.right:bounds.left;
  lensShiftX=edge-2*(target-.5);
 }
 const projectedWidth=Math.max(...raw.map(p=>p.x))-Math.min(...raw.map(p=>p.x));
 const outsideDist=side*scale-(Math.max(groupBulge,stationBulge)+half);
 return {...pose,fov,side:side*scale,subjects:group.map(o=>o.no),
  lensShiftX,outerRailSign:outsideSign,tracked:group.length,
  mode:isGate?'gate-front-broadcast':'rail-broadcast-'+shot.id,
  outerRailClearance:outsideDist,outerCourseBulge:groupBulge,
  aheadScreenSide:'dynamic',gateScreenX:isGate?.5:null,
  forwardGap:.2,projectedWidth,dollyScale:scale,
  shotPerspective:isGate?'front-gate':shot.id==='third-entry'?'outside-headon':
   shot.id==='fourth-turn'?'outside-oblique':'outside-side'};
}
