/** Kyoto outer A: reconstructed plan, not surveyed GIS coordinates.
 * JRA constraints: lap 1894.3m, finish straight 403.7m, relief 4.3m.
 * The 3000m route passes the finish after 1105.7m and climbs the hill twice.
 */
export const KYOTO_OUTER_3000=Object.freeze({lap:1894.3,distance:3000,straight:403.7,rise:4.3,width:27,firstFinish:1105.7,exitProgress:1-403.7/3000});
const SCALE=.700213,goal=403.7;
const homeStart=1200+(403.7-328.4)/SCALE;
const segments=[
 [[homeStart,536],[homeStart-(homeStart-604)/3,536],[604+(homeStart-604)/3,536],[604,536]],
 [[604,536],[415,536],[357,334],[520,220]],
 [[520,220],[710,184],[910,142],[1100,110]],
 [[1100,110],[1300,65],[1440,238],[1430,345]],
 [[1430,345],[1425,445],[1390,536],[homeStart,536]]
];
function trace(sy){
 const arr=[];let length=0;
 for(let n=0;n<segments.length;n++)for(let i=n?1:0;i<=400;i++){
  const t=i/400,u=1-t,c=segments[n];
  const x=(u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0]-900)*SCALE;
  const z=(u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]-330)*sy;
  if(arr.length)length+=Math.hypot(x-arr.at(-1).x,z-arr.at(-1).z);
  arr.push({x,z,s:length});
 }
 return {arr,length};
}
let lo=.05,hi=2;
for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(trace(mid).length<KYOTO_OUTER_3000.lap)lo=mid;else hi=mid}
const {arr,length}=trace((lo+hi)/2);
function loop(s){
 s=((s%length)+length)%length;let low=0,high=arr.length-1;
 while(high-low>1){const m=(low+high)>>1;if(arr[m].s<s)low=m;else high=m}
 const a=arr[low],b=arr[high],t=(s-a.s)/(b.s-a.s),l=Math.hypot(b.x-a.x,b.z-a.z);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/l,dz:(b.z-a.z)/l};
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function kyotoOuterHeight(t){
 const remaining=((3000*(1-t))%length+length)%length;
 return 4.3*smooth((1100-remaining)/250)*(1-smooth((800-remaining)/300));
}
export function kyotoOuterPath(t){return {...loop(goal-3000+t*3000),y:kyotoOuterHeight(t)}}
export function kyotoOuterMapPath(){
 return Array.from({length:1001},(_,i)=>{const p=kyotoOuterPath(i/1000);return(i?'L':'M')+(430+p.x*.82).toFixed(2)+' '+(277+p.z*.82).toFixed(2)}).join(' ');
}
