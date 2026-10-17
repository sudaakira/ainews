import {KYOTO_CUTS,runnerLane} from './kyoto-course.js?v=kyoto-v11-1';
/** Four cuts; the camera follows the leaders through the finish without freezing. */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'start',until:.28,kicker:'01 / START',label:'スタート',side:25,height:7,ahead:0,fov:42}),
 Object.freeze({id:'second-turn',until:.60,kicker:'02 / CLOSE UP',label:'2コーナー・向正面',side:20,height:5,ahead:7,fov:40}),
 Object.freeze({id:'third-turn',until:.836,kicker:'03 / THE CHARGE',label:'3・4コーナー 勝負所',side:15,height:7,ahead:17,fov:44}),
 Object.freeze({id:'straight',until:Infinity,kicker:'04 / FINISHING BATTLE',label:'最後の直線',side:23,height:4.3,ahead:0,fov:35})
]);
export function chooseRaceShot(progress,cuts=RACE_SHOT_LIST.map(s=>s.until)){
 const p=Number.isFinite(progress)?Math.max(0,progress):0;
 return RACE_SHOT_LIST[cuts.findIndex(x=>p<x)]||RACE_SHOT_LIST[3];
}
export function courseShotCuts(route,routeLength,config){
 return config.venue==='京都'&&config.distance===2000&&config.surface==='芝'?[...KYOTO_CUTS]:[.18,.52,.80,Infinity];
}
/** Camera framing contract:
 * Opening gate: wide establishing shot for the first four race seconds.
 * Once running: a tight three-quarter/side tracking lens, keeping the LEADING
 * horse in the left 22% of the projection with the ground visible ahead.
 * Never dolly outward merely to include the back of the field.
 */
export function raceCameraPose({shot,progress,order,path,aspect=1,clock=Infinity}){
 const gate=shot.id==='start'&&clock<=4;
 const leaders=order.slice(0,Math.min(3,order.length));
 const leader=order[0];
 if(!leader)return {position:{x:0,y:12,z:25},look:{x:0,y:1.7,z:0},fov:38,side:25,subjects:[],targetLeadViewportX:null,lensShiftX:0};
 if(gate){
  // Full field only when the stalls are still the subject of the picture.
  const group=order,p=(group[0].p+group.at(-1).p)/2,heading=path(p);
  const field=group.map(o=>{const q=path(o.p),lane=runnerLane(o.no,order.length,progress);return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane};});
  const focus={...heading,x:(Math.min(...field.map(q=>q.x))+Math.max(...field.map(q=>q.x)))/2,z:(Math.min(...field.map(q=>q.z))+Math.max(...field.map(q=>q.z)))/2};
  const side=25,height=7,ahead=0,fov=42;
  const halfWidth=field.reduce((max,q)=>Math.max(max,Math.hypot(q.x-focus.x,q.z-focus.z)),0)+2;
  const tan=Math.tan(fov*Math.PI/360)*Math.max(.42,aspect);
  const distance=Math.max(side,halfWidth/tan);
  return {position:{x:focus.x+heading.dz*distance,y:focus.y+height,z:focus.z-heading.dx*distance},
   look:{x:focus.x,y:focus.y+1.7,z:focus.z},fov,side:distance,subjects:group.map(o=>o.no),
   targetLeadViewportX:null,lensShiftX:0,mode:'establishing-gate'};
 }
 // Close-up distance is independent of fifth place and beyond.
 const shotCamera=shot.id==='third-turn'?{side:12,ahead:7,height:5.5,fov:33}:
  shot.id==='straight'?{side:15,ahead:0,height:5.0,fov:34}:
  shot.id==='second-turn'?{side:12.8,ahead:2.5,height:5.1,fov:34}:
  {side:13,ahead:0,height:5.1,fov:35};
 const {side,ahead,height,fov}=shotCamera;
 const heading=path(leader.p),lane=runnerLane(leader.no,order.length,progress);
 const cx=heading.x-heading.dz*lane,cz=heading.z+heading.dx*lane;
 const position={x:cx+heading.dz*side+heading.dx*ahead,y:heading.y+height,z:cz-heading.dx*side+heading.dz*ahead};
 const look={x:cx,y:heading.y+1.85,z:cz};
 // Keep the entire nearest leader cluster out of the left-edge crop.
 // 20% negative space is measured from the leftmost prospective muzzle of
 // the first three horses, not from the root of only the current leader.
 // A 3.0m forward envelope also covers head reach during gallop.
 const fx=look.x-position.x,fy=look.y-position.y,fz=look.z-position.z;
 const flen=Math.hypot(fx,fy,fz),tan=Math.tan(fov*Math.PI/360)*Math.max(.42,aspect);
 const frontSamples=leaders.map(o=>{
  const q=path(o.p),l=runnerLane(o.no,order.length,progress);
  const nx=q.x-q.dz*l+q.dx*3.0,nz=q.z+q.dx*l+q.dz*3.0;
  const vx=nx-position.x,vy=q.y+2.05-position.y,vz=nz-position.z;
  const depth=Math.max(1,(vx*fx+vy*fy+vz*fz)/flen);
  return {no:o.no,ndc:(-fz*vx+fx*vz)/(flen*depth*tan)};
 });
 const leftmost=Math.min(...frontSamples.map(x=>x.ndc));
 // Projection matrix[8] is subtracted from NDC. +0.60 sets the leftmost
 // projected muzzle at screen x=0.20, keeping race direction clear.
 const lensShiftX=leftmost+.60;
 return {position,look,fov,side,subjects:leaders.map(o=>o.no),
  lensShiftX,targetLeadViewportX:.20,mode:'tight-nose-leader',frontSamples};
}
