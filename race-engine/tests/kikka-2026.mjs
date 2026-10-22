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
assert.equal(c.horses.length,18);assert.equal(c.provisionalDraw,false);
assert.equal(c.drawConfirmed,true);assert.equal(c.finalRunnersConfirmed,true);
const names=['エムズビギン','コンジェスタス','アウダーシア','ショウナンガルフ','ジャスティンシカゴ','バステール','ラージアンサンブル','ロブチェン','ゴーイントゥスカイ','ダノンヒストリー','アスクエジンバラ','サノノグレーター','キンググローリー','マジョレルブルー','シートゥサミット','ショウナンハヤナミ','チャリングクロス','ナリタエスペランサ'];
const frames=[1,1,2,2,3,3,4,4,5,5,6,6,7,7,7,8,8,8];
assert.deepEqual(c.horses.map(h=>h.name),names);
assert.deepEqual(c.horses.map(h=>h.no),Array.from({length:18},(_,i)=>i+1));
assert.deepEqual(c.horses.map(h=>h.frame),frames);
assert.ok(!c.horses.some(h=>['アルトラムス','イブキ','ミッキーファルコン'].includes(h.name)));
const loop=createRegression(c,createFactors(c));
const {jockeyCap}=await load('core/jockey-caps.js');
assert.equal(jockeyCap(c.horses[7],c).hex,'#1561C2');
assert.equal(jockeyCap(c.horses[9],c).hex,'#FFD600');
for(const h of c.horses)assert.equal(createFactors(c).frame(h),h.frame);
assert.equal(loop.FEATURES.reduce((s,f)=>s+f.weight,0),100);
assert.equal(loop.FEATURES.find(x=>x.id==='draw').weight,1);
assert.equal(c.defaultVol,5);assert.equal(c.defaultPlaybackRate,8);
assert.ok(c.asOf.startsWith('2026-10-22'));assert.equal(c.seed,20261022);
assert.equal(c.horses.filter(h=>h.latestReviewKind==='final-workout').length,18);
assert.equal(c.defaultGround,'soft');assert.equal(c.defaultSpeed,0);
assert.deepEqual(c.scenarios[0].options,{pace:0,speed:0,ground:'soft',bias:'neutral',vol:5});
assert.equal(c.scenarios.length,14);
assert.ok(c.scenarios.some(s=>s.options.ground==='heavy'),'distinct 不良 case');
const wet=JSON.parse(read('data/kikka-2026-wet-20261022.json'));assert.equal(wet.rows.length,18);
assert.equal(wet.rows.filter(x=>x.heavyStarts>0).length,1);
assert.equal(wet.rows.find(x=>x.name==='ロブチェン').heavyStarts,1);
assert.equal(wet.rows.find(x=>x.name==='ゴーイントゥスカイ').softAdjustment.blood,2);
const go=c.horses.find(h=>h.name==='ゴーイントゥスカイ');
assert.equal(c.conditionResponses[go.no].ground.good,undefined);
assert.equal(go.workout.date,'2026-10-22','Thursday final, not Wednesday');
for(const h of c.horses.filter(h=>h!==go))assert.equal(h.workout.date,'2026-10-21');
const audit=JSON.parse(read('data/kikka-2026-update-20261022.json'));
const evidence=JSON.parse(read('data/kikka-2026-evidence.json'));
assert.equal(audit.rows.length,18);assert.equal(audit.asOf,c.asOf);
assert.equal(evidence.recordSnapshotAsOf,'2026-10-18T16:01:04+09:00');
assert.equal(evidence.horses.filter(h=>h.status==='confirmed').length,18);
assert.equal(evidence.horses.filter(h=>h.status==='excluded').length,2);
for(const h of c.horses){
 const a=audit.rows.find(x=>x.horseId===h.horseId),old=audit.previousModel.horses.find(x=>x.horseId===h.horseId);
 assert.equal(a.reviewedAt,c.asOf);assert.equal(a.no,h.no);
 assert.equal(evidence.horses[h.evidenceIndex].horseId,h.horseId,'evidence index remains identity based');
 assert.equal(evidence.horses[h.evidenceIndex].no,h.no);
 assert.deepEqual(evidence.horses[h.evidenceIndex].workout,h.workout);
 assert.equal(h.trainingWeight.source,'https://www.jra.go.jp/news/202610/102205.html');
 for(const [key,value]of Object.entries(audit.previousModel.featureScores[old.no])){
  if(!['training','draw'].includes(key))assert.equal(c.featureScores[h.no][key],value,h.name+' feature identity '+key);
 }
 const oldResponse=structuredClone(audit.previousModel.conditionResponses[old.no]),newResponse=structuredClone(c.conditionResponses[h.no]);
 delete oldResponse.variants.unknownTrainingGood;delete newResponse.variants.unknownTrainingGood;
 assert.deepEqual(oldResponse,newResponse,h.name+' condition identity');
 assert.ok(Math.abs(c.featureScores[h.no].draw-50)<=15);
 assert.equal(c.featureScores[h.no].training,h.trainingScore);
}
for(const [name,score,variant]of [['エムズビギン',84,88],['キンググローリー',78,84],['ナリタエスペランサ',78,84]]){
 const h=c.horses.find(h=>h.name===name);
 assert.equal(loop.scores(h).training,score);
 assert.equal(loop.scores(h,{variant:'unknownTrainingGood'}).training,variant);
}
assert.equal(c.horses[6].trainingWeight.kg,481,'JRA, not club separate measurement');
assert.equal(c.horses.find(h=>h.name==='チャリングクロス').j,'石川裕紀人');
assert.equal(c.horses.filter(h=>h.suitability.body===null).length,3);
assert.equal(c.horses.filter(h=>h.suitability.bodyEra.startsWith('5月')).length,2);
const resultFile=JSON.parse(read('results/kikka-2026-20261022.json'));
assert.equal(resultFile.totals.scenarioDraws,700000);
assert.equal(resultFile.comparison.find(h=>h.name==='エムズビギン').previousRating,76.1);
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
console.log('菊花賞: 18 confirmed horses, identity-safe draw remapping, 3000m, two hills, first-pass goal, 403.7m straight, 5 cameras, 5000 reproducible draws ✓');
