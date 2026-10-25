import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const load=p=>import('data:text/javascript;base64,'+Buffer.from(read(p)).toString('base64'));
const [{hanshinPath,HANSHIN_INNER_B},{createTrackingReplay}]=await Promise.all([load('assets/hanshin-course.js'),load('core/tracking-replay.js')]);
const data=JSON.parse(read('data/takarazuka-2026-tracking.json')),replay=createTrackingReplay(data,hanshinPath);
assert.equal(data.isGpsTracking,false);assert.equal(data.extraction.independentAccuracyValidation,false);
assert.equal(data.horses.length,18);
assert.deepEqual(replay.rank,[16,5,1,9,8,7,17,10,2,12,11,4,14,13,6,18,3,15]);
assert.deepEqual(data.horses.map(h=>h.frame),[1,1,2,2,3,3,4,4,5,5,6,6,7,7,7,8,8,8]);
const observed=data.horses.flatMap(h=>h.samples.filter(s=>s.kind==='video-observation'));
assert.equal(observed.length,data.extraction.observationCount);assert.ok(observed.length>1500,'use extracted video points, not just corner ranks');
assert.ok(observed.every(p=>p.screen.length===2&&p.matchScore>=.84&&Number.isFinite(p.videoTime)));
for(const h of data.horses){
 assert.ok(h.samples.filter(p=>p.kind==='video-observation').length>=10,h.name+' has actual image observations');
 if(h.result==='FINISHED')assert.ok(Math.abs(replay.state(h.no,h.renderFinishSeconds).p-1)<1e-10);
 let prev=-1;
 for(let t=0;t<=replay.endTime;t+=.1){const s=replay.state(h.no,t);assert.ok([s.p,s.x,s.y,s.z,s.dx,s.dz,s.speed,s.lane].every(Number.isFinite));assert.ok(s.p>=prev-1e-10);assert.ok(Math.abs(s.lane)<=10.3);prev=s.p}
}
assert.equal(replay.state(15,130).visible,false,'DNF does not receive a fabricated finish');
assert.equal(data.horses[14].finishSeconds,null);
const ranked=replay.positions(138).sort((a,b)=>b.p-a.p).map(h=>h.no);assert.deepEqual(ranked,replay.rank);
const firstGoal=hanshinPath(HANSHIN_INNER_B.startBeforeGoal/2200),finish=hanshinPath(1);
assert.ok(Math.hypot(firstGoal.x-finish.x,firstGoal.z-finish.z)<1e-8,'one full B inner lap returns to the same line');
assert.ok(Math.abs(firstGoal.y-finish.y)<1e-8,'the two climbs share the same elevation');
let length=0,prev=hanshinPath(0),y=[];
for(let i=1;i<=22000;i++){const q=hanshinPath(i/22000);length+=Math.hypot(q.x-prev.x,q.z-prev.z);y.push(q.y);prev=q}
assert.ok(Math.abs(length-2200)<.05,'2200m physical path');assert.ok(Math.max(...y)>1.89&&Math.min(...y)<.01);
assert.throws(()=>createTrackingReplay({...data,isGpsTracking:true},hanshinPath));
console.log('PASS Takarazuka: '+observed.length+' video observations, 18 trajectories, exact official results, DNF, 2200m/B-course/elevation');
