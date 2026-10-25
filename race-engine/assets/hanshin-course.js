/** Hanshin B inner, reconstructed from JRA's public dimensions, NOT surveyed GIS.
 * The 2200m start continues the home straight beyond the inner 4C exit.
 * Published B: lap1713.2m, straight359.1m, width20–25m, relief1.9m.
 */
export const HANSHIN_INNER_B=Object.freeze({lap:1713.2,distance:2200,straight:359.1,
 width:22.5,rise:1.9,startBeforeGoal:486.8,goalToFirstTurn:38.2,geometry:'dimension-constrained-reconstruction'});
const P=HANSHIN_INNER_B,S=P.straight+P.goalToFirstTurn,R=(P.lap-2*S)/(2*Math.PI),bend=Math.PI*R;
const mod=(s,n)=>((s%n)+n)%n;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
function circuit(s){
 s=mod(s,P.lap);
 if(s<S)return {x:S/2-s,z:R,dx:-1,dz:0};
 s-=S;
 if(s<bend){const a=Math.PI/2+s/R;return {x:-S/2+R*Math.cos(a),z:R*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)}}
 s-=bend;
 if(s<S)return {x:-S/2+s,z:-R,dx:1,dz:0};
 const a=-Math.PI/2+(s-S)/R;return {x:S/2+R*Math.cos(a),z:R*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};
}
export function hanshinHeight(t){
 const s=t*P.distance,q=mod(s-P.startBeforeGoal,P.lap),remaining=P.lap-q;
 if(remaining>=800)return 1.8+.1*smooth((P.lap-remaining)/200);
 if(remaining>=200)return 1.9*smooth((remaining-200)/600);
 return 1.8*smooth((200-remaining)/120);
}
export function hanshinPath(t){
 const m=t*P.distance,goalStation=P.straight;
 const q=m<P.startBeforeGoal-goalStation
  ?{x:S/2+(P.startBeforeGoal-goalStation)-m,z:R,dx:-1,dz:0}
  :circuit(m-(P.startBeforeGoal-goalStation));
 return {...q,y:hanshinHeight(t)};
}
export function hanshinMapPath(){return Array.from({length:701},(_,i)=>{const q=hanshinPath(i/700);return (i?'L':'M')+(430+q.x*.94).toFixed(2)+' '+(277+q.z*.94).toFixed(2)}).join(' ')}
