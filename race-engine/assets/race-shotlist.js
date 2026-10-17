import {KYOTO_CUTS,runnerLane} from './kyoto-course.js?v=kyoto-v11-1';
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
export function raceCameraPose({shot,progress,order,path,aspect=1,clock=Infinity,direction='右',distance=2000}){
 const leader=order?.[0];
 if(!leader)return {position:{x:0,y:9,z:35},look:{x:0,y:2,z:0},fov:41,side:35,subjects:[],mode:'empty',lensShiftX:0};
 const outerSign=direction==='左'?1:-1;
 const isGate=shot.id==='start'&&clock<=3.8;
 // Only the opening gate uses all runners. From the first few seconds onwards
 // any sudden fall-away in the pack is excluded from the live race shot.
 const maxLeadGap=clamp(distance*.016,22,34);
 let group=order.slice(0,isGate?order.length:5);
 if(!isGate)group=group.filter((h,i)=>i<3||(leader.p-h.p)*distance<=maxLeadGap);
 if(!isGate&&order.length>5){
  const fifth=group.at(-1);
  // If a sixth horse is genuinely attached to the leading five, include it
  // rather than chopping off an outside challenger at the screen boundary.
  const adjacent=order.slice(5,7).filter(h=>(fifth.p-h.p)*distance<3.0&&(leader.p-h.p)*distance<maxLeadGap);
  group=group.concat(adjacent);
 }
 const pCenter=group.reduce((sum,h,i)=>sum+h.p*(i===0?2:1),0)/(group.length+1);
 const track=path(pCenter),head=path(leader.p);
 const field=group.map(o=>{
  const q=path(o.p),lane=runnerLane(o.no,order.length,progress);
  return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane,no:o.no,p:o.p,
   dx:q.dx,dz:q.dz};
 });
 const focus={x:field.reduce((s,q)=>s+q.x,0)/field.length,
  y:field.reduce((s,q)=>s+q.y,0)/field.length,z:field.reduce((s,q)=>s+q.z,0)/field.length};
 let side=isGate?48:shot.side,ahead=isGate?0:shot.ahead;
 const height=shot.height,fov=isGate?42:shot.fov;
 const aspectRatio=Math.max(.45,Number(aspect)||1);
 const poseAt=scale=>{
  const lateral=outerSign*side*scale,forward=ahead*scale;
  return {position:{x:focus.x+track.dz*lateral+track.dx*forward,
   y:focus.y+height+Math.log2(scale)*.8,
   z:focus.z-track.dx*lateral+track.dz*forward},
   look:{x:focus.x,y:focus.y+2.0,z:focus.z}};
 };
 const imagePoints=(pos,look)=>{
  const data=[];
  for(const q of field){
   // Hoof/shoulder/head margins and lateral horses are model geometry
   // envelopes; not simply projected saddlecloth centers.
   for(const longitudinal of [-2.35,0,2.7])
    for(const transverse of [-.65,.65])
     for(const h of [.15,1.6,3.0]){
      const point={x:q.x+q.dx*longitudinal-q.dz*transverse,
       y:q.y+h,z:q.z+q.dz*longitudinal+q.dx*transverse};
      data.push(projectPoint(point,pos,look,fov,aspectRatio));
     }
  }
  return data;
 };
 let scale=1,projected,pose,ext;
 const boundary=isGate?{left:.055,right:.945,lower:.08,upper:.93}:
  {left:.075,right:.805,lower:.16,upper:.82};
 for(let iteration=0;iteration<28;iteration++){
  pose=poseAt(scale);projected=imagePoints(pose.position,pose.look);
  const valid=projected.filter(q=>q.visible);
  if(valid.length!==projected.length){scale*=1.22;continue}
  const xs=valid.map(q=>q.x),ys=valid.map(q=>q.y);
  ext={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  // Off-axis optical framing shifts the LEFT edge of the group into frame.
  // Right-facing outer-rail coverage reserves ~20% on the leader's AHEAD side.
  const allowedWidth=(boundary.right-boundary.left)*2;
  const allowedHeight=(boundary.upper-boundary.lower)*2;
  if(ext.maxX-ext.minX<=allowedWidth&&ext.maxY-ext.minY<=allowedHeight)break;
  scale*=1.12;
 }
 const lensShiftX=ext?ext.maxX-2*(boundary.right-.5):0;
 // Vertical tilt centers jockeys while keeping hooves (not empty sky).
 // Existing camera controls use the actual perspective projection.
 const frameY=ext?(ext.minY+ext.maxY)/2:0;
 pose.look.y+=frameY*.42;
 // A live side-rail broadcast shows the running surface, not 40% empty sky.
 // Tilt down modestly so the leading horses sit around the middle of the frame.
 if(!isGate)pose.look.y-=Math.min(4.2,height*.52);
 // Re-evaluate horizontal shift after adjusting camera look direction.
 const refined=imagePoints(pose.position,pose.look).filter(q=>q.visible);
 const xmax=refined.length?Math.max(...refined.map(q=>q.x)):0;
 const shift=xmax-2*(boundary.right-.5);
 return {...pose,fov,side:side*scale,subjects:group.map(h=>h.no),
  mode:isGate?'establishing-gate':'outer-rail-group',
  lensShiftX:shift,outerRailSign:outerSign,tracked:group.length,
  lookDirection:'racing-broadcast',aheadScreenSide:'right',aheadSpace:1-boundary.right,
  projectedWidth:ext?ext.maxX-ext.minX:null,dollyScale:scale,
  railCourseHeading:{x:head.dx,z:head.dz}};
}
