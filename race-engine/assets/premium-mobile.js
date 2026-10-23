/* Retro race UI. Display-only: existing playback/model callbacks are retained. */
(() => {
 'use strict';
 const config=window.RACE_CONFIG,$=id=>document.getElementById(id);
 if(!config||!window.RACE_APP_READY)return;
 const live=$('live-sim'),head=document.querySelector('.live-head');
 const forecast=document.querySelector('main section.card'),details=$('horse-details');
 const settings=document.querySelector('.grid aside section.card'),studio=document.querySelector('.hero-race');
 if(!live||!head||!forecast||!details||!settings||!studio)return;
 document.body.classList.add('retro-race-ready');
 studio.id='race-studio';forecast.id='forecast-ranking';settings.id='prediction-settings';
 const note=live.querySelector('.live-note');
 note.title=note.textContent;note.textContent='仮想レース｜馬場は選択条件・再生時計は映像用';
 const nav=document.createElement('nav');nav.className='premium-nav';
 nav.setAttribute('aria-label','レース・予想・設定・全頭分析');
 nav.innerHTML='<a href="#race-studio" data-dest="race-studio" aria-current="page">レース</a>'+
  '<a href="#forecast-ranking" data-dest="forecast-ranking">予想</a>'+
  '<a href="#prediction-settings" data-dest="prediction-settings">設定</a>'+
  '<a href="#horse-details" data-dest="horse-details">全頭分析</a>';
 studio.insertAdjacentElement('afterend',nav);
 function activeTab(dest){for(const a of nav.querySelectorAll('a')){
  if(a.dataset.dest===dest)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 }}
 for(const a of nav.querySelectorAll('a'))a.addEventListener('click',event=>{
  event.preventDefault();const dest=a.dataset.dest,target=$(dest);
  if(dest==='horse-details')details.open=true;
  if(dest==='prediction-settings')settings.querySelector('.advanced-settings').open=true;
  target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  activeTab(dest);
 });
 if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{
   const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
   if(visible[0])activeTab(visible[0].target.id);
  },{threshold:[.12,.3],rootMargin:'0px 0px -45% 0px'});
  [studio,forecast,settings,details].forEach(e=>io.observe(e));
 }
 const readout=$('race-surface-mode');
 function updateGround(){
  const ground={good:'良',yielding:'稍重',soft:'重',heavy:'不良'}[$('ground-mode').value]||'馬場未設定';
  readout.textContent=config.surface+config.distance+'m　'+ground;
 }
 $('ground-mode').addEventListener('change',updateGround);
 $('race-scenario')?.addEventListener('change',updateGround);updateGround();
 const viewButton=document.createElement('button');viewButton.id='premium-focus-button';
 viewButton.type='button';viewButton.className='premium-focus';viewButton.textContent='全画面';
 viewButton.setAttribute('aria-pressed','false');viewButton.setAttribute('aria-label','レースを全画面で表示');
 head.append(viewButton);
 const outside=[...studio.parentElement.children].filter(e=>e!==studio);
 let priorInert=[];
 function focusMode(on){
  document.body.classList.toggle('premium-immersive',on);
  if(on){priorInert=outside.map(e=>e.inert);outside.forEach(e=>e.inert=true);}
  else outside.forEach((e,i)=>e.inert=priorInert[i]||false);
  viewButton.textContent=on?'戻る':'全画面';viewButton.setAttribute('aria-pressed',String(on));
  viewButton.setAttribute('aria-label',on?'全画面表示を閉じる':'レースを全画面で表示');
  window.dispatchEvent(new Event('resize'));viewButton.focus({preventScroll:true});
 }
 viewButton.addEventListener('click',()=>focusMode(!document.body.classList.contains('premium-immersive')));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('premium-immersive'))focusMode(false)});
 document.querySelector('.live-buttons')?.setAttribute('aria-label','レース再生コントロール');
 $('live-play').setAttribute('aria-label','仮想レースを再生');
 $('live-pause').setAttribute('aria-label','仮想レースを一時停止');
 $('live-reset').setAttribute('aria-label','新しい仮想レースを生成');
 $('live-scrub').setAttribute('aria-valuetext','仮想レースの再生位置');
 $('live-rate').setAttribute('aria-label','再生速度を選択');
})();
