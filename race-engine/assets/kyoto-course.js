/** Kyoto inner A reconstruction from JRA plan and elevation profile.
 * Official constraints: lap1782.8m, home straight328.4m, total relief3.1m.
 * Plan control points are traced/reconstructed, NOT surveyed GIS coordinates. */
export const KYOTO_INNER=Object.freeze({lap:1782.8,distance:2000,straight:328.4,rise:3.1,width:27,startBeforeGoal:217.2});
const start=328.4-217.2,home=596*.700213;
// The home and back straights are NOT parallel: Kyoto's backstretch angles
// towards 3C, and its 1–2 / 3–4 ends have different radii.
const segments=[[[1200,536],[1001,536],[803,536],[604,536]],[[604,536],[415,536],[357,334],[520,220]],[[520,220],[710,184],[910,142],[1100,110]],[[1100,110],[1260,83],[1370,223],[1365,330]],[[1365,330],[1360,436],[1300,536],[1200,536]]];
function trace(sy){
 const arr=[];let length=0;
 for(let n=0;n<segments.length;n++)for(let i=n?1:0;i<=220;i++){
  const t=i/220,u=1-t,c=segments[n],x=(u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0]-900)*.700213,z=(u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]-330)*sy;
  if(arr.length)length+=Math.hypot(x-arr.at(-1).x,z-arr.at(-1).z);
  arr.push({x,z,s:length});
 }
 return {arr,length};
}
let lo=.1,hi=2;for(let i=0;i<48;i++){const mid=(lo+hi)/2;if(trace(mid).length<1782.8)lo=mid;else hi=mid}
const sy=(lo+hi)/2,{arr,length}=trace(sy);
function loop(s){
 s=((s%length)+length)%length;let low=0,high=arr.length-1;
 while(high-low>1){const m=(low+high)>>1;if(arr[m].s<s)low=m;else high=m}
 const a=arr[low],b=arr[high],t=(s-a.s)/(b.s-a.s),l=Math.hypot(b.x-a.x,b.z-a.z);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/l,dz:(b.z-a.z)/l};
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function kyotoHeight(t){
 // JRA profile: climb from ~1100m remaining, crest ~900–800m,
 // downhill to ~600m; final straight is level. Smooth the published joins.
 const m=t*2000;return 3.1*smooth((m-900)/200)*(1-smooth((m-1210)/190));
}
export function kyotoPath(t){return {...loop(start+t*2000),y:kyotoHeight(t)}}
export const KYOTO_CUTS=Object.freeze([.29,.51,(1782.8-start)/2000,Infinity]);
export function kyotoMapPath(){return Array.from({length:601},(_,i)=>{const p=kyotoPath(i/600);return (i?'L':'M')+(430+p.x*1.1).toFixed(2)+' '+(277+p.z*1.1).toFixed(2)}).join(' ')}
/** Shift of Kyoto outer turf course relative to inner A-course.
 * 3C/4C extra loop in renderer is ~38m toward the outside of the right-hand
 * circuit; this is also required when deciding where the broadcast crane may sit.
 */
export function kyotoOuterCourseOffset(t){
 const u=(t-.51)/(.836-.51);
 return u>0&&u<1?-38*Math.sin(Math.PI*u):0;
}
export function runnerLane(no,count,progress){const r=Math.min(1,Math.max(0,progress/.027));return ((count+1)/2-no)*(1.20*(1-r)+.80*r)}
