import {KYOTO_CUTS,runnerLane,kyotoOuterCourseOffset,KYOTO_INNER} from './kyoto-course.js?v=kyoto-v12';
/**
 * JRA-style, five-camera Kyoto broadcast, reconstructed from supplied JRA reference frames:
 * 01 Start gate, 02 first corner positioning, 03 backstretch lateral field view,
 * 04 fourth corner moves, 05 homestretch finish.
 * Track-side positions are outside the outermost turf rail at all cuts.
 */
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
function pickSubjects(shot,order,distance,aspect){
 if(shot.subjects==='all'||shot.subjects==='field')return order.slice();
 if(shot.subjects==='backstretch-pack')return order.slice(0,Math.min(order.length,aspect<.85?7:7));
 if(shot.subjects==='moves')return order.slice(0,Math.min(order.length,5));
 const lead=order[0],gap=o=>(lead.p-o.p)*distance;
 if(shot.subjects==='pack')return order.slice(0,7).filter((o,i)=>i<6||gap(o)<=12);
 if(shot.subjects==='frontpack'){
  // Three-quarter entry from the outer rail: five foreground competitors.
  // The remaining pack is visible in depth behind, not framing the lens.
  const pack=order.slice(0,aspect<.85?3:6).filter((o,i)=>i<(aspect<.85?3:5)||gap(o)<=8);
  return pack.length>=(aspect<.85?3:5)?pack:order.slice(0,aspect<.85?3:5);
 }
 if(shot.subjects==='leaders'){
  const firstFive=order.slice(0,aspect<.85?5:7);
  const pack=firstFive.filter((o,i)=>i<3||(i===3?gap(o)<=16:gap(o)<=10&&(firstFive[3].p-o.p)*distance<=2.6));
  return aspect<.85?order.slice(0,5):(pack.length>=4?pack:firstFive.slice(0,6));
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
 if(id==='backstretch')return {left:.04,right:.96,lower:.10,upper:.90};
 if(id==='fourth-turn')return {left:.08,right:.80,lower:.10,upper:.88};
 return {left:.10,right:.82,lower:.12,upper:.88};
}
export function raceCameraPose({shot,progress,order,path,aspect=1,clock=Infinity,direction='右',distance=2000,venue='京都'}){
 const lead=order?.[0];
 if(!lead)return {position:{x:0,y:9,z:40},look:{x:0,y:2,z:0},fov:39,side:40,subjects:[],lensShiftX:0,mode:'empty'};
 const isGate=shot.id==='start'&&clock<=1.8;
 // Renderer geometry uses offsetPoint(t,lane) = {x-dz*lane,z+dx*lane}.
 // Kyoto's OUTERMOST rail is lane = kyotoOuterCourseOffset(t)-half < 0.
 // Previous outsideSign=-1 placed the camera at POSITIVE lane (infield).
 // Right-handed Kyoto therefore uses outsideSign=+1 in setPose below.
 const rightCircuit=direction!=='左',outsideSign=rightCircuit?1:-1;
 const group=isGate?order.slice():pickSubjects(shot,order,distance,aspect);
 const pCenter=isGate?0:(shot.id==='backstretch'||shot.id==='fourth-turn'?lead.p:group.reduce((sum,o,i)=>sum+o.p*(i===0?1.6:1),0)/(group.length+.6));
 const center=path(pCenter),field=group.map(o=>{
  const q=path(o.p),lane=runnerLane(o.no,order.length,progress);
  return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane,dx:q.dx,dz:q.dz,no:o.no,p:o.p};
 });
 const framingField=shot.id==='backstretch'?field.slice(0,4):shot.id==='fourth-turn'?field.slice(0,3):field;
 const focus=isGate?{x:center.x,y:center.y,z:center.z}:{
  x:framingField.reduce((a,q)=>a+q.x,0)/framingField.length,
  y:framingField.reduce((a,q)=>a+q.y,0)/framingField.length,
  z:framingField.reduce((a,q)=>a+q.z,0)/framingField.length
 };
 // Unlike a game chase-camera, a real 3C outside camera waits ahead of
 // approaching horses, producing the foreshortened head-on TV perspective.
 // Track-local outside normal comes from the CAMERA station, not the pack.
 const inFront=shot.id==='backstretch'?0:(shot.ahead||0);
 const cameraStation=path(pCenter+(isGate?0:inFront/distance));
 const groupBulge=venue==='京都'&&distance===2000?
  Math.max(0,...group.map(o=>-kyotoOuterCourseOffset(o.p))):0;
 const stationBulge=venue==='京都'&&distance===2000?
  Math.max(0,-kyotoOuterCourseOffset(pCenter+inFront/distance)):0;
 const half=venue==='京都'&&distance===2000?KYOTO_INNER.width/2:13.5;
 // A single continuous TV dolly needs rail clearance for the WHOLE cut,
 // including the full 38m outside flare of Kyoto's 3C/4C.
 const reserveBulge=(venue==='京都'&&distance===2000&&
  shot.id==='fourth-turn')?38:0;
 const outsideNeeded=Math.max(groupBulge,stationBulge,reserveBulge)+half+
  17;
 const side=isGate?Math.max(shot.side,half+12):Math.max(shot.side||31,outsideNeeded);
 const a=Math.max(.48,Number(aspect)||1);
 const baseFov=shot.fov||28;
 let fov=isGate?(a>1.45?18:a<.85?51:38):
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
  shot.id==='backstretch'?{left:.07,right:.86,lower:.11,upper:.90}:
  shot.id==='fourth-turn'?{left:.10,right:.83,lower:.11,upper:.88}:
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
   for(const q of framingField)for(const front of [-2.35,2.7])
    for(const lateral of [-.82,.82])for(const y of [.14,3.0])
     pixels.push(projectPoint({x:q.x+q.dx*front-q.dz*lateral,
      y:q.y+y,z:q.z+q.dz*front+q.dx*lateral},
      pose.position,pose.look,fov,a));
  }
  return pixels;
 };
 // True broadcast zoom: use the field's geometry to choose a focal length.
 // The old auto-fit always pulled back for the full pack and created a distant
 // picture even at 3C/4C. At minimum rail clearance first, make the chosen
 // 3-5 competitors use 60-72% of the width, then back off only for clipping.
 if(!isGate){
  const one=setPose(1),pre=imagePoints(one).filter(q=>q.visible);
  if(pre.length){
   const pw=Math.max(...pre.map(q=>q.x))-Math.min(...pre.map(q=>q.x));
   const correction=clamp(pw/(shot.id==='backstretch'||shot.id==='fourth-turn'?1.60:1.40),.35,1);
   fov=Math.max(10.5,fov*correction);
  }
 }
 if(shot.id==='fourth-turn')fov=Math.min(34,fov);
 // Zoom in to the actual competition, but back off only as much as needed
 // to keep the picture's selected 3–5 runners uncut.
 let scale=1,pose,raw;
 for(let i=0;i<35;i++){
  pose=setPose(scale);
  raw=imagePoints(pose).filter(p=>p.visible);
  if(raw.length!== (isGate?8:framingField.length*8)){scale*=1.13;continue}
  const xs=raw.map(p=>p.x),ys=raw.map(p=>p.y);
  const width=Math.max(...xs)-Math.min(...xs);
  const heightNdc=Math.max(...ys)-Math.min(...ys);
  if(width<=2*(bounds.right-bounds.left)&&heightNdc<=2*(bounds.upper-bounds.lower))break;
  scale*=1.08;
 }
 if(!raw?.length)throw new Error('No horse group visible to broadcast lens');
 // Broadcast operator vertical framing: solve for the selected horses'
 // actual projected screen Y instead of guessing a pitch. This prevents the
 // tight corner cameras clipping jockeys off-screen or filming mostly sky.
 const targetNdcY=isGate?.12:shot.id==='first-corner'?.07:
  shot.id==='backstretch'?.08:shot.id==='fourth-turn'?.10:.05;
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
  // The user's reference shows the whole gate filling the width, not a
  // minuscule gate at x=5% with a field of empty turf to the right.
  const mid=(Math.max(...raw.map(p=>p.x))+Math.min(...raw.map(p=>p.x)))/2;
  lensShiftX=mid; // optical center x=.50
 }else{
  // Frame the RACE LEADER, not the midpoint or rearmost horse of the pack.
  // Camera optics are shifted so there is always lead-room ahead of the
  // leader's nose (22% on lateral TV shots). At an almost head-on angle
  // the room transitions continuously to the center/forward depth; a sign
  // flip at the corner must not teleport the camera to the opposite side.
  const q=path(lead.p),lane=runnerLane(lead.no,order.length,progress);
  const ahead=(meters)=>({
   x:q.x-q.dz*lane+q.dx*meters,
   y:q.y+2.02,
   z:q.z+q.dx*lane+q.dz*meters
  });
  const noseNdc=projectPoint(ahead(2.7),pose.position,pose.look,fov,a).x;
  const nextNdc=projectPoint(ahead(11),pose.position,pose.look,fov,a).x;
  const travel=nextNdc-noseNdc;
  const strength=clamp((Math.abs(travel)-.009)/.13,0,1);
  const leadTarget=.5+Math.sign(travel)*.28*strength;
  lensShiftX=noseNdc-2*(leadTarget-.5);
  // This is a semantic commitment: the front horse sets the frame. Other
  // horses behind may fall off screen instead of forcing a huge zoom-out.
  leadNoseViewportTarget=leadTarget;
  aheadScreenSide=strength<.08?'towards-camera':travel>0?'right':'left';
 }
 const projectedWidth=Math.max(...raw.map(p=>p.x))-Math.min(...raw.map(p=>p.x));
 // Independently audit the camera against the rail as it is actually drawn
 // in renderer.js (negative lane on the Kyoto outer course), not a label.
 const station=path(pCenter+(isGate?0:inFront/distance));
 const cameraLane=-(pose.position.x-station.x)*station.dz+
  (pose.position.z-station.z)*station.dx;
 const railLane=rightCircuit
  ? (venue==='京都'&&distance===2000?kyotoOuterCourseOffset(pCenter+(isGate?0:inFront/distance)):0)-half
  : (venue==='京都'&&distance===2000?kyotoOuterCourseOffset(pCenter+(isGate?0:inFront/distance)):0)+half;
 const outsideDist=rightCircuit?railLane-cameraLane:cameraLane-railLane;
 if(outsideDist<8)throw new Error('Outside-rail camera is INSIDE track: '+outsideDist.toFixed(2)+'m');
 const result={...pose,viewportAspect:a,shotId:shot.id,fov,side:side*scale,subjects:group.map(o=>o.no),
  lensShiftX,outerRailSign:outsideSign,tracked:group.length,
  mode:isGate?'gate-front-broadcast':'rail-broadcast-'+shot.id,
  outerRailClearance:outsideDist,cameraLane,railLane,railOutsideVerified:true,outerCourseBulge:groupBulge,
  aheadScreenSide,gateScreenX:isGate?.5:null,
  leadNoseViewportTarget,leadNumber:lead.no,
  forwardGap:leadNoseViewportTarget===null?null:Math.min(leadNoseViewportTarget,1-leadNoseViewportTarget),
  referenceProgress:pCenter,stationAheadMeters:inFront,lockedCameraRequested:true,
  projectedWidth,dollyScale:scale,
  shotPerspective:isGate?'front-gate':shot.id==='backstretch'?'outside-side-field':
   shot.id==='fourth-turn'?'outside-front-oblique':'outside-side'};
 // Precompose the complete 4C tracking arc on the first frame. The camera
 // follows the curved rail with a LOCKED lens, so centering only the first
 // frame can push the leader off the iPhone edge halfway through the turn.
 // Simulate the actual rail dolly and reserve lead room across the full cut.
 if(shot.id==='fourth-turn'){
  const sampleProgress=[.675,.70,.73,.75,.78,.81,.835];
  const screens=[];
  for(const p of sampleProgress){
   const candidate=followLockedCameraPose({pose:{...result,shotId:shot.id},startLeaderProgress:lead.p},
    [{no:lead.no,p:lead.p+(p-progress)}],path,{distance,venue,direction});
   const q=path(lead.p+(p-progress));
   const lane=runnerLane(lead.no,order.length,p);
   const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
   const projected=projectPoint(nose,candidate.position,candidate.look,fov,a);
   if(projected.visible) screens.push(.5+.5*(projected.x-result.lensShiftX));
  }
  if(screens.length){
   const low=Math.min(...screens),high=Math.max(...screens);
   // Center the extreme projected positions in the usable portrait frame.
   // A constant shift preserves the no-zoom/no-jitter broadcast requirement.
   const desiredShift=(low+high)/2-.46;
   // A cut must never acquire an off-screen target. Optical shift and
   // declared target are a single constraint, not independent guesses.
   const shift=desiredShift+.12;
   result.lensShiftX+=2*shift;
   result.leadNoseViewportTarget=clamp(result.leadNoseViewportTarget-shift,.20,.80);
   result.forwardGap=Math.min(result.leadNoseViewportTarget,1-result.leadNoseViewportTarget);
  }
  // The cut can be entered directly at any progress (seek/deep link).
  // Reconcile the REAL leader's projected nose at this exact entry point;
  // the precomposed arc alone assumes an earlier cut entrance.
  const q=path(lead.p),lane=runnerLane(lead.no,order.length,progress);
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

/**
 * Film-style TRACKING DOLLY: within each cut, freeze the lens and viewing
 * orientation, moving position and look target by the SAME world-space delta.
 * No recalculated focal lengths, lens shifts, pack-centre yaw or per-frame
 * shot fit (those were the source of visible shaking on iPhone).
 *
 * This is a pure function: a cut change/seek creates a new rig once,
 * ordinary playback follows the leading horse's distance on the course.
 */
export function followLockedCameraPose(rig,order,path,{distance=2000,venue='京都',direction='右'}={}){
 const leader=order?.[0];
 if(!leader)return rig.pose;
 if(rig.pose.shotId==='fourth-turn'){
  // One stationary low camera at the 4C EXIT, outside the physical rail.
  // Follow the leading five by smoothly aiming at their lead horse and
  // using a tight telephoto lens. Camera position never follows the pack.
  const exitProgress=.835;
  const station=path(exitProgress);
  const right=direction!=='左',sign=right?1:-1;
  const half=venue==='京都'&&distance===2000?KYOTO_INNER.width/2:13.5;
  const rail=(venue==='京都'&&distance===2000?kyotoOuterCourseOffset(exitProgress):0)+(right?-half:half);
  const outside=rail-sign*18;
  const position={x:station.x-station.dz*outside,y:station.y+5.2,
   z:station.z+station.dx*outside};
  const q=path(leader.p),lane=runnerLane(leader.no,order.length,leader.p);
  const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,
   z:q.z+q.dx*lane+q.dz*2.7};
  // Pan toward the center of the front 3-5 horses rather than chasing a
  // single nose; this keeps the leading contest in a stable tight frame.
  const leaders=order.slice(0,Math.min(5,order.length));
  const focus=leaders.reduce((sum,horse,i)=>{
   const h=path(horse.p),l=runnerLane(horse.no,order.length,horse.p);
   const w=i<3?1.25:0.75;
   sum.x+=(h.x-h.dz*l+h.dx*2.7)*w;
   sum.y+=(h.y+2.5)*w;
   sum.z+=(h.z+h.dx*l+h.dz*2.7)*w;
   sum.weight+=w;
   return sum;
  },{x:0,y:0,z:0,weight:0});
  const look={x:focus.x/focus.weight,y:focus.y/focus.weight,z:focus.z/focus.weight};
  const progress=Math.max(0,Math.min(1,(leader.p-.68)/.15));
  const ease=progress*progress*(3-2*progress);
  // Tight shot of ~5 leaders, modest easing as they reach the exit.
  // Keep the full leading contest visible on a narrow iPhone viewport.
  // 12° cropped the actual leader to x=.133 in the smoke projection.
  const fov=18+5*ease;
  // The five-horse centroid can be several metres behind the leader. Close
  // to the exit that angle exceeded the entire portrait lens, clipping the
  // leader despite the unchanged fixed camera. Smoothly limit ONLY the pan
  // offset from the leader's bearing. tanh has no clamp boundary/jump; the
  // stationary camera and the original monotonic 18–23° zoom are preserved.
  const aspect=rig.pose.viewportAspect||.54;
  const leadYaw=Math.atan2(nose.x-position.x,nose.z-position.z);
  const groupYaw=Math.atan2(look.x-position.x,look.z-position.z);
  const delta=Math.atan2(Math.sin(groupYaw-leadYaw),Math.cos(groupYaw-leadYaw));
  const maxPan=Math.atan(Math.tan(fov*Math.PI/360)*aspect*.30);
  const yaw=leadYaw+maxPan*Math.tanh(delta/maxPan);
  const aimDistance=Math.hypot(look.x-position.x,look.z-position.z);
  look.x=position.x+Math.sin(yaw)*aimDistance;
  look.z=position.z+Math.cos(yaw)*aimDistance;
  const laneAtStation=-(position.x-station.x)*station.dz+(position.z-station.z)*station.dx;
  const clearance=right?rail-laneAtStation:laneAtStation-rail;
  if(clearance<14.9)throw new Error('4C fixed exit camera crossed outer rail');
  return {...rig.pose,position,look,fov,lensShiftX:0,
   outerRailClearance:clearance,cameraLane:laneAtStation,railLane:rail,
   railOutsideVerified:true,leadNumber:leader.no,lockedCamera:true,
   cameraTrackYaw:0,baseShotId:'fourth-turn',
   leadNoseViewportTarget:.5,forwardGap:.5,
   trackingMode:'fixed-exit-camera-front-five-pan',pullbackProgress:ease};
 }
 const advance=rig.pose.stationAheadMeters||0;
 const startStation=path(rig.pose.referenceProgress+advance/distance);
 // The camera is bolted to an OUTSIDE-RAIL dolly. Its heading is fixed
 // RELATIVE TO THE TRACK, not to compass north. On Kyoto's curves the
 // dolly itself rotates gradually with the continuously differentiable
 // path, but no jittery pursuit of individual horses or lenses occurs.
 const startDifference=rig.pose.referenceProgress-rig.startLeaderProgress;
 const currentProgress=leader.p+startDifference+advance/distance;
 const station=path(currentProgress);
 // Raw piecewise course tangents have a 29-degree seam around p=.344.
 // Derive a CONTINUOUS track bearing from nearby path positions instead.
 const tangent=t=>{
  // Run-out continues beyond p=1. Clamping only the forward sample would
  // reverse the tangent after the finish and spin the replay camera 180°.
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
 const rotate=(q)=>({
  x:station.x+(q.x-startStation.x)*cos-(q.z-startStation.z)*sin,
  y:station.y+(q.y-startStation.y),
  z:station.z+(q.x-startStation.x)*sin+(q.z-startStation.z)*cos
 });
 const position=rotate(rig.pose.position),look=rotate(rig.pose.look);
 // Fourth turn: follow the lead horse with ONE deterministic, continuous
 // translation. The old two sequential corrections fought each other,
 // especially where the outside rail curves away from the pack.
 if(rig.pose.shotId==='fourth-turn'||rig.pose.shotId==='backstretch'){
  const q=path(leader.p),lane=runnerLane(leader.no,order.length,leader.p);
  const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
  const first=path(rig.startLeaderProgress);
  const firstLane=runnerLane(leader.no,order.length,rig.startLeaderProgress);
  const initial={x:first.x-first.dz*firstLane+first.dx*2.7,y:first.y+2,z:first.z+first.dx*firstLane+first.dz*2.7};
  const expected=rotate(initial);
  // Correct the camera's full translation rather than steering its aim.
  // The lead horse remains stationary relative to the optical axis.
  const dx=nose.x-expected.x,dz=nose.z-expected.z;
  position.x+=dx;look.x+=dx;
  position.z+=dz;look.z+=dz;
 }
 // Keep the finishing straight level: no elevation bob or pitch variation.
 if(rig.pose.shotId==='finish'){
  position.y=rig.pose.position.y;
  look.y=rig.pose.look.y;
 }
 const right=direction!=='左';
 const half=venue==='京都'&&distance===2000?KYOTO_INNER.width/2:13.5;
 const railLane=(venue==='京都'&&distance===2000?kyotoOuterCourseOffset(currentProgress):0)+(right?-half:half);
 let lane=-(position.x-station.x)*station.dz+(position.z-station.z)*station.dx;
 // Numerical safety near sharp bends: move BOTH position/target laterally.
 // The visual bearing stays a fixed angle relative to the course tangent.
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
