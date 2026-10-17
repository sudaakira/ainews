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
const url=process.env.RACE_URL||'http://127.0.0.1:8765/race-engine/?race=shuka-2026';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
mkdirSync('/tmp/race-mobile-shots',{recursive:true});
try{
 for(const vp of [{width:390,height:844},{width:320,height:568},{width:430,height:932},{width:1280,height:800}]){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1,isMobile:vp.width<700,hasTouch:vp.width<700});
  await serveLocal(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true,null,{timeout:45000}).catch(async e=>{
   console.error('WEBGL BOOT',await page.evaluate(()=>({renderer:window.KYOTO_RENDER_STATUS,error:document.getElementById('bootstrap-error')?.textContent})),errors);throw e;
  });
  const model=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);
  assert.equal(model.model,'skinned-thoroughbred-v16');assert.equal(model.horses,17);
  assert.equal(model.continuousRunOut,true);assert.equal(model.goalBoardSide,'far');
  assert.equal(await page.locator('#kyoto-map').isVisible(),false);
  assert.equal(await page.locator('#race-commentary-panel').isVisible(),true);
  assert.equal(await page.locator('.tracking-number').count(),17);
  const canvas=await page.locator('#three-stage canvas').boundingBox();
  assert.ok(canvas.width>200&&canvas.height>200);
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
   await page.waitForFunction(()=>window.RACE_CAMERA_AUDIT?.opening===window.RACE_CAMERA_AUDIT?.total,null,{timeout:8000});
   const cuts=await page.evaluate(()=>window.RACE_CINEMATIC_DEBUG.cuts);
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-gate.png'});
   const checks=[[.05,'start'],[(cuts[0]+cuts[1])/2,'second-turn'],[.57,'third-turn'],[.999,'straight']];
   for(const [p,id] of checks){
    await seek(Math.round(p*1000));
    await page.waitForFunction(shot=>window.RACE_SCENE_AUDIT?.shot===shot,id,{timeout:10000});
    await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.cameraTrackingError<.2,null,{timeout:10000});
    const state=await page.evaluate(()=>({director:window.RACE_CINEMATIC_DEBUG,scene:window.RACE_SCENE_AUDIT}));
    assert.equal(state.director.scriptedCuts,4);
    assert.equal(state.scene.leadersOccluded,0,'buildings never occlude leading horses');
    assert.equal(state.director.pose.mode,'outer-rail-group','race broadcast must follow group from outside rail');
    assert.equal(state.director.pose.outerRailSign,-1);
    assert.ok(state.director.pose.subjects.length>=5&&state.director.pose.subjects.length<=7,
     'top 5 and close outside runners must remain the picture subject');
    assert.ok(state.director.pose.aheadSpace>=.18,'camera reserves space in direction of travel');
    assert.ok(state.scene.leadVisible,'leader visible while tracking the five-horse contest');
    assert.ok(state.scene.leadScreenX>=.08&&state.scene.leadScreenX<=.94,
     'leader should remain in the group frame: '+state.scene.leadScreenX);
    assert.ok(state.director.pose.side>=25,'tracking shot must be outside track');
    if(id==='third-turn'){
     assert.ok(state.director.pose.position.y-state.director.pose.look.y<13);
     assert.ok(state.scene.positions.some(q=>q.y>1),'horses climb Kyoto hill');
    }
    if(id==='straight'){
     const end=await page.evaluate(()=>window.RACE_SCENE_AUDIT);
     assert.equal(end.gateVisible,false);
     assert.ok(Math.abs(end.cameraForwardDot)<.05,'straight must be an outer-rail lateral broadcast');
     assert.ok(end.goalBoardVisible,'finish board must remain a real 3D scene object');
    }
    assert.ok((await page.locator('#race-commentary-text').textContent()).length>10);
    const visibleOrder=await page.locator('.tracking-number').allTextContents();
    assert.equal(Number(visibleOrder[0]),state.director.pose.subjects[0]);
    await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-'+id+'.png'});
   }
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
   assert.equal((await page.locator('.live-head').textContent()).includes('v16'),true);
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-gallop-v16.png'});
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
   assert.equal(after.scene.shot,'straight','no fifth camera cut at result');
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
   console.log('PASS four cuts, far-side board, all-horse continuous run-out, pause/resume/reset',vp);
  }else{
   await seek(999);
   await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.goalInFrame&&window.RACE_SCENE_AUDIT?.goalBehindHorses,null,{timeout:10000});
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-straight.png'});
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
 await lab.waitForFunction(()=>window.EQUINE_GAIT_LAB?.snapshot().rig==='skinned-cc0-v16',
   null,{timeout:30000});
 const baseline=[];
 for(const lead of ['left','right'])for(const view of ['side','three','front'])for(const phase of [0,.25,.5,.75]){
  await lab.evaluate(l=>window.EQUINE_GAIT_LAB.setLead(l),lead);
  await lab.locator('#camera').selectOption(view);
  await lab.evaluate(p=>window.EQUINE_GAIT_LAB.seek(p),phase);
  await lab.waitForTimeout(120);
  const snap=await lab.evaluate(()=>window.EQUINE_GAIT_LAB.snapshot());
  assert.ok(Math.abs(snap.phase-phase)<1e-6,'manual gallop pose is reproducible');
  assert.equal(snap.hoofs.length,4);
  assert.ok(snap.hoofs.every(h=>h.y>-.003),'actual deformed hoof vertices stay above turf');
  if(phase===.25)assert.ok(snap.hoofs.every(h=>h.y>.035),'gathered suspension is airborne');
  const limbs=snap.bones.filter(b=>/^(FrontUpperLeg|FrontLowerLeg|BackLeg|BackUpperLeg|BackLowerLeg)/.test(b.name));
  if(baseline.length)limbs.forEach((b,i)=>assert.ok(Math.abs(b.length-baseline[0][i].length)<.0001,'limb bones do not stretch'));
  baseline.push(limbs);
  await lab.screenshot({path:'/tmp/race-mobile-shots/gallop-v16-'+lead+'-'+view+'-'+phase+'.png'});
 }
 assert.deepEqual(labErrors,[],'gait lab emits no WebGL script error');
 await lab.close();
 console.log('PASS v16 real-3D skinned limbs, airborne pose, side/three/front screenshots ✓');
}finally{await browser.close();}
