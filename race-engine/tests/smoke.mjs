// Run locally or in GitHub Actions: node race-engine/tests/smoke.mjs
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=resolve(import.meta.dirname??new URL('.',import.meta.url).pathname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const moduleURL=p=>'data:text/javascript;base64,'+Buffer.from(read(p).replace(/from ['"](\.[^'"]+)['"]/g,(_,spec)=>"from '"+moduleURL(relative(root,resolve(root,dirname(p),spec.split('?')[0])))+"'")).toString('base64');
const load=p=>import(moduleURL(p));
const [{createFactors},{createRegression},{createSimulator},{JRA_JOCKEY_CAPS,UNKNOWN_JOCKEY_CAP,jockeyCap}]=await Promise.all([
 load('core/factors.js'),load('core/regression.js'),load('core/simulator.js'),load('core/jockey-caps.js')
]);
// Every JRA frame colour and contrast is validated centrally and reused in 2D/3D.
assert.deepEqual(JRA_JOCKEY_CAPS.slice(1).map(c=>c.name),['白','黒','赤','青','黄','緑','橙','桃']);
assert.deepEqual(JRA_JOCKEY_CAPS.slice(1).map(c=>c.hex),['#FFFFFF','#111111','#E62931','#1561C2','#FFD600','#009944','#F28C00','#EE8FAB']);
for(let n=1;n<=8;n++){
 const cap=jockeyCap({no:2,frame:n},{provisionalDraw:false},()=>8);
 assert.equal(cap.frame,n,'official frame wins over horse number or derived frame');
 assert.equal(cap.hex,JRA_JOCKEY_CAPS[n].hex);
 assert.match(cap.outline,/^#[0-9A-F]{6}$/);
 assert.match(cap.text,/^#[0-9A-F]{6}$/);
}
assert.deepEqual(jockeyCap({no:12,frame:4},{provisionalDraw:true},()=>4),UNKNOWN_JOCKEY_CAP,'unknown draw must stay neutral');
assert.equal(jockeyCap({no:12},{},()=>6).frame,6,'legacy entries use frame resolver');
assert.equal(jockeyCap({no:4,frame:2,capPattern:'quartered'},{},()=>3).secondary,'#FFFFFF');
assert.equal(jockeyCap({no:4,frame:1,capPattern:'eighths'},{},()=>3).secondary,'#74D3E8');
assert.equal(jockeyCap({no:4,frame:3,capPattern:'unverified'},{},()=>3).pattern,undefined);
console.log('JRA official 8-frame jockey helmets, exceptional dyed caps, and provisional draw ✓');
for(const id of ['swan-2026','sample-demo','tokyo-20261012-11','tokyo-20261012-12','kyoto-20261012-12','shuka-2026','kikka-2026']){
 const {default:config}=await load('races/'+id+'.js');
 const factor=createFactors(config),regression=createRegression(config,factor),sim=createSimulator(config,regression);
 // Reused for ALL races, not only the 秋華賞.
 for(const h of config.horses){
  const cap=jockeyCap(h,config,horse=>factor.frame(horse));
  if(config.provisionalDraw)assert.equal(cap.frame,null);
  else assert.equal(cap.frame,factor.frame(h),'jockey helmet must match resolved JRA frame');
 }
 const options={pace:0,speed:2,vol:10,ground:'good',bias:'neutral',weights:regression.DEFAULTS};
 const result=sim.simulate(options,5000,20261012),again=sim.simulate(options,5000,20261012);
 assert.equal(result.length,config.horses.length);
 assert.deepEqual(result,again,'seeded Monte Carlo must be reproducible');
 assert.ok(Math.abs(result.reduce((n,p)=>n+p.p3,0)-300)<1e-6);
 assert.equal(regression.FEATURES.length,14);
 assert.equal(regression.FEATURES.reduce((n,f)=>n+f.weight,0),100);
 assert.ok(result.every(x=>Number.isFinite(x.rating)&&Number.isFinite(x.p3)));
 assert.ok(config.horses.every(h=>Number.isFinite(regression.evaluate(h,options).rating)));
 if(id==='swan-2026'){
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,3,3]);
  assert.equal(factor.frame(config.horses[17]),8);
 }else if(id==='tokyo-20261012-11'){
  assert.equal(config.name,'オクトーバーステークス');
  assert.equal(config.date,'2026-10-12');
  assert.equal(config.distance,2000);
  assert.equal(config.direction,'左');
  assert.equal(config.courseView,'tokyo-2000');
  assert.equal(config.horses.length,18);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.j&&h.trainer&&h.father&&h.mfather));
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,3,3]);
  assert.equal(config.demo,false);
  assert.ok(config.sources.JRA.startsWith('https://'));
  assert.ok(config.notes.includes('暫定'));
 }else if(id==='tokyo-20261012-12'){
  assert.equal(config.raceNumber,12);
  assert.equal(config.venue,'東京');
  assert.equal(config.surface,'ダート');
  assert.equal(config.distance,1300);
  assert.equal(config.direction,'左');
  assert.equal(config.demo,false);
  assert.equal(config.horses.length,16);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.j&&h.father&&h.mfather));
  assert.ok(config.notes.includes('暫定'));
  assert.equal(config.inputs[9][0],94);
  assert.ok(config.sources.JRA.startsWith('https://'));
 }else if(id==='kyoto-20261012-12'){
  assert.equal(config.date,'2026-10-12');
  assert.equal(config.venue,'京都');
  assert.equal(config.raceNumber,12);
  assert.equal(config.surface,'ダート');
  assert.equal(config.distance,1200);
  assert.equal(config.direction,'右');
  assert.equal(config.demo,false);
  assert.equal(config.horses.length,16);
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,2,2]);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.j&&h.trainer&&h.father&&h.mfather));
  assert.ok(config.horses.every(h=>['B','C'].includes(h.training)));
  assert.ok(config.notes.includes('暫定'));
  assert.equal(config.horses[15].name,'カネコメファミリー');
  assert.ok(config.sources.JRA.startsWith('https://'));
  }else if(id==='shuka-2026'){
  assert.equal(config.date,'2026-10-18');
  assert.equal(config.horses.length,17);
  assert.equal(config.finalRunnersConfirmed,true);
  assert.equal(config.drawConfirmed,true);
  assert.equal(config.provisionalDraw,false);
  assert.equal(config.seed,20261016);
  assert.equal(config.asOf,'2026-10-17T17:22:00+09:00');
  assert.equal(config.defaultPace,0);
   assert.equal(config.defaultBias,"front");
   assert.equal(config.defaultVol,5);
   assert.equal(config.defaultPlaybackRate,8);
   assert.equal(config.weather17.cushion,10.8);
   assert.equal(config.weather17.turfMoisture4CPct,7.7);
   assert.equal(config.weather17.turfMoistureFinishPct,6.8);
   assert.ok(config.weather17.observations.some(x=>x.includes('8R')));
   assert.ok(regression.scores(config.horses[7],{...options,bias:'front'}).bias>50);
   assert.equal(regression.scores(config.horses[7],{...options,bias:'front'}).draw,regression.scores(config.horses[7],options).draw);
  assert.equal(config.defaultSimulations,50000);
  assert.equal(config.horses.filter(h=>h.name==='スマートプリエール').length,0);
  assert.equal(config.withdrawn[0].name,'スマートプリエール');
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,2,3]);
  assert.deepEqual(config.horses.map(h=>h.name),[
    'ギャラボーグ','テイエムアイラン','マスターソアラ','エンネ',
    'タイセイボーグ','ラベルセーヌ','バースデイフライト',
    'モンローウォーク','スウィートハピネス','ナイスプレーアスク',
    'ガーネットフレア','カナルサンマルタン','ドリームコア',
    'サムシングスイート','フェスティバルヒル','ハヤブササキチャン','ロザーンジュ'
  ]);
  assert.deepEqual(config.horses.map(h=>h.frame),[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,8]);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&factor.frame(h)===h.frame&&h.kg===55&&h.age==='牝3'));
  assert.ok(config.horses.every(h=>h.j&&h.trainer&&h.father&&h.mfather&&h.trainingWeight));
  assert.ok(config.horses.every(h=>h.pressWorkoutGrade&&Number.isFinite(h.trainingScore)));
  assert.equal(config.horses.find(h=>h.name==='ドリームコア').no,13);
  assert.equal(config.horses.find(h=>h.name==='モンローウォーク').no,8);
  assert.equal(config.horses.find(h=>h.name==='エンネ').no,4);
  assert.equal(config.inputs[13][0],85,'Dream Core course input follows horse identity');
  assert.equal(config.inputs[8][1],89,'Monroe Walk updated lap input follows horse identity');
  assert.equal(config.horses.find(h=>h.name==='ドリームコア').trainingScore,73);
  assert.equal(config.horses.find(h=>h.name==='モンローウォーク').trainingScore,90);
  const monroe=config.horses.find(h=>h.name==='モンローウォーク');
  assert.equal(monroe.sd,10);
  assert.deepEqual(config.inputs[monroe.no],[79,89,84,69,74]);
  assert.deepEqual(monroe.evaluationAudit.previous,{course:75,lap:87,blood:68,distance:66,sd:9});
  assert.deepEqual(monroe.evaluationAudit.revised,{course:79,lap:89,blood:84,distance:74,sd:10});
  assert.ok(monroe.evaluationAudit.sources.blood.includes('jra-van.jp'));
  assert.equal(config.rebalanceReview.other16HorseInputsUnchanged,true);
  assert.equal(config.rebalanceReview.scoreWeightsUnchanged,true);
  const oldMonroe=JSON.parse(JSON.stringify(config));
  const oldHorse=oldMonroe.horses.find(h=>h.name==='モンローウォーク');
  oldMonroe.inputs[monroe.no]=[75,87,68,69,66];oldHorse.sd=9;
  const oldLoop=createRegression(oldMonroe,createFactors(oldMonroe)),oldSim=createSimulator(oldMonroe,oldLoop);
  const simParams={...options,pace:config.defaultPace};
  const adjusted=sim.simulate(simParams,2000,config.seed);
  const previous=oldSim.simulate({...simParams,weights:oldLoop.DEFAULTS},2000,config.seed);
  assert.ok(adjusted[monroe.no-1].p3>previous[monroe.no-1].p3,'evidence-backed rating must change a real simulation');
  assert.equal(adjusted.length,17);

  assert.equal(config.horses.find(h=>h.name==='ラベルセーヌ').trainingScore,90);
  assert.equal(config.factors.draw.length,9);
  assert.equal(config.factors.draw[4].p3,5);
  assert.equal(config.factors.draw[7].n,23);
  assert.equal(config.weather16.turfMoistureFinishPct,7.9);
  assert.equal(config.weather16.turfMoisture4CPct,8.5);
  assert.equal(config.horses.find(h=>h.name==='ドリームコア').trainingWeight.kg,523);
  assert.equal(config.horses.filter(h=>Number.isInteger(h.lastRace4c)).length,8);
  assert.equal(Object.keys(config.inputs).length,17);
  assert.equal(Object.keys(config.speedAdapt).length,17);
  assert.equal(config.historicalTrends.kyotoPrev4c.front.other,50);
  const withoutHist=JSON.parse(JSON.stringify(config));delete withoutHist.historicalTrends;
  const noHistoryReg=createRegression(withoutHist,createFactors(withoutHist));
  const master=config.horses.find(h=>h.name==='マスターソアラ');
  assert.ok(Math.abs(regression.scores(master,options).pace-noHistoryReg.scores(master,options).pace)<=3);
  const noDraw=JSON.parse(JSON.stringify(config));noDraw.factors.draw=[];
  const noDrawReg=createRegression(noDraw,createFactors(noDraw));
  const drawDifference=Math.abs(regression.evaluate(config.horses[7],options).rating-noDrawReg.evaluate(config.horses[7],options).rating);
  assert.ok(drawDifference<=1.1,'draw trend must not overwhelm fundamental ability');
  assert.notEqual(regression.scores(config.horses[7],options).draw,noDrawReg.scores(config.horses[7],options).draw);
  const first=sim.simulate({...options,pace:config.defaultPace},1000,config.seed);
  assert.deepEqual(first,sim.simulate({...options,pace:config.defaultPace},1000,config.seed));
  assert.ok(Math.abs(first.reduce((a,x)=>a+x.win,0)-100)<1e-6);
  assert.ok(Math.abs(first.reduce((a,x)=>a+x.p3,0)-300)<1e-6);
 }else if(id==='kikka-2026'){
  assert.equal(config.distance,3000);
  assert.equal(config.courseView,'kyoto-3000-outer');
  assert.equal(config.horses.length,18);
  assert.equal(config.provisionalDraw,true);
  assert.equal(config.scenarios.length,14);
  assert.equal(regression.FEATURES.find(f=>f.id==='blood').weight,10);
  assert.ok(config.horses.every(h=>regression.scores(h,options).draw===50));
 }else{
  assert.equal(config.demo,true,'sample must be clearly fictional');
  assert.ok(config.horses.every(h=>factor.factors(h).total===0),'unavailable factors must be neutral');
  assert.deepEqual(factor.frameSizes,[1,1,1,1,1,1]);
 }
 const zero={...options,weights:Object.fromEntries(regression.FEATURES.map(f=>[f.id,0]))};
 assert.equal(regression.evaluate(config.horses[0],zero).rating,50);
 console.log(id+': '+config.horses.length+' horses / deterministic 5000 draws / 14 factors ✓');
}
const html=read('index.html'),app=read('app.js'),render=read('renderer.js');
for(const name of ['core/factors.js','core/regression.js','core/simulator.js','core/jockey-caps.js','assets/horse-anime.js','assets/chibi-gallop.js','assets/kyoto-scenery.js'])assert.ok(existsSync(resolve(root,name)),name+' must exist');
assert.match(html,/await import\('\.\/app\.js\?v=/);
assert.match(html,/await import\('\.\/renderer\.js\?v=/);
assert.match(render,/stallCount=HS.length/);
assert.match(render,/horseV3Ready=models.length===HS.length/);
assert.match(app,/const HS=config.horses/);
assert.match(app,/config\.provisionalDraw/);
assert.match(app,/h\.workout/);
assert.match(read('core/regression.js'),/verifiedDraw/);
for(const source of [app,render])assert.doesNotThrow(()=>new Function(source.replace(/^import .*?;$/gm,'')),'ES-module syntax must parse');
const anime=read('assets/horse-anime.js');
const horseModule=await load('assets/horse-anime.js');
assert.equal(typeof horseModule.createRaceHorse,'function');
assert.equal(typeof horseModule.preloadRaceHorse,'function');
assert.match(render,/jockeyCap\(h,config,horse=>window\.SWAN_FACTORS\.frame\(horse\)\)/);
assert.match(render,/frameCap\.hex,frameCap\.outline,frameCap\.pattern/);
assert.match(app,/const cap=capFor\(h\)/);
assert.match(app,/jra-jockey-cap-legend/);
assert.match(app,/h\.evaluationAudit/);
assert.match(anime,/toon\(frameCapHex\)/);
assert.match(anime,/frameCapPattern==='quartered'/);
assert.doesNotMatch(anime,/helmetWhite/);
assert.match(html,/shared-v9/);
assert.match(read('../swan-2026/index.html'),/race-engine\/\?race=swan-2026/);
assert.match(render,/config.direction==='左'/);
assert.match(render,/config.courseView==='tokyo-2000'/);

// Mobile-first presentation is intentionally a read-only shell around the
// SAME predictor. No duplicated Monte Carlo or 14-factor scoring in UI assets.
const premiumCSS=read('assets/premium-mobile.css');
const premiumJS=read('assets/premium-mobile.js');
assert.match(html,/assets\/premium-mobile\.css\?v=ui-v1/);
assert.match(html,/import\('\.\/assets\/premium-mobile\.js\?v=cinema-v1'\)/);
assert.doesNotThrow(()=>new Function(premiumJS),'premium mobile UI code must parse');
assert.match(premiumJS,/premium-immersive/);
assert.doesNotMatch(premiumJS,/cameraOrder/,'cinematic version removes manual viewpoint selection');
assert.match(premiumJS,/MutationObserver\(updatePreview\)/);
assert.doesNotMatch(premiumJS,/SIM\.simulate|LOOP\.evaluate|SIM\.runRace/,'presentation cannot rerun model');
assert.match(app,/class="cap-number"/);
assert.match(app,/class="horse-label"/);
assert.match(app,/class="place-frame"/);
assert.match(premiumCSS,/@media\(max-width:680px\)/);
assert.match(premiumCSS,/env\(safe-area-inset-bottom/);
assert.match(premiumCSS,/prefers-reduced-motion/);
assert.match(premiumCSS,/#three-stage/);
assert.match(premiumCSS,/premium-hero-summary/);
assert.match(premiumCSS,/premium-nav/);
assert.match(premiumCSS,/premium-focus/);
assert.match(premiumCSS,/\.bar:first-child \.fill/);
assert.match(premiumCSS,/--ui-gold/);

// Meaningful playback contracts: five JRA cuts, outside-rail positioning and continuous run-out.
const cinemaJS=read('assets/race-cinematics.js'),cinemaCSS=read('assets/race-cinematics.css');
const {RACE_SHOT_LIST,chooseRaceShot,raceCameraPose,followLockedCameraPose,courseShotCuts}=await load('assets/race-shotlist.js');
const {FINISH_GAP,runOutProgress,playbackEnd,playbackRate,finishCrossings}=await load('assets/race-playback.js');
assert.deepEqual(RACE_SHOT_LIST.map(s=>s.id),['start','first-corner','backstretch','fourth-turn','finish']);
const visited=[];
for(let p=0;p<1.25;p+=.001){const id=chooseRaceShot(p).id;if(visited.at(-1)!==id)visited.push(id);}
assert.deepEqual(visited,RACE_SHOT_LIST.map(s=>s.id),'exactly five compositions including the entire run-out');
for(let i=0;i<4;i++){
 const boundary=RACE_SHOT_LIST[i].until;
 assert.equal(chooseRaceShot(boundary-1e-8).id,RACE_SHOT_LIST[i].id);
 assert.equal(chooseRaceShot(boundary).id,RACE_SHOT_LIST[i+1].id);
}
assert.equal(chooseRaceShot(NaN).id,'start');
assert.equal(chooseRaceShot(-1).id,'start');
assert.deepEqual(courseShotCuts(null,0,{venue:'東京'}),[.08,.30,.62,.84,Infinity]);
// Verify camera against Kyoto OUTERMOST outer-course rail, not just the
// inner A-course. The previous "outside" camera could sit inside the 3C bulge.
const {kyotoPath:cameraKyotoPath,runnerLane:cameraRunnerLane,kyotoOuterCourseOffset:cameraBulge}=await load('assets/kyoto-course.js');
const projectTest=(q,pose,aspect)=>{
 const a=pose.position,b=pose.look,fx=b.x-a.x,fy=b.y-a.y,fz=b.z-a.z;
 const fn=Math.hypot(fx,fy,fz),dx=q.x-a.x,dy=q.y-a.y,dz=q.z-a.z;
 const depth=(dx*fx+dy*fy+dz*fz)/fn;
 return {x:.5+.5*((-fz*dx+fx*dz)/(fn*depth*Math.tan(pose.fov*Math.PI/360)*aspect)-pose.lensShiftX),depth};
};
for(const p of [.10,.4,.59,.66,.73,.82,.94,.999])for(const aspect of [.58,.76,1.8]){
 const shot=chooseRaceShot(p,courseShotCuts(null,0,{venue:'京都',surface:'芝',distance:2000}));
 const order=Array.from({length:17},(_,i)=>({no:i+1,p:p-i*.0022}));
 const pose=raceCameraPose({shot,progress:p,clock:Math.max(5,p*119),order,
  path:cameraKyotoPath,aspect,direction:'右',venue:'京都',distance:2000});
 assert.equal(pose.mode,'rail-broadcast-'+shot.id);
 const target=shot.id==='start'?[17,17]:shot.id==='backstretch'?[7,7]:shot.id==='fourth-turn'?[5,5]:shot.id==='first-corner'?[6,7]:[3,4];
 assert.ok(pose.subjects.length>=target[0]&&pose.subjects.length<=target[1],
  shot.id+' needs '+target+' front runners, got '+pose.subjects.length);
 assert.equal(pose.outerRailSign,1,'Kyoto right-handed outer side must be negative track lane');
 assert.ok(pose.cameraLane<pose.railLane-11.9,
  'actual camera lane '+pose.cameraLane+' must be OUTSIDE negative-lane rail '+pose.railLane);
 assert.equal(pose.railOutsideVerified,true);
 assert.equal(pose.leadNumber,order[0].no,'leader, never pack midpoint, owns picture');
 assert.ok(pose.leadNoseViewportTarget>=.19&&pose.leadNoseViewportTarget<=.81,
  'leader nose must leave substantial forward space: '+pose.leadNoseViewportTarget);
 assert.ok(pose.forwardGap>=.19&&pose.forwardGap<=.5,'>=19% uncluttered space ahead');
 assert.ok(pose.outerRailClearance>=11.9,'camera OUTSIDE the actual outer-course rail');
 assert.ok(pose.shotPerspective.startsWith('outside-'),'camera is always outside');
 // Wide-field shots deliberately cover 12-17 runners rather than the old 3-5.
  // Their valid full-frame projection can occupy up to 95% of the image width.
  const maxGroupWidth=shot.id==='backstretch'||shot.id==='fourth-turn'?1.91:shot.id==='first-corner'?1.63:1.51;
 assert.ok(pose.projectedWidth<maxGroupWidth,
  'selected group must fit the shot-specific safe area: '+shot.id+' width '+pose.projectedWidth);
 const leader=order[0],q=cameraKyotoPath(leader.p),lane=cameraRunnerLane(leader.no,17,p);
 const point={x:q.x-q.dz*lane+q.dx*2,y:q.y+2,z:q.z+q.dx*lane+q.dz*2};
 const screen=projectTest(point,pose,Math.max(.48,aspect));
 assert.ok(screen.depth>0&&screen.x>.02&&screen.x<.91,'leader in shot');
}
// Kyoto corners turn: the camera's heading follows the COURSE smoothly,
// but never points to each newly-leading horse. Lens/framing remain fixed.
for(const [start,end] of [[.085,.28],[.30,.66],[.68,.83],[.84,.99]]){
 const shot=chooseRaceShot(start),order=p=>Array.from({length:17},(_,i)=>({no:i+1,p:p-i*.0022}));
 const base=raceCameraPose({shot,progress:start,clock:start*120,order:order(start),
  path:cameraKyotoPath,aspect:.54,direction:'右',venue:'京都',distance:2000});
 const rig={pose:base,startLeaderProgress:start};
 const bearing=followLockedCameraPose(rig,order(start),cameraKyotoPath,{distance:2000,venue:'京都'});
 const vector=p=>[p.look.x-p.position.x,p.look.y-p.position.y,p.look.z-p.position.z];
 const initial=vector(bearing);let previous=bearing,prevAngle=0;
 for(let j=0;j<=100;j++){
  const p=start+(end-start)*j/100;
  const camera=followLockedCameraPose(rig,order(p),cameraKyotoPath,{distance:2000,venue:'京都'});
  assert.ok(camera.lockedCamera,'track-side dolly, not jittery dynamic auto compose');
  assert.ok(camera.outerRailClearance>=14.9,'dolly stays >=15m outside rail');
  if(shot.id==='fourth-turn')assert.equal(camera.trackingMode,'fixed-exit-camera-front-five-pan');
  if(shot.id==='fourth-turn'){
   assert.ok(camera.fov>=bearing.fov-1e-8&&camera.fov<=23.001,'4C tight telephoto lens');
   assert.ok(j===0||camera.fov>=previous.fov-1e-8,'4C lens must only widen');
   if(j>0)assert.ok(Math.hypot(camera.position.x-previous.position.x,camera.position.z-previous.position.z)<1e-7,'4C exit camera must stay fixed');
  }else assert.equal(camera.fov,bearing.fov,'no per-frame zoom');
  assert.equal(camera.lensShiftX,bearing.lensShiftX,'no per-frame lens shift');
  const angle=camera.cameraTrackYaw,co=Math.cos(angle),si=Math.sin(angle);
  const target=[initial[0]*co-initial[2]*si,initial[1],initial[0]*si+initial[2]*co];
  const diff=vector(camera).map((v,i)=>Math.abs(v-target[i]));
  if(shot.id==='fourth-turn'){
   // Fourth turn uses a leader-centered forward-oblique crane rather than
   // the previous fixed-bearing rail camera. Check the optical axis itself.
   const lead=order(p)[0],q=cameraKyotoPath(lead.p),lane=cameraRunnerLane(lead.no,17,p);
   const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
   const centered=projectTest(nose,camera,.54);
   assert.ok(Math.abs(centered.x-.5)<.35,'4C leader must stay in the leading pack frame: '+centered.x);
  }else{
   assert.ok(Math.max(...diff)<1e-8,'camera must keep fixed bearing RELATIVE to curved rail: '+diff);
  }
  if(j>0){
   assert.ok(Math.abs(Math.atan2(Math.sin(angle-prevAngle),Math.cos(angle-prevAngle)))<.2,
    'course dolly must rotate CONTINUOUSLY across ±π, not jump '+JSON.stringify({start,j,p,angle,prevAngle}));
   assert.ok(Math.hypot(camera.position.x-previous.position.x,
    camera.position.z-previous.position.z)<80,'world-space dolly has no teleport');
  }
  const lead=order(p)[0],q=cameraKyotoPath(lead.p),lane=cameraRunnerLane(lead.no,17,p);
  const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
  const xy=projectTest(nose,camera,.54);
  assert.ok(xy.x>.04&&xy.x<.88,'LEADER must stay on portrait screen: '+shot.id+' '+p+' => '+xy.x);
  previous=camera;prevAngle=angle;
 }
}
assert.match(cinemaJS,/lockedRig/);
assert.match(cinemaJS,/mustRebase/);
// Regression: a five-runner centroid used to crop the leader near the 4C
// exit (x=.125 then off-screen), even though the camera station never moved.
for(const aspect of [.48,.54,.76,1.6]){
 const group=p=>Array.from({length:17},(_,i)=>({no:i+1,p:p-i*.0022}));
 const pose=raceCameraPose({shot:chooseRaceShot(.68),progress:.68,order:group(.68),
  path:cameraKyotoPath,aspect,distance:2000,venue:'京都'});
 const rig={pose,startLeaderProgress:.68};let preceding=null;
 for(let i=0;i<=150;i++){
  const p=.68+i*.001,frame=followLockedCameraPose(rig,group(p),cameraKyotoPath),q=cameraKyotoPath(p),lane=cameraRunnerLane(1,17,p);
  const nose={x:q.x-q.dz*lane+q.dx*2.7,y:q.y+2,z:q.z+q.dx*lane+q.dz*2.7};
  const screen=projectTest(nose,frame,aspect);
  assert.ok(screen.x>.32&&screen.x<.68,'4C pan keeps the real leader in the central safe area '+JSON.stringify({aspect,p,x:screen.x}));
  if(preceding){
   assert.deepEqual(frame.position,preceding.position,'4C camera is stationary');
   assert.ok(frame.fov>=preceding.fov,'original monotonic zoom is preserved');
   const yaw=f=>Math.atan2(f.look.x-f.position.x,f.look.z-f.position.z),delta=yaw(frame)-yaw(preceding);
   assert.ok(Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))<.15,'4C pan is continuous without snapping');
  }preceding=frame;
 }
}
console.log('iPhone five cuts: 400+ smooth course-relative locked bearings, zero zoom jitter, leader always visible ✓');

// The finish replay runs beyond p=1; its bearing must never reverse.
{
 const start=.84,group=p=>Array.from({length:17},(_,i)=>({no:i+1,p:p-i*.0022}));
 const base=raceCameraPose({shot:chooseRaceShot(start),progress:start,
  order:group(start),clock:120*start,path:cameraKyotoPath,aspect:.54});
 const rig={pose:base,startLeaderProgress:start};
 let prev=0;
 for(let p=1;p<=1.14;p+=.004){
  const f=followLockedCameraPose(rig,group(p),cameraKyotoPath,{distance:2000,venue:'京都'});
  const angle=f.cameraTrackYaw;
  assert.ok(Math.abs(Math.atan2(Math.sin(angle-prev),Math.cos(angle-prev)))<.1,
   'finish replay must not turn camera 180 degrees after crossing the line');
  assert.ok(f.outerRailClearance>=14.9);
  prev=angle;
 }
}
const startingOrder=Array.from({length:17},(_,i)=>({no:i+1,p:0}));
for(const aspect of [.58,.76,1.8]){
 const pose=raceCameraPose({shot:RACE_SHOT_LIST[0],progress:0,clock:0,
  order:startingOrder,path:cameraKyotoPath,aspect,direction:'右',venue:'京都',distance:2000});
 assert.equal(pose.mode,'gate-front-broadcast');
 assert.equal(pose.subjects.length,17);
 assert.ok(Math.abs(pose.gateScreenX-.5)<.01,'gate spans most of the image, not a distant object');
 assert.ok(pose.position.y>pose.look.y,'camera elevated over outside rail');
}

// Track geometry sign invariant: renderer physically draws outer rail at
// offsetPoint(t,kyotoOuterCourseOffset(t)-14), never at +14.
const kyotoRender=read('renderer.js');
assert.match(kyotoRender,/offsetPoint\(t,outer\(t\)-14,\.9\)/);
assert.match(kyotoRender,/camera\.projectionMatrix\.elements\[8\]=smoothLensShift/);
assert.match(kyotoRender,/smoothFov\+=\(shotDirection\.fov-smoothFov\)\*lensAlpha/);
assert.match(kyotoRender,/Math\.exp\(-frameDt\*\(48\+Math\.min\(16,rate\)\*2\.5\)\)/);
// Dedicated infield scene source: no image downloads and physical 64m display.
const kyotoLandmarksJS=read('assets/kyoto-landmarks.js');
assert.match(kyotoLandmarksJS,/w=64,h=10\.8/);
assert.match(kyotoLandmarksJS,/landmarks\.pond\.userData\.kyotoLandmark='pond'/);
assert.match(kyotoLandmarksJS,/frameGroup\.userData\.kyotoLandmark='turf-vision'/);
assert.match(kyotoLandmarksJS,/tex\.needsUpdate=true/);
assert.doesNotThrow(()=>new Function(kyotoLandmarksJS.replace(/export (function|const)/g,'$1')));
console.log('Official size 64m Turf Vision, pond shore geometry, live screen texture ✓');
console.log('Kyoto camera actual outer lane and frame-independent pan/zoom damping ✓');

console.log('Five cameras: outer rail, first corner pack, third/fourth entry, final battle ✓');
for(const field of [3,6,17,18])for(const duration of [68,120,180]){
 const rank=Array.from({length:field},(_,i)=>field-i);
 assert.deepEqual(finishCrossings(rank,duration-1e-5,duration),[]);
 assert.deepEqual(finishCrossings(rank,duration,duration),rank.slice(0,1));
 for(let r=0;r<field;r++){
  assert.equal(runOutProgress(r,0,duration),1-r*FINISH_GAP,'position continuous at finish');
  let previous=runOutProgress(r,0,duration);
  for(let t=.01;t<28;t+=.1){
   const current=runOutProgress(r,t,duration);
   assert.ok(current>previous,'every horse continues after the winner crosses');previous=current;
  }
  const crossing=duration*(1+r*FINISH_GAP);
  assert.ok(Math.abs(runOutProgress(r,crossing-duration,duration)-1)<1e-10);
  assert.deepEqual(finishCrossings(rank,crossing,duration),rank.slice(0,r+1),'canonical rank preserved');
  assert.ok(runOutProgress(r,playbackEnd(duration,field)-duration,duration)>=1.159999,'everyone exits camera before stopping');
 }
}
assert.equal(playbackRate(16,119,120),2);
assert.equal(playbackRate(16,102,120),4);
assert.equal(playbackRate(16,90,120),16);
assert.equal(playbackRate(16,120,120),2);
assert.equal(playbackRate(1,121,120),1);
for(const name of ['assets/race-cinematics.js','assets/race-shotlist.js','assets/race-playback.js','assets/chibi-gallop.js']){
 const source=read(name).replace(/^import .*?;$/gm,'').replace(/export (function|const)/g,'$1');
 assert.doesNotThrow(()=>new Function(source),name+' syntax');
}
assert.doesNotMatch(cinemaJS,/SIM\.simulate|LOOP\.evaluate|horseProgress\s*=|scores\(/,'director never recalculates prediction');
assert.doesNotMatch(render,/photoHorseProgress|photoVisualTime|photo\.active/,'obsolete automatic freezes removed');
assert.match(render,/continuousRunOut:true/);
assert.match(render,/goalBehindHorses/);
assert.match(render,/offsetPoint\(1,half\+6,0\)/);
assert.match(read('assets/kyoto-goal-board.js'),/offsetPoint\(1,half\+3\.7,0\)/);
assert.match(read('assets/kyoto-goal-board.js'),/for\(const sign of \[1\]\)/,'no near-side goal pole');
assert.match(render,/Math\.max\(0,t-1\)\*routeLength\*W/,'render path extends beyond goal');
assert.match(render,/goalRig\.rotation\.y=Math\.atan2\(goalDir\.dx,goalDir\.dz\)\+Math\.PI\/2/);
assert.match(cinemaCSS,/prefers-reduced-motion/);
assert.match(cinemaCSS,/env\(safe-area-inset-bottom/);
assert.match(cinemaCSS,/height:100dvh/);
assert.match(cinemaJS,/finishOrder\.slice\(0,3\)/);
assert.match(render,/photo-thoroughbred-v24/);
assert.match(anime,/photo-thoroughbred-v24/);
assert.match(html,/kyoto-v11/);
console.log('Five broadcast cuts, outside rail, fixed far-side finish, continuous run-out and exact rank ✓');

const {kyotoPath,kyotoHeight,KYOTO_INNER,KYOTO_CUTS}=await load('assets/kyoto-course.js');
let measured=0;
for(let i=1;i<=20000;i++){const a=kyotoPath((i-1)/20000),b=kyotoPath(i/20000);measured+=Math.hypot(b.x-a.x,b.z-a.z)}
assert.ok(Math.abs(measured-2000)<.15,'2000 metre route, not miniature');
const startPoint=kyotoPath(0),goalPoint=kyotoPath(1),exit=kyotoPath(KYOTO_CUTS[2]);
assert.ok(Math.abs(Math.hypot(startPoint.x-goalPoint.x,startPoint.z-goalPoint.z)-217.2)<.02);
assert.ok(Math.abs(Math.hypot(exit.x-goalPoint.x,exit.z-goalPoint.z)-328.4)<.02);
assert.equal(kyotoHeight(.57),3.1);assert.equal(kyotoHeight(.9),0);
assert.ok(kyotoHeight(.50)>kyotoHeight(.45));assert.ok(kyotoHeight(.66)<kyotoHeight(.60));
const {raceCommentary}=await load('assets/race-commentary.js');
const testHorses=[{no:1,name:'先頭馬'},{no:2,name:'追走馬'},{no:3,name:'後続馬'}];
const order=[{no:2,p:.98},{no:1,p:.9798},{no:3,p:.978}];
assert.match(raceCommentary({clock:110,progress:.98,order,horses:testHorses,crossed:[]}).text,/追走馬.*先頭馬/);
assert.equal(raceCommentary({clock:120,progress:1,order,horses:testHorses,crossed:[2]}).winner,2);
assert.doesNotMatch(cinemaJS,/toReversed/,'leader is on left');
console.log('Kyoto metric route, goal offset, 3C elevation, left-leading order and data-driven commentary ✓');


// The runtime now uses an authored skin, not endpoint cylinders.
const glb=readFileSync(resolve(root,'assets/models/horse-sprint-v19.glb'));
assert.equal(glb.readUInt32LE(0),0x46546c67);
const asset=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
assert.deepEqual(asset.animations.map(x=>x.name),['Sprint_Left','Sprint_Right','Idle']);
assert.ok(asset.skins[0].joints.length>=40);
assert.match(render,/await horseV3.preloadRaceHorse/);
assert.match(anime,/racing-sprint-v19/);
assert.doesNotMatch(anime,/setLegPose/);
assert.ok(existsSync(resolve(root,'assets/models/CC0-1.0.txt')));
console.log('v19 sprint asset and shared preload ✓; visual acceptance uses browser renders');
