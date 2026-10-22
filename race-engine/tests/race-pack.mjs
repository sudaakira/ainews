import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const moduleURL=p=>'data:text/javascript;base64,'+Buffer.from(read(p).replace(/from ['"](\.[^'"]+)['"]/g,(_,s)=>"from '"+moduleURL(relative(root,resolve(root,dirname(p),s.split('?')[0])))+"'")).toString('base64');
const load=p=>import(moduleURL(p));
process.on('uncaughtException',e=>{console.error(e.message);process.exitCode=1});
const {createRacePack,createReplayProgress,PACK_MODEL}=await load('assets/race-pack.js');
const {kyotoOuterPath}=await load('assets/kyoto-outer-3000.js');
const {kyotoPath}=await load('assets/kyoto-course.js');
// A continuous centreline is not enough: discontinuous tangent normals made
// rail-side horses teleport sideways even with perfectly smooth lane values.
for(const [path,distance] of [[kyotoPath,2000],[kyotoOuterPath,3000]]){
 let maxTurn=0,maxStep=0;
 for(let k=0;k<12000;k++){
  const a=path(k/10000),b=path((k+1)/10000);
  maxTurn=Math.max(maxTurn,Math.acos(Math.min(1,a.dx*b.dx+a.dz*b.dz)));
  for(const lane of [-12,12]){
   const dx=(b.x-b.dz*lane)-(a.x-a.dz*lane),dz=(b.z+b.dx*lane)-(a.z+a.dx*lane);
   maxStep=Math.max(maxStep,Math.hypot(dx,dz));
  }
 }
 assert.ok(maxTurn<.02,'no abrupt course tangent seam: '+maxTurn);
 assert.ok(maxStep<distance/10000*1.4,'no offset-lane teleport: '+maxStep);
 console.log('COURSE_CONTINUITY',JSON.stringify({distance,maxTurn,maxStep}));
}
const {default:kikka}=await load('races/kikka-2026.js');
const {default:shuka}=await load('races/shuka-2026.js');
const {default:demo}=await load('races/sample-demo.js');
const configs=[shuka,kikka,demo,...await Promise.all(['tokyo-20261012-11','tokyo-20261012-12','kyoto-20261012-12','swan-2026'].map(async id=>(await load('races/'+id+'.js')).default))];
const cases=Number(process.env.PACK_CASES||14);
for(let c=0;c<cases;c++){
 const config=configs[c%configs.length],horses=config.horses;
 const duration=config.duration||80,distance=config.distance;
 const direction=config.direction||'右',sign=direction==='左'?-1:1;
 const circlePath=p=>{const a=p*2*Math.PI,r=distance/(2*Math.PI);return {x:r*Math.cos(a),z:sign*r*Math.sin(a),y:0,dx:-Math.sin(a),dz:sign*Math.cos(a)}};
 const path=config===shuka?kyotoPath:config===kikka?kyotoOuterPath:circlePath;
 const rank=horses.map(h=>h.no).sort((a,b)=>Math.sin(a*13+c*7)-Math.sin(b*13+c*7));
 const progress=createReplayProgress({horses,duration,distance,rank,seed:c*37,pace:c%7-3});
 const before=performance.now();
 const settings={horses,duration,distance,progress,path,ground:c%2?'soft':'good',direction,seed:c*37,width:config===shuka||config===kikka?27:25.6};
 const pack=createRacePack(settings);
 const built=performance.now()-before;
 let minClear=Infinity,totalWidth=0,widthFrames=0,nearFront=0,changed=0;
 const previous=new Map();
 for(let t=0;t<duration*1.18;t+=.13){
  const states=horses.map(h=>pack.state(h.no,t));
  for(const h of states){
   assert.ok(Number.isFinite(h.x+h.z+h.lane+h.speed));
   const bound=Math.floor((settings.width/2-PACK_MODEL.railMargin)/PACK_MODEL.laneStep)*PACK_MODEL.laneStep;
   assert.ok(Math.abs(h.lane)<=bound+.00001,'rail clearance');
   const prev=previous.get(h.no);
   if(prev){assert.ok(h.p>=prev.p-1e-8,'no reverse motion');assert.ok(Math.abs(h.lane-prev.lane)/.13<=PACK_MODEL.maxLateralSpeed+.01,'bounded steering');}
   previous.set(h.no,h);
  }
  for(let i=0;i<states.length;i++)for(let j=0;j<i;j++){
   const a=states[i],b=states[j],ds=Math.abs(a.p-b.p)*distance,dl=Math.abs(a.lane-b.lane);
   const clear=Math.max(ds/PACK_MODEL.bodyLength,dl/PACK_MODEL.bodyWidth);
   minClear=Math.min(minClear,clear);
   assert.ok(clear>=.997,'no body overlap '+JSON.stringify({c,t,a:a.no,b:b.no,ds,dl}));
  }
  if(t>duration*.2&&t<duration*.7){
   totalWidth+=Math.max(...states.map(s=>s.lane))-Math.min(...states.map(s=>s.lane));
   widthFrames++;
   for(const a of states)if(states.some(b=>b.no!==a.no&&b.p>a.p&&(b.p-a.p)*distance<18&&Math.abs(a.lane-b.lane)<1.3))nearFront++;
  }
 }
 for(const h of horses){
  assert.ok(Math.abs(pack.state(h.no,0).lane-((horses.length+1)/2-h.no)*1.2)<1e-8,'original stalls');
  if(Math.abs(pack.state(h.no,duration*.5).lane-pack.state(h.no,0).lane)>.3)changed++;
 }
 assert.ok(changed>=horses.length/2,'a pack forms instead of fixed horse-number lanes');
 assert.ok(nearFront>widthFrames,'horses follow other horses, not only the rail');
 if(horses.length>10)assert.ok(totalWidth/widthFrames<(horses.length-1)*1.2*.9,'field narrows after the break');
 const sample=pack.state(rank[0],duration*.71);
 pack.state(rank[0],duration*.99);pack.state(rank[0],0);
 assert.deepEqual(pack.state(rank[0],duration*.71),sample,'arbitrary seeks are deterministic');
 if(c===0){const again=createRacePack(settings);assert.deepEqual(again.state(rank[0],duration*.71),sample,'independent rebuild is deterministic');}
 const finishes=rank.map((no,i)=>pack.state(no,duration*(1+i*.00135)+.000001).p);
 assert.ok(finishes.every(p=>p>=1),'original finish clock contract');
 const loss=pack.diagnostics(rank[0]).extraDistance;
 assert.ok(loss>=-.1,'travel cannot be shorter than the reference inside corridor');
 console.log('PACK',JSON.stringify({c,runners:horses.length,ms:Math.round(built),minClear,nearFront,averageWidth:totalWidth/widthFrames,changed,distanceLoss:loss}));
}
// Geometric sanity: a lane 3m farther out adds pi*3m on a half-circle.
const circle=(p,lane)=>({x:(100-lane)*Math.cos(p*Math.PI),z:(100-lane)*Math.sin(p*Math.PI)});
let inner=0,outer=0;
for(let k=1;k<=1000;k++)for(const [lane,isOuter] of [[0,false],[-3,true]]){
 const a=circle((k-1)/1000,lane),b=circle(k/1000,lane),d=Math.hypot(a.x-b.x,a.z-b.z);
 if(isOuter)outer+=d;else inner+=d;
}
assert.ok(Math.abs(outer-inner-Math.PI*3)<.0001);
console.log('Pack corridor clearance, bounds, steering, deterministic seeking, finish order and curve geometry ✓');
