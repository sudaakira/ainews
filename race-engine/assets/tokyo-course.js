/** Tokyo turf A reconstruction from published JRA dimensions.
 * Official constraints used: lap 2083.6m, home straight 525.9m (the
 * longest in Japan), left-handed, total relief about 2.2m with the
 * famous home-straight hill. The plan is a dimensioned stadium
 * reconstruction (two 525.9m straights, semicircular ends of radius
 * 164.2m closing the lap exactly), NOT surveyed GIS coordinates.
 * Loop coordinate s runs in the racing direction with s=0 at the
 * start of the home straight; the goal sits at s=525.9. A runner at
 * race progress t of a D-metre race is at loop coordinate
 * (525.9 - D + t*D) mod lap, so the 2400m start (Japan Cup / Tokyo
 * Yushun) lies 316.4m before the goal on the home straight and the
 * field passes the finish once before the full lap. */
export const TOKYO_TURF=Object.freeze({
 venue:'東京',lap:2083.6,straight:525.9,width:29,radius:164.2,relief:2.2
});
const LAP=TOKYO_TURF.lap,R=TOKYO_TURF.radius,STRAIGHT=TOKYO_TURF.straight;
// Plan pieces in running order (x east, z south; left-handed circuit).
// 1) home straight: (0, R) -> (STRAIGHT, R), heading +x.
// 2) east end (1-2 corners): semicircle about (STRAIGHT, 0).
// 3) backstretch: (STRAIGHT, -R) -> (0, -R), heading -x.
// 4) west end (3-4 corners): semicircle about (0, 0).
const pieces=[];
{
 const home={kind:'line',x0:0,z0:R,x1:STRAIGHT,z1:R,len:STRAIGHT};
 const east={kind:'arc',cx:STRAIGHT,cz:0,r:R,a0:Math.PI/2,a1:-Math.PI/2,len:Math.PI*R};
 const back={kind:'line',x0:STRAIGHT,z0:-R,x1:0,z1:-R,len:STRAIGHT};
 const west={kind:'arc',cx:0,cz:0,r:R,a0:-Math.PI/2,a1:-Math.PI*1.5,len:Math.PI*R};
 let s=0;for(const p of[home,east,back,west]){p.s0=s;s+=p.len;pieces.push(p)}
}
function loopPoint(s){
 s=((s%LAP)+LAP)%LAP;
 const p=pieces.find(q=>s<q.s0+q.len)||pieces[pieces.length-1];
 const u=Math.min(1,Math.max(0,(s-p.s0)/p.len));
 if(p.kind==='line'){
  const dx=p.x1-p.x0,dz=p.z1-p.z0,l=Math.hypot(dx,dz);
  return {x:p.x0+dx*u,z:p.z0+dz*u,dx:dx/l,dz:dz/l};
 }
 const a=p.a0+(p.a1-p.a0)*u;
 // d(position)/ds for decreasing/increasing angle, normalised.
 const dirA=Math.sign(p.a1-p.a0);
 return {
  x:p.cx+Math.cos(a)*p.r,z:p.cz+Math.sin(a)*p.r,
  dx:-Math.sin(a)*dirA,dz:Math.cos(a)*dirA
 };
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
/** Elevation (m) by metres-before-goal along the loop. The home
 * straight climbs about 2m from 460m out to 160m out (Tokyo's hill),
 * stays high to the goal, eases down through the 3-4 corners, and the
 * backstretch carries a gentle rise. */
export function tokyoHeightS(s){
 s=((s%LAP)+LAP)%LAP;
 if(s<=STRAIGHT){
  // Home straight: hill between 460m and 160m before the goal.
  return 2.0*smooth((470-s)/310);
 }
 if(s<=STRAIGHT+260){
  // 1-2 corners: ease from the hilltop down to the backstretch level.
  return 2.0*(1-smooth((s-STRAIGHT)/260));
 }
 if(s<=1500){
  // Backstretch: a gentle swell peaking mid-backstretch.
  const u=(s-STRAIGHT-260)/(1500-STRAIGHT-260);
  return .8*Math.sin(Math.PI*Math.min(1,Math.max(0,u)));
 }
 // 3-4 corners: settle back towards the straight's base level.
 return 0;
}
/** Height for race progress t of a race over `distance` metres. */
export function tokyoHeight(t,distance=2400){
 const remaining=((distance*(1-t))%LAP+LAP)%LAP;
 return tokyoHeightS(remaining);
}
export function tokyoPath(t,distance=2400){
 const s=STRAIGHT-distance+t*distance;
 const p=loopPoint(s);
 return {...p,y:tokyoHeight(t,distance)};
}
/** Metres before the goal at which a race of `distance` starts. */
export function tokyoStartBeforeGoal(distance){
 return ((distance%LAP)+LAP)%LAP;
}
