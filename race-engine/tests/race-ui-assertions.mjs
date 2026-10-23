import assert from 'node:assert/strict';

/** Verify what is actually painted, not just that 18 marker nodes exist. */
export async function assertRaceUI(page,{field,viewport=true,finished}={}){
 const a=await page.evaluate(()=>{
  const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
  const q=s=>document.querySelector(s),frame=q('#live-sim'),speech=q('#race-commentary-panel');
  const items=[...q('#race-tracking-field').children];
  const visible=e=>{const r=box(e),s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&r.w>0&&r.h>0};
  const read=e=>({box:box(e),visible:visible(e)});
  const expected=window.KYOTO_RACE.HS.map(h=>({no:h.no,p:window.KYOTO_RACE.horseProgress(h.no,window.KYOTO_RACE.LIVE.clock)})).sort((a,b)=>b.p-a.p).map(h=>h.no);
  return{vw:innerWidth,vh:innerHeight,landscape:matchMedia('(orientation:landscape) and (max-height:600px) and (min-width:600px)').matches,
   frame:box(frame),head:box(q('.live-head')),readout:box(q('.live-readout')),focus:box(q('#premium-focus-button')),screen:box(q('.live-screen')),tracker:box(q('.race-tracking')),speech:box(speech),controls:box(q('.live-buttons')),
   outsideCanvas:!q('#three-stage').contains(speech)&&!q('#three-stage').contains(q('.race-tracking')),
   markers:items.map(e=>{const r=box(e),hit=document.elementFromPoint(r.x+r.w/2,r.y+r.h/2);return{no:Number(e.textContent),box:r,visible:visible(e),onTop:hit===e||e.contains(hit)};}),
   expected,result:read(q('#race')),finished:q('#race').classList.contains('finished'),text:box(q('#race-commentary-text')),
   buttons:[...q('.live-buttons').children].map(e=>({id:e.id,...read(e)})),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 assert.equal(a.outsideCanvas,true,'tracker and commentary are independent flow rows');
 assert.equal(a.markers.length,field);
 assert.deepEqual(a.markers.map(x=>x.no),a.expected,'leftmost marker is actual running leader');
 assert.equal(a.overflow,false,'no horizontal document overflow');
 const inside=(b,p)=>b.x>=p.x-1&&b.y>=p.y-1&&b.right<=p.right+1&&b.bottom<=p.bottom+1;
 assert.ok(a.head.bottom<=a.readout.y+1,'title never wraps over readout');
 assert.ok(inside(a.focus,a.head),'full-screen control fits title row');
 if(a.landscape){
  assert.ok(a.screen.right<=a.speech.x+1,'landscape commentary beside canvas');
  assert.ok(Math.max(a.screen.bottom,a.speech.bottom)<=a.tracker.y+1);
 }else{
  assert.ok(a.screen.bottom<=a.tracker.y+1,'canvas never covers tracker');
  assert.ok(a.tracker.bottom<=a.speech.y+1,'announcer never covers tracker');
 }
 assert.ok(Math.max(a.tracker.bottom,a.speech.bottom)<=a.controls.y+1,'controls never overlap HUD');
 for(const m of a.markers){
  assert.ok(m.visible&&m.box.w>=12&&m.box.h>=20,'legible full-field marker '+m.no);
  assert.ok(inside(m.box,a.tracker),'no clipped marker '+m.no);
  if(viewport)assert.ok(m.onTop,'marker is really visible at its center '+m.no);
 }
 assert.ok(inside(a.text,a.speech),'full commentary stays inside its row');
 for(const b of a.buttons){assert.ok(b.visible&&inside(b.box,a.frame),'playback control remains available '+b.id);}
 if(finished!==undefined){assert.equal(a.finished,finished);assert.equal(a.result.visible,finished,'results only appear after finish');}
 if(a.result.visible)assert.ok(inside(a.result.box,a.speech),'compact result fits commentary panel');
 if(viewport)for(const [name,b]of Object.entries({frame:a.frame,tracker:a.tracker,speech:a.speech,controls:a.controls})){
  assert.ok(b.x>=-1&&b.y>=-1&&b.right<=a.vw+1&&b.bottom<=a.vh+1,'fits viewport '+name+' '+JSON.stringify(b));
 }
 return a;
}

export async function assertSettingsContrast(page){
 await page.locator('.advanced-settings').evaluate(e=>e.open=true);
 const rows=await page.evaluate(()=>{
  const rgba=s=>(s.match(/[\d.]+/g)||[]).map(Number);
  const composite=(a,b)=>{const t=a[3]??1;return[a[0]*t+b[0]*(1-t),a[1]*t+b[1]*(1-t),a[2]*t+b[2]*(1-t),1]};
  const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
  return[...document.querySelectorAll('#prediction-settings label,#prediction-settings small,#prediction-settings .small,#prediction-settings output,#prediction-settings summary,#prediction-settings h3,#weight-summary,#prediction-settings select')].map(e=>{
   const chain=[];for(let p=e;p;p=p.parentElement)chain.unshift(p);
   let bg=[255,255,255,1];for(const p of chain)bg=composite(rgba(getComputedStyle(p).backgroundColor),bg);
   const fg=composite(rgba(getComputedStyle(e).color),bg),a=lum(fg),b=lum(bg);
   return{text:e.textContent.trim().slice(0,45),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
 });
 assert.ok(rows.length>=45,'all 14 weight controls and settings labels audited');
 for(const r of rows)assert.ok(r.ratio>=4.5,'settings text contrast >=4.5:1 '+JSON.stringify(r));
 return{checked:rows.length,minimum:Math.min(...rows.map(r=>r.ratio))};
}
