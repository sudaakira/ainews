/** Real-browser release gate: requested camera geometry, continuous run-out and mobile controls. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'/tmp/race-playwright/node_modules/playwright/index.mjs');
const url=process.env.RACE_URL||'http://127.0.0.1:8765/race-engine/?race=shuka-2026';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
mkdirSync('/tmp/race-mobile-shots',{recursive:true});
try{
 for(const vp of [{width:390,height:844},{width:320,height:568},{width:430,height:932},{width:1280,height:800}]){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1,isMobile:vp.width<700,hasTouch:vp.width<700});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true,null,{timeout:45000}).catch(async e=>{
   console.error('WEBGL BOOT',await page.evaluate(()=>({renderer:window.KYOTO_RENDER_STATUS,error:document.getElementById('bootstrap-error')?.textContent})),errors);throw e;
  });
  const model=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);
  assert.equal(model.model,'thoroughbred-cel-v11');assert.equal(model.horses,17);
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
   const checks=[[.05,'start'],[(cuts[0]+cuts[1])/2,'second-turn'],[(cuts[1]+cuts[2])/2,'third-turn'],[.999,'straight']];
   for(const [p,id] of checks){
    await seek(Math.round(p*1000));
    await page.waitForFunction(shot=>window.RACE_SCENE_AUDIT?.shot===shot,id,{timeout:10000});
    await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.cameraTrackingError<.2,null,{timeout:10000});
    const state=await page.evaluate(()=>({director:window.RACE_CINEMATIC_DEBUG,scene:window.RACE_SCENE_AUDIT}));
    assert.equal(state.director.scriptedCuts,4);
    assert.equal(state.scene.leadersOccluded,0,'buildings never occlude leading horses');
    if(id==='third-turn'){
     assert.ok(state.director.pose.position.y-state.director.pose.look.y<10);
     assert.equal(state.director.pose.subjects.length,5);
     assert.ok(state.scene.positions.some(q=>q.y>1),'horses climb Kyoto hill');
    }
    if(id==='straight'){
     await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.goalInFrame&&window.RACE_SCENE_AUDIT?.goalBehindHorses,null,{timeout:10000});
     const end=await page.evaluate(()=>window.RACE_SCENE_AUDIT);
     assert.equal(state.director.pose.subjects.length,vp.width<700?3:5);
     assert.equal(end.gateVisible,false);
     assert.ok(Math.abs(end.cameraForwardDot)<.001,'straight is perpendicular, not diagonal');
     assert.equal(end.goalBehindHorses,true,'finish monument is deeper than every running lane');
    }
    assert.ok((await page.locator('#race-commentary-text').textContent()).length>10);
    const visibleOrder=await page.locator('.tracking-number').allTextContents();
    assert.equal(Number(visibleOrder[0]),state.director.pose.subjects[0]);
    await page.screenshot({path:'/tmp/race-mobile-shots/shuka-'+vp.width+'-'+id+'.png'});
   }
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
}finally{await browser.close();}
