
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {assertRaceUI} from './race-ui-assertions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'/tmp/race-playwright/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const out='_site/race-engine/docs';mkdirSync(out,{recursive:true});
const audits=[];
try{
 for(const width of [390,430]){
  const vp={width,height:width===390?844:932},page=await browser.newPage({viewport:vp,deviceScaleFactor:1,isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/race-engine/tenno-aki-2026.html?replay=20261030',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready&&document.querySelector('.tenno-summary'),null,{timeout:60000});
  const model=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);
  assert.equal(model.horses,17);assert.equal(model.model,'photo-thoroughbred-v24');assert.equal(model.courseView,'tokyo-2000-b');
  assert.equal(await page.locator('#kyoto-map').isVisible(),false);
  assert.equal(await page.locator('.tracking-number').count(),17);
  assert.equal(await page.locator('#live-rate').inputValue(),'4');
  await assertRaceUI(page,{field:17,finished:false});
  for(const id of ['#live-play','#live-pause','#live-reset','#live-rate','.race-tracking','#race-commentary-panel']){
   const b=await page.locator(id).boundingBox();assert.ok(b&&b.x>=-1&&b.x+b.width<=width+1&&b.y+b.height<=vp.height+2,'first viewport: '+id+' '+JSON.stringify(b));
  }
  await page.screenshot({path:out+'/tenno-'+width+'-start.png',timeout:90000});
  const phases=[[40,'start'],[150,'first-corner'],[350,'backstretch'],[650,'fourth-turn'],[930,'finish']];
  for(const [value,shot]of phases){
   await page.locator('#live-scrub').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await page.waitForFunction(s=>window.RACE_SCENE_AUDIT?.shot===s&&window.RACE_SCENE_AUDIT?.leadVisible,shot,{timeout:15000});
   const a=await page.evaluate(()=>({shot:window.RACE_SCENE_AUDIT.shot,leadVisible:window.RACE_SCENE_AUDIT.leadVisible,height:window.RACE_SCENE_AUDIT.leadScreenHeight,clearance:window.RACE_SCENE_AUDIT.cameraOuterRailClearance}));
   assert.ok(a.clearance>11,'camera outside rail');assert.equal(a.leadVisible,true);
   audits.push({width,frame:value,...a});
   if(shot==='finish')await page.screenshot({path:out+'/tenno-'+width+'-straight.png',timeout:90000});
  }
  await page.locator('#race-scenario').selectOption('desile');
  await page.waitForFunction(()=>document.querySelector('#h17').textContent.includes('90.0'));
  assert.ok((await page.locator('#h17').textContent()).includes('90.0'),'scenario changes actual score');
  await page.locator('#race-scenario').selectOption('base');
  await page.goto('http://127.0.0.1:8765/race-engine/tenno-aki-2026.html?replay=20261030',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready&&document.querySelector('.tenno-summary'),null,{timeout:60000});
  await page.locator('#live-rate').selectOption('instant');
  await page.waitForFunction(()=>document.querySelector('#race').classList.contains('finished'));
  await assertRaceUI(page,{field:17,finished:true});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:out+'/tenno-'+width+'-finish.png',timeout:90000});
  assert.deepEqual(errors,[]);await page.close();
 }
 writeFileSync(out+'/tenno-validation.json',JSON.stringify({passed:true,viewports:[390,430],audits},null,2));
 console.log('TENNO_MOBILE_PASS',JSON.stringify(audits));
}finally{await browser.close()}
