import {raceCommentary,ANNOUNCER_SVG} from './race-commentary.js?v=announcer-transparent-v34';
/** Clean cel-racing broadcast. All positions and results are read from the shared engine. */
import {chooseRaceShot,courseShotCuts,raceCameraPose,followLockedCameraPose} from './race-shotlist.js?v=pack-v1-camera-v28';
import {finishCrossings,playbackRate} from './race-playback.js?v=kyoto-v11-1';

export function createRaceCinematics({THREE,scene,stage,models,config,capFor,path,route,routeLength}){
 const cuts=courseShotCuts(route,routeLength,config);
 const duration=Number(config.duration)||80;
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const ui=document.createElement('div');ui.id='race-cinematic-overlay';
 ui.setAttribute('aria-live','off');
 ui.innerHTML='<div class="cinema-phase"><span class="cinema-phase-kicker"></span><strong id="cinema-phase-title"></strong><span id="cinema-phase-sub"></span></div>'+
  '<div class="race-distance"><strong id="race-meters">'+config.distance+'</strong><span id="race-meters-label">m</span><small id="race-speed-label">4×</small></div>'+
  '<div class="cinema-finish" id="cinema-finish"><small>仮想レース結果</small><div class="cinema-podium" id="cinema-podium"></div></div>'+
  '<div id="race-arrival" aria-live="polite"></div>'+
  '<div class="race-tracking"><div class="tracking-meta"><span id="tracking-caption">スタート待機</span><span>← 先頭</span></div><div id="race-tracking-field"></div></div>';
 ui.insertAdjacentHTML('beforeend','<div id="race-commentary-panel"><div class="race-announcer">'+ANNOUNCER_SVG+'</div><div class="race-speech"><p id="race-commentary-text"></p></div></div>');
 stage.append(ui);
 const speech=ui.querySelector('#race-commentary-text'),speechPanel=ui.querySelector('#race-commentary-panel');
 let spokenKey='',speechAt=-Infinity,previousClock=0;
 const phaseTitle=ui.querySelector('#cinema-phase-title'),kicker=ui.querySelector('.cinema-phase-kicker');
 const subtitle=ui.querySelector('#cinema-phase-sub'),meters=ui.querySelector('#race-meters');
 const metersLabel=ui.querySelector('#race-meters-label'),speedLabel=ui.querySelector('#race-speed-label');
 const podium=ui.querySelector('#cinema-podium'),finish=ui.querySelector('#cinema-finish');
 const arrival=ui.querySelector('#race-arrival'),tracking=ui.querySelector('#race-tracking-field');
 const trackingCaption=ui.querySelector('#tracking-caption');
 const badge=(h,className)=>{
  const cap=capFor(h),b=document.createElement('b');b.className=className;
  b.style.background=cap.hex;b.style.color=cap.text;b.style.borderColor=cap.outline;
  b.textContent=String(h.no);b.title=h.no+' '+h.name;return b;
 };
 const markers=new Map(config.horses.map(h=>[h.no,badge(h,'tracking-number')]));
 for(const marker of markers.values())tracking.append(marker);
 const location=document.createElement('div');location.id='race-course-guide';
 location.setAttribute('aria-label','現在位置を示す模式コース図');
 const map=document.createElementNS('http://www.w3.org/2000/svg','svg');
 map.setAttribute('viewBox','0 0 860 555');map.setAttribute('aria-hidden','true');
 const mapPath=document.createElementNS('http://www.w3.org/2000/svg','path');
 mapPath.setAttribute('d',route.getAttribute('d'));mapPath.setAttribute('fill','none');
 mapPath.setAttribute('stroke','#ffffff');mapPath.setAttribute('stroke-width','27');
 mapPath.setAttribute('stroke-linecap','round');map.append(mapPath);
 const routeDot=document.createElementNS('http://www.w3.org/2000/svg','circle');
 routeDot.setAttribute('r','34');routeDot.setAttribute('fill','#ffd748');
 routeDot.setAttribute('stroke','#254b30');routeDot.setAttribute('stroke-width','10');map.append(routeDot);
 const locText=document.createElement('span');locText.id='race-course-position';
 const schematic=document.createElement('small');schematic.textContent='コース模式図';
 location.append(map,locText,schematic);stage.append(location);

 // Original simplified course furniture, soft colored grandstand and hedge rows.
 // Geometry belongs to this app; no game assets or logos are embedded.
 if(config.courseView!=='kyoto-1400-outer'){
  const stadium=new THREE.Group();stadium.position.set(-35,0,config.venue==='京都'&&[2000,3000].includes(config.distance)?path(1).z+105:150);scene.add(stadium);
  const material=c=>new THREE.MeshToonMaterial({color:c});
  const concrete=material(0xe8eee4),seat=material(0x92b6bb),glass=material(0x59939e),roof=material(0xf8f7e4);
  const box=(w,h,d,m,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.userData.cameraOccluder=true;stadium.add(mesh);};
  box(210,3,32,concrete,0,1.5,0);
  for(let row=0;row<5;row++){
   box(210,1.8,5,row%2?glass:seat,0,4+row*1.8,-12+row*5);
   box(211,.16,5,concrete,0,5+row*1.8,-12+row*5);
  }
  box(218,.6,39,roof,0,15,2);
  for(let x=-98;x<=98;x+=28)box(.65,11,.65,concrete,x,8.5,12);
  const crowd=new THREE.InstancedMesh(new THREE.SphereGeometry(.4,5,4),material(0xffffff),360);
  const dummy=new THREE.Object3D(),palette=[0xe8eee8,0xe59d74,0x8ea9d2,0xf3ce76,0xbb91ac];
  for(let i=0;i<360;i++){
   const row=i%5,col=Math.floor(i/5);
   dummy.position.set(-102+col*2.87,5.5+row*1.8,-12+row*5);
   dummy.scale.set(.65,.9,.65);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);
   crowd.setColorAt(i,new THREE.Color(palette[i%palette.length]));
  }
  stadium.add(crowd);
  const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),material(0x3b8052),90);
  for(let i=0;i<90;i++){
   const p=path(i/90),lane=19;
   dummy.position.set(p.x-p.dz*lane,p.y+.8,p.z+p.dx*lane);
   dummy.scale.set(1.5,.9,1.4);dummy.updateMatrix();hedge.setMatrixAt(i,dummy.matrix);
  }
  scene.add(hedge);
 }
 // A small amount of grass kicked up by the hooves, without luminous trails.
 const perHorse=3,chips=new THREE.InstancedMesh(new THREE.PlaneGeometry(.11,.20),
  new THREE.MeshBasicMaterial({color:0x93c15b,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}),models.length*perHorse);
 chips.frustumCulled=false;scene.add(chips);const dummy=new THREE.Object3D();
 let lastShot='',lastMode='',lastOrder='',lastResult='',lastCrossed=-1;
 let lockedRig=null,cameraRebases=0;
 function update({clock,progress,order,finishOrder,frameDt,camera,desired,look,rate}){
  const p=Math.max(0,Math.min(1,progress)),shot=chooseRaceShot(p,cuts);let cut=shot.id!==lastShot;
  if(cut){ui.dataset.shot=shot.id;kicker.textContent=shot.kicker;phaseTitle.textContent=(config.shotLabels?.[shot.id]||shot.label);lastShot=shot.id;}
  const crossed=finishCrossings(finishOrder,clock,duration),runningOut=clock>duration;
  ui.dataset.phase=clock<=0?'gate':runningOut?'run-out':shot.id;
  const remaining=Math.max(0,Math.ceil(config.distance*(1-p)/10)*10);
  meters.textContent=remaining?String(remaining):'GOAL';metersLabel.textContent=remaining?'m':'';
  speedLabel.textContent=document.getElementById('live-rate')?.value==='instant'?'即ゴール':playbackRate(rate,clock,duration)+'×'+(runningOut?' 走り抜け':'');
  subtitle.textContent=clock<=0?'まもなく発走':runningOut?'ゴール後も走り抜け':
   shot.id==='first-corner'?'1コーナーへ向けた位置どり':
   shot.id==='backstretch'?'向こう正面、真横から全馬の隊列を確認':
   shot.id==='fourth-turn'?'4コーナーで各馬が仕掛ける勝負所':
   shot.id==='finish'?'ゴール前の先頭争い':'スタート直後';
  const call=raceCommentary({clock,progress:p,order,horses:config.horses,crossed,distance:config.distance,venue:config.venue,surface:config.surface});
  // Hold each caption long enough to read, even at 16x. Finish/seek supersedes it.
  const now=performance.now(),seeked=Math.abs(clock-previousClock)>3||clock<previousClock;
  if(call.key!==spokenKey&&(now-speechAt>2100||call.tone==='winner'||seeked||clock===0)){
   speech.textContent=call.text;speechPanel.dataset.tone=call.tone;
   spokenKey=call.key;speechAt=now;
  }
  previousClock=clock;
  for(const [no,marker] of markers)marker.classList.toggle('winner-number',crossed[0]===no);
  const orderKey=order.map(x=>x.no).join(',');
  if(orderKey!==lastOrder){
   order.forEach(o=>tracking.append(markers.get(o.no)));lastOrder=orderKey;
  }
  trackingCaption.textContent=runningOut?'ゴール通過順':clock<=0?'ゲート入り':'現在の隊列';
  if(crossed.length!==lastCrossed){
   const place=Math.min(3,crossed.length),h=config.horses.find(h=>h.no===crossed[place-1]);
   arrival.textContent=h&&place<3?place+'着  '+h.no+' '+h.name:'';
   lastCrossed=crossed.length;
  }
  const finished=crossed.length>=3;
  finish.classList.toggle('cinema-finish-visible',finished);
  const resultKey=finished?finishOrder.slice(0,3).join(','):'';
  if(resultKey!==lastResult){
   podium.replaceChildren();
   if(finished)finishOrder.slice(0,3).forEach((no,i)=>{
    const h=config.horses.find(h=>h.no===no),row=document.createElement('div');row.className='cinema-podium-row cinema-podium-'+(i+1);
    const place=document.createElement('span');place.textContent=(i+1)+'着';
    const name=document.createElement('strong');name.textContent=h.name;
    row.append(place,badge(h,'cinema-result-cap'),name);podium.append(row);
   });
   lastResult=resultKey;
  }
  const d=config.direction==='左'?(1-p)*routeLength:p*routeLength;
  const at=route.getPointAtLength(d);
  routeDot.setAttribute('cx',String(at.x.toFixed(1)));routeDot.setAttribute('cy',String(at.y.toFixed(1)));
  locText.textContent=runningOut?'ゴール':shot.label;
  const buildTag=document.getElementById('race-engine-build');
  if(buildTag)buildTag.textContent='3D中継 v26｜現在のカット：'+shot.label+'｜'+(shot.id==='backstretch'?'真横・全頭追走':shot.id==='fourth-turn'?'前方斜め・捲り確認':'固定角度追走');
  // iPhone-first TV dolly: fixed-angle and fixed lens within each shot.
  // Only cut transitions, seek/replay, and aspect changes reset the rig.
  const gateMode=shot.id==='start'&&clock<=1.8?'gate':'running';
  const mustRebase=cut||seeked||!lockedRig||
   lockedRig.mode!==gateMode||Math.abs(lockedRig.aspect-camera.aspect)>.015;
  if(mustRebase){
   const base=raceCameraPose({shot,progress:p,order,path,aspect:camera.aspect,
    clock,direction:config.direction,distance:config.distance,venue:config.venue});
   lockedRig={pose:{...base,shotId:shot.id},startLeaderProgress:order[0].p,startLeaderLane:order[0].lane,
    mode:gateMode,aspect:camera.aspect};
   cameraRebases++;cut=true;lastMode=base.mode;
  }
  const pose=followLockedCameraPose(lockedRig,order,path,{
   distance:config.distance,venue:config.venue,direction:config.direction});
  desired.set(pose.position.x,pose.position.y,pose.position.z);
  look.set(pose.look.x,pose.look.y,pose.look.z);
  // Camera zoom and shift get the same framerate-independent damping as
  // position/look in renderer.js. No instantaneous optical jumps at 8x.
  let j=0;
  for(let i=0;i<models.length;i++)for(let k=0;k<perHorse;k++,j++){
   const root=models[i].root,t=(clock*.16+i*.37+k/perHorse)%1;
   dummy.position.copy(root.position);
   dummy.position.x-=Math.sin(root.rotation.y)*(1.2+t*2.4);
   dummy.position.z-=Math.cos(root.rotation.y)*(1.2+t*2.4);
   dummy.position.y+=.12+Math.sin(t*Math.PI)*.45;
   dummy.rotation.set(-Math.PI/2+t,(i+k)*1.7,0);
   const size=clock>.05&&!reduced()?(1-t)*.8:.0001;
   dummy.scale.setScalar(size);dummy.updateMatrix();chips.setMatrixAt(j,dummy.matrix);
  }
  chips.instanceMatrix.needsUpdate=true;
  window.RACE_CINEMATIC_DEBUG={shot:shot.id,progress:p,rate,cut,scriptedCuts:5,
   mode:'mobile-locked-rail-dolly-v19',cuts,position:shot.label,runOut:runningOut,crossed:crossed.length,
   cameraRebases,lockedDirection:true,lockedLens:true,
   sideOn:shot.ahead===0,pose};
  return {cut,shot:shot.id,fov:pose.fov,lensShiftX:pose.lensShiftX||0};
 }
 return {update};
}
