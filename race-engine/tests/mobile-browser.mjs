/** Real-browser release gate: requested camera geometry, continuous run-out and mobile controls. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
async function serveLocal(page){
 if(!process.env.RACE_LOCAL_ROOT)return;
 await page.route('http://race.local/**',async route=>{
  let name=decodeURIComponent(new URL(route.request().url()).pathname);if(name.endsWith('/'))name+='index.html';
  const path=resolve(process.env.RACE_LOCAL_ROOT,'.'+name);
  const types={'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
  try{await route.fulfill({path,contentType:types[extname(path)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}
 });
}
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'/tmp/race-playwright/node_modules/playwright/index.mjs');
// All published screenshots use the SAME fixed race, unlike earlier
// time-seeded screenshots that could not match any freshly opened replay.
const baseUrl=new URL(process.env.RACE_URL||'http://127.0.0.1:8765/race-engine/?race=shuka-2026');
baseUrl.searchParams.set('replay','20261017');
baseUrl.searchParams.delete('at');
const url=baseUrl.toString();
let baselineRank=null;
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
mkdirSync('/tmp/race-mobile-shots',{recursive:true});
try{
 for(const vp of (process.env.GAIT_ONLY?[]:[{width:390,height:844},{width:320,height:568},{width:430,height:932},{width:1280,height:800}])){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1,isMobile:vp.width<700,hasTouch:vp.width<700});
  await serveLocal(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true,null,{timeout:45000}).catch(async e=>{
   console.error('WEBGL BOOT',await page.evaluate(()=>({renderer:window.KYOTO_RENDER_STATUS,error:document.getElementById('bootstrap-error')?.textContent})),errors);throw e;
  });
  const original=await page.evaluate(()=>({seed:window.KYOTO_RACE.LIVE.replaySeed,
   rank:window.KYOTO_RACE.LIVE.rank.slice(),url:location.href}));
  assert.equal(original.seed,20261017,'all screenshots must share the same seeded race');
  assert.equal(new URL(original.url).searchParams.get('replay'),'20261017');
  assert.ok((await page.locator('#race-replay-id').textContent()).includes('20261017'));
  if(baselineRank===null)baselineRank=original.rank;
  else assert.deepEqual(original.rank,baselineRank,'all viewport screenshots use the exact same race');
  const model=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);
  assert.equal(model.model,'skinned-thoroughbred-v16');assert.equal(model.gait,'racing-sprint-v19');assert.equal(model.horses,17);
  assert.equal(model.continuousRunOut,true);assert.equal(model.goalBoardSide,'far');
  assert.equal(model.landmarks?.visionScreenWidth,64,'JRA Turf Vision width 64m');
  assert.equal(model.landmarks?.visionScreenHeight,10.8,'JRA Turf Vision height 10.8m');
  assert.ok(model.landmarks?.pondWidth>=200,'Kyoto pond must be large and shaped');
  assert.equal(await page.locator('#kyoto-map').isVisible(),false);
  assert.equal(await page.locator('#race-commentary-panel').isVisible(),true);
  assert.equal(await page.locator('.tracking-number').count(),17);
  const canvas=await page.locator('#three-stage canvas').boundingBox();
  assert.ok(canvas.width>200&&canvas.height>200);
  if(vp.width===390||vp.width===1280){
   const gateCheck=await page.evaluate(()=>({min:window.RACE_SCENE_AUDIT?.gateMinScreenX,
    max:window.RACE_SCENE_AUDIT?.gateMaxScreenX,
    center:window.RACE_SCENE_AUDIT?.gateScreenX}));
   console.log('START_GATE_BOUNDS',JSON.stringify({vp,gateCheck}));
   assert.ok(gateCheck.min>=-.03&&gateCheck.max<=1.03&&gateCheck.max-gateCheck.min>.28,
    'whole gate must fill substantial screen width: '+JSON.stringify(gateCheck));
  }
  if(vp.width<700){
   for(const id of ['#live-play','#live-pause','#live-reset','#live-rate','#race']){
    const box=await page.locator(id).boundingBox();
    assert.ok(box&&box.x>=-1&&box.x+box.width<=vp.width+1&&box.y+box.height<=vp.height+2,'fits first viewport: '+id+' '+JSON.stringify(box));
   }
  }
  const seek=async value=>{
   await page.locator('#live-scrub').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await page.waitForFunction(p=>Math.abs((window.RACE_CINEMATIC_DEBUG?.progress??-1)-p)<.002,value/1000,{timeout:10000});
  };
  if(vp.width===390||vp.width===1280){
   const cuts=await page.evaluate(()=>window.RACE_CINEMATIC_DEBUG.cuts);
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-gate.png'});
   const openingAudit=await page.evaluate(()=>({audit:window.RACE_CAMERA_AUDIT,pose:window.RACE_CINEMATIC_DEBUG?.pose,gate:window.RACE_SCENE_AUDIT?.gateScreenX}));
   console.log('OPENING_CAMERA_CHECK',JSON.stringify({vp,opening:openingAudit.audit,gate:openingAudit.gate,poseMode:openingAudit.pose?.mode}));
   assert.ok(openingAudit.audit?.opening>=openingAudit.audit?.total-2,
    'opening gate needs nearly all horses visible: '+JSON.stringify(openingAudit));
   const checks=[[.04,'start'],[.18,'first-corner'],[.56,'backstretch'],[.77,'fourth-turn'],[.999,'finish']];
   for(const [p,id] of checks){
    await seek(Math.round(p*1000));
    assert.equal(new URL(page.url()).searchParams.get('at'),
      String(Math.round(p*1000)),'frame deep link must match captured still');
    await page.waitForFunction(shot=>window.RACE_SCENE_AUDIT?.shot===shot,id,{timeout:10000});
    await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.cameraTrackingError<.2,null,{timeout:10000});
    const state=await page.evaluate(()=>({director:window.RACE_CINEMATIC_DEBUG,scene:window.RACE_SCENE_AUDIT}));
    assert.equal(state.director.scriptedCuts,5);
    assert.equal(state.scene.leadersOccluded,0,'buildings never occlude leading horses');
    assert.equal(state.director.pose.mode,'rail-broadcast-'+id,'outside-rail camera composition must match cut');
    assert.equal(state.director.pose.outerRailSign,1,'Kyoto outer rail lies on negative lane');
    assert.ok(state.scene.cameraOutsideLane<state.scene.cameraRailLane-11,
      'actual camera must be outside physical rail: camera lane '+
       state.scene.cameraOutsideLane+' rail '+state.scene.cameraRailLane);
    assert.ok(state.scene.cameraOuterRailClearance>11,'outer-rail clearance from 3D geometry');
    assert.equal(state.scene.landmarkPondVisible,true,'3D infield pond exists');
    assert.equal(state.scene.landmarkTurfVisionVisible,true,'3D Turf Vision exists');
    assert.equal(state.scene.landmarkScreenWidth,64,'physical 64m screen');
    if(id!=='start'){
     assert.equal(state.director.pose.leadNumber,state.director.pose.subjects[0],
      'leading horse owns broadcast framing');
     assert.ok(state.director.pose.forwardGap>=.19&&state.director.pose.forwardGap<=.5,
      'at least 19% forward room around leading horse: '+state.director.pose.forwardGap);
     const target=state.director.pose.leadNoseViewportTarget;
     const actual=state.scene.leadNoseScreenX;
     console.log('LEADER_AIR',JSON.stringify({vp:vp.width,cut:id,target,actual,
      railClearance:state.scene.cameraOuterRailClearance}));
     assert.ok(Number.isFinite(actual)&&Math.abs(actual-target)<.18,
      'actual 3D lead horse nose must follow front-space target: '+actual+' vs '+target);
    }
    assert.ok(id==='start'||state.director.pose.fov<=(id==='backstretch'?38:34),
      'corner/finish shots use telephoto; backstretch uses a wider lateral field lens: '+id+' '+state.director.pose.fov);
    if(id==='fourth-turn'||id==='finish'){
     const visibleLabels=await page.locator('#race-front-labels b:visible').count();
     assert.ok(visibleLabels>=(id==='fourth-turn'?2:1)&&visibleLabels<=5,
       'show visible leader IDs; only in-frame labels at the finish: '+visibleLabels);
    }
    const nameBoxes=await page.locator('#race-front-labels b:visible').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));
    for(const [i,a] of nameBoxes.entries())for(const b of nameBoxes.slice(i+1))
     assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'full horse names must not overlap in '+id);
    const expectedSubjects=id==='start'?[17,17]:id==='backstretch'?[7,7]:id==='fourth-turn'?(vp.width<700?[12,12]:[15,15]):id==='first-corner'?[6,7]:[3,4];
    assert.ok(state.director.pose.subjects.length>=expectedSubjects[0]&&
     state.director.pose.subjects.length<=expectedSubjects[1],
     'subject count '+id+': '+state.director.pose.subjects.length+' expected '+expectedSubjects);
    assert.ok(state.director.pose.shotPerspective.startsWith('outside-'),'camera stays outside the outer rail');
    assert.ok(state.director.pose.outerRailClearance>=11.9,'camera physically beyond Kyoto outermost rail');
    assert.ok(state.scene.leadVisible,'leader visible while tracking the five-horse contest');
    assert.ok(state.scene.leadScreenX>=.08&&state.scene.leadScreenX<=.94,
     'leader should remain in the group frame: '+state.scene.leadScreenX);
    assert.ok(state.director.pose.side>=24,'camera outside track with safe lateral elevation');
    assert.ok(Math.abs(state.scene.cameraRenderedFov-state.director.pose.fov)<.15,
      'seeked cut must settle rendered lens exactly');
    assert.ok(Math.abs(state.scene.cameraRenderedLensShift-state.director.pose.lensShiftX)<.015,
      'seeked cut must settle rendered optical shift exactly');
    if(id==='backstretch'){
     assert.ok(state.director.pose.position.y-state.director.pose.look.y>4&&state.director.pose.position.y-state.director.pose.look.y<32,
      'high outside camera looks DOWN at approaching horses, not at the horizon');
     assert.ok(state.scene.positions.some(q=>q.y>1),'horses climb Kyoto hill');
    }
    if(id==='finish'){
     const end=await page.evaluate(()=>window.RACE_SCENE_AUDIT);
     assert.equal(end.gateVisible,false);
     assert.ok(Math.abs(end.cameraForwardDot)<8,'finish camera must remain a trackside lateral broadcast');
     assert.ok(end.goalBoardVisible,'finish board must remain a real 3D scene object');
     const tv=end.landmarkScreenPosition;
     console.log('KYOTO_TURF_VISION',JSON.stringify({vp:vp.width,screen:tv}));
     assert.ok(tv&&Number.isFinite(tv.x)&&Number.isFinite(tv.y)&&tv.z>-1&&tv.z<1,
      'real 3D Turf Vision must be present at a finite projected position');
     // Do not distort a tight finish camera to force the background screen
     // fully into every viewport. Foreground winner has priority.
    }
    assert.ok((await page.locator('#race-commentary-text').textContent()).length>10);
    const visibleOrder=await page.locator('.tracking-number').allTextContents();
    assert.equal(Number(visibleOrder[0]),state.director.pose.subjects[0]);
    await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-'+id+'.png'});
   }
   // Verify MOVING 8x video, not just five static stills. On iPhone the
   // broadcast camera should move with the pack without turning or zooming.
   await seek(350);
   await page.locator('#live-play').click();
   const trackingFrames=await page.evaluate(async()=>{
    const result=[];
    for(let i=0;i<28;i++){
     await new Promise(requestAnimationFrame);
     const a=window.RACE_SCENE_AUDIT;
     if(a?.cameraRenderedBearing)result.push({
      bearing:a.cameraRenderedBearing,pos:a.cameraRenderedPosition,
      fov:a.cameraRenderedFov,lens:a.cameraRenderedLensShift,
      rebases:a.cameraRebases,shot:a.shot,clock:a.clock,leadX:a.leadNoseScreenX});
    }
    return result;
   });
   await page.locator('#live-pause').click();
   assert.ok(trackingFrames.length>=20,'record live camera frames');
   const moving=trackingFrames.filter(x=>x.shot==='backstretch');
   assert.ok(moving.length>=16,'must remain within the backstretch shot for the tracking sample');
   const initial=moving[0],final=moving.at(-1);
   const span=Math.hypot(final.pos.x-initial.pos.x,final.pos.z-initial.pos.z);
   assert.ok(span>.25,'camera dolly must travel with the racing leaders: '+span);
   let preceding=null;
   for(const f of moving){
    if(preceding){
     const turn=Math.hypot(f.bearing.x-preceding.bearing.x,
      f.bearing.y-preceding.bearing.y,f.bearing.z-preceding.bearing.z);
     assert.ok(turn<.14,'jerky CAMERA step inside live TV shot: '+turn);
    }
    assert.ok(f.leadX>.035&&f.leadX<.95,
     'leader must remain on screen during mobile tracking: '+f.leadX);
    assert.ok(Math.abs(f.fov-initial.fov)<.005,'fixed zoom within shot');
    assert.ok(Math.abs(f.lens-initial.lens)<.005,'no per-frame optical shift');
    assert.equal(f.rebases,initial.rebases,'never recompose every frame');
    preceding=f;
   }
   console.log('MOBILE_DOLLY_STABILITY',JSON.stringify({
    viewport:vp.width,frames:moving.length,movedMeters:span,
    rebase:initial.rebases,stableRelativeBearing:true}));
   // 3D WebGL release gate: verify actual rendered limbs alternate, not just
   // theoretical beat ordering. Exercise this at the default 16x on mobile.
   await seek(380);
   await page.locator('#live-play').click();
   const limbFrames=await page.evaluate(async()=>{
    const samples=[];
    for(let i=0;i<36;i++){
     await new Promise(requestAnimationFrame);
     const h=window.RACE_SCENE_AUDIT?.gallopHoofs;
     if(h?.length===4)samples.push({
      front:Math.abs(h[0].hoofZ-h[1].hoofZ),
      hind:Math.abs(h[2].hoofZ-h[3].hoofZ)
     });
    }
    return samples;
   });
   await page.locator('#live-pause').click();
   assert.ok(limbFrames.length>=24,'3D renderer must animate the rig');
   assert.ok(limbFrames.filter(x=>x.front>.12).length>=8,'3D fore hooves must not synchronize');
   assert.ok(limbFrames.filter(x=>x.hind>.12).length>=8,'3D hind hooves must not synchronize');
   assert.ok(limbFrames.filter(x=>x.front>.12||x.hind>.12).length>=16,
    '3D fore/hind pairs should not look synchronized');
   assert.equal((await page.locator('.live-head').textContent()).includes('v19'),true);
   const labels=await page.locator('#race-front-labels b:visible').evaluateAll(nodes=>nodes.map(n=>({no:n.dataset.no,name:n.querySelector('.runner-name')?.textContent,rect:n.getBoundingClientRect().toJSON()})));
   assert.ok(labels.length>=3,'leading runners have number AND name labels');
   for(const [i,label] of labels.entries()){
    assert.ok(label.name?.length>1);assert.ok(label.rect.x>=-1&&label.rect.right<=vp.width+1);
    for(const other of labels.slice(i+1))assert.ok(label.rect.right<=other.rect.left||other.rect.right<=label.rect.left||label.rect.bottom<=other.rect.top||other.rect.bottom<=label.rect.top,'runner names must not overlap');
   }
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-sprint-v19.png'});
   // Observe real playback across the winner's line: translation AND gait continue.
   await seek(980);await page.locator('#live-play').click();
   await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.runOut===true,null,{timeout:15000});
   const before=await page.evaluate(()=>window.RACE_SCENE_AUDIT);
   await page.waitForFunction(t=>window.RACE_SCENE_AUDIT?.clock>t+.8,before.clock,{timeout:10000});
   const after=await page.evaluate(()=>({scene:window.RACE_SCENE_AUDIT,playing:window.KYOTO_RACE.LIVE.playing}));
   assert.equal(after.playing,true,'autoplay does not stop at goal');
   assert.ok(after.scene.visualTime>before.visualTime,'animation clock keeps advancing');
   assert.ok(Math.abs(after.scene.gallopPhase-before.gallopPhase)>1e-5,'actual leg joint keeps moving');
   before.positions.forEach((a,i)=>{
    const b=after.scene.positions[i];assert.ok(Math.hypot(b.x-a.x,b.z-a.z)>.1,'horse '+(i+1)+' moves through the line');
   });
   assert.equal(after.scene.shot,'finish','no sixth camera cut after result');
   await page.waitForFunction(()=>document.querySelectorAll('.cinema-podium-row').length===3,null,{timeout:12000});
   const expected=await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice(0,3).map(String));
   assert.deepEqual(await page.locator('.cinema-result-cap').allTextContents(),expected);
   assert.deepEqual(await page.locator('#race .place-number').allTextContents(),expected);
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-runout.png'});
   // User pause is still respected after the goal; resuming never samples a new rank.
   await page.locator('#live-pause').click();
   const paused=await page.evaluate(()=>({clock:window.KYOTO_RACE.LIVE.clock,visual:window.KYOTO_RACE.LIVE.visualTime,rank:window.KYOTO_RACE.LIVE.rank.join(',')}));
   await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate(()=>({clock:window.KYOTO_RACE.LIVE.clock,visual:window.KYOTO_RACE.LIVE.visualTime,rank:window.KYOTO_RACE.LIVE.rank.join(',')})),paused);
   await page.locator('#live-play').click();
   await page.waitForFunction(t=>window.KYOTO_RACE.LIVE.clock>t,paused.clock,{timeout:8000});
   assert.equal(await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.join(',')),paused.rank);
   await page.locator('#live-reset').click();
   await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.gateVisible&&window.RACE_CINEMATIC_DEBUG?.shot==='start',null,{timeout:10000});
   assert.equal(await page.locator('.cinema-podium-row').count(),0);
   console.log('PASS five cuts, far-side board, all-horse continuous run-out, pause/resume/reset',vp);
  }else{
   await seek(999);
   await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.goalInFrame,null,{timeout:10000});
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-finish.png'});
  }
  assert.deepEqual(errors,[],'no JavaScript errors');
  console.log('PASS mobile/desktop WebGL and viewport controls',vp);
  await page.close();
 }

 // Real Three.js 3D render verification for the independent single-horse
 // inspection page. Screenshot multiple poses and views, not only 2D angles.
 const lab=await browser.newPage({viewport:{width:960,height:820}});
 await serveLocal(lab);
 const labErrors=[];lab.on('pageerror',e=>labErrors.push(e.message));
 await lab.goto(new URL('gait-lab.html',url).href,{waitUntil:'domcontentloaded'});
 await lab.waitForFunction(()=>window.EQUINE_GAIT_LAB?.snapshot().rig==='racing-sprint-v19',
   null,{timeout:30000});
 const baseline=[];
 for(const lead of ['left','right'])for(const view of ['side','three','front'])for(const phase of [0,.2,.42,.6,.78,.9]){
  await lab.evaluate(l=>window.EQUINE_GAIT_LAB.setLead(l),lead);
  await lab.locator('#camera').selectOption(view);
  await lab.evaluate(p=>window.EQUINE_GAIT_LAB.seek(p),phase);
  await lab.waitForTimeout(120);
  const snap=await lab.evaluate(()=>window.EQUINE_GAIT_LAB.snapshot());
  assert.ok(Math.abs(snap.phase-phase)<1e-6,'manual gallop pose is reproducible');
  assert.equal(snap.hoofs.length,4);
  assert.ok(snap.hoofs.every(h=>h.y>-.003),'actual deformed hoof vertices stay above turf');
  if(phase===.9)assert.ok(snap.hoofs.every(h=>h.y>.035),'gathered suspension is airborne');
  // FrontUpperLeg is the translating elbow attachment (scapular slide), not
  // the length of the radius. Its child FrontLowerLeg measures that rigid bone.
  const limbs=snap.bones.filter(b=>/^(FrontLowerLeg|BackLeg|BackUpperLeg|BackLowerLeg|HoofLink)/.test(b.name));
  // Parented bones are rigid. Independent IK endpoints interpolate linearly
  // between baked samples while joints slerp, so allow at most 2mm there.
  if(baseline.length)limbs.forEach((b,i)=>assert.ok(Math.abs(b.length-baseline[0][i].length)<(b.name.startsWith('HoofLink')?.002:.0001),'limb bones do not stretch '+JSON.stringify({lead,phase,b,baseline:baseline[0][i]})));
  baseline.push(limbs);
  await lab.screenshot({path:'/tmp/race-mobile-shots/sprint-v19-'+lead+'-'+view+'-'+phase+'.png'});
 }
 assert.deepEqual(labErrors,[],'gait lab emits no WebGL script error');
 await lab.close();
 console.log('PASS v19 real-3D sprint, airborne pose, side/three/front screenshots ✓');
}finally{await browser.close();}
