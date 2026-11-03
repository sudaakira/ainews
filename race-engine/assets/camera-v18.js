/**
 * Broadcast camera v18 — the five-shot JRA grammar (side gate, low
 * first corner, close backstretch, front-oblique fourth corner, level
 * finish) executed as television craft:
 *
 *  - Poses are built at minimum outside-rail clearance, then the lens
 *    zooms so the selected competitors fill 60-72% of the width.
 *  - Inside a cut the rig is LOCKED: it translates with the leader and
 *    rotates rigidly with the course tangent. Fov and lens shift never
 *    change mid-shot, so there is no per-frame reframing jitter.
 *  - Lead room is optical (lens shift), measured from how far the
 *    leader's nose travels across the frame.
 *  - The fourth corner (except Hanshin) cuts to a fixed exit station
 *    that only pans, with the whole arc precomposed at the cut.
 *  - The camera is audited against the rail as actually drawn and
 *    throws rather than silently crossing it.
 *
 * Pure presentation: no race RNG, order or prediction imports.
 */
import {KYOTO_INNER,kyotoOuterCourseOffset,runnerLane} from './kyoto-course.js';
import {finishCrossings} from './race-playback.js';

export const CAMERA_V18=Object.freeze({mode:'broadcast-rail-dolly-v18'});

export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'start',until:.12,kicker:'01 / START',label:'スタート',subjects:'all',side:29,ahead:32,height:8,fov:22}),
 Object.freeze({id:'first-corner',until:.32,kicker:'02 / POSITION',label:'1コーナー 位置どり',subjects:'pack',side:31,ahead:12,height:6.4,fov:26}),
 Object.freeze({id:'backstretch',until:.67,kicker:'03 / BACKSTRETCH',label:'向こう正面 隊列',subjects:'backstretch-pack',side:31,ahead:0,height:6.4,fov:23}),
 Object.freeze({id:'fourth-turn',until:.84,kicker:'04 / THE MOVE',label:'4コーナー 仕掛け',subjects:'moves',side:28,ahead:35,height:5.2,fov:24}),
 Object.freeze({id:'finish',until:Infinity,kicker:'05 / FINISH',label:'ゴール前',subjects:'finish',side:31,ahead:0,height:6.8,fov:21})
]);
export function chooseRaceShot(progress,cuts=RACE_SHOT_LIST.map(s=>s.until)){
 const p=Number.isFinite(progress)?Math.max(0,progress):0;
 return RACE_SHOT_LIST[cuts.findIndex(x=>p<x)]||RACE_SHOT_LIST[4];
}
export function courseShotCuts(route,routeLength,config={}){
 if(config?.courseView==='hanshin-2200-inner-b')return [.17,.44,.71,.835,Infinity];
 if(config?.courseView==='kyoto-3000-outer')return [.12,.58,.78,1-403.7/3000,Infinity];
 return config?.venue==='京都'&&config?.distance===2000&&config?.surface==='芝'
  ? RACE_SHOT_LIST.map(s=>s.until)
  : [.08,.30,.62,.84,Infinity];
}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

/** NDC projection (x right, y up, lens shift applied by callers as
 *  screen = .5+.5*(ndc - shift), matching THREE's elements[8]). */
export function projectPoint(q,pos,look,fov,aspect){
 const vx=look.x-pos.x,vy=look.y-pos.y,vz=look.z-pos.z;
 const len=Math.hypot(vx,vy,vz)||1,fx=vx/len,fy=vy/len,fz=vz/len;
 const rxLen=Math.hypot(fx,fz)||1,rightX=-fz/rxLen,rightZ=fx/rxLen;
 const upX=-fy*rightZ,upY=rxLen,upZ=fy*rightX;
 const dx=q.x-pos.x,dy=q.y-pos.y,dz=q.z-pos.z;
 const depth=dx*fx+dy*fy+dz*fz;
 if(depth<.1)return {x:0,y:0,visible:false};
 const tan=Math.tan(fov*Math.PI/360);
 return {x:(dx*rightX+dz*rightZ)/(depth*tan*aspect),
  y:(dx*upX+dy*upY+dz*upZ)/(depth*tan),visible:true};
}
function pickSubjects(shot,order,distance,aspect){
 if(shot.subjects==='all'||shot.subjects==='field')return order.slice();
 if(shot.subjects==='backstretch-pack')return order.slice(0,Math.min(order.length,7));
 if(shot.subjects==='moves')return order.slice(0,Math.min(order.length,5));
 const lead=order[0],gap=o=>(lead.p-o.p)*distance;
 if(shot.subjects==='pack')return order.slice(0,7).filter((o,i)=>i<6||gap(o)<=12);
 if(shot.subjects==='finish'){
  const threeOrFour=order.slice(0,4).filter((o,i)=>i<3||gap(o)<=6.5);
  return threeOrFour.length>=3?threeOrFour:order.slice(0,3);
 }
 return order.slice(0,5);
}
const isKyoto2000=(venue,distance)=>venue==='京都'&&distance===2000;
const courseHalf=(venue,distance)=>isKyoto2000(venue,distance)?KYOTO_INNER.width/2:13.5;
const outerOffsetAt=(venue,distance,t)=>isKyoto2000(venue,distance)?kyotoOuterCourseOffset(t):0;

export function raceCameraPose({shot,progress,order,path,aspect=1,clock=Infinity,direction='右',distance=2000,venue='京都'}){
 const lead=order?.[0];
 if(!lead)return {position:{x:0,y:9,z:40},look:{x:0,y:2,z:0},fov:39,side:40,subjects:[],lensShiftX:0,mode:'empty'};
 const isGate=shot.id==='start'&&clock<=1.8;
 const rightCircuit=direction!=='左',outsideSign=rightCircuit?1:-1;
 const group=isGate?order.slice():pickSubjects(shot,order,distance,aspect);
 const pCenter=isGate?0:(shot.id==='backstretch'||shot.id==='fourth-turn'
  ?lead.p
  :group.reduce((sum,o,i)=>sum+o.p*(i===0?1.6:1),0)/(group.length+.6));
 const center=path(pCenter);
 const field=group.map(o=>{
  const q=path(o.p),lane=o.lane??runnerLane(o.no,order.length,progress);
  return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane,dx:q.dx,dz:q.dz,no:o.no,p:o.p};
 });
 const framingField=shot.id==='backstretch'?field.slice(0,4)
  :shot.id==='fourth-turn'?field.slice(0,3):field;
 const focus=isGate?{x:center.x,y:center.y,z:center.z}:{
  x:framingField.reduce((a,q)=>a+q.x,0)/framingField.length,
  y:framingField.reduce((a,q)=>a+q.y,0)/framingField.length,
  z:framingField.reduce((a,q)=>a+q.z,0)/framingField.length};
 const inFront=shot.id==='backstretch'?0:(shot.ahead||0);
 const cameraStation=path(pCenter+(isGate?0:inFront/distance));
 const kyoto=isKyoto2000(venue,distance);
 const groupBulge=kyoto?Math.max(0,...group.map(o=>-kyotoOuterCourseOffset(o.p))):0;
 const stationBulge=kyoto?Math.max(0,-kyotoOuterCourseOffset(pCenter+inFront/distance)):0;
 const half=courseHalf(venue,distance);
 const reserveBulge=(kyoto&&shot.id==='fourth-turn')?38:0;
 const outsideNeeded=Math.max(groupBulge,stationBulge,reserveBulge)+half+17;
 const side=isGate?Math.max(shot.side,half+12):Math.max(shot.side||31,outsideNeeded);
 const a=Math.max(.48,Number(aspect)||1);
 const baseFov=shot.fov||28;
 let fov=isGate?(a>1.45?18:a<.85?51:38)
  :a>1.45?Math.max(16,baseFov-5):a<.85?Math.min(38,baseFov+6):baseFov;
 const height=shot.height||8;
 const setPose=scale=>{
  let x,z;
  if(isGate){
   x=focus.x+center.dx*inFront*scale+center.dz*outsideSign*side*scale;
   z=focus.z+center.dz*inFront*scale-center.dx*outsideSign*side*scale;
  }else{
   x=cameraStation.x+cameraStation.dz*outsideSign*side*scale;
   z=cameraStation.z-cameraStation.dx*outsideSign*side*scale;
  }
  return {position:{x,y:focus.y+height+Math.log2(scale)*.38,z},
   look:{x:focus.x,y:focus.y+(isGate?1.7:1.8),z:focus.z}};
 };
 const bounds=isGate?{left:.06,right:.95,lower:.14,upper:.90}
  :shot.id==='first-corner'?{left:.07,right:.86,lower:.11,upper:.90}
  :shot.id==='backstretch'?{left:.07,right:.86,lower:.11,upper:.90}
  :shot.id==='fourth-turn'?{left:.10,right:.83,lower:.11,upper:.88}
  :{left:.14,right:.80,lower:.13,upper:.88};
 const imagePoints=pose=>{
  const pixels=[];
  if(isGate){
   const origin=path(0),behind=3.7,span=order.length*.6+1.15;
   for(const lateral of [-span,span])for(const y of [.08,4.2])
    for(const forward of [-2.1,2.1])
     pixels.push(projectPoint({x:origin.x-origin.dx*behind+origin.dz*lateral+origin.dx*forward,
      y:origin.y+y,z:origin.z-origin.dz*behind-origin.dx*lateral+origin.dz*forward},
      pose.position,pose.look,fov,a));
  }else{
   for(const q of framingField)for(const front of [-2.35,2.7])
    for(const lateral of [-.82,.82])for(const y of [.14,3.0])
     pixels.push(projectPoint({x:q.x+q.dx*front-q.dz*lateral,
      y:q.y+y,z:q.z+q.dz*front+q.dx*lateral},
      pose.position,pose.look,fov,a));
  }
  return pixels;
 };
 if(!isGate){
  const one=setPose(1),pre=imagePoints(one).filter(q=>q.visible);
  if(pre.length){
   const pw=Math.max(...pre.map(q=>q.x))-Math.min(...pre.map(q=>q.x));
   const correction=clamp(pw/(shot.id==='backstretch'||shot.id==='fourth-turn'?1.60:1.40),.35,1);
   fov=Math.max(10.5,fov*correction);
  }
 }
 if(shot.id==='fourth-turn')fov=Math.min(34,fov);
 let scale=1,pose,raw;
 for(let i=0;i<35;i++){
  pose=setPose(scale);
  raw=imagePoints(pose).filter(p=>p.visible);
  if(raw.length!==(isGate?8:framingField.length*8)){scale*=1.13;continue}
  const xs=raw.map(p=>p.x),ys=raw.map(p=>p.y);
  const width=Math.max(...xs)-Math.min(...xs);
  const heightNdc=Math.max(...ys)-Math.min(...ys);
  if(width<=2*(bounds.right-bounds.left)&&heightNdc<=2*(bounds.upper-bounds.lower))break;
  scale*=1.08;
 }
 if(!raw?.length)throw new Error('No horse group visible to broadcast lens');
 const targetNdcY=isGate?.12:shot.id==='first-corner'?.07
  :shot.id==='backstretch'?.08:shot.id==='fourth-turn'?.10:.05;
 for(let step=0;step<6;step++){
  const projected=imagePoints(pose).filter(p=>p.visible);
  if(!projected.length)break;
  const cy=(Math.min(...projected.map(x=>x.y))+Math.max(...projected.map(x=>x.y)))/2;
  const horizontal=Math.hypot(pose.position.x-pose.look.x,pose.position.z-pose.look.z);
  const change=clamp((cy-targetNdcY)*horizontal*Math.tan(fov*Math.PI/360)*.8,-6,6);
  pose.look.y+=change;
 }
 raw=imagePoints(pose).filter(p=>p.visible);
 let lensShiftX=0,leadNoseViewportTarget=null,aheadScreenSide='center';
 if(isGate){
  const mid=(Math.max(...raw.map(p=>p.x))+Math.min(...raw.map(p=>p.x)))/2;
  lensShiftX=mid;
 }else{
  const q=path(lead.p),lane=lead.lane??runnerLane(lead.no,order.length,progress);
  const ahead=meters=>({x:q.x-q.dz*lane+q.dx*meters,y:q.y+2.02,
   z:q.z+q.dx*lane+q.dz*meters});
  const noseNdc=projectPoint(ahead(2.7),pose.position,pose.look,fov,a).x;
  const nextNdc=projectPoint(ahead(11),pose.position,pose.look,fov,a).x;
  const travel=nextNdc-noseNdc;
  const strength=clamp((Math.abs(travel)-.009)/.13,0,1);
  const leadTarget=.5+Math.sign(travel)*.28*strength;
  lensShiftX=noseNdc-2*(leadTarget-.5);
  leadNoseViewportTarget=leadTarget;
  aheadScreenSide=strength<.08?'towards-camera':travel>0?'right':'left';
 }
 const projectedWidth=Math.max(...raw.map(p=>p.x))-Math.min(...raw.map(p=>p.x));
 const station=path(pCenter+(isGate?0:inFront/distance));
 const cameraLane=-(pose.position.x-station.x)*station.dz
  +(pose.position.z-station.z)*station.dx;
 const railLane=outerOffsetAt(venue,distance,pCenter+(isGate?0:inFront/distance))
  +(rightCircuit?-half:half);
 const outsideDist=rightCircuit?railLane-cameraLane:cameraLane-railLane;
 if(outsideDist<8)throw new Error('Outside-rail camera is INSIDE track: '+outsideDist.toFixed(2)+'m');
 const result={...pose,viewportAspect:a,shotId:shot.id,fov,side:side*scale,
  subjects:group.map(o=>o.no),lensShiftX,outerRailSign:outsideSign,
  tracked:group.length,mode:isGate?'gate-front-broadcast':'rail-broadcast-'+shot.id,
  outerRailClearance:outsideDist,cameraLane,railLane,railOutsideVerified:true,
  outerCourseBulge:groupBulge,aheadScreenSide,gateScreenX:isGate?.5:null,
  leadNoseViewportTarget,leadNumber:lead.no,
  forwardGap:leadNoseViewportTarget===null?null
   :Math.min(leadNoseViewportTarget,1-leadNoseViewportTarget),
  referenceProgress:pCenter,stationAheadMeters:inFront,lockedCameraRequested:true,
  projectedWidth,dollyScale:scale,
  shotPerspective:isGate?'front-gate':shot.id==='backstretch'?'outside-side-field'
   :shot.id==='fourth-turn'?'outside-front-oblique':'outside-side'};
 if(shot.id==='fourth-turn'&&venue!=='阪神'){
  const sampleProgress=distance===3000?[.781,.795,.81,.825,.84,.85,.864]
   :[.675,.70,.73,.75,.78,.81,.835];
  const screens=[];
  for(const p of sampleProgress){
   const candidate=followLockedCameraPose(
    {pose:{...result,shotId:shot.id},startLeaderProgress:lead.p},
    [{no:lead.no,p:lead.p+(p-progress)}],path,{distance,venue,direction});
   const q=path(lead.p+(p-progress));
   const lane=lead.lane??runnerLane(lead.no,order.length,p);
   const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
   const projected=projectPoint(nose,candidate.position,candidate.look,fov,a);
   if(projected.visible)screens.push(.5+.5*(projected.x-result.lensShiftX));
  }
  if(screens.length){
   const low=Math.min(...screens),high=Math.max(...screens);
   const desiredShift=(low+high)/2-.46;
   const shift=desiredShift+.12;
   result.lensShiftX+=2*shift;
   result.leadNoseViewportTarget=clamp(result.leadNoseViewportTarget-shift,.20,.80);
   result.forwardGap=Math.min(result.leadNoseViewportTarget,1-result.leadNoseViewportTarget);
  }
  const q=path(lead.p),lane=lead.lane??runnerLane(lead.no,order.length,progress);
  const nose={x:q.x-q.dz*lane+q.dx*2,y:q.y+2,z:q.z+q.dx*lane+q.dz*2};
  const projected=projectPoint(nose,result.position,result.look,result.fov,a);
  if(projected.visible){
   const actual=.5+.5*(projected.x-result.lensShiftX);
   const correction=actual-clamp(actual,.24,.76);
   result.lensShiftX+=2*correction;
   result.leadNoseViewportTarget=clamp(result.leadNoseViewportTarget-correction,.20,.80);
   result.forwardGap=Math.min(result.leadNoseViewportTarget,1-result.leadNoseViewportTarget);
  }
 }
 return result;
}

export function followLockedCameraPose(rig,order,path,{distance=2000,venue='京都',direction='右'}={}){
 const leader=order?.[0];
 if(!leader)return rig.pose;
 if(rig.pose.shotId==='fourth-turn'&&venue!=='阪神'){
  const exitProgress=distance===3000?1-403.7/3000:.835;
  const station=path(exitProgress);
  const right=direction!=='左',sign=right?1:-1;
  const half=courseHalf(venue,distance);
  const rail=outerOffsetAt(venue,distance,exitProgress)+(right?-half:half);
  const outside=rail-sign*18;
  const position={x:station.x-station.dz*outside,y:station.y+2.5,
   z:station.z+station.dx*outside};
  const q=path(leader.p),lane=leader.lane??runnerLane(leader.no,order.length,leader.p);
  const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,
   z:q.z+q.dx*lane+q.dz*2.7};
  const leaders=order.slice(0,Math.min(5,order.length));
  const focus=leaders.reduce((sum,horse,i)=>{
   const h=path(horse.p),l=horse.lane??runnerLane(horse.no,order.length,horse.p);
   const w=i<3?1.2:.7;
   sum.x+=(h.x-h.dz*l+h.dx*2.7)*w;
   sum.z+=(h.z+h.dx*l+h.dz*2.7)*w;
   sum.weight+=w;
   return sum;
  },{x:0,z:0,weight:0});
  const look={x:focus.x/focus.weight,y:position.y-.15,z:focus.z/focus.weight};
  const cameraDistance=Math.hypot(nose.x-position.x,nose.z-position.z);
  const aspect=Math.max(.48,rig.pose.viewportAspect||.54);
  const leadYaw=Math.atan2(nose.x-position.x,nose.z-position.z);
  const groupYaw=Math.atan2(look.x-position.x,look.z-position.z);
  const delta=Math.atan2(Math.sin(groupYaw-leadYaw),Math.cos(groupYaw-leadYaw));
  const desiredFov=2*Math.atan(5/Math.max(24,cameraDistance))*180/Math.PI;
  const fov=clamp(Math.max(desiredFov,
   2*Math.atan(Math.tan(Math.abs(delta))/(aspect*.52))*180/Math.PI),18,36);
  const maxPan=Math.atan(Math.tan(fov*Math.PI/360)*aspect*.25);
  const yaw=leadYaw+maxPan*Math.tanh(delta/Math.max(.0001,maxPan));
  const aimDistance=Math.hypot(look.x-position.x,look.z-position.z);
  look.x=position.x+Math.sin(yaw)*aimDistance;
  look.z=position.z+Math.cos(yaw)*aimDistance;
  const laneAtStation=-(position.x-station.x)*station.dz
   +(position.z-station.z)*station.dx;
  const clearance=right?rail-laneAtStation:laneAtStation-rail;
  if(clearance<14.9)throw new Error('4C fixed exit camera crossed outer rail');
  return {...rig.pose,position,look,fov,lensShiftX:0,
   outerRailClearance:clearance,cameraLane:laneAtStation,railLane:rail,
   railOutsideVerified:true,leadNumber:leader.no,lockedCamera:true,
   cameraTrackYaw:0,baseShotId:'fourth-turn',
   leadNoseViewportTarget:.5,forwardGap:.5,
   trackingMode:'fixed-exit-camera-stable-broadcast',pullbackProgress:0};
 }
 const advance=rig.pose.stationAheadMeters||0;
 const startStation=path(rig.pose.referenceProgress+advance/distance);
 const startDifference=rig.pose.referenceProgress-rig.startLeaderProgress;
 const currentProgress=leader.p+startDifference+advance/distance;
 const station=path(currentProgress);
 const tangent=t=>{
  const sample=Math.max(0,Math.min(1,t));
  const a=path(Math.max(0,sample-.015)),b=path(Math.min(1,sample+.015));
  const len=Math.hypot(b.x-a.x,b.z-a.z);
  if(len<.001){const q=path(t);return {dx:q.dx,dz:q.dz}}
  return {dx:(b.x-a.x)/len,dz:(b.z-a.z)/len};
 };
 const initialHeading=tangent(rig.pose.referenceProgress+advance/distance);
 const currentHeading=tangent(currentProgress);
 const dot=initialHeading.dx*currentHeading.dx+initialHeading.dz*currentHeading.dz;
 const cross=initialHeading.dx*currentHeading.dz-initialHeading.dz*currentHeading.dx;
 const angle=Math.atan2(cross,dot);
 const cos=Math.cos(angle),sin=Math.sin(angle);
 const rotate=q=>({
  x:station.x+(q.x-startStation.x)*cos-(q.z-startStation.z)*sin,
  y:station.y+(q.y-startStation.y),
  z:station.z+(q.x-startStation.x)*sin+(q.z-startStation.z)*cos});
 const position=rotate(rig.pose.position),look=rotate(rig.pose.look);
 if(rig.pose.shotId==='fourth-turn'||rig.pose.shotId==='backstretch'||rig.pose.shotId==='start'){
  const q=path(leader.p),lane=leader.lane??runnerLane(leader.no,order.length,leader.p);
  const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
  const first=path(rig.startLeaderProgress);
  const firstLane=rig.startLeaderLane??runnerLane(leader.no,order.length,rig.startLeaderProgress);
  const initial={x:first.x-first.dz*firstLane+first.dx*2.7,y:first.y+2,
   z:first.z+first.dx*firstLane+first.dz*2.7};
  const expected=rotate(initial);
  const dx=nose.x-expected.x,dz=nose.z-expected.z;
  position.x+=dx;look.x+=dx;
  position.z+=dz;look.z+=dz;
 }
 if(rig.pose.shotId==='finish'){
  position.y=rig.pose.position.y;
  look.y=rig.pose.look.y;
 }
 const right=direction!=='左';
 const half=courseHalf(venue,distance);
 const railLane=outerOffsetAt(venue,distance,currentProgress)+(right?-half:half);
 let lane=-(position.x-station.x)*station.dz+(position.z-station.z)*station.dx;
 const limit=railLane+(right?-15:15);
 let offset=0;
 if(right&&lane>limit)offset=limit-lane;
 else if(!right&&lane<limit)offset=limit-lane;
 if(offset!==0){
  const dx=-station.dz*offset,dz=station.dx*offset;
  position.x+=dx;look.x+=dx;position.z+=dz;look.z+=dz;
  lane+=offset;
 }
 const clearance=right?railLane-lane:lane-railLane;
 if(clearance<11.9)throw new Error('Rail dolly crossed actual outer rail');
 return {...rig.pose,position,look,outerRailClearance:clearance,
  cameraLane:lane,railLane,railOutsideVerified:true,
  leadNumber:leader.no,lockedCamera:true,cameraTrackYaw:angle,
  baseShotId:rig.pose.shotId||null,
  lensShiftX:rig.pose.lensShiftX,fov:rig.pose.fov};
}

/**
 * Live director: owns the locked rig, the cut list, the broadcast
 * debug contract and the turf-chip kick-up. Course furniture lives in
 * course-v18.js; this module is camera and craft only.
 */
export function createBroadcastDirector({THREE,scene,stage,models,config,path,route,routeLength}){
 const cuts=courseShotCuts(route,routeLength,config);
 const duration=Number(config?.duration)||80;
 const reduced=()=>typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const ui=document.createElement('div');ui.id='race-cinematic-overlay';
 ui.setAttribute('aria-hidden','true');stage?.append(ui);
 const perHorse=3;
 const chips=new THREE.InstancedMesh(new THREE.PlaneGeometry(.11,.20),
  new THREE.MeshBasicMaterial({color:0x7fae54,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}),
  Math.max(1,models.length)*perHorse);
 chips.frustumCulled=false;scene.add(chips);
 const dummy=new THREE.Object3D();
 let lastShot='',previousClock=0,lockedRig=null,cameraRebases=0;
 function update({clock,progress,order,finishOrder=[],frameDt=0,camera,desired,look,rate=1}){
  const seeked=Math.abs(clock-previousClock)>3||clock<previousClock;
  previousClock=clock;
  const p=Math.max(0,Math.min(1,progress)),shot=chooseRaceShot(p,cuts);
  let cut=shot.id!==lastShot;
  if(cut){ui.dataset.shot=shot.id;lastShot=shot.id}
  const crossed=finishCrossings(finishOrder,clock,duration),runningOut=clock>duration;
  ui.dataset.phase=clock<=0?'gate':runningOut?'run-out':shot.id;
  const gateMode=shot.id==='start'&&clock<=1.8?'gate':'running';
  const mustRebase=cut||seeked||!lockedRig||lockedRig.mode!==gateMode
   ||Math.abs(lockedRig.aspect-camera.aspect)>.015;
  if(mustRebase){
   const base=raceCameraPose({shot,progress:p,order,path,aspect:camera.aspect,
    clock,direction:config?.direction,distance:config?.distance,venue:config?.venue});
   lockedRig={pose:{...base,shotId:shot.id},
    startLeaderProgress:order[0]?.p??p,startLeaderLane:order[0]?.lane??0,
    mode:gateMode,aspect:camera.aspect};
   cameraRebases++;cut=true;
  }
  const pose=followLockedCameraPose(lockedRig,order,path,{
   distance:config?.distance,venue:config?.venue,direction:config?.direction});
  desired.set(pose.position.x,pose.position.y,pose.position.z);
  look.set(pose.look.x,pose.look.y,pose.look.z);
  let j=0;
  for(let i=0;i<models.length;i++)for(let k=0;k<perHorse;k++,j++){
   const root=models[i].root,t=(clock*.16+i*.37+k/perHorse)%1;
   dummy.position.copy(root.position);
   dummy.position.x-=Math.sin(root.rotation.y)*(1.2+t*2.4);
   dummy.position.z-=Math.cos(root.rotation.y)*(1.2+t*2.4);
   dummy.position.y+=.12+Math.sin(t*Math.PI)*.45;
   dummy.rotation.set(-Math.PI/2+t,(i+k)*1.7,0);
   dummy.scale.setScalar(clock>.05&&!reduced()?(1-t)*.8:.0001);
   dummy.updateMatrix();chips.setMatrixAt(j,dummy.matrix);
  }
  chips.instanceMatrix.needsUpdate=true;
  const debug={shot:shot.id,progress:p,rate,cut,scriptedCuts:5,
   mode:CAMERA_V18.mode,cuts,position:shot.label,runOut:runningOut,
   crossed:crossed.length,cameraRebases,lockedDirection:true,lockedLens:true,
   sideOn:shot.ahead===0,pose,replay:false};
  if(typeof window!=='undefined')window.RACE_CINEMATIC_DEBUG=debug;
  return {cut,shot:shot.id,fov:pose.fov,lensShiftX:pose.lensShiftX||0,pose};
 }
 return {update,cuts};
}
