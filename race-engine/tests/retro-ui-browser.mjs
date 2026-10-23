/** Fast layout/contrast/fallback release gate, also called by the real WebGL gate. */
import assert from 'node:assert/strict';
import {resolve,extname} from 'node:path';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {assertRaceUI,assertSettingsContrast} from './race-ui-assertions.mjs';

export async function verifyCompactRaceUI({browser,baseURL,root}){
 mkdirSync('/tmp/retro-race-ui',{recursive:true});
 const cases=[
  {width:320,height:568,race:'kikka-2026'},
  {width:390,height:660,race:'kikka-2026'},
  {width:430,height:932,race:'kikka-2026'},
  {width:844,height:390,race:'kikka-2026'},
  {width:1280,height:800,race:'kikka-2026'},
  {width:390,height:844,race:'sample-demo'}
 ];
 for(const vp of cases){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},isMobile:vp.width<900,hasTouch:true,reducedMotion:'reduce'});
  if(root)await page.route('http://race.local/**',async r=>{
   let name=decodeURIComponent(new URL(r.request().url()).pathname);if(name.endsWith('/'))name+='index.html';
   const path=resolve(root,'.'+name),types={'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
   try{await r.fulfill({path,contentType:types[extname(path)]||'application/octet-stream'})}catch{await r.fulfill({status:404,body:'Missing'})}
  });
  // The same HUD must remain functional when Three.js/WebGL is unavailable.
  await page.route('**/vendor/three.module.js*',r=>r.fulfill({status:503,body:'Intentional fallback regression'}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=new URL(baseURL);url.searchParams.set('race',vp.race);url.searchParams.set('replay','20261023');url.searchParams.delete('at');
  await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.RACE_APP_READY&&document.body.classList.contains('retro-race-ready'),null,{timeout:45000});
  await page.waitForFunction(()=>window.KYOTO_RENDER_STATUS?.ready===false,null,{timeout:15000});
  assert.equal(await page.locator('#kyoto-map').isVisible(),true,'SVG fallback visible');
  const field=await page.evaluate(()=>window.RACE_CONFIG.horses.length);
  const before=await assertRaceUI(page,{field,finished:false});
  const initialRank=await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank.slice());
  await page.locator('#live-rate').selectOption('instant');
  await page.waitForFunction(()=>document.getElementById('race').classList.contains('finished'));
  const after=await assertRaceUI(page,{field,finished:true});
  assert.ok(Math.abs(before.screen.h-after.screen.h)<.1,'finish UI cannot resize canvas or jerk the camera');
  assert.deepEqual(await page.evaluate(()=>window.KYOTO_RACE.LIVE.rank),initialRank,'instant finish preserves sampled race');
  const names=await page.locator('#race .place-name').evaluateAll(es=>es.map(e=>({name:e.textContent,clipped:e.scrollWidth>e.clientWidth+1})));
  assert.ok(names.every(n=>!n.clipped),'all result names fit '+JSON.stringify(names));
  await page.screenshot({path:'/tmp/retro-race-ui/'+vp.race+'-'+vp.width+'-'+vp.height+'-finish.png'});
  await page.locator('#premium-focus-button').click();
  await assertRaceUI(page,{field,finished:true});
  assert.equal(await page.locator('#premium-focus-button').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#premium-focus-button').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#prediction-settings').evaluate(e=>e.inert),false);
  if(!before.landscape){
   await page.locator('#live-sim').evaluate(e=>e.style.setProperty('--race-commentary-height','136px'));
   await assertRaceUI(page,{field,finished:true});
   await page.locator('#live-sim').evaluate(e=>e.style.removeProperty('--race-commentary-height'));
  }
  await page.locator('#live-rate').selectOption('4');await page.locator('#live-reset').click();
  await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  await assertRaceUI(page,{field,finished:false});
  const contrast=await assertSettingsContrast(page);
  await page.locator('#ground-mode').selectOption('heavy');
  assert.ok((await page.locator('#race-surface-mode').textContent()).includes('不良'),'HUD follows manual ground setting');
  if(vp.race==='kikka-2026'){
   await page.locator('#race-scenario').selectOption('base');
   assert.ok((await page.locator('#race-surface-mode').textContent()).includes('重'),'HUD follows scenario selector');
  }
  assert.deepEqual(errors,[]);
  console.log('RETRO_UI',JSON.stringify({width:vp.width,height:vp.height,field,svgFallback:true,allMarkersPainted:true,finishCanvasStable:true,...contrast}));
  await page.close();
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 const root=process.env.RACE_LOCAL_ROOT;
 try{await verifyCompactRaceUI({browser,root,baseURL:root?'http://race.local/race-engine/?race=kikka-2026':'http://127.0.0.1:8765/race-engine/?race=kikka-2026'})}finally{await browser.close()}
}
