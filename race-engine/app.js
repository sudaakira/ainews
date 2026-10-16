/* Race-engine shared UI application. Loaded after per-race configuration. */
const config=window.RACE_CONFIG;
const FACTOR=window.SWAN_FACTORS,LOOP=window.SWAN_LOOP,SIM=window.RACE_SIM;
if(!config||!FACTOR||!LOOP||!SIM)throw Error('Race configuration has not loaded');
const HS=config.horses,FIELD=HS.length,CENTER=(FIELD+1)/2;
const distance=Number(config.distance),duration=Number(config.duration)||80;
// Race-local text, warnings, metadata and limits (not a Kyoto-only UI).
document.title=config.name+' '+config.date+'｜共通レースシミュレーター';
const head=document.querySelector('header');
if(head){head.innerHTML='<p>'+config.venue+' '+config.raceNumber+'R / '+config.date+' / '+config.surface+config.distance+'m '+(config.course||'')+'</p><h1>🏇 '+config.name+' レース予想</h1><p>'+FIELD+'頭・条件回帰ループ3Dシミュレーション'+(config.finalRunnersConfirmed?' ／ 出走馬・騎手確定':'')+(config.provisionalDraw?' ／ 仮番号・枠順未確定':'')+'</p>'+(config.asOf?'<p style="color:#e1f5b4;font-weight:700">📅 データ更新：'+config.asOf.replace('T',' ').replace('+09:00',' JST')+'（確定枠順・出走17頭）</p>':'')+(config.demo?'<p style="color:#aa2d2d;font-weight:800">⚠ 架空の動作確認データ。実在の競馬予想ではありません。</p>':'');}
const hero=document.querySelector('.hero-race h2');if(hero)hero.textContent='🏇 '+config.venue+'｜'+FIELD+'頭レースシミュレーター';
const liveHead=document.querySelector('.live-head strong');if(liveHead)liveHead.textContent='🏇 '+config.venue+' '+config.surface+config.distance+'m｜3Dレース';
const mainHeading=document.querySelector('main section.card h2');if(mainHeading)mainHeading.innerHTML='全'+FIELD+'頭の3着以内率｜<span id="count">—</span>';
const broadcast=document.querySelector('.track-broadcast');if(broadcast)broadcast.innerHTML='<b>'+config.venue+' '+config.raceNumber+'R</b><span>'+config.name+'｜'+config.surface+config.distance+'m '+(config.course||'')+'</span>';
const venueTag=document.querySelector('.track-broadcast-bottom');if(venueTag)venueTag.firstChild.textContent='🏇 '+config.venue+' ';
for(const id of ['live-distance','broadcast-distance']){const el=document.getElementById(id);if(el)el.textContent=(id==='live-distance'?'':'残り ')+distance+'m';}
const map=document.getElementById('kyoto-map');if(map){map.setAttribute('aria-label',config.courseView==='kyoto-1400-outer'?'京都芝1400m外のモデル模式図':'汎用3D競馬模式図（コース形状・距離は実測ではない）');if(config.courseView!=='kyoto-1400-outer'){map.querySelectorAll('text').forEach(t=>{const v=t.textContent||'';if(v.includes('京都'))t.textContent=v.replaceAll('京都競馬場',config.venue).replaceAll('京都',config.venue);if(v.includes('芝1400m'))t.textContent=config.surface+config.distance+'m / 汎用模式図';if(v.includes('高低差 4.3m'))t.textContent='高低差は未再現';if(v.includes('最後の直線 約400m'))t.textContent='直線長は模式表示';if(v.includes('3コーナーの上り'))t.textContent='坂の形状は模式図';if(v.includes('4コーナーへ下り'))t.textContent='勾配は未再現';});}}
const docLinks=document.querySelector('.card.links');
if(docLinks){
 const sources={...(config.factors?.sources||{}),...(config.sources||{})};
 const entries=Object.entries(sources).filter(([,url])=>typeof url==='string'&&url.startsWith('https://'));
 docLinks.innerHTML='<summary>📚 出典・モデルの注意点</summary>'+
  '<p class="small">'+(config.notes||'情報が未取得の要素は中立に扱います。')+'</p>'+
  '<p class="small">'+(config.factors?.scope||'該当コースの騎手・枠順・性別統計は未入力のため中立です。')+'</p>'+ (config.withdrawn?.length?'<p style="color:#a43824;font-weight:700">回避：'+config.withdrawn.map(h=>h.name+'（'+h.reason+'）').join('、')+'</p>':'')+
  (entries.length?'<p class="small">'+entries.map(([type,url])=>
    '<a rel="noopener" target="_blank" href="'+url+'">'+type+'の資料</a>').join(' ／ ')+'</p>':'')+
  (config.historicalTrends?'<details style="margin:12px 0;background:#f3f6f6;border:1px solid #b9c9c8;border-radius:8px;padding:10px"><summary><b>📊 添付データ：過去10年の秋華賞・京都開催8回の傾向</b></summary><p class="small">'+(config.drawConfirmed?'確定枠順を京都開催8回の枠別傾向で弱く補正。枠だけで馬の実力を逆転させない。':'枠は確定するまで中立。')+' 京都開催8回の前走4角4番手以内＝0-3-2-50（3着内9.1%）、5番手以下＝8-5-6-65（3着内22.6%）。ローズS勝馬や位置取りだけで消さず、既存の先行力・展開項目内に平滑化した軽微な補正だけを適用。</p><p class="small">脚質：逃げ0-2-0-6／先行2-0-1-23／差し6-4-7-47／追込0-2-0-39。キャリア5・6戦優位などは診断用途。人気は能力に使用せず、未確認4角は中立。</p><p class="small">詳細な数表と修正ログ：GitHubの race-engine/races/shuka-2026.js を参照。2021・2022年阪神代替を枠・脚質から除外。</p></details>':'')+
  '<p class="small">※着順率は未校正モデル内の出現率。'+(config.courseView==='kyoto-1400-outer'?'':'3Dは汎用模式図で実際の競馬場の高低差・距離形状を再現しません。')+'</p>';
}
const cameraAll=document.querySelector('[data-camera="wide"]');
if(cameraAll)cameraAll.textContent='🏟️ '+config.venue+'・全景';
const auditTitle=document.querySelector('.card.breakdown summary');
if(auditTitle)auditTitle.textContent='📊 14項目・全'+FIELD+'頭の採点表';
const horseListTitle=document.querySelector('.horse-list summary');
if(horseListTitle)horseListTitle.textContent='🐎 全'+FIELD+'頭の詳細を見る';
const el=id=>document.getElementById(id);let probs=[],n=20000;
const random=SIM.random,norm=SIM.norm;
function initWeightControls(){
 const box=el('weight-controls');
 box.innerHTML=LOOP.FEATURES.map(f=>
  '<div class="weight-row"><label for="weight-'+f.id+'">'+f.label+
  '<small>初期 '+f.weight+'点・'+f.confidence+'</small></label>'+
  '<div class="weight-input"><input id="weight-'+f.id+'" data-factor="'+f.id+
  '" type="range" min="0" max="2" step=".25" value="1" aria-label="'+f.label+'の倍率">'+
  '<output id="output-'+f.id+'">1.00倍</output></div></div>').join('');
 const update=()=>{
  let sum=0;
  for(const f of LOOP.FEATURES){
   const v=+el('weight-'+f.id).value;
   el('output-'+f.id).textContent=v.toFixed(2)+'倍';sum+=f.weight*v;
  }
  el('weight-summary').textContent=sum?'有効配点 '+sum.toFixed(0)+' → 100点換算':'全項目OFF（中立50点）';
 };
 const refresh=()=>{update();run();if(typeof sampleLiveRace==='function')sampleLiveRace()};
 for(const f of LOOP.FEATURES){
  const slider=el('weight-'+f.id);
  slider.oninput=update;slider.onchange=refresh;
 }
 el('weight-reset').onclick=()=>{
  for(const f of LOOP.FEATURES)el('weight-'+f.id).value='1';
  refresh();
 };
 for(const id of ['ground-mode','bias-mode'])el(id).onchange=refresh;
 update();
}
function opts(){return{pace:+el('pace').value,speed:+el('speed').value,vol:+el('vol').value,
 ground:el('ground-mode').value,bias:el('bias-mode').value,
 weights:Object.fromEntries(LOOP.FEATURES.map(f=>[f.id,+el('weight-'+f.id).value]))}}
const runRace=(r,s,computed)=>SIM.runRace(r,s,computed);
function run(){
 const s=opts();n=+el('n').value;
 // Common random numbers prevent unrelated RNG fluctuations when race settings change.
 const result=SIM.simulate(s,n,Number(config.seed??20261012));
 probs=result;
 const ordered=probs.slice().sort((a,b)=>b.p3-a.p3);
 el('bars').innerHTML=ordered.map(x=>
  '<div class="bar"><span class="n" data-no="'+x.no+'">'+(config.provisionalDraw?'仮'+x.no:x.no)+' '+x.name+'</span>'+
  '<div class="track"><div class="fill" style="width:'+Math.min(100,x.p3*1.7)+'%"></div></div>'+
  '<span class="val"><b>'+x.p3.toFixed(1)+'%</b><small>'+x.rating.toFixed(1)+'点</small></span></div>').join('');
 el('bars').querySelectorAll('.n').forEach(node=>node.onclick=()=>{
  el('horse-details').open=true;
  requestAnimationFrame(()=>el('h'+node.dataset.no).scrollIntoView({behavior:'smooth',block:'start'}));
 });
 el('count').textContent=n.toLocaleString()+'回';renderFactors(s);cards();
}
function raceview(v,final=false){
 const key=(final?'F':'L')+v.slice(0,6).join('-');
 if(raceview.lastKey===key)return;
 raceview.lastKey=key;
 const labels=['🥇','🥈','🥉'];
 el('result-state').textContent=final?'🏁 確定着順':'● 走行中・暫定順位';
 el('race').classList.toggle('finished',final);
 el('race').innerHTML=v.slice(0,3).map((no,k)=>{
   const h=HS[no-1];
   return '<div class="place-card place-'+(k+1)+'"><div class="place-rank">'+labels[k]+' '+(k+1)+'着</div>'+
    '<div class="place-number">'+(config.provisionalDraw?'仮'+no:no)+'</div><div class="place-name">'+h.name+'</div>'+
    '<div class="place-jockey">'+h.j+' 騎手</div></div>';
 }).join('');
}
const formatFactor=n=>(n>0?'+':'')+n.toFixed(2);
function renderFactors(s){
 const rows=HS.map(h=>({h,ev:LOOP.evaluate(h,s)})).sort((a,b)=>b.ev.rating-a.ev.rating);
 el('factor-deltas').innerHTML='<table class="factor-table"><thead><tr><th>馬</th><th>100点評価</th><th>得意項目</th><th>枠</th></tr></thead><tbody>'+
  rows.map(({h,ev})=>{
   const best=LOOP.FEATURES.filter(f=>ev.detail[f.id].effectiveWeight>0)
    .sort((a,b)=>ev.detail[b.id].score-ev.detail[a.id].score)
    .slice(0,2).map(f=>f.label).join('・');
   return '<tr><td><b>'+(config.provisionalDraw?'仮'+h.no:h.no)+' '+h.name+'</b><small>'+h.j+'</small></td>'+
    '<td><strong>'+ev.rating.toFixed(1)+'</strong></td><td>'+best+'</td><td>'+(config.provisionalDraw?'枠未確定':FACTOR.frame(h.no)+'枠')+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function cards(){
 const scenario=opts();
 el('horses').innerHTML=HS.map(h=>{
  const p=probs.find(x=>x.no===h.no),v=LOOP.evaluate(h,scenario);
  const scoreRows=LOOP.FEATURES.map(f=>{
   const d=v.detail[f.id];
   return '<tr><td>'+f.label+'<small>'+f.confidence+'</small></td><td>'+
    d.score.toFixed(1)+'</td><td>'+d.effectiveWeight.toFixed(1)+'</td></tr>';
  }).join('');
  return '<article class="horse" id="h'+h.no+'"><h3>'+(config.provisionalDraw?'仮'+h.no:h.no)+' '+h.name+'</h3>'+
   '<span class="pill">'+h.age+'</span><span class="pill">'+(config.provisionalDraw?'枠未確定':FACTOR.frame(h.no)+'枠')+'</span>'+
   '<span class="pill">'+h.style+'</span><p>'+h.j+' / '+h.trainer+' / '+h.kg+'kg</p>'+
   '<p><b>暫定総合評価：'+v.rating.toFixed(1)+' / 100点</b>　3着内率 '+(p?p.p3.toFixed(1):'—')+'%</p>'+
   (h.workout?'<p style="padding:9px;border:1px solid #bfd6ce;border-radius:8px"><b>⏱ 追い切り：</b>'+h.workout.status+'（'+h.workout.date+'）／'+h.workout.venue+' '+h.workout.time+'／'+h.workout.note+'</p>':'')+
   (h.pressWorkoutGrade?'<p><b>10/16全頭調教診断：</b>'+h.pressWorkoutGrade+'（専門家所見／調教状態の補助情報）</p>':'')+
   (h.drawRemark?'<p><b>枠・金曜陣営コメント：</b>'+h.drawRemark+'</p>':'')+
   (h.trainingWeight?'<p><b>JRA調教後馬体重：</b>'+h.trainingWeight.kg+'kg（前走 '+h.trainingWeight.lastKg+'kg）／10月'+h.trainingWeight.day+'日 '+h.trainingWeight.location+'計量。輸送後・当日体重とは異なり採点不使用。</p>':'')+
   (h.latest?'<p style="background:#e7f5ef;padding:9px;border-radius:8px"><b>📅 直近調査：</b>'+h.latest+'</p>':'')+
   '<p><b>強み：</b>'+h.plus+'</p><p class="risk"><b>注意：</b>'+h.minus+'</p>'+
   '<details><summary>14項目の条件回帰採点・血統・近走を表示</summary>'+
   '<table class="factor-table horse-score-table"><thead><tr><th>評価項目</th><th>素点</th><th>配点</th></tr></thead><tbody>'+scoreRows+'</tbody></table>'+
   '<p>父 '+h.father+'／母父 '+h.mfather+'</p><p><b>近4走：</b>'+h.history+'</p>'+
   '<p><b>状態：</b>調教 '+(h.training||'未確定')+'・前走から'+h.rest+'日</p>'+ (Number.isFinite(h.trainingScore)?'<p>当週の補間状態素点 '+h.trainingScore+' / 100（裁量値・未校正）</p>':'')+(Number.isInteger(h.lastRace4c)?'<p><b>前走4角：</b>'+h.lastRace4c+'番手（公式結果で照合済。過去傾向の反映は小さく制限）</p>':'')+ (h.officialPeakRating?'<p><b>JRA2026年最高レーティング：</b>'+h.officialPeakRating+' '+h.officialPeakDistance+'（今回の予想点ではなく、年間ピーク）</p>':'')+
   '<p class="small">血統は父・母父のみ確認。完全5代血統、全走のラップ、未確認の調教・騎手統計は欠測扱い。代理点は未校正です。</p>'+
   '</details></article>';
 }).join('');
}
el('simulate').onclick=run;el('csv').onclick=()=>{
 const scenario=opts();
 const header=[config.provisionalDraw?'仮番号':'馬番','馬名','総合評価100点','1着率','3着以内率','騎手性別枠順OFF時3着内率']
  .concat(LOOP.FEATURES.map(f=>f.label+'素点'))
  .concat(LOOP.FEATURES.map(f=>f.label+'配点倍率'));
 const rows=HS.map(h=>{
  const p=probs[h.no-1],ev=LOOP.evaluate(h,scenario);
  return [h.no,h.name,ev.rating.toFixed(1),p.win.toFixed(2),p.p3.toFixed(2),p.baseP3.toFixed(2)]
   .concat(LOOP.FEATURES.map(f=>ev.detail[f.id].score.toFixed(1)))
   .concat(LOOP.FEATURES.map(f=>scenario.weights[f.id].toFixed(2))).join(',');
 });
 const csv=header.join(',')+'\n'+rows.join('\n');
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
 a.download=config.id+'_condition_loop.csv';a.click();URL.revokeObjectURL(a.href);
};el('pace').oninput=()=>el('pacelabel').textContent=['超スロー','スロー','ややスロー','中立','ややハイ','ハイ','超ハイ'][+el('pace').value+3];el('speed').oninput=()=>el('speedlabel').textContent=['通常','やや高速','高速','レコード級'][+el('speed').value];el('vol').oninput=()=>el('vollabel').textContent=el('vol').value;
if(Number.isInteger(config.defaultPace))el('pace').value=String(Math.max(-3,Math.min(3,config.defaultPace)));
if(Number.isInteger(config.defaultSimulations))el('n').value=String(config.defaultSimulations);
el('pace').oninput();el('speed').oninput();
initWeightControls();run();


/* Interactive 18-horse race playback: a sampled hypothetical finish, not live race telemetry */
const LIVE = {playing:false,clock:0,visualTime:0,last:0,rank:[],seed:0,duration,raf:0,ready:false};
const NS='http://www.w3.org/2000/svg';
const route=el('kyoto-route'), group=el('kyoto-horses');
const routeLength=route.getTotalLength();
const routeAt=d=>route.getPointAtLength(config.direction==='左'?routeLength-d:d);
const silks=['#d33c39','#f6e9e2','#1b6fcb','#eac73a','#d65e91','#50b7ae','#b6b6b6','#f18a35','#713fb3','#c1a447','#e15532','#59b45a','#e9eff3','#a774db','#5ca0ca','#c89a75','#d2db49','#d24e70'];
function mkSvg(tag,attrs){let e=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));return e}
HS.forEach(h=>{
 let g=mkSvg('g',{id:'horse-'+h.no,'aria-label':h.no+'番 '+h.name});
 let glyph=mkSvg('text',{x:0,y:1,class:'horse-icon'});glyph.textContent='🐎';g.appendChild(glyph);
 let bg=mkSvg('circle',{cx:0,cy:-18,r:11,fill:silks[h.no-1],stroke:'#fff','stroke-width':1.8});g.appendChild(bg);
 let num=mkSvg('text',{x:0,y:-18,class:'horse-number'});num.textContent=h.no;g.appendChild(num);
 group.appendChild(g);
});
function sampleLiveRace(){
 let s=opts(),r=random((Date.now()%4294967295)>>>0);LIVE.rank=runRace(r,s);LIVE.seed=r()*1000;LIVE.clock=0;LIVE.visualTime=0;LIVE.ready=true;LIVE.playing=false;LIVE.last=0;
 el('live-status').textContent='スタート待機';raceview.lastKey='';el('result-state').textContent='スタート待機';el('race').classList.remove('finished');el('race').innerHTML=['🥇','🥈','🥉'].map((medal,i)=>'<div class="place-card place-'+(i+1)+'"><div class="place-rank">'+medal+' '+(i+1)+'着</div><div class="place-number">—</div><div class="place-name">レース待機中</div></div>').join('');drawLive();
}
function ease(t){return t*t*(3-2*t)}
function horseProgress(no,sec){
 let p=Math.min(1,Math.max(0,sec/LIVE.duration)),h=HS[no-1],rank=LIVE.rank.indexOf(no);
 let early=h.style==='逃げ'?.048:h.style==='好位'?.026:h.style==='中団'?-.006:-.036;
 let shift=early*Math.sin(Math.PI*p)*Math.pow(1-p,.15);
 let pace=+el('pace').value;
 shift+=(h.style==='逃げ'?-.004*pace:h.style==='差し'?.004*pace:0)*Math.sin(Math.PI*p);
 let finishGap=rank*.0038*ease(Math.max(0,(p-.47)/.53));
 let jitter=Math.sin(p*24+no*2.6+LIVE.seed)*.0009*Math.sin(Math.PI*p);
 return Math.max(0,Math.min(1,p+shift-finishGap+jitter));
}
function drawLive(){
 if(!LIVE.ready)return;
 let progress=Math.min(1,LIVE.clock/LIVE.duration),left=Math.max(0,Math.round(distance*(1-progress)));
 let mm=String(Math.floor(LIVE.clock/60)).padStart(2,'0'),ss=String(Math.floor(LIVE.clock%60)).padStart(2,'0');
 el('live-clock').textContent=mm+':'+ss;el('live-distance').textContent=left+'m';
 el('live-section').textContent=left>distance*.7?'前半':left>distance*.5?'中盤':left>distance*.25?'後半':left>distance*.14?'直線':left>0?'ゴール前':'確定';
 el('live-scrub').value=Math.round(progress*1000);
 let order=HS.map(h=>({no:h.no,p:horseProgress(h.no,LIVE.clock)})).sort((a,b)=>b.p-a.p);
 let active=new Set(order.slice(0,3).map(x=>x.no));
 HS.forEach(h=>{
  let p=horseProgress(h.no,LIVE.clock),dist=routeLength*p;
  let pos=routeAt(dist),prev=routeAt(Math.max(0,dist-1)),next=routeAt(Math.min(routeLength,dist+1));
  let dx=next.x-prev.x,dy=next.y-prev.y,len=Math.max(.1,Math.hypot(dx,dy));
  let lateral=(CENTER-h.no)*4.3, x=pos.x-dy/len*lateral,y=pos.y+dx/len*lateral;
  let g=el('horse-'+h.no);g.setAttribute('transform','translate('+x.toFixed(1)+' '+(y+Math.sin(LIVE.visualTime*11+h.no)*1.2).toFixed(1)+')');
  g.setAttribute('opacity',active.has(h.no)?'1':'.9');
  g.setAttribute('style','filter:drop-shadow(0 2px 2px #122c24);');
 });
 el('live-leaders').innerHTML=progress===0?'':order.slice(3,6).map((h,i)=>'<span>'+(i+4)+'位 <b>'+h.no+' '+HS[h.no-1].name+'</b></span>').join('');
 if(progress>0)raceview(order.map(x=>x.no),progress>=1);
 if(progress>=1){LIVE.playing=false;el('live-status').textContent='🏁 ゴール・着順確定';raceview(LIVE.rank,true)}
}
function liveFrame(t){
 if(LIVE.playing){
  if(LIVE.last){
   const dt=Math.min(.12,Math.max(0,(t-LIVE.last)/1000));
   const rate=+el('live-rate').value;
   // Race time accelerates up to 16x, but gallop phase advances smoothly in screen time.
   // This avoids stroboscopic frozen/jerky legs at high playback speeds.
   LIVE.clock=Math.min(LIVE.duration,LIVE.clock+dt*rate);
   LIVE.visualTime+=dt*(1+.13*Math.log2(rate));
  }
  LIVE.last=t;drawLive();
 }
 LIVE.raf=requestAnimationFrame(liveFrame);
}
el('live-play').onclick=()=>{if(!LIVE.ready||LIVE.clock>=LIVE.duration)sampleLiveRace();LIVE.playing=true;LIVE.last=0;el('live-status').textContent='● シミュレーション再生中';};
el('live-pause').onclick=()=>{LIVE.playing=false;LIVE.last=0;el('live-status').textContent='一時停止';};
el('live-reset').onclick=()=>sampleLiveRace();
el('live-scrub').oninput=v=>{LIVE.clock=LIVE.duration*(+v.target.value)/1000;LIVE.playing=false;LIVE.last=0;drawLive();};
const oldSim=el('simulate').onclick;el('simulate').onclick=()=>{oldSim();sampleLiveRace();};
sampleLiveRace();LIVE.raf=requestAnimationFrame(liveFrame);
window.KYOTO_RACE={HS,LIVE,route,routeLength,horseProgress,config};
window.RACE_APP_READY=true;

