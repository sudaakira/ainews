/**
 * CINEMATIC RACE v1 — reusable real-time Three.js race direction.
 * This module is VISUAL ONLY: no probability, model, RNG seed or horseProgress writes.
 * All movement comes from the caller's existing race engine.
 * Designed for 3–18 entrants and mobile WebGL1/2.
 */
import {chooseRaceShot} from './race-shotlist.js?v=director-v5';

export function createRaceCinematics({THREE,scene,stage,models,config,capFor,path,route,routeLength}){
 const mobile=()=>window.innerWidth<700;
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const n=models.length,PI=Math.PI;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const vec=(p,side,forward,height)=>new THREE.Vector3(
  p.x+p.dz*side+p.dx*forward,p.y+height,p.z-p.dx*side+p.dz*forward);
 const c=(hex)=>new THREE.Color(hex);
 // Broad illustrated sunlight + contrast rim lighting for close-up shots.
 const key=new THREE.DirectionalLight(0xffe8ac,1.35);key.position.set(45,65,-75);scene.add(key);
 const fill=new THREE.DirectionalLight(0x91dfff,.65);fill.position.set(-95,36,40);scene.add(fill);
 scene.fog=new THREE.FogExp2(0xa9d4db,.0012);

 // A real 3D grandstand and crowd for generic course views. One
 // instanced crowd replaces hundreds of draw calls on iPhones.
 if(config.courseView!=='kyoto-1400-outer'){
  const stadium=new THREE.Group();stadium.position.set(-8,0,216);scene.add(stadium);
  const stadiumMat=new THREE.MeshLambertMaterial({color:0x607c94}),
        shade=new THREE.MeshLambertMaterial({color:0x203d57}),
        rail=new THREE.MeshLambertMaterial({color:0xe9e9db});
  function box(w,h,d,m,x,y,z){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
   mesh.position.set(x,y,z);stadium.add(mesh);return mesh;
  }
  box(205,3.2,54,stadiumMat,0,2,0);
  for(let row=0;row<7;row++){
   box(208,1.45,6,row%2?stadiumMat:shade,0,4.4+row*1.65,-17+row*5);
   box(205,.18,5,rail,0,5.1+row*1.65,-16+row*5);
  }
  box(218,2,72,shade,0,19.9,5);
  box(215,.45,71,rail,0,21.0,5);
  for(let i=-95;i<=95;i+=19)box(.7,16,.7,stadiumMat,i,12,31);
  const spectatorCount=mobile()?360:720;
  const spectators=new THREE.InstancedMesh(
   new THREE.SphereGeometry(.55,5,5),
   new THREE.MeshLambertMaterial({color:0xffffff}),spectatorCount);
  const dummy=new THREE.Object3D(),colours=[0xf5d26e,0xff796b,0x5fa7ee,0xf0f0ef,0x6bdebb,0xdba0df];
  for(let i=0;i<spectatorCount;i++){
   const row=i%7,slot=Math.floor(i/7),slots=Math.ceil(spectatorCount/7);
   dummy.position.set(-102+204*(slot+.5)/slots,5.45+row*1.65,-17+row*5);
   dummy.scale.set(.68,.78,.72);dummy.updateMatrix();spectators.setMatrixAt(i,dummy.matrix);
   spectators.setColorAt(i,c(colours[(i*17+row)%colours.length]));
  }
  spectators.instanceMatrix.needsUpdate=true;stadium.add(spectators);
  // Huge illuminated sign readable during sweeping TV shots.
  const label=document.createElement('canvas');label.width=1024;label.height=160;
  const g=label.getContext('2d');g.fillStyle='#0d293c';g.fillRect(0,0,1024,160);
  g.fillStyle='#e8ca88';g.font='bold 74px system-ui';g.textAlign='center';
  g.fillText((config.name||'RACE').slice(0,14)+'  •  CINEMATIC RACE',512,108);
  const tex=new THREE.CanvasTexture(label);tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(130,20),
   new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  sign.position.set(0,30,48);stadium.add(sign);
 }

 // Canvas-built light halo (original graphics; no downloaded textures).
 const haloCanvas=document.createElement('canvas');haloCanvas.width=128;haloCanvas.height=128;
 const h=haloCanvas.getContext('2d');const grd=h.createRadialGradient(64,64,5,64,64,62);
 grd.addColorStop(0,'rgba(255,255,230,.8)');grd.addColorStop(.28,'rgba(255,227,146,.34)');
 grd.addColorStop(1,'rgba(255,227,146,0)');
 h.fillStyle=grd;h.fillRect(0,0,128,128);
 const haloTex=new THREE.CanvasTexture(haloCanvas);
 const halos=models.map((model,i)=>{
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex,transparent:true,
   depthWrite:false,depthTest:false,opacity:0,blending:THREE.AdditiveBlending}));
  m.scale.set(5,5,1);m.position.set(0,2.6,-.7);model.root.add(m);return m;
 });

 // Surface grass chips are instanced, and never accumulate per frame.
 const perHorse=mobile()?5:9,total=n*perHorse;
 const chipGeom=new THREE.PlaneGeometry(.13,.29);
 const chips=new THREE.InstancedMesh(chipGeom,
  new THREE.MeshBasicMaterial({color:0xcee7a0,transparent:true,opacity:.66,
   depthWrite:false,side:THREE.DoubleSide}),total);
 chips.frustumCulled=false;scene.add(chips);
 const dummy=new THREE.Object3D();
 // Twelve luminous streaks make the final chase visually dramatic.
 const streaks=[];
 for(let i=0;i<12;i++){
  const m=new THREE.Mesh(new THREE.BoxGeometry(.035,.025,4+i%3*1.9),
   new THREE.MeshBasicMaterial({color:i%2?0xc7ffff:0xffecae,transparent:true,
    opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  scene.add(m);streaks.push(m);
 }

 const ui=document.createElement('div');ui.id='race-cinematic-overlay';
 ui.setAttribute('aria-live','off');ui.innerHTML=
  '<div class="cinema-letterbox cinema-top"></div>'+
  '<div class="cinema-letterbox cinema-bottom"></div>'+
  '<div class="cinema-speed-wash"></div><div class="cinema-focus-flare"></div>'+
  '<div class="cinema-phase"><span class="cinema-phase-kicker">CINEMATIC / VIRTUAL RACE</span>'+
  '<strong id="cinema-phase-title">START YOUR ENGINES</strong>'+
  '<span id="cinema-phase-sub">決戦のスタート</span></div>'+
  '<div class="cinema-duel" id="cinema-duel">'+
   '<span class="cinema-duel-label">FINAL SPRINT / 先頭争い</span>'+
   '<div class="cinema-duel-contenders" id="cinema-duel-contenders"></div></div>'+
  '<div class="cinema-finish" id="cinema-finish"><small>PHOTO FINISH · VIRTUAL RACE</small>'+
   '<strong class="cinema-finish-heading">確定着順 TOP 3</strong>'+
   '<div class="cinema-podium" id="cinema-podium"></div>'+
   '<span id="cinema-finish-caption">ゴール！</span></div>'+
  '<div class="cinema-confetti" aria-hidden="true">'+
    Array.from({length:24},(_,i)=>'<i style="--i:'+i+';--x:'+((i*37)%95+2)+'%;--h:'+(i%2?'#f5ce8c':'#a2eee1')+'"></i>').join('')+
  '</div>';
 // Overlay is pointer-events:none, so native replay/scrub controls work.
 stage.append(ui);
 // Always-on course locator: same SVG path and progress as the rendered horses.
 // It remains a labelled schematic, not a claimed surveyed Kyoto 3D map.
 const location=document.createElement('div');location.id='race-course-guide';
 location.setAttribute('aria-label','現在位置を示す模式コース図');
 const locTitle=document.createElement('strong');
 locTitle.textContent=(config.venue||'競馬場')+'・'+
   (config.venue==='京都'&&config.distance===2000?'内回り':'コース')+' 位置';
 const map=document.createElementNS('http://www.w3.org/2000/svg','svg');
 map.setAttribute('viewBox','0 0 860 555');map.setAttribute('aria-hidden','true');
 const mapPath=document.createElementNS('http://www.w3.org/2000/svg','path');
 mapPath.setAttribute('d',route?.getAttribute('d')||'');
 mapPath.setAttribute('fill','none');mapPath.setAttribute('stroke','#bad2dd');
 mapPath.setAttribute('stroke-width','24');mapPath.setAttribute('stroke-linecap','round');
 map.append(mapPath);
 const routeDot=document.createElementNS('http://www.w3.org/2000/svg','circle');
 routeDot.setAttribute('r','39');routeDot.setAttribute('fill','#efcf83');
 routeDot.setAttribute('stroke','#102a37');routeDot.setAttribute('stroke-width','10');
 map.append(routeDot);
 const locText=document.createElement('span');locText.id='race-course-position';
 locText.textContent='スタンド前・発走';
 const schematic=document.createElement('small');schematic.textContent='コース模式図';
 location.append(locTitle,map,locText,schematic);stage.append(location);
 const phaseTitle=ui.querySelector('#cinema-phase-title');
 const phaseKicker=ui.querySelector('.cinema-phase-kicker');
 const phaseSub=ui.querySelector('#cinema-phase-sub');
 const duel=ui.querySelector('#cinema-duel');
 const contenders=ui.querySelector('#cinema-duel-contenders');
 const finish=ui.querySelector('#cinema-finish');
 const podium=ui.querySelector('#cinema-podium');
 const finishCaption=ui.querySelector('#cinema-finish-caption');
 let lastPhase='',lastShot='',lastPair='',lastFinished=false,lastClock=-1;

 function phaseAt(p,clock){
  if(clock<=0)return ['gate','GATE IN','運命の発走'];
  if(p<.035)return ['break','BREAK AWAY','一斉にスタート！'];
  if(p<.40)return ['pursuit','FULL GALLOP','流れるような追走'];
  if(p<.70)return ['corner','THE CHASE','3〜4コーナーへ、馬群が動く'];
  if(p<.83)return ['attack','FINAL TURN','直線勝負、ここからだ！'];
  if(p<.965)return ['sprint','LAST 400','激しい先頭争い！'];
  if(p<1)return ['photo','TO THE LINE','最後の一完歩！'];
  return ['finish','PHOTO FINISH','仮想レース決着'];
 }
 function update({clock,progress,order,finishOrder,frameDt,camera,desired,look,rate}){
  const p=clamp(progress,0,1),lead=order[0],aspect=camera.aspect;
  const [phase,,subtitle]=phaseAt(p,clock);
  const shot=chooseRaceShot(p),cut=lastShot!==shot.id;
  if(phase!==lastPhase||cut){
   ui.dataset.phase=phase;ui.dataset.shot=shot.id;
   phaseKicker.textContent=shot.kicker;
   phaseTitle.textContent=shot.label;
   phaseSub.textContent=subtitle;
   lastPhase=phase;lastShot=shot.id;
  }
  const sprint=p>.80&&p<1&&!reduced();
  ui.classList.toggle('cinema-sprint',sprint);
  const needNames=p>.78;
  duel.classList.toggle('cinema-duel-visible',needNames&&p<1);
  if(needNames){
   const first=order[0],second=order[1],pair=first.no+'-'+second.no;
   if(pair!==lastPair){
    const item=(o)=>{
     const horse=config.horses[o.no-1],cap=capFor(horse);
     const badge='<b class="cinema-cap" style="background:'+cap.hex+';color:'+cap.text+';border-color:'+cap.outline+'">'+o.no+'</b>';
     return '<span class="cinema-horse">'+badge+'<strong>'+horse.name+'</strong></span>';
    };
    contenders.innerHTML=item(first)+'<span class="cinema-versus">VS</span>'+item(second);
    lastPair=pair;
   }
  }
  const finished=p>=1;
  const finishChanged=finished!==lastFinished;
  if(finishChanged){
   finish.classList.toggle('cinema-finish-visible',finished);
   ui.classList.toggle('cinema-victory',finished);
   lastFinished=finished;
  }
  if(finished&&(finishChanged||clock!==lastClock)){
   // Use the original simulator's definitive LIVE.rank — never derive a
   // potentially wrong finish from visually interpolated 3D positions.
   const placed=Array.isArray(finishOrder)&&finishOrder.length>=3
    ?finishOrder.slice(0,3):order.slice(0,3).map(o=>o.no);
   const medals=['🥇','🥈','🥉'];
   podium.replaceChildren(...placed.map((no,index)=>{
     const row=document.createElement('div');row.className='cinema-podium-row cinema-podium-'+(index+1);
     const horse=config.horses[no-1],cap=capFor(horse);
     const medal=document.createElement('span');medal.className='cinema-medal';medal.textContent=medals[index];
     const number=document.createElement('b');number.className='cinema-result-cap';
     number.style.background=cap.hex;number.style.color=cap.text;
     number.style.borderColor=cap.outline;number.textContent=String(no);
     const name=document.createElement('strong');name.textContent=horse.name;
     row.append(medal,number,name);return row;
   }));
   finishCaption.textContent='シミュレーション確定着順 · 実際のレース結果ではありません';
  }
  lastClock=clock;
  if(route&&routeLength){
   const d=config.direction==='左'?(1-p)*routeLength:p*routeLength;
   const pp=route.getPointAtLength(Math.max(0,Math.min(routeLength,d)));
   routeDot.setAttribute('cx',String(pp.x.toFixed(1)));
   routeDot.setAttribute('cy',String(pp.y.toFixed(1)));
  }
  const stageName=p<.14?'スタンド前・発走':p<.29?'1〜2コーナー':
   p<.55?'向正面':p<.80?'3〜4コーナー':p<1?'最後の直線':'ゴール';
  if(locText.textContent!==stageName)locText.textContent=stageName;
  // Storyboard: readable wide field -> warm character close-up -> tactical
  // wide -> last-400 duel. ~8 seconds at 16x means purposeful cuts rather
  // than a continuously swinging camera that obscures overtakes.
  const short=aspect<.83;
  const subject=shot.view==='field'?order[Math.min(3,order.length-1)]:
                shot.view==='pack'?order[Math.min(1,order.length-1)]:lead;
  const target=path(subject.p);
  const next=path(order[Math.min(1,order.length-1)].p);
  const focus=shot.view==='duel'?
    {x:target.x*.76+next.x*.24,y:target.y*.76+next.y*.24,
     z:target.z*.76+next.z*.24,dx:target.dx,dz:target.dz}:target;
  // Camera stays mostly in FRONT of the racing line with symmetric offsets.
  // Vertical phone shots have a modestly larger FOV, never a massive pan.
  const factor=short?.89:1;
  const side=shot.side*factor,height=shot.height,ahead=shot.ahead;
  desired.copy(vec(focus,side,ahead,height));
  look.copy(vec(focus,0,-.6,2.1));
  const targetFov=shot.fov+(short?3:0);
  const shake=sprint&&!reduced()?Math.min(.062,.018+(p-.8)*.18):0;
  if(shake){
   const t=clock*3.3;desired.x+=Math.sin(t*1.9)*shake;
   desired.y+=Math.sin(t*2.8)*shake*.38;
  }
  camera.fov=cut?targetFov:lerp(camera.fov,targetFov,clamp(frameDt*8,0,1));
  camera.updateProjectionMatrix();

  // Natural ground particles/hoof contact, driven by existing model poses.
  const isRunning=clock>.06&&p<1&&!reduced();
  let j=0;
  for(let i=0;i<n;i++){
   const obj=models[i].root;
   const forward=new THREE.Vector3(Math.sin(obj.rotation.y),0,Math.cos(obj.rotation.y));
   const sideVector=new THREE.Vector3(forward.z,0,-forward.x);
   for(let k=0;k<perHorse;k++,j++){
    const lifetime=(clock*1.25+i*.37+k/perHorse)%1;
    const sway=Math.sin((i+1)*17.13+k*41)*.65;
    const rear=1.1+lifetime*3.1,spread=sway*(.5+lifetime);
    dummy.position.copy(obj.position)
     .addScaledVector(forward,-rear)
     .addScaledVector(sideVector,spread);
    dummy.position.y=Math.max(.12,obj.position.y+.08+lifetime*(.8+((i+k)%4)*.1));
    dummy.rotation.set(-PI/2+lifetime*.55,(i+k)*1.25,0);
    const size=isRunning?(.5+lifetime*.9)*(1-lifetime):0.0001;
    dummy.scale.set(size,size,size);dummy.updateMatrix();
    chips.setMatrixAt(j,dummy.matrix);
   }
  }
  chips.instanceMatrix.needsUpdate=true;
  for(let i=0;i<streaks.length;i++){
   const m=streaks[i],h=order[i%2],root=models[h.no-1].root;
   const tangent=new THREE.Vector3(Math.sin(root.rotation.y),0,Math.cos(root.rotation.y));
   const sideways=new THREE.Vector3(tangent.z,0,-tangent.x);
   const phaseOffset=(clock*.35+i*.17)%1;
   m.position.copy(root.position).addScaledVector(tangent,-(3+phaseOffset*6))
    .addScaledVector(sideways,(i%6-2.5)*.38);
   m.position.y+=1.1+(i%3)*.54;m.rotation.set(0,root.rotation.y,0);
   m.material.opacity=sprint?.18+.2*(1-phaseOffset):0;
   m.scale.set(1,.7+(i%3)*.18,1);
  }
  halos.forEach((x,i)=>x.material.opacity=sprint&&order.slice(0,2).some(a=>a.no===i+1)?.10:0);
  window.RACE_CINEMATIC_DEBUG={shot:shot.id,progress:p,rate,cut,
   scriptedCuts:4,mode:'16x-geographic',position:stageName};
  return {cut,shot:shot.id};
 }
 return {update};
}
