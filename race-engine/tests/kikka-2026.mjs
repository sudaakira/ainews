import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=resolve(import.meta.dirname??new URL('.',import.meta.url).pathname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const moduleURL=p=>'data:text/javascript;base64,'+Buffer.from(read(p).replace(/from ['"](\.[^'"]+)['"]/g,(_,spec)=>"from '"+moduleURL(relative(root,resolve(root,dirname(p),spec.split('?')[0])))+"'")).toString('base64');
const load=p=>import(moduleURL(p));
const [{default:c},{createFactors},{createRegression},{createSimulator},{KYOTO_OUTER_3000:course,kyotoOuterPath:path,kyotoOuterHeight:height},{courseShotCuts,chooseRaceShot,raceCameraPose,followLockedCameraPose}]=await Promise.all([
 load('races/kikka-2026.js'),load('core/factors.js'),load('core/regression.js'),load('core/simulator.js'),load('assets/kyoto-outer-3000.js'),load('assets/race-shotlist.js')
]);
assert.equal(c.horses.length,18);assert.equal(c.provisionalDraw,true);
assert.ok(!c.horses.some(h=>['アルトラムス','イブキ','ミッキーファルコン'].includes(h.name)));
const loop=createRegression(c,createFactors(c));
assert.equal(loop.FEATURES.reduce((s,f)=>s+f.weight,0),100);
for(const h of c.horses)assert.equal(loop.scores(h).draw,50,'no registration-order draw bonus');
for(const name of ['エムズビギン']){
 const h=c.horses.find(h=>h.name===name);assert.equal(loop.scores(h).training,50);
}
assert.equal(loop.scores(c.horses.find(h=>h.name==='ナリタエスペランサ')).training,45,'reported fitness concern is not a missing observation');
assert.equal(c.defaultVol,5);assert.equal(c.defaultPlaybackRate,8);
assert.ok(c.asOf.startsWith('2026-10-20'));
assert.equal(loop.scores(c.horses.find(h=>h.name==='キンググローリー')).training,78,'verified earlier workout resolves missing data');
assert.equal(c.horses.filter(h=>h.latestReviewKind==='new-report').length,4);
assert.equal(c.horses.filter(h=>h.latestReviewKind==='newly-verified-earlier-report').length,1);
const audit=JSON.parse(read('data/kikka-2026-update-20261020.json'));
assert.equal(audit.rows.length,18);assert.equal(audit.asOf,c.asOf);
const priorResults=JSON.parse(read('results/kikka-2026-20261019.json'));
for(const h of c.horses){
 const row=audit.rows.find(x=>x.name===h.name);
 assert.equal(row.reviewedAt,c.asOf);
 if(row.kind==='retained')assert.equal(loop.evaluate(h,{}).rating,priorResults.scenarios[0].result.find(x=>x.name===h.name).rating);
}
for(const name of ['エムズビギン','キンググローリー','ナリタエスペランサ'])assert.equal(loop.scores(c.horses.find(h=>h.name===name),{variant:'unknownTrainingGood'}).training,80);
assert.equal(c.horses.find(h=>h.name==='チャリングクロス').j,'石川裕紀人');
assert.equal(c.horses.filter(h=>h.suitability.body===null).length,3,'missing autumn photos stay missing');
assert.equal(c.horses.filter(h=>h.suitability.bodyEra.startsWith('5月')).length,2,'spring photos must remain labelled');
let meters=0,previous=path(0),peaks=0;
for(let i=1;i<=12000;i++){
 const p=i/12000,q=path(p);meters+=Math.hypot(q.x-previous.x,q.z-previous.z);previous=q;
 if(height(p)>=4.299&&height(p-1/12000)<4.299)peaks++;
}
assert.ok(Math.abs(meters-3000)<.1,'actual planar path is 3000m');
assert.equal(peaks,2,'hill must be climbed twice');
const end=path(1),pass=path(course.firstFinish/3000);
assert.ok(Math.hypot(end.x-pass.x,end.z-pass.z)<1e-6,'same goal on first and final pass');
assert.ok(Math.abs(end.y)<1e-9&&Math.abs(pass.y)<1e-9);
const exit=path(course.exitProgress);
assert.ok(Math.abs(Math.hypot(exit.x-end.x,exit.z-end.z)-403.7)<.01,'403.7m straight');
const sim=createSimulator(c,loop),result=sim.simulate({vol:10},5000,c.seed);
assert.equal(result.length,18);assert.ok(Math.abs(result.reduce((a,h)=>a+h.p3,0)-300)<1e-9);
const cuts=courseShotCuts(null,null,c);
assert.equal(chooseRaceShot(.82,cuts).id,'fourth-turn');assert.equal(chooseRaceShot(.9,cuts).id,'finish');
for(const aspect of [.54,1.6])for(const progress of [.01,.19,.63,.80,.84,.865,.90,.999]){
 const order=c.horses.map((h,i)=>({no:h.no,p:Math.max(0,progress-i*.0009)}));
 const shot=chooseRaceShot(progress,cuts);
 const pose=raceCameraPose({shot,progress,order,path,aspect,clock:progress*c.duration,distance:3000,venue:'京都'});
 assert.ok(pose.railOutsideVerified&&pose.outerRailClearance>=8);
 const followed=followLockedCameraPose({pose:{...pose,shotId:shot.id},startLeaderProgress:progress},order,path,{distance:3000,venue:'京都'});
 assert.ok(Number.isFinite(followed.position.x)&&Number.isFinite(followed.look.y));
}
console.log('菊花賞: 18 horses, neutral unknowns, 3000m, two hills, first-pass goal, 403.7m straight, 5 cameras, 5000 reproducible draws ✓');
