import {hanshinPath,hanshinMapPath} from './assets/hanshin-course.js?v=takarazuka-3d-v1';
import {createTrackingReplay} from './core/tracking-replay.js?v=takarazuka-3d-v1';
import {jockeyCap} from './core/jockey-caps.js?v=cap-v1';

const el=id=>document.getElementById(id),clockText=t=>Math.floor(t/60)+':'+(t%60).toFixed(1).padStart(4,'0');
const fail=e=>{el('replay-loading').hidden=true;el('replay-error').hidden=false;el('replay-error').textContent='3Dを開始できませんでした。'+(e?.message||e);el('live-status').textContent='読み込みエラー';};
try{
 const response=await fetch('./data/takarazuka-2026-tracking.json?v=takarazuka-3d-v1');
 if(!response.ok)throw Error('位置データ HTTP '+response.status);
 const data=await response.json(),replay=createTrackingReplay(data,hanshinPath),HS=data.horses;
 const config={name:'宝塚記念',date:'2026-06-14',venue:'阪神',raceNumber:11,surface:'芝',distance:2200,
  direction:'右',duration:replay.duration,courseView:'hanshin-2200-inner-b',horses:HS,replay:true};
 window.RACE_CONFIG=config;window.SWAN_FACTORS={frame:h=>h.frame};
 const LIVE={clock:0,visualTime:0,duration:replay.duration,playing:false,ready:true,rank:replay.rank,last:0,seed:0};
 const route=el('kyoto-route');route.setAttribute('d',hanshinMapPath());
 window.KYOTO_RACE={HS,LIVE,config,route,routeLength:route.getTotalLength(),horseProgress:replay.progress,horseState:replay.state,pack:replay};
 const official=data.horses.slice().sort((a,b)=>(a.finish??99)-(b.finish??99));
 for(const h of official){const tr=document.createElement('tr');for(const value of [h.finish??'中止',h.no,h.name,h.jockey,h.finishSeconds===null?'—':clockText(h.finishSeconds)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}el('official-results').append(tr)}
 el('data-summary').textContent='全18頭／馬番マーカー '+data.extraction.observationCount.toLocaleString()+'点を保存。位置を読み取れた時刻の間を補間。生GPSデータの取得件数は0件。';
 el('live-scrub').max=replay.endTime;
 let lastHud=-1,renderReady=false;
 const caps=new Map(HS.map(h=>[h.no,jockeyCap(h,config)]));
 function draw(){
  const t=LIVE.clock,order=replay.positions(t).sort((a,b)=>b.p-a.p||(t===0?a.no-b.no:(a.officialFinish??99)-(b.officialFinish??99)));
  el('live-clock').textContent=clockText(t);el('live-scrub').value=t;
  el('seek-label').textContent=clockText(t)+' / '+clockText(replay.endTime);
  const remaining=Math.max(0,Math.round((1-order[0].p)*2200));el('live-distance').textContent=remaining?'残り'+remaining+'m':'ゴール通過';
  el('leaders').replaceChildren(...order.map(s=>{
   const h=HS[s.no-1],cap=caps.get(s.no),span=document.createElement('span');span.className='tracking-number'+(s.retired?' retired':'');
   span.style.setProperty('--cap',cap.hex);span.style.setProperty('--cap-text',cap.text);span.style.setProperty('--cap-outline',cap.outline);
   span.textContent=s.no;span.title=h.name+(s.retired?'（競走中止・位置不明）':'');span.dataset.no=s.no;return span;
  }));
  const first=HS[order[0].no-1],second=HS[order[1].no-1];
  el('race-commentary').textContent=t===0?'全18頭、スタート待機中':t>=data.winnerSeconds?'16番 メイショウタバルが1着。5番 クロワデュノール、1番 ダノンデサイル。':first.no+'番 '+first.name+'が先頭。'+second.no+'番 '+second.name+'が続く。';
  el('source-state').textContent=t<10?'発走直後は補間':t>=data.winnerSeconds?'公式着順を表示':'映像の位置を補間';
  const finished=t>=data.winnerSeconds;el('race').hidden=!finished;
  if(finished&&!el('race').childElementCount){
   for(const h of official.slice(0,3)){const card=document.createElement('div');card.className='place-card';for(const [cls,value] of [['place-rank',h.finish+'着'],['place-number',h.no],['place-name',h.name]]){const p=document.createElement('div');p.className=cls;p.textContent=value;card.append(p)}el('race').append(card)}
  }
 }
 function seek(t){LIVE.clock=Math.max(0,Math.min(replay.endTime,Number(t)||0));LIVE.visualTime=LIVE.clock;LIVE.playing=false;LIVE.last=0;el('live-status').textContent=LIVE.clock?'一時停止':'スタート待機';draw()}
 el('live-play').onclick=()=>{if(LIVE.clock>=replay.endTime)seek(0);LIVE.playing=true;LIVE.last=0;el('live-status').textContent='▶ リプレイ再生中'};
 el('live-pause').onclick=()=>{LIVE.playing=false;LIVE.last=0;el('live-status').textContent='一時停止';draw()};
 el('live-reset').onclick=()=>seek(0);el('live-finish').onclick=()=>seek(data.winnerSeconds+.7);
 el('live-scrub').oninput=e=>seek(e.target.value);
 function frame(now){
  if(LIVE.playing&&!document.hidden){
   const dt=LIVE.last?Math.min(.15,(now-LIVE.last)/1000):0,rate=Number(el('live-rate').value);
   LIVE.clock=Math.min(replay.endTime,LIVE.clock+dt*rate);LIVE.visualTime+=dt*(1+.13*Math.log2(rate));
   if(LIVE.clock>=replay.endTime){LIVE.playing=false;el('live-status').textContent='リプレイ終了'}
  }
  LIVE.last=now;
  if(now-lastHud>100){draw();lastHud=now}
  if(!renderReady&&window.KYOTO_RENDER_STATUS){
   if(window.KYOTO_RENDER_STATUS.ready){renderReady=true;el('replay-loading').hidden=true;el('live-status').textContent='スタート待機';for(const b of document.querySelectorAll('.transport button'))b.disabled=false;}
   else{fail(Error(window.KYOTO_RENDER_STATUS.reason));return}
  }
  requestAnimationFrame(frame);
 }
 document.addEventListener('visibilitychange',()=>{LIVE.last=0});
 window.TAKARAZUKA_REPLAY={seek,replay,snapshot:()=>({clock:LIVE.clock,playing:LIVE.playing,rank:LIVE.rank,states:replay.positions(LIVE.clock)})};
 draw();window.RACE_APP_READY=true;requestAnimationFrame(frame);
 await import('./renderer.js?v=takarazuka-3d-v1');
}catch(error){console.error(error);fail(error)}
