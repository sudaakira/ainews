/** Collision-aware replay choreography, NOT a calibrated race-outcome model.
 * Longitudinal schedules come from the sampled race. A time-expanded corridor
 * planner finds short, sheltered, low-steering paths without horse/rail contact.
 * See docs/pack-dynamics.md for evidence, assumptions and limitations.
 */
import {FINISH_GAP,runOutProgress} from './race-playback.js?v=kyoto-v11-1';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Existing sampled-outcome replay timing, separated from lateral planning. */
export function createReplayProgress({horses,duration,rank,seed,pace=0}){
 const indices=new Map(horses.map(h=>[h.no,{h,rank:rank.indexOf(h.no)}]));
 return (no,sec)=>{
  const {h,rank:r}=indices.get(no),p=clamp(sec/duration,0,1);
  if(sec>duration)return runOutProgress(r,sec-duration,duration);
  const early=h.style==='逃げ'?.012:h.style==='好位'?.0065:h.style==='中団'?-.0015:-.009;
  const shift=early*Math.sin(Math.PI*p)*Math.pow(1-p,.15)+
   (h.style==='逃げ'?-.004*pace:h.style==='差し'?.004*pace:0)*Math.sin(Math.PI*p);
  const f=clamp((p-.47)/.53,0,1),finishGap=r*FINISH_GAP*f*f*(3-2*f);
  return clamp(p+shift-finishGap+Math.sin(no*2.6+seed)*.0012*Math.sin(Math.PI*p),0,1);
 };
}
export const PACK_MODEL=Object.freeze({version:'pack-v1',width:27,railMargin:1.5,
 laneStep:.3,maxLateralSpeed:.72,bodyLength:4.8,bodyWidth:1.08});
const mix=(a,b,u)=>a+(b-a)*u;
export function offsetRunner(path,p,lane){
 const q=path(p);return {x:q.x-q.dz*lane,y:q.y||0,z:q.z+q.dx*lane};
}
export function createRacePack({horses,duration,distance,progress,path,direction='右',ground='good',seed=0,width=27}){
 if(!horses.length||!(duration>0&&distance>0))throw Error('Invalid pack dimensions');
 const spec=PACK_MODEL,inside=direction==='左'?-1:1;
 const rail=Math.floor((width/2-spec.railMargin)/spec.laneStep)*spec.laneStep;
 const intervals=Math.ceil(duration/.44),dt=duration/intervals;
 const steps=Math.ceil(intervals*1.20),n=horses.length;
 const lanes=Array.from({length:Math.round(rail*2/spec.laneStep)+1},(_,i)=>-rail+i*spec.laneStep);
 const cells=lanes.length,starts=horses.map(h=>((n+1)/2-h.no)*1.2);
 const schedules=horses.map(h=>Float64Array.from({length:steps+1},(_,k)=>progress(h.no,k*dt)*distance));
 const plans=new Array(n),smoothing=new Float64Array(n);
 const linear=(arr,t)=>{const k=clamp(t/dt,0,steps),j=Math.min(steps-1,Math.floor(k));return mix(arr[j],arr[j+1],k-j)};
 // A cubic B-spline is C2 and stays inside the convex hull of its controls.
 // It is accepted only after substep clearance checks; no visual-only
 // smoothing can silently move a horse into another horse's reserved corridor.
 function laneAt(i,t){
  if(!plans[i])return starts[i];
  const a=plans[i],u=clamp(t/dt,0,steps),j=Math.floor(u),f=u-j;
  const get=k=>a[clamp(k,0,steps)];
  const curved=(get(j-1)*(1-f)**3+get(j)*(3*f**3-6*f*f+4)+get(j+1)*(-3*f**3+3*f*f+3*f+1)+get(j+2)*f**3)/6;
  return mix(linear(a,t),curved,smoothing[i]);
 }
 let obstacleS,obstacleL,obstacleReserve;
 function blocked(i,t,lane,padding=.025){
  const frame=clamp(Math.round(t/dt*8),0,steps*8),offset=frame*n,s=obstacleS[offset+i];
  for(let j=0;j<n;j++)if(j!==i){
   const reserve=padding+obstacleReserve[j];
   if(Math.abs(obstacleS[offset+j]-s)<spec.bodyLength+reserve&&Math.abs(obstacleL[offset+j]-lane)<spec.bodyWidth+reserve)return true;
  }
  return false;
 }
 function unsafeMerge(i,k,oldLane,newLane){
  if(oldLane===newLane)return false;
  const a=(k-1)*8*n,b=k*8*n;
  for(let j=0;j<n;j++)if(j!==i){
   const behind=obstacleS[b+i]-obstacleS[b+j],other=obstacleL[b+j];
   if(behind>0&&behind<10&&
    (newLane-oldLane)*(other-oldLane)>0&&
    Math.abs(oldLane-obstacleL[a+j])>=1.15&&Math.abs(newLane-other)<1.15)return true;
  }
  return false;
 }
 // Inside stalls plan first. Unplanned runners reserve their original corridor.
 // This makes a feasible safe path (staying put laterally) available at every
 // planning stage, rather than teleporting an outside runner out of a conflict.
 const priority=horses.map((_,i)=>i).sort((a,b)=>inside*(starts[b]-starts[a]));
 for(const i of priority){
  obstacleS=new Float64Array((steps*8+1)*n);obstacleL=new Float64Array(obstacleS.length);
  obstacleReserve=Float64Array.from({length:n},(_,j)=>plans[j]?0:.04);
  for(let f=0;f<=steps*8;f++)for(let j=0;j<n;j++){
   obstacleS[f*n+j]=linear(schedules[j],f*dt/8);obstacleL[f*n+j]=laneAt(j,f*dt/8);
  }
  // Illustrative disposition, not a claim about an identified horse's mind.
  const defaultFollow=horses[i].style==='逃げ'?.25:horses[i].style==='好位'?.6:.8;
  const follow=clamp(horses[i].packPreference??(defaultFollow+.10*Math.sin(seed+horses[i].no*7.3)),0,1);
  const blockedAt=new Uint8Array((steps+1)*cells),costAt=new Float64Array(blockedAt.length);
  for(let k=0;k<=steps;k++){
   const t=k*dt,s=schedules[i][k],p=s/distance;
   const a=path(p-1/distance),b=path(p+1/distance);
   const curvature=Math.atan2(a.dx*b.dz-a.dz*b.dx,a.dx*b.dx+a.dz*b.dz)/2;
   for(let l=0;l<cells;l++){
    const lane=lanes[l],idx=k*cells+l;
    blockedAt[idx]=blocked(i,t,lane,.025)?1:0;
    let shelter=0,merge=0;
    for(let j=0;j<n;j++)if(j!==i){
     const gap=schedules[j][k]-s,dl=obstacleL[k*8*n+j]-lane;
     if(gap>4&&gap<18)shelter=Math.max(shelter,Math.exp(-dl*dl/1.8)*Math.exp(-(((gap-7)/9)**2)));
     // Avoid occupying a following horse's nose: stronger than body-only
     // clearance, but not represented as a legal foul adjudication system.
     if(gap< -3.9&&gap> -10)merge+=Math.exp(-dl*dl/.8)*(10+gap)/6;
    }
    const railGap=rail-inside*lane;
    // Geometric metre cost: ds_lane/ds_center = 1 - curvature*lane.
    // Outer trips are longer; no arbitrary probability bonus is injected.
    const advance=k?Math.max(0,s-schedules[i][k-1]):0;
    costAt[idx]=advance*(1-curvature*lane)+dt*((.012+.02*(1-follow))*railGap-(.06+.20*follow)*shelter+.20*merge);
   }
  }
  // State includes the previous steering direction: penalise reversals, not
  // just displacement, so a horse commits to a gap instead of zigzagging.
  const stride=cells*3,parents=new Int16Array((steps+1)*stride).fill(-1);
  let prev=new Float64Array(stride).fill(Infinity);
  const start=Math.round((starts[i]+rail)/spec.laneStep);prev[start*3+1]=0;
  for(let k=1;k<=steps;k++){
   const next=new Float64Array(stride).fill(Infinity);
   for(let l=0;l<cells;l++)if(!blockedAt[k*cells+l])for(let d=-1;d<=1;d++){
    if(k*dt<2.2&&d)continue; // keep straight until clear of the stalls
    const old=l-d;if(old<0||old>=cells)continue;
    if(!Number.isFinite(Math.min(prev[old*3],prev[old*3+1],prev[old*3+2])))continue;
    if(unsafeMerge(i,k,lanes[old],lanes[l]))continue;
    let clear=true;
    for(let f=1;f<8&&clear;f++)clear=!blocked(i,(k-1+f/8)*dt,mix(lanes[old],lanes[l],f/8));
    if(!clear)continue;
    for(let pd=-1;pd<=1;pd++){
     const from=old*3+pd+1,idx=l*3+d+1;
     const wet=ground==='soft'||ground==='heavy'?1.5:1;
     const score=prev[from]+costAt[k*cells+l]+wet*(.045*d*d+.12*(d-pd)**2);
     if(score<next[idx]){next[idx]=score;parents[k*stride+idx]=from;}
    }
   }
   prev=next;
  }
  let end=0;for(let j=1;j<stride;j++)if(prev[j]<prev[end])end=j;
  if(!Number.isFinite(prev[end]))throw Error('No safe racing corridor for '+horses[i].no);
  const plan=new Float64Array(steps+1);let cursor=end;
  for(let k=steps;k>0;k--){plan[k]=lanes[Math.floor(cursor/3)];cursor=parents[k*stride+cursor];}
  plan[0]=starts[i];plans[i]=plan;
  for(const amount of [1,.5,.25,0]){
   smoothing[i]=amount;let safe=true;
   for(let k=0;k<steps*8&&safe;k++)safe=!blocked(i,k*dt/8,laneAt(i,k*dt/8));
   if(safe)break;
   if(amount===0)throw Error('Unsafe racing corridor for '+horses[i].no);
  }
 }
 const indices=new Map(horses.map((h,i)=>[h.no,i]));
 function state(no,t){
  t=Math.max(0,t);
  const i=indices.get(no);if(i===undefined)throw Error('Unknown runner '+no);
  const p=progress(no,Math.max(0,t)),lane=laneAt(i,t);
  const q=offsetRunner(path,p,lane),before=Math.max(0,t-.25),after=t+.25;
  const a=offsetRunner(path,progress(no,before),laneAt(i,before));
  const b=offsetRunner(path,progress(no,after),laneAt(i,after));
  const len=Math.max(.0001,Math.hypot(b.x-a.x,b.z-a.z));
  return {no,p,lane,...q,dx:(b.x-a.x)/len,dz:(b.z-a.z)/len,speed:len/(after-before)};
 }
 function diagnostics(no){
  const i=indices.get(no);let travelled=0,railTravel=0,prev,prevRail;
  for(let k=0;k<=intervals*4;k++){
   const t=k*dt/4,p=progress(no,t),q=offsetRunner(path,p,laneAt(i,t)),r=offsetRunner(path,p,inside*rail);
   if(prev){travelled+=Math.hypot(q.x-prev.x,q.z-prev.z,q.y-prev.y);railTravel+=Math.hypot(r.x-prevRail.x,r.z-prevRail.z,r.y-prevRail.y);}
   prev=q;prevRail=r;
  }
  return {travelled,railTravel,extraDistance:travelled-railTravel};
 }
 return {version:spec.version,state,diagnostics,dt,endTime:steps*dt};
}
