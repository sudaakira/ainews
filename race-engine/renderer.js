import {kyotoPath,kyotoHeight,KYOTO_INNER,runnerLane,kyotoOuterCourseOffset} from './assets/kyoto-course.js?v=kyoto-v12';

/* True WebGL 3D horses and racecourse. CDN failure retains the self-contained SVG view. */
import {jockeyCap} from './core/jockey-caps.js?v=cap-v1';
(async()=>{
 const stage=document.getElementById('three-stage'),svg=document.getElementById('kyoto-map'),controls=document.getElementById('camera-controls');
 const status=document.getElementById('three-status');
 let THREE;
 const show3DFailure=(detail)=>{
  window.KYOTO_RENDER_STATUS={ready:false,reason:String(detail)};
  stage.style.display='none';svg.classList.remove('svg-hidden');
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
 const {HS,LIVE,route,routeLength,horseProgress,config}=api;const CENTER=(HS.length+1)/2;const distance=config.distance;
 const metricKyoto=config.venue==='京都'&&distance===2000&&config.surface==='芝';
 const capFor=h=>jockeyCap(h,config,horse=>window.SWAN_FACTORS.frame(horse));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x9dd8f0);scene.fog=new THREE.FogExp2(0xc5e7ef,.00055);
 const camera=new THREE.PerspectiveCamera(50,1,.1,2200);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default',alpha:false,preserveDrawingBuffer:false});
 // Fewer GPU pixels on phones preserve frame rate when all up to 18 animated horses are visible.
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<800?1.2:1.8)); // Restore sharp full-resolution 3D.
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.NoToneMapping;
 renderer.toneMappingExposure=1.05;
 stage.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x627e45,1.65));
 const sun=new THREE.DirectionalLight(0xfff4da,2.0);sun.position.set(-80,130,50);scene.add(sun);
 const mat=(c,rough=.83)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:0});
 // Wait for venue geometry before the first render; do not silently show the old empty turf.
 let venueReady=false;
 try{
  if(config.courseView==='kyoto-1400-outer'){
   const venue=await import("./assets/kyoto-scenery.js?v=shared-v1");
   venue.buildScenery(THREE,scene,mat);
  }else if(!metricKyoto){
   // Stylized generic scenery; not a mapped reproduction of any track.
   const stand=new THREE.Mesh(new THREE.BoxGeometry(165,16,24),mat(0xc4d9df));
   stand.position.set(-10,8,240);scene.add(stand);
   const roof=new THREE.Mesh(new THREE.BoxGeometry(173,1.4,30),mat(0xe7f1ef));
   roof.position.set(-10,17,240);scene.add(roof);
  }
  venueReady=true;
 }catch(e){
  console.error("Kyoto venue geometry failed to load",e);
  // Always-visible backup grandstand when the scenery module is unavailable.
  const stand=new THREE.Mesh(new THREE.BoxGeometry(175,22,28),mat(0xb5d4dc));
  stand.position.set(-8,11,245);scene.add(stand);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(187,2,46),mat(0xf5f5ee));
  roof.position.set(-8,23,241);scene.add(roof);
 }
 // Procedural natural grass: deterministic blade/soil grain and mowing bands, no external image requests.
 function grassTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=512;
  const g=c.getContext('2d');let seed=1357911;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  g.fillStyle='#64a844';g.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=64){
   g.fillStyle=((y/64)%2===0)?'rgba(18,50,16,.14)':'rgba(162,197,105,.11)';
   g.fillRect(0,y,512,64);
  }
  for(let i=0;i<6000;i++){
   const x=rand()*512,y=rand()*512;
   const light=rand()>.49;
   g.fillStyle=light?'rgba(190,217,117,.18)':'rgba(24,75,32,.19)';
   g.fillRect(x,y,.7+rand()*2,.6+rand()*2);
  }
  for(let i=0;i<1800;i++){
   const x=rand()*512,y=rand()*512,len=1.5+rand()*5;
   g.strokeStyle=rand()>.53?'rgba(199,226,134,.37)':'rgba(24,91,37,.34)';
   g.lineWidth=.45+rand()*.65;
   g.beginPath();g.moveTo(x,y);g.lineTo(x+(rand()-.5)*2,y-len);g.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return t;
 }
 const grassMap=grassTexture();
 const turf=new THREE.MeshStandardMaterial({map:grassMap,color:0xd7efba,roughness:.98,side:THREE.DoubleSide});
 const turfAlt=turf,white=mat(0xf1f2e8),darkRail=mat(0xcad8d2),soil=mat(0x786748);
 const lawnMap=grassMap.clone();lawnMap.needsUpdate=true;lawnMap.repeat.set(14,10);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1600,1300),new THREE.MeshStandardMaterial({map:lawnMap,color:0xa9cd87,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.32;scene.add(ground);
 const W=.245;
 function heightAt(t){
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  if(config.courseView==='tokyo-2000'){
   // Approximate schematic elevations: gentle 3C ascent, back turn descent,
   // then the last-straight 2.1m climb. NOT surveyed course geometry.
   return 1.45*smooth((t-.40)/.13)-1.15*smooth((t-.62)/.14)+1.80*smooth((t-.84)/.13);
  }
  if(config.courseView!=='kyoto-1400-outer')return 0;
  let u=t<.28?0:t<.44?(t-.28)/.16:t<.72?1-(t-.44)/.28:0;
  return 4.3*(u*u*(3-2*u));
 }
 function path(t){
  if(metricKyoto)return kyotoPath(t);
  const normalized=Math.max(0,Math.min(1,t));
  const sign=config.direction==='左'?-1:1;
  const d=(sign===-1?1-normalized:normalized)*routeLength;
  const p=route.getPointAtLength(d);
  const a=route.getPointAtLength(Math.max(0,d-2)),b=route.getPointAtLength(Math.min(routeLength,d+2));
  const dx=(b.x-a.x)*sign,dz=(b.y-a.y)*sign,l=Math.max(.01,Math.hypot(dx,dz));
  const runOut=Math.max(0,t-1)*routeLength*W;
  return {x:(p.x-430)*W+dx/l*runOut,z:(p.y-277)*W+dz/l*runOut,dx:dx/l,dz:dz/l,y:heightAt(normalized)};
 }
 const count=800,half=metricKyoto?13.5:12.8,trackEnd=metricKyoto?KYOTO_INNER.lap/2000:1.22;
 function offsetPoint(t,lane,yOffset=0){let p=path(t);return new THREE.Vector3(p.x-p.dz*lane,p.y+yOffset,p.z+p.dx*lane)}
 const verts=[],norm=[],uv=[],idx=[];
 for(let i=0;i<=count;i++){let t=i/count*trackEnd;for(let side of [-1,1]){let p=offsetPoint(t,side*half,.015);verts.push(p.x,p.y,p.z);uv.push(side===-1?0:1,t*20)}}
 for(let i=0;i<count;i++){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}
 let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
 const track=new THREE.Mesh(geo,turfAlt);track.material.side=THREE.DoubleSide;scene.add(track);
 // Kyoto's inner/outer split, infield dirt circuit and backstretch chute.
 // The hill is a graded surface, not a floating strip over a flat lawn.
 if(metricKyoto){
  const ribbon=(laneAt,width,material,heightScale=1)=>{
   const v=[],uv=[],ix=[];
   for(let i=0;i<=800;i++){const t=i/800*trackEnd;for(const side of [-1,1]){
    const q=offsetPoint(t,laneAt(t)+side*width/2,0);q.y=q.y*heightScale-.045;
    v.push(q.x,q.y,q.z);uv.push(side===-1?0:1,i/20);
   }}
   for(let i=0;i<800;i++){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2)}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();scene.add(new THREE.Mesh(g,material));
  };
  ribbon(()=>0,75,turf);
  ribbon(()=>40,22,new THREE.MeshLambertMaterial({color:0xc5a77d,side:THREE.DoubleSide}),.96);
  // Outer bend separates from the inner at 3C and rejoins at 4C.
  const outer=kyotoOuterCourseOffset;
  ribbon(outer,27,turf);
  const outerPts=[];for(let i=0;i<=500;i++){const t=i/500*trackEnd;outerPts.push(offsetPoint(t,outer(t)-14,.9))}
  const curve=new THREE.CatmullRomCurve3(outerPts),rail=new THREE.Mesh(new THREE.TubeGeometry(curve,1000,.08,5),white);scene.add(rail);
  const chute=path(.46),v=new THREE.Vector3(chute.dx,0,chute.dz),center=new THREE.Vector3(chute.x,chute.y,chute.z).addScaledVector(v,-220);
  const spur=new THREE.Mesh(new THREE.PlaneGeometry(27,440),turf);spur.rotation.set(-Math.PI/2,0,-Math.atan2(chute.dx,chute.dz));spur.position.copy(center);spur.position.y=-.06;scene.add(spur);
  const lake=new THREE.Mesh(new THREE.CircleGeometry(1,60),new THREE.MeshStandardMaterial({color:0x638f9b,roughness:.26}));lake.rotation.x=-Math.PI/2;lake.position.set(-10,-.15,0);lake.scale.set(95,43,1);scene.add(lake);
 }
 // Sparse actual 3D grass tufts on the turf, instanced in one draw call for mobile performance.
 const bladeGeo=new THREE.BufferGeometry();
 bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,0,.23,0],3));
 bladeGeo.computeVertexNormals();
 const bladeMat=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
 const bladeCount=1250,blades=new THREE.InstancedMesh(bladeGeo,bladeMat,bladeCount);
 const dummyBlade=new THREE.Object3D();
 let bladeSeed=8675309;
 const bladeRand=()=>{bladeSeed=(Math.imul(bladeSeed,1664525)+1013904223)>>>0;return bladeSeed/4294967296};
 for(let i=0;i<bladeCount;i++){
  const t=(i+bladeRand())/bladeCount,lane=(bladeRand()-.5)*24.4;
  const q=offsetPoint(t,lane,.06);
  dummyBlade.position.copy(q);dummyBlade.rotation.set(0,bladeRand()*Math.PI*2,0);
  const scale=.45+bladeRand()*.65;dummyBlade.scale.set(scale,scale,scale);dummyBlade.updateMatrix();
  blades.setMatrixAt(i,dummyBlade.matrix);
  blades.setColorAt(i,new THREE.Color().setHSL(.27+bladeRand()*.055,.32+bladeRand()*.22,.30+bladeRand()*.17));
 }
 blades.instanceMatrix.needsUpdate=true;scene.add(blades);
 function tube(points,r,color){let curve=new THREE.CatmullRomCurve3(points);let mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*2),r,5,false),color);scene.add(mesh);return mesh}
 for(let lane of [-half-.8,half+.8]){
  let pts=[];for(let i=0;i<=count;i++)pts.push(offsetPoint(i/count*trackEnd,lane,.75));
  tube(pts,.10,white);
  for(let i=0;i<=count;i+=9){let p=offsetPoint(i/count*trackEnd,lane,.1);let post=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.8,6),darkRail);post.position.copy(p).add(new THREE.Vector3(0,.33,0));scene.add(post)}
 }
 for(let lane of []){
  let pts=[];for(let i=0;i<=count;i++)pts.push(offsetPoint(i/count,lane,.035));
  tube(pts,.025,mat(0xb5d59c));
 }
 function box(w,h,d,material,parent,x,y,z){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m}
 const silkColors=['#d63e3e','#e8e4df','#2670db','#edc33a','#dd63a5','#4ebbb0','#c7c7c7','#f2932f','#7144bd','#bda144','#db5e32','#62b55c','#e4edf4','#9c78d7','#5b9bd1','#c5a07c','#d6dc45','#cb5171'];
 const {updateGallop}=await import("./assets/chibi-gallop.js?v=skin-v16");
 const models=[];
 let horseV3Ready=false,modelError='';
 try{
  const horseV3=await import("./assets/horse-anime.js?v=skin-v16");
  await horseV3.preloadRaceHorse(THREE);
  for(const h of HS){
   const frameCap=capFor(h);
   models.push(horseV3.createRaceHorse(THREE,scene,h,silkColors[h.no-1],frameCap.hex,frameCap.outline,frameCap.pattern||null,frameCap.secondary||'#FFFFFF'));
  }
  horseV3Ready=models.length===HS.length&&models.every(m=>m.artDirection==='skinned-thoroughbred-v16');
  if(!horseV3Ready)throw new Error('アニメ馬モデルと出走'+HS.length+'頭の整合性を確認できませんでした');
 }catch(e){
  modelError=String(e?.stack||e);
  console.error("Horse model loading failed",e);
  status.textContent='⚠️ 新馬モデルの読込エラー：'+String(e?.message||e);
  // Do not silently replace the redesigned horses with the old geometry.
  throw e;
 }
 // Full variable-stall starting gate, visible at the start and opening as the race begins.
 const start=offsetPoint(0,0,.1),end=offsetPoint(1,0,.1);
 const gateRoot=new THREE.Group();gateRoot.position.copy(start);
 const startDir=path(0);
 // Keep the physical variable-stall gate behind the start line so the horses leave it in view.
 gateRoot.position.x-=startDir.dx*3.7;
 gateRoot.position.z-=startDir.dz*3.7;
 gateRoot.rotation.y=Math.atan2(startDir.dx,startDir.dz);scene.add(gateRoot);
 const gateSteel=mat(0x347f79),gateWhite=mat(0xf4f6ee),gateDark=mat(0x1c514e),gateYellow=mat(0xf8d54f),gateNumberMat=mat(0x253b45);
 const stallWidth=1.20,stallDepth=3.2,stallCount=HS.length,gateDoors=[];
 const beam=(parent,x,y,z,w,h,d,m)=>{let v=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);v.position.set(x,y,z);parent.add(v);return v};
 for(let i=0;i<stallCount;i++){
  const x=(i-(stallCount-1)/2)*stallWidth;
  for(let sx of [-.5,.5])for(let sz of [-1,1]){
   beam(gateRoot,x+sx*stallWidth,1.45,sz*stallDepth/2,.055,2.9,.055,gateSteel);
  }
  beam(gateRoot,x,2.85,0,stallWidth,.13,stallDepth+.4,gateSteel);
  beam(gateRoot,x,3.05,0,stallWidth,.13,stallDepth+.4,gateWhite);
  for(const side of [-1,1])beam(gateRoot,x+side*stallWidth/2,1.65,-.4,.06,.72,stallDepth*.68,gateWhite);
  // Open side rails keep the new side-on start from looking through a solid wall.
  for(let side of [-1,1])for(const y of [.50,1.25,2.05])
   beam(gateRoot,x+side*stallWidth/2,y,0,.055,.065,stallDepth,gateSteel);
  // Front doors pivot open from both edges of each stall.
  const doors=[];
  for(let side of [-1,1]){
   const hinge=new THREE.Group();hinge.position.set(x+side*stallWidth/2,1.47,stallDepth/2);gateRoot.add(hinge);
   // Open grille doors: a solid white panel obscured the horses completely.
   const leaf=new THREE.Group();hinge.add(leaf);
   for(let k=0;k<4;k++)beam(leaf,-side*stallWidth/4,-1.02+k*.65,0,stallWidth/2-.07,.065,.07,gateSteel);
   beam(leaf,-side*(stallWidth/2-.10),0,0,.07,2.50,.08,gateSteel);
   doors.push({hinge,side});
  }
  gateDoors.push(...doors);
  const cv=document.createElement('canvas');cv.width=128;cv.height=128;
  const g=cv.getContext('2d');g.fillStyle='#f8d54f';g.fillRect(0,0,128,128);g.fillStyle='#24343b';g.textAlign='center';g.textBaseline='middle';g.font='bold 92px sans-serif';g.fillText(String(i+1),64,69);
  const tex=new THREE.CanvasTexture(cv);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(stallWidth*.78,.52),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  label.position.set(x,3.34,stallDepth/2+.10);gateRoot.add(label);
 }
 beam(gateRoot,0,3.92,0,stallWidth*stallCount+2,.55,1.4,gateDark);
 const banner=document.createElement('canvas');banner.width=1024;banner.height=128;
 const bc=banner.getContext('2d');bc.fillStyle='#245f5b';bc.fillRect(0,0,1024,128);
 bc.fillStyle='#ffffff';bc.textAlign='center';bc.textBaseline='middle';bc.font='bold 75px sans-serif';bc.fillText(config.venue+'競馬場  '+config.name,512,67);
 const bannerTex=new THREE.CanvasTexture(banner);bannerTex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(stallWidth*stallCount,.55),new THREE.MeshBasicMaterial({map:bannerTex,side:THREE.DoubleSide}));
 sign.position.set(0,3.92,stallDepth/2+.12);gateRoot.add(sign);
 // Mobile bridge legs and transport wheels outside the occupied stalls.
 for(const side of [-1,1]){
  const x=side*(stallCount*stallWidth/2+.8);
  beam(gateRoot,x,2,0,.22,4,1,gateSteel);
  for(const z of [-1.4,1.4]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.24,16),mat(0x262b2c));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.43,z);gateRoot.add(wheel)}
 }
 // At the stalls, scale the chibi runners slightly down to fit; blend back to normal as they accelerate.
 function updateGates(clock){
  const opening=Math.max(0,Math.min(1,clock/.65));
  const swing=opening*1.48;
  for(const door of gateDoors)door.hinge.rotation.y=-door.side*swing;
 }
 // Authentic-inspired 2023 Kyoto "KYOTO" turf finish marker (green
 // and ivory nested racetrack arches with floodlights). It is not a gate.
 let goalRig=null,goalBoard=null;
 if(config.venue==='京都'&&config.surface==='芝'){
  const {createKyotoGoalBoard}=await import('./assets/kyoto-goal-board.js?v=kyoto-v11-1');
  goalBoard=createKyotoGoalBoard({THREE,scene,offsetPoint,path,half});
  goalRig=goalBoard.root;goalRig.scale.setScalar(.58);
 }else{
  // Kyoto-inspired freestanding finish monument on the infield side, not a banner over the track.
  goalRig=new THREE.Group();
  goalRig.position.copy(offsetPoint(1,half+6,0));
  const goalDir=path(1);goalRig.rotation.y=Math.atan2(goalDir.dx,goalDir.dz)+Math.PI/2;scene.add(goalRig);
  const ivory=mat(0xf4f5ed),teal=mat(0x16786d),bronze=mat(0xc2a76a);
  // A single rounded horseshoe-shaped finish tower: two uprights and an open arch.
  for(const side of [-1,1]){
   beam(goalRig,side*2.05,4.6,0,1.05,8.8,1.0,ivory);
   beam(goalRig,side*2.05,4.5,.58,.22,7.9,.18,teal);
   beam(goalRig,side*2.05,1.1,1.15,1.0,.45,1.0,bronze);
  }
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.08,.49,12,52,Math.PI),ivory);
  arch.position.set(0,8.95,0);goalRig.add(arch);
  const archAccent=new THREE.Mesh(new THREE.TorusGeometry(2.08,.11,8,52,Math.PI),teal);
  archAccent.position.set(0,8.95,.51);goalRig.add(archAccent);
  const finishLabel=document.createElement('canvas');finishLabel.width=512;finishLabel.height=256;
  const fg=finishLabel.getContext('2d');fg.fillStyle='#f4f5ed';fg.fillRect(0,0,512,256);
  fg.fillStyle='#176f64';fg.font='bold 76px sans-serif';fg.textAlign='center';fg.textBaseline='middle';fg.fillText(config.venue,256,92);
  fg.font='bold 47px sans-serif';fg.fillText(config.venue,256,178);
  const finishTex=new THREE.CanvasTexture(finishLabel);finishTex.colorSpace=THREE.SRGBColorSpace;
  const finishSign=new THREE.Mesh(new THREE.PlaneGeometry(4.1,2.05),new THREE.MeshBasicMaterial({map:finishTex,side:THREE.DoubleSide}));
  finishSign.position.set(0,7.0,.7);goalRig.add(finishSign);
  const finishSpire=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,2.6,8),teal);
  finishSpire.position.set(0,12.1,0);goalRig.add(finishSpire);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.7),new THREE.MeshBasicMaterial({color:0x187c69,side:THREE.DoubleSide}));
  flag.position.set(.7,13.0,0);goalRig.add(flag);
  // Matching thin white finish-line poles stay beyond the running lanes.
  const finishGeo=new THREE.PlaneGeometry(half*2,1.0),finishMat=new THREE.MeshBasicMaterial({color:0xf2f5f3,side:THREE.DoubleSide});
  const finish=new THREE.Mesh(finishGeo,finishMat);finish.rotation.x=-Math.PI/2;finish.rotation.z=0;finish.position.copy(end);finish.position.y+=.05;scene.add(finish);
  for(let side of [1]){let p=offsetPoint(1,side*(half+.8),.0);let pole=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,5,8),mat(0xf7f7f0));pole.position.copy(p);pole.position.y+=2.5;scene.add(pole)}
 }
 // Correct JRA-style red/white posts with round numbered plaques (2=200m).
 const {createJRAFurlongPosts}=await import("./assets/jra-furlong-posts.js?v=geo-v6");
 const furlongPosts=createJRAFurlongPosts({THREE,scene,offsetPoint,distance,half});
 // Cinematic director replaces manual angle selection for every race.
 const {createRaceCinematics}=await import("./assets/race-cinematics.js?v=jra-reference-camera-v9");
 const cinematics=createRaceCinematics({THREE,scene,stage,models,config,capFor,path,route,routeLength});
 const cameraBlockers=[];scene.traverse(o=>{if(o.isMesh&&o.userData.cameraOccluder)cameraBlockers.push(o)});
 const visibilityRay=new THREE.Raycaster();
 controls.style.display='none';
 document.querySelector('.camera-more')?.setAttribute('hidden','');
 stage.style.display='block';svg.classList.add('svg-hidden');
 status.textContent='3D RACE · '+models.length+'頭';
 document.getElementById('horse-model-version').textContent='EQUINE v16 · SKELETAL GALLOP';
 const liveTitle=document.querySelector('.live-head strong');if(liveTitle)liveTitle.textContent+=' · v16';
 window.KYOTO_RENDER_STATUS={ready:true,model:'skinned-thoroughbred-v16',gait:'authored-skeletal-v16',venue:venueReady?'full':'fallback',
  horses:models.length,camera:'outer-rail-front-3to5-ids',courseView:config.courseView,
  cinematic:true,saddleclothNames:true,goalBoard:!!goalBoard,gateDisappears:true,
  continuousRunOut:true,goalBoardSide:'far',furlongDigits:furlongPosts.map(x=>x.digit)};
 let cw=0,ch=0;
 function resize(){let w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;if(w!==cw||h!==ch){cw=w;ch=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
 const tmp=new THREE.Vector3(),look=new THREE.Vector3(),desired=new THREE.Vector3();
 let first=true,lastFrame=0,frame=0,lastHud=0;
 const smoothLook=new THREE.Vector3();
 // TV-style lightweight horse-number chips above the leading runners.
 // Camera perspective determines their locations; this does not change rankings.
 const leaderLabelLayer=document.createElement('div');
 leaderLabelLayer.id='race-front-labels';
 leaderLabelLayer.style.cssText='position:absolute;inset:0;z-index:13;pointer-events:none;overflow:hidden;';
 stage.append(leaderLabelLayer);
 const leaderLabels=new Map(HS.map(h=>{
  const cap=capFor(h),node=document.createElement('b');
  node.dataset.no=String(h.no);
  node.setAttribute('aria-label',h.no+'番 '+h.name);
  node.title=h.name;
  node.textContent=String(h.no);
  node.style.cssText='position:absolute;display:none;place-items:center;min-width:19px;height:19px;'+
   'padding:0 3px;box-sizing:border-box;border:1px solid '+cap.outline+';'+
   'border-radius:5px;background:'+cap.hex+';color:'+cap.text+';'+
   'font:900 12px/1 sans-serif;box-shadow:0 1px 4px #10231cbb;'+
   'transform:translate(-50%,-100%);white-space:nowrap;';
  leaderLabelLayer.append(node);return [h.no,node];
 }));
 function animate(now){
  requestAnimationFrame(animate);
  if(document.hidden)return;
  resize();if(!LIVE.ready)return;
  const frameDt=lastFrame?Math.min(.12,Math.max(0,(now-lastFrame)/1000)):1/60;lastFrame=now;
  const clock=LIVE.clock;
  const visualP=h=>horseProgress(h.no,clock);
  const order=HS.map(h=>({no:h.no,p:visualP(h)}))
   .sort((a,b)=>b.p-a.p || LIVE.rank.indexOf(a.no)-LIVE.rank.indexOf(b.no));
  if(now-lastHud>180){
   lastHud=now;
   const raceProgress=Math.min(1,Math.max(0,clock/LIVE.duration));
   const remaining=Math.max(0,Math.round(distance*(1-raceProgress)/10)*10);
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
   const h=HS[i],m=models[i],p=visualP(h),d=path(p);
   const release=Math.max(0,Math.min(1,clock/3.2));
   // At zero time all race horses are physically inside their own starting stalls.
   // Stall coordinates are in the gate's local frame; after the break the model
   // transitions smoothly onto the course's racing lanes.
   const lane=runnerLane(h.no,HS.length,clock/LIVE.duration);
   const gateX=gateRoot.position.x+startDir.dz*(h.no-CENTER)*1.20;
   const gateZ=gateRoot.position.z-startDir.dx*(h.no-CENTER)*1.20;
   const staging=Math.max(0,1-Math.min(1,clock/.8));
   m.root.position.set(
    (d.x-d.dz*lane)*(1-staging)+gateX*staging,
    d.y+.015,
    (d.z+d.dx*lane)*(1-staging)+gateZ*staging
   );
   m.root.scale.setScalar(1);
   m.root.rotation.y=Math.atan2(d.dx,d.dz);
   if(metricKyoto){const slope=(kyotoHeight(p+.0005)-kyotoHeight(p-.0005))/2;m.root.rotation.x=-Math.atan(slope);}
   // Articulated four-leg gallop, driven by smooth screen time.
   // The same playback clock drives limbs before and after the finish.
   const visualTime=LIVE.visualTime;
   // Track-based cadence without visual strobing at 16x playback.
   const t0=Math.max(0,Math.min(LIVE.duration-.01,clock-.4));
   const t1=Math.min(LIVE.duration,Math.max(t0+.01,clock+.4));
   const speedMps=Math.abs(horseProgress(h.no,t1)-horseProgress(h.no,t0))*distance/(t1-t0);
   const cornerLead=config.direction==='左'?'left':'right';
   const straightLead=cornerLead==='left'?'right':'left';
   // Illustrative straight hand change, configurable by each horse.
   const changeAt=Number.isFinite(h.leadChangeAt)?h.leadChangeAt:.82;
   const lead=p>=changeAt?straightLead:cornerLead;
   updateGallop(m,clock,visualTime,h.no,Math.min(1,clock/LIVE.duration),{speedMps,lead,frameDt,playing:LIVE.playing});
   // No floating head numbers: genuine saddlecloth number/name on the flanks.
  }
  updateGates(clock);
  // Remove the start stalls after the first seconds; restore on replay.
  gateRoot.visible=clock<=Math.min(6,LIVE.duration*.055);
  const raceProgress=Math.min(1,Math.max(0,clock/LIVE.duration));
  const rate=+document.getElementById('live-rate').value;
  // Four-cut broadcast camera and compact racing HUD.
  // Does not touch horseProgress, standings or any forecast calculation.
  const shotDirection=cinematics.update({clock,progress:raceProgress,order,finishOrder:LIVE.rank,frameDt,camera,desired,look,rate});
  // Framerate-independent camera tracking, responsive enough for 16x playback.
  // Each requested cut switches directly. Tracking is smoothed within a shot.
  const stableAlpha=1-Math.exp(-frameDt*(12+rate*2));
  if(first||shotDirection?.cut){camera.position.copy(desired);smoothLook.copy(look);first=false}
  else{camera.position.lerp(desired,stableAlpha);smoothLook.lerp(look,stableAlpha)}
  camera.lookAt(smoothLook);
  camera.updateMatrixWorld();
  // Verify the opening camera actually frames every projected horse body.
  if(shotDirection?.shot==='start'||shotDirection?.shot==='third-turn'){
   let inside=0;const projected=new THREE.Vector3();
   for(const h of models){
    projected.set(0,2.0,0);h.root.localToWorld(projected);projected.project(camera);
    if(projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94)inside++;
   }
   window.RACE_CAMERA_AUDIT={opening:inside,total:models.length,shot:shotDirection?.shot};
  }
  // Real WebGL checks: is the start gate absent after the break and
  // is the KYOTO goal post actually INSIDE the camera frame at the line?
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
   const ray=target.clone().sub(camera.position);visibilityRay.set(camera.position,ray.clone().normalize());visibilityRay.far=ray.length();
   if(visibilityRay.intersectObjects(cameraBlockers,false).length)leadersOccluded++;
  }
  const sight=camera.getWorldDirection(new THREE.Vector3());
  const goalDepth=goalRig?goalRig.position.clone().sub(camera.position).dot(sight):null;
  const farthestHorse=Math.max(...models.map(m=>m.root.position.clone().sub(camera.position).dot(sight)));
  const leaderVisual=models[order[0].no-1].root.localToWorld(new THREE.Vector3(0,1.85,0)).project(camera);
   const leaderNose=models[order[0].no-1].root.localToWorld(new THREE.Vector3(0,2.05,1.75)).project(camera);
   // Mark the foremost 3-5 runners so their saddlecloth numbers remain
   // legible at the smaller iPhone display size. Never cover the picture at the gate.
   const pictured=new Set(window.RACE_CINEMATIC_DEBUG?.pose?.subjects||[]);
   const placed=[];
   for(const [no,node] of leaderLabels){
    if(clock<2||!pictured.has(no)){node.style.display='none';continue}
    const m=models[no-1],pt=m.root.localToWorld(new THREE.Vector3(0,3.20,0)).project(camera);
    if(pt.z< -1||pt.z>1||Math.abs(pt.x)>1.15||Math.abs(pt.y)>1.25){node.style.display='none';continue}
    // At the finish the jockey's head can reach the top of the perspective
    // frame even while the horse is visible. Keep the label legible by
    // pinning it just inside the broadcast-safe image area.
    const x=Math.max(16,Math.min(cw-16,(pt.x+1)*cw/2));
    const y=Math.max(81,Math.min(ch-110,(1-pt.y)*ch/2));
    const overlap=placed.filter(q=>Math.abs(q.x-x)<27&&Math.abs(q.y-y)<26).length;
    node.style.left=x.toFixed(1)+'px';node.style.top=(y-overlap*19).toFixed(1)+'px';
    node.style.display='grid';placed.push({x,y:y-overlap*19});
   }
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
   window.RACE_SCENE_AUDIT={gateMinScreenX:gateEdges.length?Math.min(...gateEdges):null,
    gateMaxScreenX:gateEdges.length?Math.max(...gateEdges):null,
    gateScreenX:(gateCenter.x+1)/2,
    leadScreenX:(leaderVisual.x+1)/2,leadScreenY:(1-leaderVisual.y)/2,
    leadNoseScreenX:(leaderNose.x+1)/2,leadNoseScreenY:(1-leaderNose.y)/2,
    leadVisible:leaderVisual.z>-1&&leaderVisual.z<1&&Math.abs(leaderVisual.x)<1&&Math.abs(leaderVisual.y)<1,
    gateVisible:gateRoot.visible,
   goalBoardVisible:!!goalRig?.visible,goalInFrame,goalScreen,leadersOccluded,
   shot:shotDirection?.shot,goalSide:'far',
   runOut:clock>LIVE.duration,clock,visualTime:LIVE.visualTime,
   positions:models.map(m=>({x:m.root.position.x,y:m.root.position.y,z:m.root.position.z})),
   course:metricKyoto?KYOTO_INNER:null,
   cameraForwardDot:(camera.position.x-smoothLook.x)*path(1).dx+(camera.position.z-smoothLook.z)*path(1).dz,
   goalDepth,goalBehindHorses:goalDepth!==null&&goalDepth>farthestHorse,
   gallopPhase:models[0].gallopAudit?.phase,gallopLead:models[0].gallopAudit?.lead,gallopFlight:models[0].gallopAudit?.flight,gallopHoofs:models[0].gallopAudit?.hoofs,
   cameraTrackingError:camera.position.distanceTo(desired)+smoothLook.distanceTo(look)};
  renderer.render(scene,camera);
 }
 animate();
 }catch(err){
  console.error('3D renderer error',err);
  show3DFailure(err?.message||err);
  document.getElementById('horse-model-version').textContent='⚠ 3D INIT ERROR';
 }
})();

