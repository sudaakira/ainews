import {KYOTO_CUTS,runnerLane} from './kyoto-course.js?v=kyoto-v11';
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
export function raceCameraPose({shot,progress,order,path,aspect=1}){
 const full=shot.id==='start',group=full?order:order.slice(0,5);
 const p=(group[0].p+group.at(-1).p)/2,heading=path(p);
 const field=group.map(o=>{const q=path(o.p),lane=runnerLane(o.no,order.length,progress);return {x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane}});
 const focus={...heading,x:(Math.min(...field.map(q=>q.x))+Math.max(...field.map(q=>q.x)))/2,z:(Math.min(...field.map(q=>q.z))+Math.max(...field.map(q=>q.z)))/2};
 let side=shot.side,height=shot.height,ahead=shot.ahead;
 // Fit only the selected leaders. Camera-space fit respects perspective and
 // narrow phones without reverting to a bird's-eye field-wide composition.
 const norm=Math.hypot(side,ahead),rx=(heading.dx*side-heading.dz*ahead)/norm,rz=(heading.dz*side+heading.dx*ahead)/norm;
 const horizontal=field.map(q=>(q.x-focus.x)*rx+(q.z-focus.z)*rz);
 const width=Math.max(...horizontal)-Math.min(...horizontal)+4.2;
 const fit=width/(2*Math.tan(shot.fov*Math.PI/360)*Math.max(.42,aspect));
 const scale=Math.max(1,fit/Math.hypot(norm,height));
 side*=scale;ahead*=scale;
 // Deliberately retain low elevation even when width requires more distance.
 const point=(lateral,forward,y)=>({x:focus.x+heading.dz*lateral+heading.dx*forward,y:focus.y+y,z:focus.z-heading.dx*lateral+heading.dz*forward});
 return {position:point(side,ahead,height),look:point(0,0,1.35),fov:shot.fov,forward:{x:heading.dx,z:heading.dz},side,subjects:group.map(o=>o.no)};
}
