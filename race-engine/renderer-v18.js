/**
 * Renderer v18 — ground-up rebuild. Procedural horses (horse-v18),
 * phase-driven gait (gait-v18), a full 3D course (course-v18) and a
 * locked broadcast camera (camera-v18), on an ACES-lit scene with one
 * shadow cascade, adaptive quality for phones, and a slow-motion
 * finish replay after the goal. The v17 engine stays available via
 * ?engine=v17; this module is the default.
 *
 * Simulation, pack paths and finish order are read from the shared
 * engine exactly as before — presentation only.
 */
import {kyotoOuterPath,kyotoOuterHeight,KYOTO_OUTER_3000} from './assets/kyoto-outer-3000.js?v=pack-v1-smooth';
import {kyotoPath,kyotoHeight,KYOTO_INNER,kyotoOuterCourseOffset} from './assets/kyoto-course.js?v=pack-v1-smooth';
import {hanshinPath,hanshinHeight,HANSHIN_INNER_B} from './assets/hanshin-course.js?v=takarazuka-3d-v1';
import {tokyoPath,tokyoHeight,TOKYO_TURF} from './assets/tokyo-course.js';
import {jockeyCap} from './core/jockey-caps.js?v=cap-v1';
import {createRaceHorseV18,HORSE_V18} from './assets/horse-v18.js';
import {updateGallopV18} from './assets/gait-v18.js';
import {createBroadcastDirector} from './assets/camera-v18.js';
import {buildCourseV18,buildStartingGateV18} from './assets/course-v18.js';
import {playbackEnd} from './assets/race-playback.js';

(async()=>{
 const stage=document.getElementById('three-stage'),svg=document.getElementById('kyoto-map'),controls=document.getElementById('camera-controls');
 const status=document.getElementById('three-status');
 let THREE;
 const show3DFailure=(detail)=>{
  window.KYOTO_RENDER_STATUS={ready:false,reason:String(detail)};
  if(stage)stage.style.display='none';svg?.classList.remove('svg-hidden');
  const parent=document.querySelector('.live-screen');
  if(parent){
   let warning=document.getElementById('race-3d-warning');
   if(!warning){warning=document.createElement('div');warning.id='race-3d-warning';parent.append(warning)}
   warning.textContent='⚠ 3D映像を開始できません：'+String(detail)+'（2D代替表示）';
  }
  if(status)status.textContent='⚠ 3D起動不可：'+String(detail);
 };
 try{THREE=await import('./vendor/three.module.js?v=three-0.160.0')}
 catch(err){console.error('Local 3D library failed',err);show3DFailure(err?.message||err);return}
 try{
 const api=window.KYOTO_RACE;
 if(!api)throw Error('Race state unavailable');
 const {HS,LIVE,route,routeLength,horseProgress,horseState,config}=api;
 const CENTER=(HS.length+1)/2,distance=config.distance;
 const outer3000=config.courseView==='kyoto-3000-outer';
 const metricKyoto=outer3000||(config.venue==='京都'&&distance===2000&&config.surface==='芝');
 const metricHanshin=config.courseView==='hanshin-2200-inner-b';
 const metricTokyo=config.courseView==='tokyo-2400'||(config.venue==='東京'&&config.surface==='芝'&&[1400,1600,1800,2000,2400,3400].includes(distance));
 const metricTrack=metricKyoto||metricHanshin||metricTokyo;
 const courseProfile=metricHanshin?HANSHIN_INNER_B:outer3000?KYOTO_OUTER_3000:metricTokyo?{...TOKYO_TURF,distance}:KYOTO_INNER;
 const metricPath=metricHanshin?hanshinPath:outer3000?kyotoOuterPath:metricTokyo?(t=>tokyoPath(t,distance)):kyotoPath;
 const metricHeight=metricHanshin?hanshinHeight:outer3000?kyotoOuterHeight:metricTokyo?(t=>tokyoHeight(t,distance)):kyotoHeight;
 const capFor=h=>jockeyCap(h,config,horse=>window.SWAN_FACTORS.frame(horse));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x9dd8f0);
 scene.fog=new THREE.Fog(0xd7ecf3,220,1500);
 const camera=new THREE.PerspectiveCamera(50,1,.1,2200);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default',alpha:false,preserveDrawingBuffer:false});
 const basePixelRatio=Math.min(window.devicePixelRatio||1,window.innerWidth<800?1.2:1.8);
 renderer.setPixelRatio(basePixelRatio);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 stage.appendChild(renderer.domElement);
 const skyDome=new THREE.Mesh(new THREE.SphereGeometry(1750,24,12),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x74b9e6)},mid:{value:new THREE.Color(0xbfe3f2)},low:{value:new THREE.Color(0xe8f3e9)}},
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec3 vP;uniform vec3 top,mid,low;void main(){float h=normalize(vP).y;vec3 c=h>.12?mix(mid,top,smoothstep(.12,.65,h)):mix(low,mid,smoothstep(-.06,.12,h));gl_FragColor=vec4(c,1.0);}'}));
 scene.add(skyDome);
 scene.add(new THREE.HemisphereLight(0xffffff,0x627e45,1.8));
 const sun=new THREE.DirectionalLight(0xfff4da,2.4);sun.position.set(-80,130,50);
 sun.castShadow=true;
 const baseShadowSize=window.innerWidth<800?1024:2048;
 sun.shadow.mapSize.set(baseShadowSize,baseShadowSize);
 Object.assign(sun.shadow.camera,{left:-62,right:62,top:62,bottom:-62,near:20,far:340});
 sun.shadow.bias=-0.0004;sun.shadow.normalBias=.03;
 scene.add(sun);scene.add(sun.target);
 const mat=(c,rough=.83)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:0});
 const W=.245;
 function heightAt(t){
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  if(config.courseView==='tokyo-2000'){
   return 1.45*smooth((t-.40)/.13)-1.15*smooth((t-.62)/.14)+1.80*smooth((t-.84)/.13);
  }
  if(config.courseView!=='kyoto-1400-outer')return 0;
  let u=t<.28?0:t<.44?(t-.28)/.16:t<.72?1-(t-.44)/.28:0;
  return 4.3*(u*u*(3-2*u));
 }
 function path(t){
  if(metricTrack)return metricPath(t);
  const normalized=Math.max(0,Math.min(1,t));
  const sign=config.direction==='左'?-1:1;
  const d=(sign===-1?1-normalized:normalized)*routeLength;
  const p=route.getPointAtLength(d);
  const a=route.getPointAtLength(Math.max(0,d-2)),b=route.getPointAtLength(Math.min(routeLength,d+2));
  const dx=(b.x-a.x)*sign,dz=(b.y-a.y)*sign,l=Math.max(.01,Math.hypot(dx,dz));
  const runOut=Math.max(0,t-1)*routeLength*W;
  return {x:(p.x-430)*W+dx/l*runOut,z:(p.y-277)*W+dz/l*runOut,dx:dx/l,dz:dz/l,y:heightAt(normalized)};
 }
 const half=metricHanshin?courseProfile.width/2:metricKyoto?13.5:metricTokyo?courseProfile.width/2:12.8;
 const trackEnd=metricHanshin?1:(metricKyoto||metricTokyo)?courseProfile.lap/distance:1.22;
 const trackBegin=metricHanshin?courseProfile.startBeforeGoal/distance:0;
 const trackAt=u=>trackBegin+u*(trackEnd-trackBegin);
 function offsetPoint(t,lane,yOffset=0){const p=path(t);return new THREE.Vector3(p.x-p.dz*lane,p.y+yOffset,p.z+p.dx*lane)}
 // Full v18 course environment. A failure degrades to a backup stand
 // rather than an empty field (venue flag reports it honestly).
 let venueReady=false,course=null;
 try{
  course=buildCourseV18({THREE,scene,config,path,offsetPoint,half,mat,
   venueName:config.venue,metricKyoto:metricKyoto&&!outer3000,outer3000,hanshin:metricHanshin,metricTokyo,
   trackEnd,trackAt,
   hanshinSpurEnd:metricHanshin?(courseProfile.startBeforeGoal-courseProfile.straight)/distance:0,
   landmarksOn:metricKyoto,goalBoardOn:config.venue==='京都'&&config.surface==='芝'});
  venueReady=true;
 }catch(e){
  console.error('Course v18 build failed',e);
  const stand=new THREE.Mesh(new THREE.BoxGeometry(175,22,28),mat(0xb5d4dc));
  stand.position.set(-8,11,245);scene.add(stand);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(187,2,46),mat(0xf5f5ee));
  roof.position.set(-8,23,241);scene.add(roof);
 }
 const goalRig=course?.goalRig||null,goalBoard=course?.goalBoard||null;
 const kyotoLandmarks=course?.landmarks||null;
 // Procedural horses.
 const silkColors=['#d63e3e','#e8e4df','#2670db','#edc33a','#dd63a5','#4ebbb0','#c7c7c7','#f2932f','#7144bd','#bda144','#db5e32','#62b55c','#e4edf4','#9c78d7','#5b9bd1','#c5a07c','#d6dc45','#cb5171'];
 const models=[];
 let horseV18Ready=false;
 try{
  for(const h of HS){
   const frameCap=capFor(h);
   const model=createRaceHorseV18(THREE,scene,h,silkColors[h.no-1],frameCap.hex,frameCap.outline,frameCap.pattern||null,frameCap.secondary||'#FFFFFF');
   scene.add(model.root);scene.add(model.shadowGroup);
   models.push(model);
  }
  horseV18Ready=models.length===HS.length&&models.every(m=>m.artDirection==='procedural-thoroughbred-v18');
  if(!horseV18Ready)throw new Error('v18馬モデルと出走'+HS.length+'頭の整合性を確認できませんでした');
  for(const m of models)m.shadowDim=.5;
 }catch(e){
  console.error('Horse model v18 failed',e);
  if(status)status.textContent='⚠️ 新馬モデルの読込エラー：'+String(e?.message||e);
  throw e;
 }
 // Starting gate v18 with individual sprung doors.
 const startPoint=path(0),startDir={dx:startPoint.dx,dz:startPoint.dz};
 const gate=buildStartingGateV18({THREE,scene,config,HS,startPoint,startDir});
 const gateRoot=gate.root,stallCount=HS.length;
 const stallWidth=1.20;
 const director=createBroadcastDirector({THREE,scene,stage,models,config,path,route,routeLength});
 const cameraBlockers=[];scene.traverse(o=>{if(o.isMesh&&o.userData.cameraOccluder)cameraBlockers.push(o)});
 const visibilityRay=new THREE.Raycaster();
 if(controls)controls.style.display='none';
 document.querySelector('.camera-more')?.setAttribute('hidden','');
 stage.style.display='block';svg?.classList.add('svg-hidden');
 if(status)status.textContent='3D RACE · '+models.length+'頭';
 const versionEl=document.getElementById('horse-model-version');
 if(versionEl)versionEl.textContent='EQUINE v18 · PROCEDURAL GALLOP';
 // Adaptive quality: step pixel ratio and shadow resolution down
 // when the frame rate sags, back up when there is headroom.
 const qualityLevels=[
  {pixelRatio:basePixelRatio,shadow:baseShadowSize,castShadow:true},
  {pixelRatio:Math.min(basePixelRatio,1.25),shadow:1024,castShadow:true},
  {pixelRatio:1.0,shadow:512,castShadow:true},
  {pixelRatio:.85,shadow:0,castShadow:false}];
 let qualityLevel=0,fpsEma=60,lowTime=0,highTime=0,qualityCooldown=0;
 function applyQuality(level){
  qualityLevel=level;const q=qualityLevels[level];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,q.pixelRatio));
  if(cw&&ch)renderer.setSize(cw,ch,false);
  sun.castShadow=q.castShadow;
  if(q.shadow>0&&sun.shadow.mapSize.x!==q.shadow){
   sun.shadow.mapSize.set(q.shadow,q.shadow);
   if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}
  }
  if(window.KYOTO_RENDER_STATUS)window.KYOTO_RENDER_STATUS.qualityLevel=level;
 }
 window.KYOTO_RENDER_STATUS={ready:true,model:HORSE_V18.model,gait:HORSE_V18.gait,
  venue:venueReady?'full':'fallback',horses:models.length,
  camera:'broadcast-rail-dolly-v18',courseView:config.courseView,
  cinematic:true,saddleclothNames:true,goalBoard:!!goalBoard,gateDisappears:true,
  continuousRunOut:true,goalBoardSide:'far',
  furlongDigits:course?.furlongDigits||[],landmarks:kyotoLandmarks?.audit||null,
  tokyoVision:!!course?.tokyoVision,
  qualityLevel:0,engine:'v18'};
 // Post-goal slow replay (visual only; the simulation clock, result
 // DOM and standings are already final and never touched).
 const replayBadge=document.createElement('div');
 replayBadge.textContent='↺ SLOW REPLAY（タップでスキップ）';
 replayBadge.style.cssText='position:absolute;top:10px;right:10px;z-index:5;display:none;padding:6px 10px;border-radius:999px;background:rgba(16,24,20,.72);color:#fff;font:600 11px/1.2 sans-serif;letter-spacing:.08em';
 stage.appendChild(replayBadge);
 let replay=null,replayDone=false,replayVisual=0;
 let prevHoofWorld=null,prevGaitClock=0;
 stage.addEventListener('pointerdown',()=>{if(replay){replay=null;replayDone=true;replayBadge.style.display='none'}},true);
 let cw=0,ch=0;
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;if(w!==cw||h!==ch){cw=w;ch=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
 const look=new THREE.Vector3(),desired=new THREE.Vector3();
 let first=true,lastFrame=0,lastHud=0,lastCamClock=NaN;
 let lastDrawClock=NaN,lastDrawVisual=NaN,lastDrawW=0,lastDrawH=0,settledFrames=0,renderSerial=0;
 const smoothLook=new THREE.Vector3();
 let smoothFov=50,smoothLensShift=0,lastInfo={calls:0,triangles:0};
 let cutBlend=null;const blendPos=new THREE.Vector3(),blendLook=new THREE.Vector3();
 function animate(now){
  requestAnimationFrame(animate);
  if(document.hidden)return;
  resize();if(!LIVE.ready)return;
  const rawDt=lastFrame?Math.max(0,(now-lastFrame)/1000):1/60;
  const frameDt=lastFrame?Math.min(.12,rawDt):1/60;lastFrame=now;
  const clock=LIVE.clock;
  // Adaptive quality bookkeeping (playback only, real elapsed time).
  if(LIVE.playing&&rawDt>0){
   fpsEma=fpsEma*.94+(1/Math.max(rawDt,1/240))*.06;
   qualityCooldown-=rawDt;
   if(fpsEma<45&&qualityLevel<3){lowTime+=rawDt;highTime=0}else if(fpsEma>57&&qualityLevel>0){highTime+=rawDt;lowTime=0}else{lowTime=0;highTime=0}
   if(qualityCooldown<=0&&lowTime>1.5){applyQuality(qualityLevel+1);lowTime=0;qualityCooldown=1.2}
   else if(qualityCooldown<=0&&highTime>4){applyQuality(qualityLevel-1);highTime=0;qualityCooldown=1.2}
  }
  // Replay lifecycle: starts shortly after a finished race settles,
  // ends on completion or any interaction with the race controls.
  const endClock=playbackEnd(LIVE.duration,HS.length);
  if(clock<endClock-1&&replayDone){replayDone=false;replay=null;replayBadge.style.display='none'}
  if(replay){
   if(LIVE.playing||Math.abs(clock-endClock)>.01){replay=null;replayDone=true;replayBadge.style.display='none'}
  }else if(!replayDone&&!LIVE.playing&&clock>=endClock-.001&&LIVE.rank?.length){
   replay={t:LIVE.duration*.90,rate:Math.max(.6,.25*(+document.getElementById('live-rate')?.value||4)),delay:.9};
   replayVisual=LIVE.visualTime;
  }
  const replayActive=!!replay&&replay.delay<=0;
  if(replay&&replay.delay>0)replay.delay-=frameDt;
  const changed=clock!==lastDrawClock||LIVE.visualTime!==lastDrawVisual||cw!==lastDrawW||ch!==lastDrawH||replayActive;
  if(changed)settledFrames=0;
  if(!LIVE.playing&&!changed&&settledFrames>=2)return;
  const effClock=replayActive?replay.t:clock;
  const order=HS.map(h=>horseState(h.no,effClock))
   .sort((a,b)=>b.p-a.p||LIVE.rank.indexOf(a.no)-LIVE.rank.indexOf(b.no));
  if(now-lastHud>180&&!replayActive){
   lastHud=now;
   const raceProgress=Math.min(1,Math.max(0,clock/LIVE.duration));
   const remaining=Math.max(0,Math.round(distance*(1-(config.replay?order[0].p:raceProgress))/10)*10);
   const raceClock=Math.min(clock,LIVE.duration);
   document.getElementById('broadcast-clock').textContent=Math.floor(raceClock/60)+':'+(raceClock%60).toFixed(1).padStart(4,'0');
   document.getElementById('broadcast-distance').textContent=remaining?'残り '+remaining+'m':'ゴール通過';
   const angle=Math.PI*2*raceProgress+Math.PI;
   document.getElementById('broadcast-dot').setAttribute('cx',(105+81*Math.cos(angle)).toFixed(1));
   document.getElementById('broadcast-dot').setAttribute('cy',(39+21*Math.sin(angle)).toFixed(1));
   const top=HS[order[0].no-1],second=HS[order[1].no-1];
   document.getElementById('broadcast-leader').textContent=clock<=0?'スタート前':raceProgress>=1?'🏁 ゴール！':'先頭 '+top.no+'番 '+top.name;
   document.getElementById('broadcast-comment').textContent=clock<=0?config.venue+config.surface+distance+'m、まもなく発走！':raceProgress>=1?'上位3頭の着順をご確認ください':remaining<300?'直線勝負！ '+second.no+'番 '+second.name+' が追う！':second.no+'番 '+second.name+' が続きます';
  }
  for(let i=0;i<HS.length;i++){
   const h=HS[i],m=models[i],p=horseProgress(h.no,effClock),d=path(p);
   const motion=horseState(h.no,effClock),lane=motion.lane;
   const gateX=gateRoot.position.x+startDir.dz*(h.no-CENTER)*stallWidth;
   const gateZ=gateRoot.position.z-startDir.dx*(h.no-CENTER)*stallWidth;
   const staging=Math.max(0,1-Math.min(1,effClock/.8));
   m.root.position.set(
    (d.x-d.dz*lane)*(1-staging)+gateX*staging,
    d.y+.015,
    (d.z+d.dx*lane)*(1-staging)+gateZ*staging
   );
   m.root.visible=motion.visible!==false;
   m.root.scale.setScalar(1);
   m.root.rotation.y=Math.atan2(motion.dx,motion.dz);
   if(metricTrack){const slope=(metricHeight(p+.0005)-metricHeight(p-.0005))/(distance*.001);m.root.rotation.x=-Math.atan(slope)}
   m.shadowGroup.position.set(m.root.position.x,
    (metricTrack?metricHeight(p):heightAt(Math.min(1,p)))+.02,m.root.position.z);
   m.shadowGroup.rotation.y=m.root.rotation.y;
   const speedMps=motion.speed;
   const cornerLead=config.direction==='左'?'left':'right';
   const straightLead=cornerLead==='left'?'right':'left';
   const changeAt=Number.isFinite(h.leadChangeAt)?h.leadChangeAt:.82;
   const lead=p>=changeAt?straightLead:cornerLead;
   updateGallopV18(m,effClock,h.no,Math.min(1,effClock/LIVE.duration),{speedMps,lead});
  }
  // Non-overlap, enforced on body extents (user feedback): each
  // horse occupies an oriented plan-view rectangle of 2.30m (torso,
  // chest to pelvis) by 0.62m. A final separation pass just before
  // drawing pushes apart any pair whose rectangles intersect, along
  // the axis of least penetration (usually lateral), in up to five
  // relaxation rounds. pack-v1 already guarantees >=1.0m of corridor
  // clearance, so on pack-planned races this is a safety net; on
  // generic schematic courses (whose tight curves compress the pack
  // mapping) it does real work. The worst pairwise clearance is
  // audited every frame as minBodyClearance (negative would mean
  // visible interpenetration).
  const BODY_LEN=2.30,BODY_WID=.62;
  const rectOf=m=>({x:m.root.position.x,z:m.root.position.z,rot:m.root.rotation.y});
  const frameOf=r=>({fx:Math.sin(r.rot),fz:Math.cos(r.rot),lx:Math.cos(r.rot),lz:-Math.sin(r.rot)});
  const relIn=(P,Q)=>{
   const f=frameOf(P),dx=Q.x-P.x,dz=Q.z-P.z;
   return {long:dx*f.fx+dz*f.fz,lat:dx*f.lx+dz*f.lz,frame:f};
  };
  const rectClearance=(P,Q)=>{
   let worst=Infinity;
   for(const [A,B] of [[P,Q],[Q,P]]){
    const r=relIn(A,B),lg=Math.abs(r.long)-BODY_LEN,ag=Math.abs(r.lat)-BODY_WID;
    const c=(lg<0&&ag<0)?-Math.min(-lg,-ag):Math.hypot(Math.max(lg,0),Math.max(ag,0));
    if(c<worst)worst=c;
   }
   return worst;
  };
  const sepDeltas=models.map(()=>({x:0,z:0}));
  // Three relaxation rounds; each pair is tested in BOTH heading
  // frames (on tight schematic curves the headings differ enough
  // that an overlap can hide in one frame only), and a push is
  // applied for each frame that intersects.
  for(let round=0;round<5;round++){
   for(let i=0;i<models.length;i++)for(let j=i+1;j<models.length;j++){
    const A=rectOf(models[i]),B=rectOf(models[j]);
    A.x+=sepDeltas[i].x;A.z+=sepDeltas[i].z;B.x+=sepDeltas[j].x;B.z+=sepDeltas[j].z;
    for(const [P,Q,pi,pj] of [[A,B,i,j],[B,A,j,i]]){
     const r=relIn(P,Q);
     const lg=Math.abs(r.long)-BODY_LEN,ag=Math.abs(r.lat)-BODY_WID;
     if(lg<0&&ag<0){
      if(-ag<=-lg){
       const push=Math.min(.5,-ag/2),s=r.lat>=0?1:-1;
       sepDeltas[pi].x-=r.frame.lx*s*push;sepDeltas[pi].z-=r.frame.lz*s*push;
       sepDeltas[pj].x+=r.frame.lx*s*push;sepDeltas[pj].z+=r.frame.lz*s*push;
      }else{
       const push=Math.min(.5,-lg/2),s=r.long>=0?1:-1;
       sepDeltas[pi].x-=r.frame.fx*s*push;sepDeltas[pi].z-=r.frame.fz*s*push;
       sepDeltas[pj].x+=r.frame.fx*s*push;sepDeltas[pj].z+=r.frame.fz*s*push;
      }
     }
    }
   }
  }
  models.forEach((m,i)=>{
   const dl=sepDeltas[i];
   if(dl.x||dl.z){
    m.root.position.x+=dl.x;m.root.position.z+=dl.z;
    m.shadowGroup.position.x+=dl.x;m.shadowGroup.position.z+=dl.z;
   }
  });
  let minPairDistance=Infinity,minBodyClearance=Infinity;
  for(let i=0;i<models.length;i++)for(let j=i+1;j<models.length;j++){
   const a=models[i].root.position,b=models[j].root.position;
   minPairDistance=Math.min(minPairDistance,Math.hypot(b.x-a.x,b.z-a.z));
   minBodyClearance=Math.min(minBodyClearance,rectClearance(rectOf(models[i]),rectOf(models[j])));
  }
  // Measured planted-hoof ground-speed error (m/s per race second):
  // for every hoof in contact on both this and the previous frame,
  // how fast did it actually slide over the ground? The phase is
  // locked to race time, so this stays ~0 at any playback rate
  // (small residuals on curves, where the body yaws around the hoof,
  // and while the gate-staging blend settles). Sampled after the
  // first second so the staging blend is excluded.
  let gallopSlipError=null;
  {
   const dtRace=effClock-prevGaitClock;
   const cur=models.map(m=>{
    const cos=Math.cos(m.root.rotation.y),sin=Math.sin(m.root.rotation.y);
    return (m.gallopAudit?.hoofs||[]).map(h=>h.contact?{
     x:m.root.position.x+(h.hoofX*cos+h.hoofZ*sin),
     z:m.root.position.z+(-h.hoofX*sin+h.hoofZ*cos),contact:true}:{contact:false});
   });
   if(prevHoofWorld&&effClock>1&&dtRace>.0005&&dtRace<=.5){
    let maxErr=0,found=false;
    cur.forEach((hoofs,i)=>{
     // A lead change re-times the swapped legs mid-suspension; the
     // blend frames are excluded from the slip measurement. Pairs
     // whose phase advanced past one stance window are also
     // excluded: the hoof has legitimately lifted and re-planted a
     // full stride ahead (this only occurs at very low frame rates).
     if(models[i].gaitState?.change)return;
     if((models[i].gallopAudit?.cadence||0)*dtRace>.30)return;
     hoofs.forEach((h,k)=>{
      const prev=prevHoofWorld[i]?.[k];
      if(h.contact&&prev?.contact){
       const err=Math.hypot(h.x-prev.x,h.z-prev.z)/dtRace;
       if(err>maxErr)maxErr=err;found=true;
      }
     });
    });
    if(found)gallopSlipError=maxErr;
   }
   prevHoofWorld=cur;prevGaitClock=effClock;
  }
  gate.update(effClock);
  if(course)course.update(effClock,order);
  gateRoot.visible=effClock<=Math.min(6,LIVE.duration*.055);
  const raceProgress=Math.min(1,Math.max(0,clock/LIVE.duration));
  const rate=+document.getElementById('live-rate')?.value||4;
  let shotDirection;
  if(replayActive){
   // A lower, closer tracking angle than the finish shot, locked to
   // the leader so the finish fight fills the frame.
   const leadState=order[0],leadPoint=path(Math.min(1,leadState.p));
   const rp=offsetPoint(Math.min(1,leadState.p),-(half+8),2.6);
   desired.set(rp.x,rp.y,rp.z);
   look.set(leadPoint.x,leadPoint.y+1.5,leadPoint.z);
   shotDirection={cut:false,shot:'finish',fov:27,lensShiftX:0};
   if(window.RACE_CINEMATIC_DEBUG)window.RACE_CINEMATIC_DEBUG.replay=true;
   replayBadge.style.display='block';
   replay.t+=frameDt*replay.rate;
   replayVisual+=frameDt*replay.rate;
   if(replay.t>=LIVE.duration*1.02){replay=null;replayDone=true;replayBadge.style.display='none'}
  }else{
   replayBadge.style.display='none';
   shotDirection=director.update({clock,progress:raceProgress,order,finishOrder:LIVE.rank,frameDt,camera,desired,look,rate});
  }
  const clockJump=Number.isFinite(lastCamClock)&&
   (Math.abs(clock-lastCamClock)>Math.max(1.4,frameDt*rate*4)||clock<lastCamClock-.001);
  lastCamClock=clock;
  if(shotDirection?.cut&&!first&&!clockJump&&LIVE.playing&&!cutBlend){
   cutBlend={t:0,fromPos:camera.position.clone(),fromLook:smoothLook.clone(),fromFov:smoothFov,fromShift:smoothLensShift};
  }
  if(cutBlend){
   cutBlend.t+=frameDt;
   const u=Math.min(1,cutBlend.t/.38),e=u*u*(3-2*u);
   if(e>=1)cutBlend=null;
   else{
    blendPos.copy(desired);desired.lerpVectors(cutBlend.fromPos,blendPos,e);
    blendLook.copy(look);look.lerpVectors(cutBlend.fromLook,blendLook,e);
    shotDirection.fov=cutBlend.fromFov+(shotDirection.fov-cutBlend.fromFov)*e;
    shotDirection.lensShiftX=cutBlend.fromShift+(shotDirection.lensShiftX-cutBlend.fromShift)*e;
   }
  }
  const snap=first||clockJump||!LIVE.playing||replayActive;
  if(snap)cutBlend=null;
  const trackAlpha=1-Math.exp(-frameDt*(48+Math.min(16,rate)*2.5));
  const lensAlpha=1-Math.exp(-frameDt*(8+Math.min(16,rate)*.50));
  if(snap){
   camera.position.copy(desired);smoothLook.copy(look);
   smoothFov=shotDirection.fov;smoothLensShift=shotDirection.lensShiftX;
  }else{
   camera.position.lerp(desired,trackAlpha);
   smoothLook.lerp(look,trackAlpha);
   smoothFov+=(shotDirection.fov-smoothFov)*lensAlpha;
   smoothLensShift+=(shotDirection.lensShiftX-smoothLensShift)*lensAlpha;
  }
  first=false;
  camera.fov=smoothFov;
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[8]=smoothLensShift;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.lookAt(smoothLook);
  camera.updateMatrixWorld();
  sun.position.set(smoothLook.x-60,smoothLook.y+110,smoothLook.z+38);
  sun.target.position.copy(smoothLook);sun.target.updateMatrixWorld();
  skyDome.position.copy(camera.position);
  if(shotDirection?.shot==='start'||shotDirection?.shot==='third-turn'){
   let inside=0;const projected=new THREE.Vector3();
   for(const h of models){
    projected.set(0,2.0,0);h.root.localToWorld(projected);projected.project(camera);
    if(projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94)inside++;
   }
   window.RACE_CAMERA_AUDIT={opening:inside,total:models.length,shot:shotDirection?.shot};
  }
  let goalInFrame=false,goalScreen=null;
  if(goalRig){
   const pt=goalRig.localToWorld(new THREE.Vector3(0,6,0)).project(camera);
   goalScreen={x:+pt.x.toFixed(3),y:+pt.y.toFixed(3),z:+pt.z.toFixed(3)};
   goalInFrame=pt.z>-1&&pt.z<1&&Math.abs(pt.x)<.97&&Math.abs(pt.y)<.97;
  }
  scene.updateMatrixWorld(true);
  let leadersOccluded=0;
  for(const item of order.slice(0,3)){
   const target=models[item.no-1]?.root.position.clone().add(new THREE.Vector3(0,1.2,0));
   if(!target)continue;
   const ray=target.clone().sub(camera.position);
   visibilityRay.set(camera.position,ray.clone().normalize());visibilityRay.far=ray.length();
   if(visibilityRay.intersectObjects(cameraBlockers,false).length)leadersOccluded++;
  }
  const sight=camera.getWorldDirection(new THREE.Vector3());
  const goalDepth=goalRig?goalRig.position.clone().sub(camera.position).dot(sight):null;
  const farthestHorse=Math.max(...models.map(m=>m.root.position.clone().sub(camera.position).dot(sight)));
  const leaderVisual=models[order[0].no-1].root.localToWorld(new THREE.Vector3(0,1.85,0)).project(camera);
  const leaderNose=models[order[0].no-1].root.localToWorld(new THREE.Vector3(0,2.05,1.75)).project(camera);
  const leaderHoof=models[order[0].no-1].root.localToWorld(new THREE.Vector3(0,0,0)).project(camera);
  const leaderTop=models[order[0].no-1].root.localToWorld(new THREE.Vector3(0,2.7,0)).project(camera);
  const gateCenter=gateRoot.position.clone().add(new THREE.Vector3(0,2.15,0)).project(camera);
  const gateEdges=[];
  if(gateRoot.visible){
   for(const lateral of [-stallCount*.6-1.15,stallCount*.6+1.15])
    for(const heightAt of [.1,4.2])
     for(const forward of [-2.1,2.1]){
      const p=new THREE.Vector3(gateRoot.position.x+startDir.dz*lateral+startDir.dx*forward,
       gateRoot.position.y+heightAt,
       gateRoot.position.z-startDir.dx*lateral+startDir.dz*forward).project(camera);
      gateEdges.push((p.x+1)/2);
     }
  }
  window.RACE_SCENE_AUDIT={renderSerial:++renderSerial,
   gateMinScreenX:gateEdges.length?Math.min(...gateEdges):null,
   gateMaxScreenX:gateEdges.length?Math.max(...gateEdges):null,
   gateScreenX:(gateCenter.x+1)/2,
   leadScreenX:(leaderVisual.x+1)/2,leadScreenY:(1-leaderVisual.y)/2,
   leadNoseScreenX:(leaderNose.x+1)/2,leadNoseScreenY:(1-leaderNose.y)/2,
   leadScreenHeight:Math.abs(leaderTop.y-leaderHoof.y)/2,
   leadVisible:leaderVisual.z>-1&&leaderVisual.z<1&&Math.abs(leaderVisual.x)<1&&Math.abs(leaderVisual.y)<1,
   gateVisible:gateRoot.visible,
   goalBoardVisible:!!goalRig?.visible,goalInFrame,goalScreen,leadersOccluded,
   shot:shotDirection?.shot,goalSide:'far',
   runOut:clock>LIVE.duration,clock,visualTime:LIVE.visualTime,
   positions:models.map(m=>({x:m.root.position.x,y:m.root.position.y,z:m.root.position.z})),
   packVersion:api.pack.version,
   packStates:order.map(h=>({no:h.no,p:h.p,lane:h.lane,x:h.x,z:h.z,dx:h.dx,dz:h.dz,speed:h.speed})),
   course:metricTrack?courseProfile:null,
   cameraForwardDot:(camera.position.x-smoothLook.x)*path(1).dx+(camera.position.z-smoothLook.z)*path(1).dz,
   goalDepth,goalBehindHorses:goalDepth!==null&&goalDepth>farthestHorse,
   gallopPhase:models[0].gallopAudit?.phase,gallopLead:models[0].gallopAudit?.lead,
   gallopFlight:models[0].gallopAudit?.flight,gallopHoofs:models[0].gallopAudit?.hoofs,
   landmarkPondVisible:Boolean(kyotoLandmarks?.pond?.visible),
   landmarkTurfVisionVisible:Boolean(kyotoLandmarks?.turfVision?.visible),
   landmarkScreenWidth:kyotoLandmarks?.audit.visionScreenWidth||null,
   landmarkScreenPosition:kyotoLandmarks?(()=>{
    const pos=kyotoLandmarks.turfVision.position.clone().add(new THREE.Vector3(0,6.9,0)).project(camera);
    return {x:(pos.x+1)/2,y:(1-pos.y)/2,z:pos.z};
   })():null,
   cameraTrackingError:camera.position.distanceTo(desired)+smoothLook.distanceTo(look),
   cameraRenderedFov:smoothFov,cameraRenderedLensShift:smoothLensShift,
   cameraOuterRailClearance:window.RACE_CINEMATIC_DEBUG?.pose?.outerRailClearance,
   cameraOutsideLane:window.RACE_CINEMATIC_DEBUG?.pose?.cameraLane,
   cameraRailLane:window.RACE_CINEMATIC_DEBUG?.pose?.railLane,
   cameraLockedDirection:window.RACE_CINEMATIC_DEBUG?.lockedDirection===true,
   cameraRebases:window.RACE_CINEMATIC_DEBUG?.cameraRebases,
   cameraRenderedPosition:{x:camera.position.x,y:camera.position.y,z:camera.position.z},
   cameraRenderedBearing:(()=>{const v=smoothLook.clone().sub(camera.position).normalize();
    return {x:v.x,y:v.y,z:v.z}})(),
   drawCalls:lastInfo.calls,triangles:lastInfo.triangles,qualityLevel,replay:replayActive,
   gallopSlipError,
   minPairDistance:Number.isFinite(minPairDistance)?minPairDistance:null,
   minBodyClearance:Number.isFinite(minBodyClearance)?minBodyClearance:null};
  renderer.render(scene,camera);
  lastInfo={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  lastDrawClock=clock;lastDrawVisual=LIVE.visualTime;lastDrawW=cw;lastDrawH=ch;settledFrames++;
 }
 animate();
 }catch(err){
  console.error('3D renderer error',err);
  show3DFailure(err?.message||err);
  const versionEl=document.getElementById('horse-model-version');
  if(versionEl)versionEl.textContent='⚠ 3D INIT ERROR';
 }
})();
