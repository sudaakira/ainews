/**
 * Real-browser gate for race display. The old smoke test only parsed JS and
 * missed the CDN failure that silently displayed a huge 2D fallback on iOS.
 * Run against the ACTUAL _site output after same-origin Three.js is vendored.
 */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const pkg=process.env.PLAYWRIGHT_ENTRY||'/tmp/race-playwright/node_modules/playwright/index.mjs';
const {chromium}=await import(pkg);
const url=process.env.RACE_URL||'http://127.0.0.1:8765/race-engine/?race=shuka-2026';
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader',
 '--disable-dev-shm-usage'
]});
try{
 for(const vp of [{width:390,height:844},{width:320,height:568},{width:430,height:932}]){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[],failedRequests=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('requestfailed',req=>failedRequests.push(req.url()+': '+req.failure()?.errorText));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  try {
   await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true,undefined,{timeout:18000});
  } catch(error) {
   const state=await page.evaluate(()=>({
    documentTitle:document.title,
    boot:document.querySelector('#bootstrap-error')?.textContent,
    bootHidden:document.querySelector('#bootstrap-error')?.hidden,
    renderer:window.KYOTO_RENDER_STATUS,
    stageDisplay:getComputedStyle(document.querySelector('#three-stage')).display,
    warning:document.querySelector('#race-3d-warning')?.textContent,
    threeStatus:document.querySelector('#three-status')?.textContent,
    raceReady:!!window.RACE_APP_READY,
    canvasCount:document.querySelectorAll('#three-stage canvas').length
   })).catch(e=>({evalError:e.message}));
   console.error('REAL BROWSER FAILED TO START WEBGL',JSON.stringify({vp,state,errors,failedRequests}));
   throw error;
  }
  const model=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);
  assert.equal(model.saddleclothNames,true);
  assert.deepEqual(model.furlongDigits,[2,4,6,8,10,12,14,16,18]);
  assert.equal(model.camera,'geographic-4-shot');
  const guide=page.locator('#race-course-guide');
  assert.equal(await guide.isVisible(),true);
  assert.match(await guide.textContent(),/模式図/);
  if(vp.width===390){
   await page.waitForFunction(()=>window.RACE_CAMERA_AUDIT?.shot==='establish',{timeout:5000});
   const gateAudit=await page.evaluate(()=>window.RACE_CAMERA_AUDIT);
   assert.equal(gateAudit.opening,gateAudit.total,
    'ALL runners should be onscreen in the opening shot '+JSON.stringify(gateAudit));
  }
  assert.equal(model.ready,true,'3D must actually load, not merely pass source tests');
  assert.equal(model.horses,17);
  assert.equal(model.cinematic,true);
  const scene=await page.locator('#three-stage').boundingBox();
  const canvas=await page.locator('#three-stage canvas').boundingBox();
  assert.ok(scene&&canvas&&scene.height>120&&canvas.height>120,'live 3D scene should be visible');
  const backup=await page.locator('#kyoto-map').isVisible();
  assert.equal(backup,false,'the basic flat SVG should be hidden when WebGL is live');
  const play=await page.locator('#live-play').boundingBox();
  const top3=await page.locator('#race').boundingBox();
  assert.ok(play&&top3,'controls/results should be in viewport');
  const viewportLimit=vp.height+3;
  assert.ok(play.y+play.height<=viewportLimit,'start control must fit viewport '+JSON.stringify({vp,play}));
  assert.ok(top3.y+top3.height<=viewportLimit,'top-three podium must fit first viewport '+JSON.stringify({vp,top3}));
  assert.ok(scene.y>=0,'3D screen starts within viewport');
  assert.ok(top3.y>=play.y,'top3 shown after the race playback controls');
  // Inspect the actual 16x directing rhythm, not just source-string checks.
  if(vp.width===390){
   await page.locator('#live-rate').evaluate(el=>{
    el.value='16';el.dispatchEvent(new Event('change',{bubbles:true}));
   });
   const checks=[
    [.05,'establish'],[.30,'follow'],[.60,'follow'],
    [.78,'turn'],[.92,'duel']
   ];
   for(const [progress,shot] of checks){
    await page.locator('#live-scrub').evaluate((el,value)=>{
     el.value=String(Math.round(value*1000));
     el.dispatchEvent(new Event('input',{bubbles:true}));
    },progress);
    await page.waitForFunction(expected=>window.RACE_CINEMATIC_DEBUG?.shot===expected,shot,{timeout:4500});
   }
   const composition=await page.evaluate(()=>{
    const stage=document.getElementById('three-stage').getBoundingClientRect();
    const title=document.querySelector('.cinema-phase').getBoundingClientRect();
    const duel=document.getElementById('cinema-duel').getBoundingClientRect();
    return {stageHeight:stage.height,titleTop:title.top-stage.top,
     titleBottom:title.bottom-stage.top,titleWidth:title.width/stage.width,
     duelBottom:stage.bottom-duel.bottom,rate:document.getElementById('live-rate').value,
     director:window.RACE_CINEMATIC_DEBUG};
   });
   assert.equal(composition.rate,'16');
   const dot1=await page.locator('#race-course-guide circle').getAttribute('cx');
   await page.locator('#live-scrub').evaluate(el=>{
    el.value='300';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const dot2=await page.locator('#race-course-guide circle').getAttribute('cx');
   assert.notEqual(dot1,dot2,'mini-map dot must follow race progress');
   assert.ok(composition.titleBottom<composition.stageHeight*.38,
    'cinematic text must stay in upper safe region '+JSON.stringify(composition));
   assert.ok(composition.titleWidth<.55,'story titles may not cover entire screen');
   assert.ok(composition.duelBottom<85,
    'duel info should stay near edge, not obscure the ponies');
   assert.equal(composition.director.mode,'16x-geographic');
   assert.equal(composition.director.scriptedCuts,4);
   assert.equal(await page.locator('#race-course-position').isVisible(),true);
   mkdirSync('/tmp/race-mobile-shots',{recursive:true});
   await page.screenshot({path:'/tmp/race-mobile-shots/shuka-390x844-last400.png'});
   console.log('PASS Real 16x geographically stable four shots, all horses at start and route position',composition);
  }
  // The finished leaderboard uses the ORIGINAL race engine final order.
  await page.locator('#live-scrub').evaluate(el=>{
   el.value='1000';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelectorAll('.cinema-podium-row').length===3,{timeout:15000});
  const expected=await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice(0,3).map(String));
  const actual=await page.locator('.cinema-result-cap').allTextContents();
  assert.deepEqual(actual,expected,'cinematic podium must match exact simulator finish order');
  assert.equal(await page.locator('#race .place-card').count(),3);
  if(vp.width===390)await page.screenshot({path:'/tmp/race-mobile-shots/shuka-390x844-finish.png'});
  assert.ok(!errors.some(x=>/Uncaught|Cannot read|module/i.test(x)),'browser JS errors '+JSON.stringify(errors));
  console.log('PASS Mobile WebGL cinematic, exact 1–3 finish and single viewport',vp,model.model);
  await page.close();
 }
}finally{await browser.close()}
