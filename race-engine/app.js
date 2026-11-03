import {kyotoOuterMapPath,kyotoOuterPath} from './assets/kyoto-outer-3000.js?v=pack-v1-smooth';
import {kyotoMapPath,kyotoPath} from './assets/kyoto-course.js?v=pack-v1-smooth';
import {createRacePack,createReplayProgress} from './assets/race-pack.js?v=pack-v1';
import {createRaceHUD} from './assets/race-hud.js?v=retro-flow-v1';
/* Race-engine shared UI application. Loaded after per-race configuration. */
import {jockeyCap,JRA_JOCKEY_CAPS} from './core/jockey-caps.js?v=cap-v1';
import {FINISH_GAP,playbackEnd,playbackRate,finishCrossings} from './assets/race-playback.js?v=kyoto-v11-1';
const config=window.RACE_CONFIG;
const isKyotoOuter3000=config?.courseView==='kyoto-3000-outer';
const isKyotoInner=config?.venue==='京都'&&config?.distance===2000&&config?.surface==='芝';
const FACTOR=window.SWAN_FACTORS,LOOP=window.SWAN_LOOP,SIM=window.RACE_SIM;
if(!config||!FACTOR||!LOOP||!SIM)throw Error('Race configuration has not loaded');
const HS=config.horses,FIELD=HS.length,CENTER=(FIELD+1)/2;
const capFor=h=>jockeyCap(h,config,horse=>FACTOR.frame(horse));
const distance=Number(config.distance),duration=Number(config.duration)||80;
const raceHUD=createRaceHUD({config,capFor});
// Race-local text, warnings, metadata and limits (not a Kyoto-only UI).
document.title=config.name+' '+config.date+'｜共通レースシミュレーター';
const head=document.querySelector('header');
if(head){head.innerHTML='<p>'+config.venue+' '+config.raceNumber+'R / '+config.date+' / '+config.surface+config.distance+'m '+(config.course||'')+'</p><h1>🏇 '+config.name+' レース予想</h1><p>'+FIELD+'頭・条件回帰ループ3Dシミュレーション'+(config.finalRunnersConfirmed?' ／ 出走馬・騎手確定':'')+(config.provisionalDraw?' ／ 仮番号・枠順未確定':'')+'</p>'+(config.asOf?'<p style="color:#e1f5b4;font-weight:700">📅 データ更新：'+config.asOf.replace('T',' ').replace('+09:00',' JST')+'</p>':'')+(config.demo?'<p style="color:#aa2d2d;font-weight:800">⚠ 架空の動作確認データ。実在の競馬予想ではありません。</p>':'');}
const hero=document.querySelector('.hero-race h2');if(hero)hero.textContent='🏇 '+config.venue+'｜'+FIELD+'頭レースシミュレーター';
const liveHead=document.querySelector('.live-head strong');if(liveHead)liveHead.textContent=config.venue+' '+config.raceNumber+'R　'+config.name;
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
  '<p class="small">※着順率は未校正モデル内の出現率。'+(isKyotoOuter3000?'京都外回りの公開寸法に基づく復元モデルです。3000m・2度の坂越えを再現します（測量データではありません）。':isKyotoInner?'京都内回りの公開コース図・寸法・高低差に基づく復元モデルです。':config.courseView==='kyoto-1400-outer'?'':'3Dは汎用模式図で実際の競馬場の高低差・距離形状を再現しません。')+'</p>';
}
if(docLinks)docLinks.insertAdjacentHTML('beforeend','<details id="pack-model-note"><summary>馬群・走行ラインのモデル（pack-v1）</summary><p class="small">馬番固定レーンではなく、前馬の後ろ・ラチとの余裕・コーナーの距離ロス・進路の空きに応じて走路を計画します。重馬場想定では急な切り返しを抑えます。</p><p class="small">走行ラインは映像用の仮定です。抽選済みの前後位置と着順は維持し、詰まりによる減速や消耗から勝率を再推定するモデルではありません。</p><p><a href="https://github.com/sudaakira/ainews/blob/main/race-engine/docs/pack-dynamics.md" target="_blank" rel="noopener">調査根拠・経路計画・限界と検証</a></p></details>');
if(config.evidenceUrl){
 const liveNote=document.querySelector('.live-note');if(liveNote)liveNote.textContent='仮想レース。再生時計3分03秒5は映像用で、予測タイムではありません。';
 const genericNote=document.querySelector('.factor-settings > p.small:last-child');
 if(genericNote)genericNote.textContent=config.informationNote||'5代血統・全戦績は照合済み。枠順、最終調教、当日馬場、実オッズは未確定。シナリオの改善・回復は仮説です。';
 if(liveNote&&config.assumptionLabel)liveNote.textContent=config.assumptionLabel+'。再生時計3分03秒5は映像用で、予測タイムではありません。';
 if(docLinks){
  if(config.updateSummary)docLinks.insertAdjacentHTML('beforeend','<p style="font-weight:700">'+config.updateSummary+'</p>');
  if(config.trackObservation){
   const t=config.trackObservation;
   const numbers=t.cushion&&t.water?'クッション値'+t.cushion.value+'、芝含水率はゴール前'+t.water.goal+'%／4角'+t.water.corner4+'%。':'当日のクッション値・含水率は未確認。';
   docLinks.insertAdjacentHTML('beforeend','<p id="track-observation" class="small"><b>観測と想定を区別：</b>'+t.asOf.replace('T',' ').replace('+09:00',' JST')+'の京都芝は'+t.turf+'・'+t.course+'コース。'+numbers+' '+(t.note||'観測時点とレース当日の想定は異なります。')+' <a href="'+t.source+'" target="_blank" rel="noopener">馬場の確認資料</a></p>');
  }
  docLinks.insertAdjacentHTML('beforeend','<p><a href="'+config.reportUrl+'" target="_blank">全頭の予想・配点・シナリオ結果</a> ／ <a href="'+config.evidenceUrl+'" target="_blank">全21頭の戦績・5代血統データ</a></p>');
  if(config.reserves?.length)docLinks.insertAdjacentHTML('beforeend','<p>'+(config.reservesLabel||'除外対象（現時点）')+'：'+config.reserves.map(h=>h.name).join('、')+'</p>');
 }
 const sourceBox=document.createElement('details');sourceBox.className='card';sourceBox.id='race-evidence';
 sourceBox.innerHTML='<summary>📖 全21頭の戦績・5代血統・調教・騎手データ</summary><p>登録馬も含めた全頭の確認資料を表示します。</p><div id="race-evidence-content"></div>';
 document.querySelector('.card.horse-list').insertAdjacentElement('afterend',sourceBox);
 let loaded=false;
 sourceBox.addEventListener('toggle',async()=>{
  if(!sourceBox.open||loaded)return;
  const target=sourceBox.querySelector('#race-evidence-content');target.textContent='読み込み中…';
  try{
   const response=await fetch(config.evidenceUrl);if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();target.replaceChildren();
   const table=(headers,rows)=>{
    const wrap=document.createElement('div');wrap.style.overflowX='auto';const table=document.createElement('table');table.className='factor-table';
    const row=(items,header=false)=>{const tr=document.createElement('tr');for(const value of items){const td=document.createElement(header?'th':'td');td.textContent=value??'未確認';tr.append(td)}return tr};
    table.append(row(headers,true));rows.forEach(r=>table.append(row(r)));wrap.append(table);return wrap;
   };
   for(const h of data.horses){
    const item=document.createElement('details'),title=document.createElement('summary');
    title.textContent=h.name+' ／ '+({expected:'出走想定',confirmed:'出走確定',withdrawn:'回避',reserve:'除外対象',excluded:'除外（非抽選）'}[h.status]);item.append(title);
    const note=document.createElement('p');note.textContent=h.bloodInterpretation;item.append(note);
    if(h.conditionReview){const r=h.conditionReview,p=document.createElement('p'),a=document.createElement('a');p.textContent=r.publishedDate+'公表：'+r.summary+' '+r.assessment+' '+(r.eventDateNote||'');a.href=r.source;a.target='_blank';a.rel='noopener';a.textContent=' 出典';p.append(a);item.append(p);}
    const j=h.jockeyCourseStats,stats=document.createElement('p');
    stats.textContent=h.jockey+'：京都芝3000m '+(j?j.races+'騎乗・複勝率'+j.place_rate+'%・複勝回収率'+j.place_payback+'%':'集計資料に掲載なし・中立')+'。'+h.statsScope;item.append(stats);
    item.append(table(['日付','開催','競走','着順','距離・馬場','時計','位置取り','前後区間','上がり','斤量'],h.records.map(r=>[r.date,r.venue,r.race,r.finish,r.distance+' '+r.ground,r.time,r.corners,r.paceFirstLast3f,r.last3f,r.weight])));
    const ped=document.createElement('details'),summary=document.createElement('summary');summary.textContent='全5代62枠の血統（F＝父、M＝母）';ped.append(summary);
    ped.append(table(['系譜','世代','祖先'],h.pedigree.map(p=>[p.path,p.generation+'代',p.name])));item.append(ped);target.append(item);
   }
   loaded=true;
  }catch(error){target.textContent='資料を読み込めませんでした。再度開くと再試行します。'}
 });
}
const cameraAll=document.querySelector('[data-camera="wide"]');
if(cameraAll)cameraAll.textContent='🏟️ '+config.venue+'・全景';
const auditTitle=document.querySelector('.card.breakdown summary');
if(auditTitle)auditTitle.textContent='📊 14項目・全'+FIELD+'頭の採点表';
const horseListTitle=document.querySelector('.horse-list summary');
if(horseListTitle)horseListTitle.textContent='🐎 全'+FIELD+'頭の詳細を見る';
const el=id=>document.getElementById(id);let probs=[],n=20000,activeVariant='';
if(config.scenarios?.length){
 const select=document.createElement('select');select.id='race-scenario';select.setAttribute('aria-label','展開別シナリオ');
 select.innerHTML=config.scenarios.map(s=>'<option value="'+s.id+'">'+s.label+'</option>').join('');
 el('pace').parentElement.insertBefore(select,el('pace').previousElementSibling);
 select.onchange=()=>{
  const s=config.scenarios.find(s=>s.id===select.value);if(!s)return;
  activeVariant=s.options.variant||'';
  for(const [key,id] of Object.entries({pace:'pace',speed:'speed',ground:'ground-mode',bias:'bias-mode',vol:'vol'}))if(s.options[key]!==undefined)el(id).value=String(key==='vol'&&s.id==='base'?(config.defaultVol??s.options[key]):s.options[key]);
  el('pace').oninput?.();el('speed').oninput?.();el('vol').oninput?.();run();sampleLiveRace();
 };
}
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
function opts(){return{variant:activeVariant,pace:+el('pace').value,speed:+el('speed').value,vol:+el('vol').value,
 ground:el('ground-mode').value,bias:el('bias-mode').value,
 weights:Object.fromEntries(LOOP.FEATURES.map(f=>[f.id,+el('weight-'+f.id).value]))}}
const runRace=(r,s,computed)=>SIM.runRace(r,s,computed);
function run(){
 const s=opts();n=+el('n').value;
 // Common random numbers prevent unrelated RNG fluctuations when race settings change.
 const result=SIM.simulate(s,n,Number(config.seed??20261012));
 probs=result;
 const ordered=probs.slice().sort((a,b)=>b.p3-a.p3);
 el('bars').innerHTML=ordered.map((x,i)=>{
  const cap=capFor(HS[x.no-1]);
  const capStyle='--cap-color:'+cap.hex+';--cap-text:'+cap.text+';--cap-outline:'+cap.outline;
  return '<div class="bar"><span class="n" data-no="'+x.no+'" tabindex="0" role="button" aria-label="'+x.name+'の全項目を表示">'+
   '<span class="rank" aria-hidden="true">'+(i+1)+'</span>'+
   '<span class="cap-number" style="'+capStyle+'" aria-hidden="true">'+(config.provisionalDraw?'仮'+x.no:x.no)+'</span>'+
   '<span class="horse-label">'+x.name+'</span></span>'+
   '<div class="track"><div class="fill" style="width:'+Math.min(100,x.p3*1.7)+'%"></div></div>'+
   '<span class="val"><b>'+x.p3.toFixed(1)+'%</b><small>'+x.rating.toFixed(1)+'点</small></span></div>';
 }).join('');
 el('bars').querySelectorAll('.n').forEach(node=>{
  const openCard=()=>{
   el('horse-details').open=true;
   requestAnimationFrame(()=>el('h'+node.dataset.no).scrollIntoView({behavior:'smooth',block:'start'}));
  };
  node.onclick=openCard;
  node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCard();}};
 });
 el('count').textContent=n.toLocaleString()+'回';renderFactors(s);cards();
}
function raceview(v,final=false){
 const key=(final?'F':'L')+v.slice(0,6).join('-');
 if(raceview.lastKey===key)return;
 raceview.lastKey=key;
 el('result-state').textContent=final?'🏁 確定着順':'● 走行中・暫定順位';
 el('race').classList.toggle('finished',final);
 el('live-sim').classList.toggle('race-finished',final);
 el('race').innerHTML=v.slice(0,3).map((no,k)=>{
   const h=HS[no-1],cap=capFor(h);
   const capStyle='background:'+cap.hex+';color:'+cap.text+';border-color:'+cap.outline;
   return '<div class="place-card place-'+(k+1)+'"><div class="place-rank">'+(k+1)+'着</div>'+
    '<div class="place-number">'+(config.provisionalDraw?'仮'+no:no)+'</div><div class="place-name">'+h.name+'</div>'+
    '<div class="place-jockey"><span class="place-frame" style="'+capStyle+'">'+(cap.frame?cap.frame+'枠':'枠未定')+'</span> '+h.j+' 騎手</div></div>';
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
    '<td><strong>'+ev.rating.toFixed(1)+'</strong></td><td>'+best+'</td><td>'+(config.provisionalDraw?'枠未確定':FACTOR.frame(h)+'枠')+'</td></tr>';
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
   '<span class="pill">'+h.age+'</span><span class="pill">'+(config.provisionalDraw?'枠未確定':FACTOR.frame(h)+'枠')+'</span>'+
   '<span class="pill">'+h.style+'</span><p>'+h.j+' / '+h.trainer+' / '+h.kg+'kg</p>'+
   '<p><b>暫定総合評価：'+v.rating.toFixed(1)+' / 100点</b>　3着内率 '+(p?p.p3.toFixed(1):'—')+'%</p>'+
   (h.workout?'<p style="padding:9px;border:1px solid #bfd6ce;border-radius:8px"><b>⏱ 追い切り：</b>'+(h.workout.status||h.workout.verification||'未確認')+'（'+(h.workout.date||'日付未確認')+'）／'+(h.workout.venue||h.workout.track||'')+' '+(h.workout.time||h.workout.clock||'時計未確認')+'／'+(h.workout.note||h.workout.content||'')+'</p>':'')+
   (h.pressWorkoutGrade?'<p><b>10/16全頭調教診断：</b>'+h.pressWorkoutGrade+'（専門家所見／調教状態の補助情報）</p>':'')+
   (h.drawRemark?'<p><b>枠順・陣営情報：</b>'+h.drawRemark+'</p>':'')+
   (h.trainingWeight?'<p><b>JRA調教後馬体重：</b>'+h.trainingWeight.kg+'kg（前走 '+h.trainingWeight.lastKg+'kg）／10月'+h.trainingWeight.day+'日 '+h.trainingWeight.location+'計量。輸送後・当日体重とは異なり採点不使用。</p>':'')+
   (h.latest?'<p style="background:#e7f5ef;padding:9px;border-radius:8px"><b>📅 直近調査：</b>'+h.latest+(h.latestSource?' <a href="'+h.latestSource+'" target="_blank" rel="noopener">報道元</a>':'')+'</p>':'')+
   (h.suitability?'<p class="suitability"><b>血統・馬体・走法（適性の参考点）：</b> 血統 '+h.suitability.blood+'／馬体 '+(h.suitability.body===null?'未採点':h.suitability.body)+'／走法 '+h.suitability.gait+'。'+h.suitability.bodyEra+'。総合評価への単純加算はしていません。'+(h.suitability.source?' <a target="_blank" rel="noopener" href="'+h.suitability.source+'">馬体資料</a>':'')+'</p><p class="small">'+h.suitability.headline+'。'+h.suitability.caution+'</p>':'')+
   (h.evaluationAudit?'<details style="border:1px solid #b3cbd3;padding:9px;border-radius:8px;background:#f4f9fc"><summary><b>📝 実走証拠に基づく採点再検証（10/16）</b></summary><p>芝2000m未経験をコース・血統・距離で多重減点しない。初距離の不確実性は順位変動（SD）に残す。</p><table class="factor-table"><thead><tr><th>評価</th><th>旧素点</th><th>修正素点</th></tr></thead><tbody>'+[['course','同コース・近接距離'],['lap','ラップ・直接対戦'],['blood','血統'],['distance','距離適性'],['sd','順位変動SD']].map(p=>'<tr><td>'+p[1]+'</td><td>'+h.evaluationAudit.previous[p[0]]+'</td><td>'+h.evaluationAudit.revised[p[0]]+'</td></tr>').join('')+'</tbody></table><p class="small">ローズS1000m58.9秒、ノーステッキで0.5秒差。JRA-VAN血統分析で配合適性を再確認。ほか16頭の入力と採点配点は据え置き。</p></details>':'')+
   '<p><b>強み：</b>'+h.plus+'</p><p class="risk"><b>注意：</b>'+h.minus+'</p>'+
   '<details><summary>14項目の条件回帰採点・血統・近走を表示</summary>'+
   '<table class="factor-table horse-score-table"><thead><tr><th>評価項目</th><th>素点</th><th>配点</th></tr></thead><tbody>'+scoreRows+'</tbody></table>'+
   '<p>父 '+h.father+'／母父 '+h.mfather+'</p>'+(h.bloodNote?'<p><b>5代血統の見立て：</b>'+h.bloodNote+'</p>':'')+'<p><b>近走：</b>'+h.history+'</p>'+
   '<p><b>状態：</b>調教 '+(h.training||(h.workout?.verification||'未確定'))+'・前走から'+h.rest+'日</p>'+ (Number.isFinite(h.trainingScore)?'<p>状態の暫定素点 '+h.trainingScore+' / 100（裁量値・未校正）</p>':'')+(Number.isInteger(h.lastRace4c)?'<p><b>前走4角：</b>'+h.lastRace4c+'番手（公式結果で照合済。過去傾向の反映は小さく制限）</p>':'')+ (h.officialPeakRating?'<p><b>JRA2026年最高レーティング：</b>'+h.officialPeakRating+' '+h.officialPeakDistance+'（今回の予想点ではなく、年間ピーク）</p>':'')+
   '<p class="small">'+(config.evidenceUrl?(config.horseEvidenceNote||'全5代の血統と全戦績を確認済み。最終調教・枠順・当日馬場は未確定。採点は未校正です。'):'血統は父・母父のみ確認。完全5代血統、全走のラップ、未確認の調教・騎手統計は欠測扱い。代理点は未校正です。')+'</p>'+
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
if(Number.isInteger(config.defaultSpeed))el('speed').value=String(Math.max(0,Math.min(3,config.defaultSpeed)));
if(config.defaultGround&&Array.from(el('ground-mode').options).some(option=>option.value===config.defaultGround))el('ground-mode').value=config.defaultGround;
 if(Number.isFinite(config.defaultVol))el('vol').value=String(Math.max(1,Math.min(16,config.defaultVol)));
 if(Number.isFinite(config.defaultPlaybackRate)&&[1,2,4,8,16].includes(config.defaultPlaybackRate))el('live-rate').value=String(config.defaultPlaybackRate);
 if(config.defaultBias&&Array.from(el('bias-mode').options).some(option=>option.value===config.defaultBias))el('bias-mode').value=config.defaultBias;
if(Number.isInteger(config.defaultSimulations))el('n').value=String(config.defaultSimulations);
el('pace').oninput();el('speed').oninput();el('vol').oninput();
initWeightControls();run();


/* Interactive 18-horse race playback: a sampled hypothetical finish, not live race telemetry */
// A reproducible race must use a real random-number seed, not a cache token.
// Same replay ID + same race settings -> same rankings and camera follow.
const replayQuery=new URLSearchParams(location.search);
const rawReplaySeed=replayQuery.get('replay');
const fixedSeed=rawReplaySeed!==null&&/^\d{1,10}$/.test(rawReplaySeed)&&
 Number(rawReplaySeed)<=4294967295?Number(rawReplaySeed)>>>0:null;
const rawReplayAt=replayQuery.get('at');
const initialPosition=rawReplayAt!==null&&/^\d{1,4}$/.test(rawReplayAt)&&
 +rawReplayAt<=1000?+rawReplayAt:null;
let firstRace=true;
const LIVE = {playing:false,clock:0,visualTime:0,last:0,rank:[],seed:0,
 replaySeed:null,duration,raf:0,ready:false,playbackAtFinish:false};
function shareRaceFrame(at){
 const u=new URL(location.href);
 u.searchParams.set('replay',String(LIVE.replaySeed));
 if(at===null)u.searchParams.delete('at');
 else u.searchParams.set('at',String(Math.max(0,Math.min(1000,Math.round(at)))));
 history.replaceState(null,'',u.pathname+u.search+u.hash);
}
const replayIndicator=document.createElement('small');
replayIndicator.id='race-replay-id';
replayIndicator.style.cssText='display:block;color:#e4eddd;font:600 11px/1.5 sans-serif;margin:4px 0 7px;';
replayIndicator.title='この再現番号を含むURLなら、同じ展開と先頭馬を再生できます';
(docLinks||el('live-status').parentElement)
 .insertAdjacentElement('afterend',replayIndicator);
const NS='http://www.w3.org/2000/svg';
const route=el('kyoto-route'), group=el('kyoto-horses');
// True topology (schematic metrics): Kyoto turf 2000m (inner A) starts on
// the grandstand-side home straight, rounds 1C -> 2C -> back straight ->
// 3C -> 4C, and finishes on that SAME home straight. Unlike the previous
// incomplete U-shaped SVG, the model now travels all four corners.
// The path coordinates are diagram geometry, not surveyed measurements.
if(config.venue==='京都'&&config.distance===2000&&config.surface==='芝'){
 route.setAttribute('d',kyotoMapPath());
 route.setAttribute('data-course-model','kyoto-inner-A-metric');
 const svg=document.getElementById('kyoto-map');svg.setAttribute('aria-label','京都芝2000m内回り・公開寸法を基準に復元');
 svg.querySelectorAll('text').forEach(t=>{if(t.textContent==='高低差は未再現')t.textContent='3コーナー 高低差3.1m';if(t.textContent==='直線長は模式表示')t.textContent='最後の直線328.4m';if(t.textContent==='勾配は未再現')t.textContent='4コーナーへ下り';});
}

if(isKyotoOuter3000){
 route.setAttribute('d',kyotoOuterMapPath());route.setAttribute('data-course-model','kyoto-outer-A-3000-metric');
 const svg=document.getElementById('kyoto-map');svg.setAttribute('aria-label','京都芝3000m外回り・2度の坂越え・1周目ゴール通過');
 svg.querySelectorAll('text').forEach(t=>{const v=t.textContent;if(v.includes('汎用模式図'))t.textContent='芝3000m 外回り・2度の坂越え';if(v.includes('高低差'))t.textContent='3コーナー 高低差4.3m';if(v.includes('直線長'))t.textContent='最後の直線403.7m';});
}
const routeLength=route.getTotalLength();
const routeAt=d=>route.getPointAtLength(config.direction==='左'?routeLength-d:d);
// The map, camera and horse models consume the same lateral trajectory.
// Non-Kyoto courses retain their existing explicitly schematic scale.
function packPath(p){
 if(isKyotoOuter3000)return kyotoOuterPath(p);
 if(isKyotoInner)return kyotoPath(p);
 const s=Math.max(0,Math.min(1,p))*routeLength,q=routeAt(s);
 const a=routeAt(Math.max(0,s-2)),b=routeAt(Math.min(routeLength,s+2));
 const len=Math.max(.001,Math.hypot(b.x-a.x,b.y-a.y)),dx=(b.x-a.x)/len,dz=(b.y-a.y)/len;
 const runOut=Math.max(0,p-1)*routeLength*.245;
 return {x:(q.x-430)*.245+dx*runOut,z:(q.y-277)*.245+dz*runOut,y:0,dx,dz};
}
let pack=null,replayProgress=null;
// Race markers show jockey CAP colour, not the race-silk colour.
// Cap colour follows the official JRA frame (1=white through 8=pink).
function mkSvg(tag,attrs){let e=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));return e}
HS.forEach(h=>{
 const cap=capFor(h);
 let g=mkSvg('g',{id:'horse-'+h.no,'aria-label':h.no+'番 '+h.name+'（'+(cap.frame?cap.frame+'枠・'+cap.name+'帽':'枠未確定')+'）'});
 let glyph=mkSvg('text',{x:0,y:1,class:'horse-icon'});glyph.textContent='🐎';g.appendChild(glyph);
 let bg=mkSvg('circle',{cx:0,cy:-18,r:11,fill:cap.hex,stroke:cap.outline,'stroke-width':1.8});g.appendChild(bg);
 // Four/eight-way dyeing is only drawn when the race file explicitly
 // documents the JRA exceptional capPattern.
 if(cap.pattern){
  const sectors=cap.pattern==='quartered'?4:8;
  for(let i=0;i<sectors;i++){
   const a=-Math.PI/2+i*Math.PI*2/sectors,b=a+Math.PI*2/sectors,r=10.8;
   const x1=(Math.cos(a)*r).toFixed(3),y1=(-18+Math.sin(a)*r).toFixed(3);
   const x2=(Math.cos(b)*r).toFixed(3),y2=(-18+Math.sin(b)*r).toFixed(3);
   g.appendChild(mkSvg('path',{d:'M0,-18 L'+x1+','+y1+' A'+r+','+r+' 0 0 1 '+x2+','+y2+' Z',fill:i%2?cap.secondary:cap.hex}));
  }
  g.appendChild(mkSvg('circle',{cx:0,cy:-18,r:11,fill:'none',stroke:cap.outline,'stroke-width':1.8}));
 }
 let num=mkSvg('text',{x:0,y:-18,class:'horse-number',fill:cap.text});num.textContent=h.no;g.appendChild(num);
 group.appendChild(g);
});
// Shared JRA helmet swatches: the same palette drives the 3D caps and 2D.
const liveScreen=document.querySelector('.live-screen');
if(liveScreen){
 const legend=document.createElement('div');legend.id='jra-jockey-cap-legend';
 legend.style.cssText='display:flex;gap:7px 13px;flex-wrap:wrap;align-items:center;margin:7px 0 10px;font-size:12px;color:#dce8e8';
 const legendTitle=document.createElement('strong');legendTitle.textContent='騎手帽色（JRA枠色）';legend.appendChild(legendTitle);
 for(const entry of JRA_JOCKEY_CAPS.slice(1)){
  const item=document.createElement('span');item.style.cssText='display:inline-flex;align-items:center;gap:4px;white-space:nowrap';
  const dot=document.createElement('span');dot.style.cssText='display:inline-block;width:13px;height:13px;border-radius:50%;background:'+entry.hex+';border:1.5px solid '+entry.outline;
  item.appendChild(dot);item.appendChild(document.createTextNode(entry.frame+'枠 '+entry.name));legend.appendChild(item);
 }
 if(config.provisionalDraw){const note=document.createElement('small');note.textContent='枠未確定の出走馬は灰色で表示';legend.appendChild(note);}
 liveScreen.parentNode.insertBefore(legend,liveScreen);
}
function sampleLiveRace(){
 const seed=(firstRace&&fixedSeed!==null)?fixedSeed:
  ((Date.now() ^ Math.floor(Math.random()*4294967296))>>>0);
 const useStartFrame=firstRace&&initialPosition!==null;
 firstRace=false;
 const s=opts(),r=random(seed);
 LIVE.rank=runRace(r,s);LIVE.seed=r()*1000;LIVE.replaySeed=seed;
 replayProgress=createReplayProgress({horses:HS,duration:LIVE.duration,rank:LIVE.rank,seed:LIVE.seed,pace:s.pace});
 pack=createRacePack({horses:HS,duration:LIVE.duration,distance,progress:horseProgress,
  path:packPath,direction:config.direction,ground:s.ground,seed,width:isKyotoOuter3000||isKyotoInner?27:25.6});
 LIVE.clock=useStartFrame?LIVE.duration*initialPosition/1000:0;
 LIVE.visualTime=0;LIVE.ready=true;LIVE.playing=false;LIVE.last=0;LIVE.playbackAtFinish=false;LIVE.instantFinished=false;
 el('live-sim').classList.remove('race-finished');
 shareRaceFrame(useStartFrame?initialPosition:null);
 replayIndicator.textContent='🎥 再現ID '+seed+' ｜ URLで同じ展開を再現（設定変更・新しいレースは別展開）';
 el('live-status').textContent='スタート待機';raceview.lastKey='';el('result-state').textContent='スタート待機';el('race').classList.remove('finished');el('race').innerHTML=['🥇','🥈','🥉'].map((medal,i)=>'<div class="place-card place-'+(i+1)+'"><div class="place-rank">'+medal+' '+(i+1)+'着</div><div class="place-number">—</div><div class="place-name">レース待機中</div></div>').join('');drawLive();
 if(el('live-rate').value==='instant')finishLiveRace();
}
function horseProgress(no,sec){return replayProgress(no,sec)}
function horseState(no,sec){return pack.state(no,sec)}
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
  let p=horseProgress(h.no,LIVE.clock),dist=routeLength*Math.min(1,p);
  let pos=routeAt(dist),prev=routeAt(Math.max(0,dist-1)),next=routeAt(Math.min(routeLength,dist+1));
  let dx=next.x-prev.x,dy=next.y-prev.y,len=Math.max(.1,Math.hypot(dx,dy));
  let lateral=horseState(h.no,LIVE.clock).lane*(isKyotoOuter3000?.82:isKyotoInner?1.1:1/.245), x=pos.x-dy/len*lateral,y=pos.y+dx/len*lateral;
  if(p>1){x+=dx/len*(p-1)*routeLength;y+=dy/len*(p-1)*routeLength;}
  let g=el('horse-'+h.no);g.setAttribute('transform','translate('+x.toFixed(1)+' '+(y+Math.sin(LIVE.visualTime*11+h.no)*1.2).toFixed(1)+')');
  g.setAttribute('opacity',active.has(h.no)?'1':'.9');
  g.setAttribute('style','filter:drop-shadow(0 2px 2px #122c24);');
 });
 el('live-leaders').innerHTML=progress===0?'':order.slice(3,6).map((h,i)=>'<span>'+(i+4)+'位 <b>'+h.no+' '+HS[h.no-1].name+'</b></span>').join('');
 const crossed=finishCrossings(LIVE.rank,LIVE.clock,LIVE.duration);
 raceHUD.update({clock:LIVE.clock,progress,order,crossed,rate:el('live-rate').value});
 el('broadcast-clock').textContent=Math.floor(LIVE.clock/60)+':'+(LIVE.clock%60).toFixed(1).padStart(4,'0');
 if(progress>0)raceview(order.map(x=>x.no),crossed.length>=3);
 if(progress>=1){
  if(LIVE.playing)LIVE.playbackAtFinish=true;
  el('live-status').textContent=LIVE.playing?'ゴール通過・走り抜け':'ゴール';
  if(crossed.length>=3)raceview(LIVE.rank,true);
 }
}
function finishLiveRace(){
 if(!LIVE.ready)return;
 LIVE.clock=LIVE.duration*(1+(FIELD-1)*FINISH_GAP)+.01;
 LIVE.playing=false;LIVE.last=0;LIVE.playbackAtFinish=true;LIVE.instantFinished=true;
 shareRaceFrame(1000);drawLive();
}
function liveFrame(t){
 if(LIVE.playing){
  if(LIVE.last){
   const dt=Math.min(.12,Math.max(0,(t-LIVE.last)/1000));
   const rate=playbackRate(+el('live-rate').value||4,LIVE.clock,LIVE.duration);
   // Playback defaults to 4x (adjustable up to 16x); gallop motion remains smooth.
   // This avoids stroboscopic frozen/jerky legs at high playback speeds.
   LIVE.clock=Math.min(playbackEnd(LIVE.duration,FIELD),LIVE.clock+dt*rate);
   LIVE.visualTime+=dt*(1+.13*Math.log2(rate));
   if(LIVE.clock>=playbackEnd(LIVE.duration,FIELD))LIVE.playing=false;
  }
  LIVE.last=t;drawLive();
 }
 LIVE.raf=requestAnimationFrame(liveFrame);
}
el('live-rate').onchange=()=>{if(el('live-rate').value==='instant')finishLiveRace();};
el('live-play').onclick=()=>{
 if(!LIVE.ready||LIVE.instantFinished||LIVE.clock>=playbackEnd(LIVE.duration,FIELD))sampleLiveRace();
 if(el('live-rate').value==='instant'){finishLiveRace();return;}
 LIVE.playing=true;LIVE.last=0;el('live-status').textContent='● シミュレーション再生中';
};
el('live-pause').onclick=()=>{LIVE.playing=false;LIVE.last=0;el('live-status').textContent='一時停止';};
el('live-reset').onclick=()=>sampleLiveRace();
el('live-scrub').oninput=v=>{LIVE.clock=LIVE.duration*(+v.target.value)/1000;LIVE.playing=false;LIVE.last=0;LIVE.playbackAtFinish=false;LIVE.instantFinished=false;el('live-status').textContent=LIVE.clock>0?'一時停止':'スタート待機';shareRaceFrame(v.target.value);drawLive();};
const oldSim=el('simulate').onclick;el('simulate').onclick=()=>{oldSim();sampleLiveRace();};
sampleLiveRace();LIVE.raf=requestAnimationFrame(liveFrame);
window.KYOTO_RACE={HS,LIVE,route,routeLength,horseProgress,horseState,config,
 get pack(){return pack}};
window.RACE_APP_READY=true;


