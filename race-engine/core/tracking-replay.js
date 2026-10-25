/** Deterministic playback of video observations. No random race simulation.
 * Metres are reconstructed from the broadcast graphic and are NOT GPS fixes.
 * PCHIP preserves increasing distance and sample values without cubic overshoot.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function curve(points,key){
 const n=points.length,x=points.map(p=>p.t),y=points.map(p=>p[key]);
 const h=x.slice(1).map((v,i)=>v-x[i]),d=h.map((v,i)=>(y[i+1]-y[i])/v),m=new Array(n);
 m[0]=d[0];m[n-1]=d[n-2];
 for(let i=1;i<n-1;i++){
  if(d[i-1]*d[i]<=0)m[i]=0;
  else{const a=2*h[i]+h[i-1],b=h[i]+2*h[i-1];m[i]=(a+b)/(a/d[i-1]+b/d[i])}
 }
 return t=>{
  if(t<=x[0])return y[0];if(t>=x[n-1])return y[n-1];
  let a=0,b=n-1;while(b-a>1){const k=(a+b)>>1;if(x[k]<=t)a=k;else b=k}
  const u=(t-x[a])/h[a],v=u*u,w=v*u;
  return (2*w-3*v+1)*y[a]+(w-2*v+u)*h[a]*m[a]+(-2*w+3*v)*y[b]+(w-v)*h[a]*m[b];
 };
}
export function createTrackingReplay(data,path){
 if(data.schemaVersion!==1||data.isGpsTracking!==false||!Array.isArray(data.horses))throw Error('Invalid tracking replay data');
 const distance=data.distanceMeters,profiles=new Map();
 for(const horse of data.horses){
  const points=horse.samples;
  if(!Array.isArray(points)||points.length<2)throw Error('Insufficient samples: '+horse.no);
  points.forEach((p,i)=>{
   if(![p.t,p.s,p.lane].every(Number.isFinite)||p.t<0||Math.abs(p.lane)>11.25||
    (i&&(p.t<=points[i-1].t||p.s<points[i-1].s)))throw Error('Invalid trajectory: '+horse.no);
  });
  profiles.set(horse.no,{horse,points,s:curve(points,'s'),lane:curve(points,'lane')});
 }
 function state(no,t){
  const p=profiles.get(no);if(!p)throw Error('Unknown runner: '+no);
  const {horse,points}=p,last=points.at(-1),finish=horse.renderFinishSeconds;
  const sAt=sec=>finish!==null&&sec>finish?distance+(sec-finish)*14.5:p.s(sec);
  const s=sAt(t),progress=s/distance,lane=clamp(p.lane(t),-10.3,10.3),q=path(progress);
  const speed=Math.max(0,(sAt(t+.05)-sAt(Math.max(0,t-.05)))/(t<.05?.05:.1));
  let a=0,b=points.length-1;while(b-a>1){const k=(a+b)>>1;if(points[k].t<=t)a=k;else b=k}
  const exact=points.find(v=>Math.abs(v.t-t)<.00001),observed=exact?.kind==='video-observation';
  const unknown=horse.result==='DNF'&&t>last.t+1.5;
  return {no,p:progress,lane,x:q.x-q.dz*lane,y:q.y,z:q.z+q.dx*lane,
   dx:q.dx,dz:q.dz,speed,visible:!unknown,source:observed?'video-observation':'interpolated',
   matchScore:observed?exact.matchScore:null,bracket:[points[a].t,points[b].t],
   retired:unknown,officialFinish:horse.finish};
 }
 const rank=data.horses.slice().sort((a,b)=>(a.finish??99)-(b.finish??99)).map(h=>h.no);
 return {version:'video-tracking-v1',state,progress:(no,t)=>state(no,t).p,rank,
  duration:data.winnerSeconds,endTime:Math.max(...data.horses.map(h=>h.renderFinishSeconds??0))+3,
  data,positions:t=>data.horses.map(h=>state(h.no,t))};
}
