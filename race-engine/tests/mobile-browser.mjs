/**
 * Real-browser gate for race display. The old smoke test only parsed JS and
 * missed the CDN failure that silently displayed a huge 2D fallback on iOS.
 * Run against the ACTUAL _site output after same-origin Three.js is vendored.
 */
import assert from 'node:assert/strict';
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
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===true,{timeout:85000});
  const model=await page.evaluate(()=>window.KYOTO_RENDER_STATUS);
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
  // The finished leaderboard uses the ORIGINAL race engine final order.
  await page.locator('#live-scrub').evaluate(el=>{
   el.value='1000';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelectorAll('.cinema-podium-row').length===3,{timeout:15000});
  const expected=await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice(0,3).map(String));
  const actual=await page.locator('.cinema-result-cap').allTextContents();
  assert.deepEqual(actual,expected,'cinematic podium must match exact simulator finish order');
  assert.equal(await page.locator('#race .place-card').count(),3);
  assert.ok(!errors.some(x=>/Uncaught|Cannot read|module/i.test(x)),'browser JS errors '+JSON.stringify(errors));
  console.log('PASS Mobile WebGL cinematic, exact 1–3 finish and single viewport',vp,model.model);
  await page.close();
 }
}finally{await browser.close()}
