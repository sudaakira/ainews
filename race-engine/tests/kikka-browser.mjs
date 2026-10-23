/** Actual WebGL and mobile interaction coverage for the two-pass 3000m route. */
import assert from 'node:assert/strict';
import {resolve,extname} from 'node:path';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const root=process.env.RACE_LOCAL_ROOT;
const base=process.env.KIKKA_URL||(root?'http://race.local/race-engine/?race=kikka-2026&replay=20261022':'http://127.0.0.1:8765/race-engine/?race=kikka-2026&replay=20261022');
mkdirSync('/tmp/kikka-mobile-shots',{recursive:true});
try{
 for(const vp of [{width:390,height:844},{width:1280,height:800}].filter(v=>!process.env.KIKKA_VIEWPORT||v.width===Number(process.env.KIKKA_VIEWPORT))){
  const page=await browser.newPage({viewport:vp,isMobile:vp.width<700,hasTouch:vp.width<700});
  if(root)await page.route('http://race.local/**',async route=>{
   let name=decodeURIComponent(new URL(route.request().url()).pathname);if(name.endsWith('/'))name+='index.html';
   const path=resolve(root,'.'+name),types={'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.woff':'font/woff'};
   try{await route.fulfill({path,contentType:types[extname(path)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true,null,{timeout:60000}).catch(async e=>{
   console.error('KIKKA_BOOT',await page.evaluate(()=>({status:window.KYOTO_RENDER_STATUS,error:document.getElementById('bootstrap-error')?.textContent})),errors);throw e;
  });
  const initial=await page.evaluate(()=>({status:window.KYOTO_RENDER_STATUS,rank:window.KYOTO_RACE.LIVE.rank,seed:window.KYOTO_RACE.LIVE.replaySeed,scene:window.RACE_SCENE_AUDIT}));
  assert.equal(initial.status.horses,18);assert.equal(initial.status.model,'photo-thoroughbred-v24');
  assert.equal(initial.status.courseView,'kyoto-3000-outer');assert.equal(initial.scene.course.distance,3000);
  assert.equal(initial.seed,20261022);assert.equal(initial.rank.length,18);
  assert.equal(initial.scene.packVersion,'pack-v1');
  const draw=await page.evaluate(()=>window.RACE_CONFIG.horses.map(h=>({no:h.no,name:h.name,frame:h.frame})));
  assert.deepEqual(draw.find(h=>h.name==='ロブチェン'),{no:8,name:'ロブチェン',frame:4});
  assert.equal(await page.locator('#vol').inputValue(),'3');
  assert.equal(await page.locator('#live-rate').inputValue(),'4');
  assert.equal(await page.locator('#ground-mode').inputValue(),'soft');
  assert.equal(await page.locator('#speed').inputValue(),'0');
  assert.ok((await page.locator('.live-note').innerText()).includes('重馬場想定'));
  assert.equal(await page.locator('#bars .bar').first().locator('.val small').innerText(),'86.9点');
  assert.ok((await page.locator('header').innerText()).includes('2026-10-22'));
  assert.equal(await page.locator('#horses .suitability').count(),18);
  assert.equal(await page.locator('.tracking-number').count(),18);
  assert.equal(await page.locator('#race-front-labels').count(),0);
  // Regression: the supplied FRONT-FACING pixel announcer must replace the
  // old blue-suit vector portrait in the actual rendered browser DOM.
  const portrait=page.locator('#race-commentary-panel .race-announcer img.announcer-portrait');
  assert.equal(await portrait.count(),1,'original pixel announcer image must be mounted');
  const portraitAudit=await portrait.evaluate(img=>({
   loaded:img.complete&&img.naturalWidth>0,
   width:img.naturalWidth,height:img.naturalHeight,
   src:img.getAttribute('src')||'',
   pixelated:getComputedStyle(img).imageRendering
  }));
  assert.ok(portraitAudit.loaded,'pixel announcer image decoded successfully');
  assert.ok(portraitAudit.src.startsWith('data:image/webp;base64,UklGR'),
   'announcer must be supplied original WebP, not old vector art');
  assert.equal(portraitAudit.pixelated,'pixelated');
  await page.locator('#race-commentary-panel').screenshot({path:'/tmp/kikka-mobile-shots/announcer-'+vp.width+'.png'});
  console.log('ANNOUNCER_PIXEL_PROOF',JSON.stringify({viewport:vp.width,
   width:portraitAudit.width,height:portraitAudit.height,
   screenshot:'/tmp/kikka-mobile-shots/announcer-'+vp.width+'.png'}));
  if(vp.width<700){
   for(const id of ['#live-play','#live-pause','#live-reset','#live-rate','#race']){
    const box=await page.locator(id).boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=vp.width+1&&box.y+box.height<=vp.height+2,'mobile first viewport '+id);
   }
  }
  const seek=async p=>{
   await page.locator('#live-scrub').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}))},Math.round(p*1000));
   await page.waitForFunction(p=>Math.abs((window.RACE_CINEMATIC_DEBUG?.progress??-1)-p)<.002,p,{timeout:15000});
   await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.cameraTrackingError<.2,null,{timeout:15000});
  };
  for(const [p,id] of [[.04,'start'],[.18,'first-corner'],[.369,'first-corner'],[.64,'backstretch'],[.79,'fourth-turn'],[.82,'fourth-turn'],[.85,'fourth-turn'],[.864,'fourth-turn'],[.91,'finish'],[.999,'finish']]){
   await seek(p);const scene=await page.evaluate(()=>window.RACE_SCENE_AUDIT);
   assert.equal(scene.shot,id);assert.equal(scene.leadersOccluded,0);
   // The camera, WebGL models and shared replay must use the very same
   // dynamic lanes; a visually correct but disconnected planner is not enough.
   for(const horse of scene.packStates){
    const pos=scene.positions[horse.no-1];
    assert.ok(Math.hypot(pos.x-horse.x,pos.z-horse.z)<.001,'actual 3D trajectory alignment');
    assert.ok(Math.abs(horse.lane)<=12.00001,'actual 3D rail clearance');
   }
   assert.ok(scene.leadVisible,'leader visible '+vp.width+' '+p+' '+JSON.stringify({x:scene.leadScreenX,y:scene.leadScreenY}));
   assert.ok(scene.cameraOuterRailClearance>=11.9,'camera outside rail '+p);
   if(p===.369){assert.equal(scene.goalBoardVisible,true);assert.equal(await page.locator('.cinema-finish-visible').count(),0,'first goal passage is not the finish');}
   if(p>=.91){assert.equal(scene.gateVisible,false);assert.equal(scene.goalBoardVisible,true);}
   if([.18,.82,.999].includes(p))await page.screenshot({path:'/tmp/kikka-mobile-shots/kikka-'+vp.width+'-'+String(p).replace('.','-')+'.png'});
   console.log('KIKKA_FRAME',JSON.stringify({width:vp.width,p,shot:id,leader:scene.leadVisible,x:scene.leadScreenX,rail:scene.cameraOuterRailClearance}));
  }
  // All rankings change together when a visible conditional hypothesis is chosen.
  await page.locator('#race-scenario').selectOption('right-improves');
  const improved=await page.evaluate(()=>window.SWAN_LOOP.evaluate(window.RACE_CONFIG.horses.find(h=>h.name==='ゴーイントゥスカイ'),{variant:'rightImproves'}).rating);
  const baseline=await page.evaluate(()=>window.SWAN_LOOP.evaluate(window.RACE_CONFIG.horses.find(h=>h.name==='ゴーイントゥスカイ'),{}).rating);
  assert.ok(improved>baseline);
  await page.locator('#race-scenario').selectOption('base');
  assert.equal(await page.locator('#vol').inputValue(),'3','base scenario restores the requested default');
  await page.locator('#horse-details').evaluate(e=>e.open=true);
  assert.ok(!(await page.locator('#horses').textContent()).includes('undefined'),'workout fields render completely');
  assert.ok((await page.locator('#h8').innerText()).includes('4枠'),'actual frame rendered');
  assert.ok((await page.locator('#h18').innerText()).includes('8枠'),'outer frame rendered');
  assert.equal(await page.locator('#horses').getByText('JRA調教後馬体重：',{exact:false}).count(),18);
  await page.locator('#race-evidence').evaluate(e=>e.open=true);
  await page.waitForFunction(()=>document.querySelectorAll('#race-evidence-content > details').length===21,null,{timeout:45000}).catch(async error=>{console.error('KIKKA_EVIDENCE',await page.evaluate(()=>({text:document.querySelector('#race-evidence-content')?.textContent?.slice(0,300),count:document.querySelectorAll('#race-evidence-content > details').length,url:window.RACE_CONFIG.evidenceUrl})));throw error});
  await page.locator('#live-play').scrollIntoViewIfNeeded();
  await seek(.995);await page.locator('#live-play').click();
  await page.waitForFunction(()=>window.KYOTO_RACE.LIVE.clock>window.KYOTO_RACE.LIVE.duration+1,null,{timeout:60000});
  const final=await page.evaluate(()=>({expected:window.KYOTO_RACE.LIVE.rank.slice(0,3),text:document.querySelector('#race').textContent,clock:window.KYOTO_RACE.LIVE.clock}));
  for(const no of final.expected){const name=await page.evaluate(no=>window.RACE_CONFIG.horses[no-1].name,no);assert.ok(final.text.includes(name));}
  // Instant finish uses the current sampled race; it never rolls a new result.
  await seek(.35);
  const beforeSkip=await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice());
  await page.locator('#live-rate').selectOption('instant');
  await page.waitForFunction(()=>document.getElementById('race').classList.contains('finished'));
  const skipped=await page.evaluate(()=>({rank:window.KYOTO_RACE.LIVE.rank,playing:window.KYOTO_RACE.LIVE.playing,
   clock:window.KYOTO_RACE.LIVE.clock,duration:window.KYOTO_RACE.LIVE.duration,
   allFinished:window.RACE_CONFIG.horses.every(h=>window.KYOTO_RACE.horseProgress(h.no,window.KYOTO_RACE.LIVE.clock)>=1)}));
  assert.deepEqual(skipped.rank,beforeSkip);assert.equal(skipped.playing,false);assert.ok(skipped.clock>=skipped.duration);
  assert.equal(skipped.allFinished,true);
  for(const no of skipped.rank.slice(0,3))assert.ok((await page.locator('#race').innerText()).includes(await page.evaluate(n=>window.RACE_CONFIG.horses[n-1].name,no)));
  await page.waitForFunction(()=>document.getElementById('race-speed-label').textContent==='即ゴール');
  assert.ok(await page.evaluate(()=>Object.values(window.RACE_SCENE_AUDIT.cameraRenderedPosition).every(Number.isFinite)));
  await page.locator('#live-reset').click();
  assert.ok(await page.evaluate(()=>!window.KYOTO_RACE.LIVE.playing&&document.getElementById('race').classList.contains('finished')),'new race respects instant mode');
  await page.locator('#live-play').click();
  assert.ok(await page.evaluate(()=>!window.KYOTO_RACE.LIVE.playing&&document.getElementById('race').classList.contains('finished')),'start respects instant mode');
  await page.locator('#live-rate').selectOption('4');
  await page.locator('#live-reset').click();
  assert.equal(await page.evaluate(()=>window.KYOTO_RACE.LIVE.clock),0);
  await page.locator('#live-play').click();
  await page.waitForFunction(()=>window.KYOTO_RACE.LIVE.clock>0);
  const runningRank=await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice());
  await page.locator('#live-rate').selectOption('instant');
  assert.deepEqual(await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank),runningRank);
  assert.equal(await page.evaluate(()=>window.KYOTO_RACE.LIVE.playing),false);
  await page.screenshot({path:'/tmp/kikka-mobile-shots/kikka-'+vp.width+'-instant.png'});
  assert.deepEqual(errors,[]);
  console.log('KIKKA_BROWSER',JSON.stringify({width:vp.width,expected:final.expected,clock:final.clock,errors}));
  await page.close();
 }
}finally{await browser.close()}
