import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.RACE_URL||(process.env.RACE_LOCAL_ROOT?'http://race.local/race-engine/takarazuka-2026-replay.html':'http://127.0.0.1:8765/race-engine/takarazuka-2026-replay.html');
const shots=process.env.RACE_SHOTS||'/tmp/takarazuka-3d-shots';mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 for(const width of [390,430,1280]){
  const page=await browser.newPage({viewport:{width,height:width<700?844:820},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
  if(process.env.RACE_LOCAL_ROOT)await page.route('http://race.local/**',async route=>{
   const name=decodeURIComponent(new URL(route.request().url()).pathname),file=resolve(process.env.RACE_LOCAL_ROOT,'.'+name);
   const types={'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.woff':'font/woff'};
   try{await route.fulfill({path:file,contentType:types[extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true||document.getElementById('replay-error')?.hidden===false,null,{timeout:45000});
  assert.equal(await page.evaluate(()=>window.KYOTO_RENDER_STATUS?.ready),true,await page.locator('#replay-error').textContent());
  await page.waitForFunction(()=>document.querySelector('#live-play').disabled===false);
  const render=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);assert.equal(render.horses,18);assert.equal(render.model,'photo-thoroughbred-v24');assert.equal(render.courseView,'hanshin-2200-inner-b');
  assert.equal(await page.locator('#live-rate').inputValue(),'4');assert.equal(await page.locator('.tracking-number').count(),18);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal page overflow');
  const play=await page.locator('#live-play').boundingBox(),leader=await page.locator('#leaders').boundingBox();
  assert.ok(play.y+play.height<844,'play fits on iPhone');assert.ok(leader.x>=0&&leader.x+leader.width<=width);
  await page.screenshot({timeout:process.env.CI?90000:30000,path:shots+'/takarazuka-'+width+'-start.png'});
  for(const [t,shot] of [[32,'first-corner'],[70,'backstretch'],[100,'fourth-turn'],[119,'finish']]){
   await page.evaluate(t=>window.TAKARAZUKA_REPLAY.seek(t),t);
   await page.waitForFunction(t=>Math.abs(window.RACE_SCENE_AUDIT?.clock-t)<.01,t);
   const scene=await page.evaluate(()=>window.RACE_SCENE_AUDIT);
   assert.equal(scene.shot,shot);assert.equal(scene.gateVisible,false);assert.equal(scene.positions.length,18);
   assert.ok(scene.positions.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
   console.log('CAMERA',width,t,scene.leadVisible,scene.leadersOccluded,scene.goalInFrame,scene.leadScreenHeight);
   assert.equal(scene.leadVisible,true,'leader in frame '+width+' at '+t);
   if(t===100)assert.ok(scene.leadScreenHeight>.065,'4C is a close view, not distant horses on the horizon');
   if(width===390||t===119)await page.screenshot({timeout:process.env.CI?90000:30000,path:shots+'/takarazuka-'+width+'-'+shot+'.png'});
  }
  await page.locator('#live-play').click();await page.waitForFunction(()=>window.KYOTO_RACE.LIVE.clock>119.4,null,{timeout:12000});
  await page.locator('#live-pause').click();const paused=await page.evaluate(()=>window.KYOTO_RACE.LIVE.clock);
  await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.KYOTO_RACE.LIVE.clock),paused);
  await page.locator('#live-finish').click();await page.waitForFunction(()=>!document.getElementById('race').hidden);
  assert.deepEqual(await page.locator('.place-number').allTextContents(),['16','5','1']);
  await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.clock>132);
  await page.screenshot({timeout:process.env.CI?90000:30000,path:shots+'/takarazuka-'+width+'-goal.png'});
  await page.locator('#live-reset').click();await page.waitForFunction(()=>window.RACE_SCENE_AUDIT?.gateVisible&&window.KYOTO_RACE.LIVE.clock===0);
  assert.deepEqual(await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice(0,3)),[16,5,1]);assert.equal(await page.locator('#race').isVisible(),false);
  assert.deepEqual(errors,[],'no JavaScript errors');await page.close();
  console.log('PASS actual WebGL, five shots, all 18, fixed results, controls, reset',width);
 }
}finally{await browser.close()}
