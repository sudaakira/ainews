import {raceCommentary,ANNOUNCER_SVG} from './tenno-commentary-2026.js';
import {playbackRate} from './race-playback.js?v=kyoto-v11-1';

/** Read-only race presentation, shared by WebGL and the SVG fallback.
 * The tracker and commentary are normal-flow rows OUTSIDE the clipped canvas.
 * No scores, progress, random numbers or sampled finish order are changed here. */
export function createRaceHUD({config,capFor}){
 const slot=document.getElementById('race-observation');
 const tracker=document.createElement('section');tracker.className='race-tracking';
 tracker.setAttribute('aria-label','隊列。左が先頭です');
 tracker.innerHTML='<div class="tracking-meta"><span id="tracking-caption">隊列・ゲート入り</span><span>← 先頭</span></div><div id="race-tracking-field" role="list" aria-label="全頭の現在の隊列"></div>';
 const field=tracker.querySelector('#race-tracking-field');
 field.style.setProperty('--race-field',String(config.horses.length));
 const markers=new Map(config.horses.map(h=>{
  const cap=capFor(h),b=document.createElement('b');b.className='tracking-number';
  b.style.background=cap.hex;b.style.color=cap.text;b.style.borderColor=cap.outline;
  b.textContent=String(h.no);b.title=h.no+' '+h.name;
  b.setAttribute('role','listitem');b.setAttribute('aria-label',h.no+' '+h.name);
  field.append(b);return [h.no,b];
 }));
 const panel=document.createElement('section');panel.id='race-commentary-panel';
 panel.setAttribute('aria-label','レース実況');panel.setAttribute('aria-live','off');
 panel.innerHTML='<div class="race-announcer" aria-hidden="true">'+ANNOUNCER_SVG+'</div><div class="race-speech"><p id="race-commentary-text"></p></div>';
 const result=document.getElementById('race');
 result.setAttribute('aria-label','仮想レースの確定着順');
 panel.querySelector('.race-speech').append(result);
 slot.replaceChildren(tracker,panel);
 const speech=panel.querySelector('#race-commentary-text'),caption=tracker.querySelector('#tracking-caption');
 const meters=document.getElementById('race-meters'),label=document.getElementById('race-meters-label');
 const speed=document.getElementById('race-speed-label');
 let spokenKey='',speechAt=-Infinity,previousClock=0,lastOrder='';
 function update({clock,progress,order,crossed,rate}){
  const remaining=Math.max(0,Math.ceil(config.distance*(1-Math.min(1,progress))/10)*10);
  meters.textContent=remaining?String(remaining):'GOAL';label.textContent=remaining?'m':'';
  speed.textContent=rate==='instant'?'即ゴール':playbackRate(Number(rate)||4,clock,Number(config.duration)||80)+'×';
  const key=order.map(h=>h.no).join(',');
  if(key!==lastOrder){order.forEach(h=>field.append(markers.get(h.no)));lastOrder=key;}
  for(const [no,marker]of markers)marker.classList.toggle('winner-number',crossed[0]===no);
  caption.textContent=clock>(Number(config.duration)||80)?'隊列・ゴール通過順':clock<=0?'隊列・ゲート入り':'現在の隊列';
  const call=raceCommentary({clock,progress,order,horses:config.horses,crossed,distance:config.distance,venue:config.venue,surface:config.surface});
  const now=performance.now(),seeked=Math.abs(clock-previousClock)>3||clock<previousClock;
  if(call.key!==spokenKey&&(now-speechAt>2100||call.tone==='winner'||seeked||clock===0)){
   speech.textContent=call.text;panel.dataset.tone=call.tone;spokenKey=call.key;speechAt=now;
  }
  if(crossed.length>=3){
   const winner=config.horses.find(h=>h.no===crossed[0]);
   const text=winner.name+'、1着でゴールイン！';
   if(speech.textContent!==text)speech.textContent=text;
  }
  previousClock=clock;
 }
 return Object.freeze({update});
}
