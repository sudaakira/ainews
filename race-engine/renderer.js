
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
 const capFor=h=>jockeyCap(h,config,horse=>window.SWAN_FACTORS.frame(horse));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x9edbf7);scene.fog=new THREE.FogExp2(0xb9e1ee,.0015);
 const camera=new THREE.PerspectiveCamera(50,1,.1,1000);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default',alpha:false,preserveDrawingBuffer:false});
 // Fewer GPU pixels on phones preserve frame rate when all up to 18 animated horses are visible.
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<800?1.2:1.8)); // Restore sharp full-resolution 3D.
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.05;
 stage.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x56975d,2.1));
 const sun=new THREE.DirectionalLight(0xfff7d8,2.5);sun.position.set(-80,130,50);scene.add(sun);
 const mat=(c,rough=.83)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:0});
 // Wait for venue geometry before the first render; do not silently show the old empty turf.
 let venueReady=false;
 try{
  if(config.courseView==='kyoto-1400-outer'){
   const venue=await import("./assets/kyoto-scenery.js?v=shared-v1");
   venue.buildScenery(THREE,scene,mat);
  }else{
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
  g.fillStyle='#548b43';g.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=64){
   g.fillStyle=((y/64)%2===0)?'rgba(18,50,16,.14)':'rgba(162,197,105,.11)';
   g.fillRect(0,y,512,64);
  }
  for(let i=0;i<43000;i++){
   const x=rand()*512,y=rand()*512;
   const light=rand()>.49;
   g.fillStyle=light?'rgba(190,217,117,.18)':'rgba(24,75,32,.19)';
   g.fillRect(x,y,.7+rand()*2,.6+rand()*2);
  }
  for(let i=0;i<12500;i++){
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
 const turf=new THREE.MeshStandardMaterial({map:grassMap,color:0xb4dfac,roughness:.98,side:THREE.DoubleSide});
 const turfAlt=turf,white=mat(0xf1f2e8),darkRail=mat(0xcad8d2),soil=mat(0x786748);
 const lawnMap=grassMap.clone();lawnMap.needsUpdate=true;lawnMap.repeat.set(14,10);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(850,900),new THREE.MeshStandardMaterial({map:lawnMap,color:0xb8d7b1,roughness:1}));
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
  const normalized=Math.max(0,Math.min(1,t));
  const sign=config.direction==='左'?-1:1;
  const d=(sign===-1?1-normalized:normalized)*routeLength;
  const p=route.getPointAtLength(d);
  const a=route.getPointAtLength(Math.max(0,d-2)),b=route.getPointAtLength(Math.min(routeLength,d+2));
  const dx=(b.x-a.x)*sign,dz=(b.y-a.y)*sign,l=Math.max(.01,Math.hypot(dx,dz));
  return {x:(p.x-430)*W,z:(p.y-277)*W,dx:dx/l,dz:dz/l,y:heightAt(normalized)};
 }
 const count=320,half=12.8;
 function offsetPoint(t,lane,yOffset=0){let p=path(t);return new THREE.Vector3(p.x-p.dz*lane,p.y+yOffset,p.z+p.dx*lane)}
 const verts=[],norm=[],uv=[],idx=[];
 for(let i=0;i<=count;i++){let t=i/count;for(let side of [-1,1]){let p=offsetPoint(t,side*half,.015);verts.push(p.x,p.y,p.z);uv.push(side===-1?0:1,t*20)}}
 for(let i=0;i<count;i++){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}
 let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
 const track=new THREE.Mesh(geo,turfAlt);track.material.side=THREE.DoubleSide;scene.add(track);
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
  let pts=[];for(let i=0;i<=count;i++)pts.push(offsetPoint(i/count,lane,.75));
  tube(pts,.10,white);
  for(let i=0;i<=count;i+=9){let p=offsetPoint(i/count,lane,.1);let post=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.8,6),darkRail);post.position.copy(p).add(new THREE.Vector3(0,.33,0));scene.add(post)}
 }
 for(let lane of [-6.3,0,6.3]){
  let pts=[];for(let i=0;i<=count;i++)pts.push(offsetPoint(i/count,lane,.035));
  tube(pts,.025,mat(0xb5d59c));
 }
 function box(w,h,d,material,parent,x,y,z){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m}
 const sharedSphere=new THREE.SphereGeometry(1,14,12);
 function ellipsoid(parent,material,x,y,z,sx,sy,sz){let m=new THREE.Mesh(sharedSphere,material);m.scale.set(sx,sy,sz);m.position.set(x,y,z);parent.add(m);return m}
 function segment(parent,material,from,to,r1,r2){let a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);let m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,d.length(),9),material);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);return m}
 const horseColors=[0x6e3927,0x9e542b,0x4b2a24,0x9b6437,0x382a28,0x8c3d24,0x6d513c,0x342d2c,0x91542d,0x52382e,0x9d5d32,0x613b2c,0x3d302b,0xa06d42,0x684631,0x412b27,0x97572d,0x5d372a];
 const silkColors=['#d63e3e','#e8e4df','#2670db','#edc33a','#dd63a5','#4ebbb0','#c7c7c7','#f2932f','#7144bd','#bda144','#db5e32','#62b55c','#e4edf4','#9c78d7','#5b9bd1','#c5a07c','#d6dc45','#cb5171'];
 const {updateGallop}=await import("./assets/chibi-gallop.js?v=cinema-v5");
 const models=[];
 const toonCache=new Map();
 function animeMaterial(c){const key=new THREE.Color(c).getHex();if(!toonCache.has(key))toonCache.set(key,new THREE.MeshToonMaterial({color:key}));return toonCache.get(key)}
 function horseModel(h){
  const root=new THREE.Group(),anim=new THREE.Group();root.add(anim);
  const anime=animeMaterial;
  const palette=[0x996047,0xc38a5e,0x856356,0xe2b388,0x55433f,0xb87d59,0xa88a70,0x60504b,0xd7a06d,0x81655a,0xc89b75,0x94705f,0x594942,0xd6b28b,0xa78467,0x745b51,0xc6a07c,0x93725f];
  // Soft natural coat and glossy dark eyes; retain the rounded, friendly proportions.
  let coat=new THREE.MeshStandardMaterial({color:palette[h.no-1],roughness:.79,metalness:0}),
      coatDark=new THREE.MeshStandardMaterial({color:new THREE.Color(palette[h.no-1]).multiplyScalar(.69),roughness:.86}),
      mane=new THREE.MeshStandardMaterial({color:h.no%3===0?0x624438:0x302729,roughness:.95}),
      hoof=anime(0x36333d),skin=anime(0xf6c3a6),silk=anime(silkColors[h.no-1]),pants=anime(0xf8f4ed),helmet=anime(capFor(h).hex),reins=anime(0x353038);
  // Anatomical shapes: rump, chest, shoulders, arched neck, muzzle and two ears
  ellipsoid(anim,coat,0,1.57,0,.88,.76,1.34);
  ellipsoid(anim,coat,0,1.29,.16,.72,.34,1.08);
  ellipsoid(anim,coat,0,1.59,.88,.77,.72,.78);
  ellipsoid(anim,coat,0,1.57,-1.05,.78,.73,.81);
  let neck=ellipsoid(anim,coat,0,2.04,1.25,.46,.85,.49);neck.rotation.x=-.47;
  // The shoulder, flank and hindquarter follow a believable racehorse silhouette.
  for(const side of [-1,1]){
   const shoulder=ellipsoid(anim,coat,side*.55,1.58,.77,.33,.59,.48);shoulder.rotation.x=-.15;
   const haunch=ellipsoid(anim,coat,side*.54,1.57,-1.05,.38,.58,.50);haunch.rotation.x=.18;
  }
  // Chibi body, but more realistic thoroughbred head: long nasal bridge, defined jaw and alert ears.
  const headRig=new THREE.Group();headRig.position.set(0,2.62,1.54);headRig.scale.set(1.13,1.10,1.14);anim.add(headRig);
  let head=ellipsoid(headRig,coat,0,.12,-.04,.51,.61,.58);head.rotation.x=.16;
  // A long sloping nasal bridge, strong cheekbones and soft natural muzzle.
  const bridge=ellipsoid(headRig,coat,0,-.19,.46,.35,.43,.70);bridge.rotation.x=-.25;
  ellipsoid(headRig,coatDark,0,-.46,.95,.40,.24,.34);
  ellipsoid(headRig,anime(0xb79b8a),0,-.48,1.14,.39,.21,.24);
  // Rounded lower lip and subtly shaded cheekbone, closer to a real thoroughbred.
  ellipsoid(headRig,coat,0,-.33,.12,.45,.36,.40);
  ellipsoid(headRig,coatDark,0,-.65,1.07,.32,.09,.24);
  ellipsoid(headRig,coat,0,-.08,-.18,.58,.45,.43);
  ellipsoid(headRig,anime(0x49332f),0,-.59,1.28,.18,.024,.025);
  for(let side of [-1,1]){
   let ear=ellipsoid(headRig,coat,side*.38,.77,-.12,.16,.39,.15);ear.rotation.z=-side*.12;
   let innerEar=ellipsoid(headRig,anime(0x9e7775),side*.39,.80,.003,.075,.24,.045);innerEar.rotation.z=-side*.12;
   // Realistic lateral horse eye: dark glossy almond eye with one subtle reflection.
   ellipsoid(headRig,coatDark,side*.535,.21,.21,.205,.17,.14);
   ellipsoid(headRig,anime(0x1e1a1b),side*.655,.22,.245,.145,.12,.12);
   ellipsoid(headRig,new THREE.MeshPhysicalMaterial({color:0x30201c,roughness:.13,clearcoat:1,clearcoatRoughness:.12}),side*.739,.22,.267,.067,.088,.061);
   ellipsoid(headRig,anime(0xffffff),side*.782,.268,.303,.033,.035,.025);
   const brow=ellipsoid(headRig,coat,side*.55,.37,.18,.24,.075,.15);brow.rotation.z=side*.14;
   // Distinct nostrils on the sides of the muzzle.
   const nostril=ellipsoid(headRig,anime(0x392b2a),side*.31,-.45,1.28,.105,.079,.057);nostril.rotation.z=side*.15;
   ellipsoid(headRig,anime(0x9a6e64),side*.27,-.49,1.305,.052,.028,.026);
   // Short soft muzzle whiskers and a subtle lower eyelid.
   for(let k=0;k<3;k++){
    segment(headRig,anime(0xd0b8a1),[side*(.21+k*.055),-.54,1.28],[side*(.27+k*.07),-.61,1.35],.008,.003);
   }
   const lowerLid=ellipsoid(headRig,coat,side*.61,.12,.29,.17,.045,.10);lowerLid.rotation.z=-side*.10;
   ellipsoid(headRig,mane,side*.43,.55,-.10,.15,.065,.08);
  }
  for(let i=0;i<7;i++)ellipsoid(anim,mane,0,2.20+i*.11,1.03-i*.09,.18,.18,.19);
  // Natural forelock, short mane and a small blaze on some horses.
  for(let i=0;i<7;i++){const fringe=ellipsoid(headRig,mane,(i-3)*.12,.65,.27,.10,.24,.12);fringe.rotation.z=(i-3)*.15;fringe.rotation.x=.20}
  for(let i=0;i<7;i++){const crest=ellipsoid(anim,mane,0,2.24+i*.10,1.06-i*.13,.14,.14,.18);crest.rotation.x=-.22}
  if(h.no%3===0){
   ellipsoid(headRig,anime(0xfff8ed),0,.34,.49,.11,.26,.043);
   ellipsoid(headRig,anime(0xfff8ed),0,-.03,.72,.065,.23,.041);
  }
  // Bridle: cheekpieces, browband and a noseband; reins run to the jockey.
  for(let side of [-1,1]){
   segment(headRig,reins,[side*.44,.40,-.06],[side*.39,-.42,1.03],.025,.025);
   segment(headRig,reins,[side*.36,-.33,.99],[side*.42,-.47,1.20],.025,.025);
  }
  segment(headRig,reins,[-.43,.47,.06],[.43,.47,.06],.032,.032);
  segment(headRig,reins,[-.39,-.43,1.05],[.39,-.43,1.05],.030,.030);
  const tailRig=new THREE.Group();tailRig.position.set(0,1.90,-1.55);anim.add(tailRig);
  for(let i=0;i<5;i++){let tail=ellipsoid(tailRig,mane,Math.sin(i*.6)*.07,-i*.17,-i*.13,.25-i*.013,.27,.25-i*.014);tail.rotation.x=-.4}
  ellipsoid(tailRig,mane,0,-.82,-.55,.22,.30,.29);
  // Articulated legs: independently animated joints and hoof geometry
  let legs=[];
  for(let front of [false,true])for(let side of [-1,1]){
   let pivot=new THREE.Group();pivot.position.set(side*.56,1.33,front?.91:-1.05);anim.add(pivot);
   segment(pivot,coat,[0,0,0],[0,-.67,front?.14:-.13],.245,.15);
   let knee=new THREE.Group();knee.position.set(0,-.67,front?.14:-.13);pivot.add(knee);
   segment(knee,coatDark,[0,0,0],[0,-.55,.08],.145,.09);
   box(.31,.17,.43,hoof,knee,0,-.57,.17);
   legs.push({pivot,knee,front,side});
  }
  // Visible saddlecloth on both flanks, with a real 1-18 number rather than only a floating marker.
  const saddleColor=anime(0xf6f2e7),saddleBorder=anime(silkColors[h.no-1]);
  box(1.54,.11,1.42,saddleBorder,anim,0,2.17,-.16);
  box(1.44,.09,1.31,saddleColor,anim,0,2.23,-.16);
  const clothCanvas=document.createElement('canvas');clothCanvas.width=256;clothCanvas.height=256;
  const clothCtx=clothCanvas.getContext('2d');
  clothCtx.fillStyle=silkColors[h.no-1];clothCtx.fillRect(0,0,256,256);
  clothCtx.strokeStyle='#ffffff';clothCtx.lineWidth=13;clothCtx.strokeRect(10,10,236,236);
  clothCtx.fillStyle='#ffffff';clothCtx.textAlign='center';clothCtx.textBaseline='middle';clothCtx.font='bold 172px sans-serif';clothCtx.fillText(String(h.no),128,139);
  const clothTex=new THREE.CanvasTexture(clothCanvas);clothTex.colorSpace=THREE.SRGBColorSpace;
  const clothMat=new THREE.MeshBasicMaterial({map:clothTex,side:THREE.DoubleSide,transparent:false});
  for(const side of [-1,1]){
   const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.18,1.06),clothMat);
   panel.position.set(side*.81,1.88,-.22);panel.rotation.y=side*Math.PI/2;anim.add(panel);
  }
  const torso=ellipsoid(anim,silk,0,2.81,.15,.37,.48,.34);torso.rotation.x=.45;
  ellipsoid(anim,pants,0,2.42,-.28,.41,.22,.39);
  for(let side of [-1,1]){
   segment(anim,silk,[side*.29,2.94,.25],[side*.44,2.60,.90],.14,.09);
   segment(anim,pants,[side*.34,2.48,-.25],[side*.45,2.00,.45],.17,.11);
   segment(anim,hoof,[side*.45,2.06,.42],[side*.44,1.85,.51],.10,.09);
   segment(anim,reins,[side*.35,2.58,.95],[side*.16,2.40,1.75],.018,.018);
  }
  // Clearly identifiable jockey: face, goggles, helmet, gloves, boots and riding crop.
  ellipsoid(anim,skin,0,3.19,.47,.34,.37,.32);
  ellipsoid(anim,helmet,0,3.48,.43,.40,.29,.36);
  box(.60,.055,.25,helmet,anim,0,3.37,.68);
  for(let side of [-1,1]){
   ellipsoid(anim,anime(0x252c37),side*.19,3.23,.74,.13,.12,.06);
   ellipsoid(anim,anime(0x8bc8d6),side*.19,3.23,.79,.09,.078,.025);
   ellipsoid(anim,anime(0xf8f5ed),side*.46,2.57,.90,.13,.13,.13);
   ellipsoid(anim,hoof,side*.47,1.93,.47,.17,.17,.26);
  }
  segment(anim,reins,[.45,2.64,.85],[.65,3.13,-.35],.015,.012);
  // Racing number billboard
  const cn=document.createElement('canvas');cn.width=128;cn.height=128;const ctx=cn.getContext('2d');
  const frameCap=capFor(h);
  ctx.fillStyle=frameCap.hex;ctx.beginPath();ctx.arc(64,64,55,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=7;ctx.strokeStyle=frameCap.outline;ctx.stroke();ctx.font='bold 67px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=frameCap.text;ctx.fillText(String(h.no),64,67);
  const texture=new THREE.CanvasTexture(cn),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.position.set(0,4.35,0);sprite.scale.set(1.7,1.7,1);root.add(sprite);
  scene.add(root);return {root,anim,legs,sprite,headRig,tailRig};
 }
 // Never silently show the old horse when the requested new model fails.
 let horseV3Ready=false,modelError='';
 try{
  const horseV3=await import("./assets/horse-anime.js?v=cinema-v5");
  for(const h of HS){
   const frameCap=capFor(h);
   models.push(horseV3.createRaceHorse(THREE,scene,h,silkColors[h.no-1],frameCap.hex,frameCap.outline,frameCap.pattern||null,frameCap.secondary||'#FFFFFF'));
  }
  horseV3Ready=models.length===HS.length&&models.every(m=>m.artDirection==='anime-pony-v19-kawaii');
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
 gateRoot.position.x-=startDir.dx*1.6;
 gateRoot.position.z-=startDir.dz*1.6;
 gateRoot.rotation.y=Math.atan2(startDir.dx,startDir.dz);scene.add(gateRoot);
 const gateSteel=mat(0x347f79),gateWhite=mat(0xf4f6ee),gateDark=mat(0x1c514e),gateYellow=mat(0xf8d54f),gateNumberMat=mat(0x253b45);
 const stallWidth=1.51,stallDepth=4.9,stallCount=HS.length,gateDoors=[];
 const beam=(parent,x,y,z,w,h,d,m)=>{let v=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);v.position.set(x,y,z);parent.add(v);return v};
 for(let i=0;i<stallCount;i++){
  const x=(i-(stallCount-1)/2)*stallWidth;
  for(let sx of [-.5,.5])for(let sz of [-1,1]){
   beam(gateRoot,x+sx*stallWidth,1.63,sz*stallDepth/2,.075,3.25,.075,gateSteel);
  }
  beam(gateRoot,x,3.23,0,stallWidth,.18,stallDepth+.4,gateSteel);
  beam(gateRoot,x,3.46,0,stallWidth,.18,stallDepth+.4,gateWhite);
  for(let side of [-1,1])beam(gateRoot,x+side*stallWidth/2,1.35,0,.055,1.8,stallDepth,gateSteel);
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
  const label=new THREE.Mesh(new THREE.PlaneGeometry(stallWidth*.88,1.08),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  label.position.set(x,4.1,stallDepth/2+.10);gateRoot.add(label);
 }
 beam(gateRoot,0,4.82,0,stallWidth*stallCount+2,.85,1.4,gateDark);
 const banner=document.createElement('canvas');banner.width=1024;banner.height=128;
 const bc=banner.getContext('2d');bc.fillStyle='#245f5b';bc.fillRect(0,0,1024,128);
 bc.fillStyle='#ffffff';bc.textAlign='center';bc.textBaseline='middle';bc.font='bold 75px sans-serif';bc.fillText(config.venue+' RACE',512,67);
 const bannerTex=new THREE.CanvasTexture(banner);bannerTex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(stallWidth*stallCount,1.1),new THREE.MeshBasicMaterial({map:bannerTex,side:THREE.DoubleSide}));
 sign.position.set(0,5.05,stallDepth/2+.12);gateRoot.add(sign);
 // At the stalls, scale the chibi runners slightly down to fit; blend back to normal as they accelerate.
 function updateGates(clock){
  const opening=Math.max(0,Math.min(1,clock/.65));
  const swing=opening*1.48;
  for(const door of gateDoors)door.hinge.rotation.y=-door.side*swing;
 }
 // Kyoto-inspired freestanding finish monument on the infield side, not a banner over the track.
 const goalRig=new THREE.Group();
 goalRig.position.copy(offsetPoint(1,-(half+6),0));
 const goalDir=path(1);goalRig.rotation.y=Math.atan2(goalDir.dx,goalDir.dz);scene.add(goalRig);
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
 for(let side of [-1,1]){let p=offsetPoint(1,side*(half+.8),.0);let pole=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,5,8),mat(0xf7f7f0));pole.position.copy(p);pole.position.y+=2.5;scene.add(pole)}
 // Draw distance signposts: positions use nominal model progress
 for(let meters of [1000,800,600,400,200].filter(x=>x<distance)){
  let t=1-meters/distance,p=offsetPoint(t,half+3,0);
  let post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.7,8),white);post.position.copy(p);post.position.y+=1.35;scene.add(post);
  let cv=document.createElement('canvas');cv.width=128;cv.height=64;let c=cv.getContext('2d');c.fillStyle='#fafafa';c.fillRect(0,0,128,64);c.fillStyle='#1b514b';c.font='bold 40px sans-serif';c.textAlign='center';c.fillText(meters,64,45);
  let label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv)}));label.position.copy(p);label.position.y+=3.2;label.scale.set(4,2,1);scene.add(label);
 }
 // Cinematic director replaces manual angle selection for every race.
 const {createRaceCinematics}=await import("./assets/race-cinematics.js?v=cinema-v5");
 const cinematics=createRaceCinematics({THREE,scene,stage,models,config,capFor,path});
 controls.style.display='none';
 document.querySelector('.camera-more')?.setAttribute('hidden','');
 stage.style.display='block';svg.classList.add('svg-hidden');
 status.textContent='🎬 CINEMATIC 3D · '+models.length+'頭';
 document.getElementById('horse-model-version').textContent='CINEMATIC RACE · DIRECTOR v1';
 window.KYOTO_RENDER_STATUS={ready:true,model:'anime-pony-v19-kawaii',venue:venueReady?'full':'fallback',
  horses:models.length,camera:'automatic-cinematic',courseView:config.courseView,cinematic:true};
 let cw=0,ch=0;
 function resize(){let w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;if(w!==cw||h!==ch){cw=w;ch=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
 const tmp=new THREE.Vector3(),look=new THREE.Vector3(),desired=new THREE.Vector3();
 let first=true,lastFrame=0,frame=0,lastHud=0;
 const smoothLook=new THREE.Vector3();
 function animate(now){
  requestAnimationFrame(animate);
  if(document.hidden)return;
  resize();if(!LIVE.ready)return;
  const frameDt=lastFrame?Math.min(.12,Math.max(0,(now-lastFrame)/1000)):1/60;lastFrame=now;
  const clock=LIVE.clock,order=HS.map(h=>({no:h.no,p:horseProgress(h.no,clock)})).sort((a,b)=>b.p-a.p);
  if(now-lastHud>180){
   lastHud=now;
   const raceProgress=Math.min(1,Math.max(0,clock/LIVE.duration));
   const remaining=Math.max(0,Math.round(distance*(1-raceProgress)/10)*10);
   document.getElementById('broadcast-clock').textContent=Math.floor(clock/60)+':'+(clock%60).toFixed(1).padStart(4,'0');
   document.getElementById('broadcast-distance').textContent=remaining?'残り '+remaining+'m':'🏁 ゴール';
   const angle=Math.PI*2*raceProgress+Math.PI;
   document.getElementById('broadcast-dot').setAttribute('cx',(105+81*Math.cos(angle)).toFixed(1));
   document.getElementById('broadcast-dot').setAttribute('cy',(39+21*Math.sin(angle)).toFixed(1));
   const top=HS[order[0].no-1],second=HS[order[1].no-1];
   document.getElementById('broadcast-leader').textContent=clock<=0?'スタート前':raceProgress>=1?'🏁 ゴール！':'先頭 '+top.no+'番 '+top.name;
   document.getElementById('broadcast-comment').textContent=clock<=0?config.venue+config.surface+distance+'m、まもなく発走！':raceProgress>=1?'上位3頭の着順をご確認ください':remaining<300?'直線勝負！ '+second.no+'番 '+second.name+' が追う！':second.no+'番 '+second.name+' が続きます';
  }
  for(let i=0;i<HS.length;i++){
   const h=HS[i],m=models[i],p=horseProgress(h.no,clock),d=path(p);
   const release=Math.max(0,Math.min(1,clock/3.2));
   // At zero time all race horses are physically inside their own starting stalls.
   // Stall coordinates are in the gate's local frame; after the break the model
   // transitions smoothly onto the course's racing lanes.
   const lane=(CENTER-h.no)*(1.51*(1-release)+1.054*release);
   const gateX=gateRoot.position.x+startDir.dz*(h.no-CENTER)*1.51;
   const gateZ=gateRoot.position.z-startDir.dx*(h.no-CENTER)*1.51;
   const staging=Math.max(0,1-Math.min(1,clock/.8));
   m.root.position.set(
    (d.x-d.dz*lane)*(1-staging)+gateX*staging,
    d.y+.12,
    (d.z+d.dx*lane)*(1-staging)+gateZ*staging
   );
   const size=.88+.12*Math.max(0,Math.min(1,clock/3.0));m.root.scale.setScalar(size);
   m.root.rotation.y=Math.atan2(d.dx,d.dz);
   // Entirely new ground-contact + two-bone IK gait, loaded from gallop-ik.js.
   updateGallop(m,clock,LIVE.visualTime,h.no,clock/LIVE.duration);
   m.sprite.material.opacity=order.slice(0,3).some(x=>x.no===h.no)?1:.88;
  }
  updateGates(clock);
  // The starting gate remains a permanent 3D venue object, including in the outside camera.
  gateRoot.visible=true;
  const raceProgress=Math.min(1,Math.max(0,clock/LIVE.duration));
  const rate=+document.getElementById('live-rate').value;
  // Dedicated cinematic director: automatic camera, lights, turf spray,
  // luminous gallop streaks, duel titles and finish celebrations.
  // Does not touch horseProgress, standings or any forecast calculation.
  const shotDirection=cinematics.update({clock,progress:raceProgress,order,finishOrder:LIVE.rank,frameDt,camera,desired,look,rate});
  // Framerate-independent camera tracking, responsive enough for 16x playback.
  const followAlpha=1-Math.exp(-frameDt*(8+rate*1.5));
  // A deliberate 16x cut is a new shot, not a dizzying several-second
  // camera orbit across the whole course. Between cuts, track smoothly.
  if(first||shotDirection?.cut){
   camera.position.copy(desired);smoothLook.copy(look);first=false;
  }else{
   camera.position.lerp(desired,followAlpha);
   smoothLook.lerp(look,followAlpha);
  }
  camera.lookAt(smoothLook);
  renderer.render(scene,camera);
 }
 animate();
 }catch(err){
  console.error('3D renderer error',err);
  show3DFailure(err?.message||err);
  document.getElementById('horse-model-version').textContent='⚠ 3D INIT ERROR';
 }
})();
