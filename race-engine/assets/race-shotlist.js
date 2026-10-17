import {KYOTO_CUTS,runnerLane,kyotoOuterCourseOffset,KYOTO_INNER} from './kyoto-course.js?v=kyoto-v12';
/**
 * Racing broadcast grammar — not a horse portrait camera.
 * Main race: operator on the OUTER rail, first five runners and adjacent outside
 * challengers visible together. Space is left AHEAD of the field in SCREEN
 * coordinates (right in a natural outer-rail/right-handed Kyoto shot).
 * Source: PR Center official JRA 2018 camera breakdown.
 */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'start',until:.28,kicker:'01 / START',label:'スタート・第1角',side:35,height:9,ahead:0,fov:41}),
 Object.freeze({id:'second-turn',until:.60,kicker:'02 / THE FIELD',label:'2コーナー・向正面',side:38,height:7.8,ahead:2,fov:40}),
 Object.freeze({id:'third-turn',until:.836,kicker:'03 / THE MOVE',label:'3・4コーナー 勝負所',side:43,height:9.4,ahead:6,fov:40}),
 Object.freeze({id:'straight',until:Infinity,kicker:'04 / THE FINISH',label:'最後の直線・先頭争い',side:43,height:7.5,ahead:0,fov:38})
]);
export function chooseRaceShot(progress,cuts=RACE_SHOT_LIST.map(s=>s.until)){
 const p=Number.isFinite(progress)?Math.max(0,progress):0;
 return RACE_SHOT_LIST[cuts.findIndex(x=>p<x)]||RACE_SHOT_LIST[3];
}
export function courseShotCuts(route,routeLength,config){
 return config.venue==='京都'&&config.distance===2000&&config.surface==='芝'?[...KYOTO_CUTS]:[.18,.52,.80,Infinity];
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
export function raceCameraPose({shot,progress,order,path,aspect=1,clock=Infinity,direction='右',distance=2000,venue='京都'}){
 const lead=order?.[0];
 if(!lead)return {position:{x:0,y:9,z:40},look:{x:0,y:2,z:0},fov:39,side:40,subjects:[],lensShiftX:0,mode:'empty'};
 const isGate=shot.id==='start'&&clock<=1.8;
 const outerSign=direction==='左'?1:-1;
 const maxGap=Math.min(19,distance*.0095);
 let group=isGate?order.slice():order.slice(0,5).filter((o,i)=>i<3||(lead.p-o.p)*distance<=maxGap);
 // Positions in this simulator have no measured lateral running telemetry.
 // We do not pretend sixth place is running wide, but reveal it immediately
 // after it joins the first five. Five is the maximum size of the live closeup.
 const pCenter=isGate?0:group.reduce((sum,o,i)=>sum+o.p*(i===0?1.7:1),0)/(group.length+.7);
 const track=path(pCenter),field=group.map(o=>{
  const q=path(o.p),lane=runnerLane(o.no,order.length,progress);
  return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane,dx:q.dx,dz:q.dz,no:o.no,p:o.p};
 });
 const focus=isGate?{x:track.x,y:track.y,z:track.z}:{
  x:field.reduce((a,q)=>a+q.x,0)/field.length,
  y:field.reduce((a,q)=>a+q.y,0)/field.length,
  z:field.reduce((a,q)=>a+q.z,0)/field.length
 };
 // Keep the camera outside the OUTERMOST rail. Kyoto's 3C-4C outer
 // course extends up to 38m beyond the inner A-course: the former 43m
 // camera position was INSIDE this outside loop.
 const modeledOuter=venue==='京都'&&distance===2000?
  Math.max(0,...group.map(o=>-kyotoOuterCourseOffset(o.p))):0;
 const courseHalfWidth=venue==='京都'&&distance===2000?KYOTO_INNER.width/2:13.5;
 const requiredOutside=modeledOuter+courseHalfWidth+12;
 const baselineSide=shot.id==='third-turn'?50:shot.id==='straight'?39:shot.id==='second-turn'?35:39;
 const side=isGate?49:Math.max(baselineSide,requiredOutside);
 const ahead=isGate?32:shot.id==='third-turn'?4:shot.id==='second-turn'?2:0;
 const height=isGate?8.5:shot.id==='third-turn'?9.1:7.2;
 const a=Math.max(.48,Number(aspect)||1);
 const fov=isGate?43:a>1.45?20:a<.85?34:29;
 const poseAt=(scale)=>{
  const lateral=outerSign*side*scale,forward=ahead*scale;
  return {position:{x:focus.x+track.dz*lateral+track.dx*forward,
   y:focus.y+height+Math.log2(scale)*.45,
   z:focus.z-track.dx*lateral+track.dz*forward},
   look:{x:focus.x,y:focus.y+1.8,z:focus.z}};
 };
 const imagePoints=(pos,look)=>{
  const data=[];
  for(const q of field)
   for(const longitudinal of [-2.35,2.7])
    for(const transverse of [-.85,.85])
     for(const y of [.15,3.0])
      data.push(projectPoint({x:q.x+q.dx*longitudinal-q.dz*transverse,
       y:q.y+y,z:q.z+q.dz*longitudinal+q.dx*transverse},pos,look,fov,a));
  return data;
 };
 const boundary=isGate?{left:.055,right:.94,lower:.07,upper:.94}:
  {left:.07,right:.81,lower:.10,upper:.88};
 let scale=1,pose,ext=null;
 for(let i=0;i<32;i++){
  pose=poseAt(scale);
  const pp=imagePoints(pose.position,pose.look).filter(q=>q.visible);
  if(pp.length!==field.length*8){scale*=1.15;continue}
  const xs=pp.map(x=>x.x),ys=pp.map(x=>x.y);
  ext={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  if(ext.maxX-ext.minX<=2*(boundary.right-boundary.left)&&
   ext.maxY-ext.minY<=2*(boundary.upper-boundary.lower))break;
  scale*=1.105;
 }
 if(!ext)throw new Error('Camera cannot fit leading horses');
 const frameY=(ext.minY+ext.maxY)/2;
 pose.look.y+=frameY*.55;
 if(!isGate)pose.look.y-=Math.min(3.4,height*.43);
 let shift=0,gateScreenX=null,aheadScreenSide='right';
 if(isGate){
  // Place the ENTIRE 17-stall starting gate at the trailing edge, not
  // its CENTER at the edge (which cropped half of the stalls).
  // Physical gate root is 3.7m behind the start line and ±10.2m broad.
  pose.look.y-=3.0;
  const origin=path(0),behind=3.7,halfStalls=order.length*.6+1.15;
  const leftRight=[];
  for(const lateral of [-halfStalls,halfStalls]){
   for(const heightAt of [.1,4.2]){
    const point={x:origin.x-origin.dx*behind+origin.dz*lateral,
     y:origin.y+heightAt,z:origin.z-origin.dz*behind-origin.dx*lateral};
    leftRight.push(projectPoint(point,pose.position,pose.look,fov,a));
   }
  }
  const next={x:origin.x+origin.dx*11,y:origin.y+2.2,z:origin.z+origin.dz*11};
  const atGate={x:origin.x-origin.dx*behind,y:origin.y+2.2,z:origin.z-origin.dz*behind};
  const advancesRight=projectPoint(next,pose.position,pose.look,fov,a).x>
   projectPoint(atGate,pose.position,pose.look,fov,a).x;
  const ndcEdge=advancesRight?Math.min(...leftRight.map(q=>q.x)):Math.max(...leftRight.map(q=>q.x));
  const trailingScreenEdge=advancesRight?.055:.945;
  shift=ndcEdge-2*(trailingScreenEdge-.5);
  gateScreenX=trailingScreenEdge;
  aheadScreenSide=advancesRight?'right':'left';

 }else{
  const refined=imagePoints(pose.position,pose.look).filter(q=>q.visible);
  const edge=outerSign===-1?Math.max(...refined.map(q=>q.x)):Math.min(...refined.map(q=>q.x));
  const target=outerSign===-1?boundary.right:boundary.left;
  shift=edge-2*(target-.5);
  aheadScreenSide=outerSign===-1?'right':'left';
 }
 return {...pose,fov,side:side*scale,subjects:group.map(o=>o.no),
  lensShiftX:shift,outerRailSign:outerSign,tracked:group.length,
  mode:isGate?'establishing-gate':'outer-rail-3to5',
  outerRailClearance:side*scale-(modeledOuter+courseHalfWidth),
  outerCourseBulge:modeledOuter,aheadScreenSide,gateScreenX,forwardGap:1-boundary.right,
  projectedWidth:ext.maxX-ext.minX,dollyScale:scale};
}
