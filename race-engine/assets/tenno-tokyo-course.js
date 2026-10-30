
/** JRA Tokyo B: lap2101.9m, straight525.9m, width28–38m.
 * Equal arcs/straights, pocket and slopes are schematic, not surveyed. */
export const TOKYO_B=Object.freeze({lap:2101.9,straight:525.9,width:28,distance:2000,elevation:2.7,pocket:129,basis:'JRA寸法を基準にした模式形状'});
const L=525.9,R=(2101.9-2*L)/(2*Math.PI),A=Math.PI*R,remaining=2000-129-L-A-L,join=A-remaining;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
function oval(s){
 s=((s%2101.9)+2101.9)%2101.9;
 if(s<A){const a=Math.PI/2-s/R;return {x:L/2+R*Math.cos(a),z:R*Math.sin(a),dx:Math.sin(a),dz:-Math.cos(a)}}
 s-=A;if(s<L)return {x:L/2-s,z:-R,dx:-1,dz:0};
 s-=L;if(s<A){const a=-Math.PI/2-s/R;return {x:-L/2+R*Math.cos(a),z:R*Math.sin(a),dx:Math.sin(a),dz:-Math.cos(a)}}
 s-=A;return {x:-L/2+s,z:R,dx:1,dz:0};
}
export function tokyoHeight(p){const m=p*2000;return .55+.65*smooth((m-790)/160)-1.05*smooth((m-1030)/300)+2.1*smooth((m-1540)/160)}
export function tokyoPath(p){
 const m=p*2000;
 if(m<129){const q=oval(join),back=m-129;return {...q,x:q.x+q.dx*back,z:q.z+q.dz*back,y:tokyoHeight(p)}}
 if(m>=2000){const q=oval(2101.9-1e-7);return {...q,x:q.x+m-2000,y:tokyoHeight(1),dx:1,dz:0}}
 return {...oval(join+m-129),y:tokyoHeight(p)};
}
export function tokyoMapPath(){return Array.from({length:801},(_,i)=>{const q=tokyoPath(i/800);return (i?'L':'M')+(430+q.x*.68).toFixed(2)+','+(260+q.z*.68).toFixed(2)}).join(' ')}
