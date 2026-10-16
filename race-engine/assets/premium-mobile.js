/* Premium responsive race presentation only. No calls to model or RNG. */
(() => {
  'use strict';
  const config=window.RACE_CONFIG;
  if(!config||!window.RACE_APP_READY)return;
  const $=id=>document.getElementById(id);
  const header=document.querySelector('header');
  const live=$('live-sim'),head=document.querySelector('.live-head');
  const forecast=document.querySelector('main section.card');
  const details=$('horse-details');
  const bars=$('bars');
  if(!header||!live||!head||!forecast||!details||!bars)return;
  document.body.classList.add('premium-mobile-ready');
  live.classList.add('premium-view-focus');
  document.querySelector('.hero-race')?.setAttribute('id','race-studio');
  forecast.id='forecast-ranking';

  // Use UI values already produced by the existing 14-factor engine, not a
  // second calculation. Updates after every real recomputation.
  const chips=document.createElement('div');
  chips.className='premium-header-meta';
  function chip(label,kind){
    const node=document.createElement('span');
    node.className='premium-meta-chip'+(kind?' premium-meta-chip--'+kind:'');
    node.textContent=label;
    chips.append(node);
  }
  chip(config.grade||'RACE SIM');
  chip(config.venue+' '+config.raceNumber+'R');
  chip(config.surface+config.distance+'m');
  chip(config.horses.length+'頭');
  chip(config.provisionalDraw?'枠順未確定':'枠順確定','live');
  header.append(chips);

  const preview=document.createElement('div');
  preview.className='premium-hero-summary';
  const summaryLeft=document.createElement('div');
  const eyebrow=document.createElement('span');
  eyebrow.className='premium-summary-eyebrow';eyebrow.textContent='MODEL LEADER · 予想評価';
  const name=document.createElement('div');
  name.className='premium-summary-name';name.textContent='モデル計算結果を読み込み中';
  const sub=document.createElement('div');
  sub.className='premium-summary-sub';sub.textContent='最新のモデル3着内率順を表示';
  const rate=document.createElement('div');
  rate.className='premium-summary-rate';rate.textContent='—';
  const rateNote=document.createElement('small');rateNote.textContent='モデル3着内率';rate.append(rateNote);
  summaryLeft.append(eyebrow,name,sub);
  preview.append(summaryLeft,rate);
  header.append(preview);

  function updatePreview(){
    const rows=bars.querySelectorAll('.bar');
    if(!rows.length)return;
    const leader=rows[0],label=leader.querySelector('.horse-label');
    name.textContent=label?.textContent||leader.querySelector('.n')?.textContent?.trim()||'—';
    sub.textContent='全'+config.horses.length+'頭｜14項目の条件回帰評価｜未校正モデル';
    const val=leader.querySelector('.val b')?.textContent;
    if(val){
      if(rate.firstChild?.nodeType===3)rate.firstChild.textContent=val;
      else rate.prepend(document.createTextNode(val));
    }
  }
  const observer=new MutationObserver(updatePreview);
  observer.observe(bars,{childList:true,subtree:false});
  updatePreview();

  const nav=document.createElement('nav');
  nav.className='premium-nav';
  nav.setAttribute('aria-label','ページ内ナビゲーション');
  nav.innerHTML=
    '<a href="#race-studio" data-dest="race-studio" aria-current="page"><span aria-hidden="true">▶</span> 3Dレース</a>'+
    '<a href="#forecast-ranking" data-dest="forecast-ranking"><span aria-hidden="true">▥</span> 予想順位</a>'+
    '<a href="#horse-details" data-dest="horse-details"><span aria-hidden="true">◇</span> 全頭分析</a>';
  header.insertAdjacentElement('afterend',nav);
  function activeTab(dest){
    nav.querySelectorAll('a').forEach(a=>{
      if(a.dataset.dest===dest)a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
  }
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',event=>{
    event.preventDefault();
    const target=$(a.dataset.dest);
    if(a.dataset.dest==='horse-details')details.open=true;
    if(!target)return;
    target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    activeTab(a.dataset.dest);
  }));
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
      if(visible[0])activeTab(visible[0].target.id);
    },{threshold:[0,.12,.25],rootMargin:'-90px 0px -55% 0px'});
    [document.getElementById('race-studio'),forecast,details].forEach(e=>e&&io.observe(e));
  }

  const viewButton=document.createElement('button');
  viewButton.id='premium-focus-button';
  viewButton.className='premium-focus';
  viewButton.type='button';
  viewButton.setAttribute('aria-pressed','false');
  viewButton.setAttribute('aria-label','3Dレース映像を集中表示');
  viewButton.textContent='⛶ 集中表示';
  head.append(viewButton);

  function focusMode(on){
    document.body.classList.toggle('premium-immersive',on);
    viewButton.textContent=on?'✕ 戻る':'⛶ 集中表示';
    viewButton.setAttribute('aria-pressed',String(on));
    viewButton.setAttribute('aria-label',on?'集中表示を閉じる':'3Dレース映像を集中表示');
    window.dispatchEvent(new Event('resize'));
    if(on)live.scrollTop=0;
  }
  viewButton.addEventListener('click',()=>focusMode(!document.body.classList.contains('premium-immersive')));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.body.classList.contains('premium-immersive'))focusMode(false);
  });

  const cameraOrder=['follow','wide','horse','gate','finish','2d'];
  const cameraLabels={follow:'追走',wide:'全景',horse:'馬アップ',gate:'ゲート',finish:'ゴール', '2d':'2D'};
  const camera=document.createElement('button');
  camera.id='premium-camera-cycle';
  camera.className='premium-focus';
  camera.type='button';
  camera.textContent='▣ カメラ切替';
  camera.setAttribute('aria-label','レースカメラの視点を切り替え');
  head.append(camera);
  camera.addEventListener('click',()=>{
    const cams=Array.from(document.querySelectorAll('#camera-controls [data-camera]'));
    const usable=cameraOrder.filter(mode=>{
      const b=cams.find(x=>x.dataset.camera===mode);
      return b&&b.style.display!=='none';
    });
    if(!usable.length)return;
    const active=cams.find(x=>x.classList.contains('cam-active'))?.dataset.camera||'follow';
    const next=usable[(usable.indexOf(active)+1)%usable.length];
    const button=cams.find(b=>b.dataset.camera===next);
    if(button){button.click();camera.textContent='▣ '+cameraLabels[next];}
  });

  // Enhance existing live controls; never replace their model callbacks.
  const controls=document.querySelector('.live-buttons');
  controls?.setAttribute('aria-label','レース再生コントロール');
  const play=$('live-play'),pause=$('live-pause'),reset=$('live-reset');
  play?.setAttribute('aria-label','仮想レースを再生');
  pause?.setAttribute('aria-label','仮想レースを一時停止');
  reset?.setAttribute('aria-label','新しい仮想レースを生成');
  const scrub=$('live-scrub');
  scrub?.setAttribute('aria-valuetext','仮想レースの再生位置');
  const speed=$('live-rate');
  speed?.setAttribute('aria-label','再生速度を選択');
})();
