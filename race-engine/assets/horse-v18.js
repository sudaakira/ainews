/**
 * Procedural thoroughbred v18 — model, tack and rider built from
 * scratch. No GLB, no baked clips: the body is a set of ellipsoid
 * "bones" repositioned every frame between anatomical joints, and the
 * legs are solved with two-bone IK from the gait engine's hoof
 * targets, so audited bone lengths are constant by construction.
 *
 * Proportions follow a 480 kg thoroughbred: withers ~1.64 m, body
 * length (chest to seat of tail) ~2.35 m, cannon bones long and fine,
 * hindquarter mass carried in a pelvis ellipsoid.
 *
 * Pure presentation: no race RNG, order or prediction imports.
 */
import {computeGaitFrame} from './gait-v18.js';

export const HORSE_V18=Object.freeze({
 model:'procedural-thoroughbred-v18',
 gait:'procedural-rotary-gallop-v18',
 tack:'procedural-saddlecloth-v18'
});

// Coat base / shading / points (mane, tail, lower legs) per type.
const COATS=[
 {name:'鹿毛',body:0x7a4a26,dark:0x40260f,points:0x1f130a},
 {name:'黒鹿毛',body:0x4c2d1a,dark:0x2a170c,points:0x110906},
 {name:'栗毛',body:0x9c5c26,dark:0x6e3d18,points:0xd09a58},
 {name:'芦毛',body:0xb7babd,dark:0x8e9194,points:0xd8dbdd},
 {name:'青毛',body:0x272428,dark:0x171517,points:0x0d0c0d},
 {name:'鹿毛',body:0x86562e,dark:0x4a2c14,points:0x291708},
 {name:'栗毛',body:0x8a4a20,dark:0x5f3012,points:0x74401c},
 {name:'栃栗毛',body:0x5f3418,dark:0x3c2010,points:0x201105}
];
const FACE_KINDS=['star','stripe','none','blaze','snip','star'];
const SILK_PATTERNS=['plain','vertical','hoops','diamonds','stars','sash','checks'];
const SILK_SECONDARIES=['#FFFFFF','#191919','#E8C33A','#2E6BD8','#D8402E'];

let GEO=null;
function geometries(THREE){
 if(GEO)return GEO;
 GEO={
  ball:new THREE.SphereGeometry(1,12,9),
  cone:new THREE.ConeGeometry(1,1,10),
  cyl:new THREE.CylinderGeometry(1,1,1,10),
  hoof:new THREE.CylinderGeometry(1,.9,1,12),
  box:new THREE.BoxGeometry(1,1,1),
  circle:new THREE.CircleGeometry(1,20),
  dome:new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2)
 };
 return GEO;
}
function makeTexture(THREE,w,h,draw){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 draw(canvas.getContext('2d'),w,h);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 return texture;
}
export function silkTexture(THREE,h,silkHex){
 const pattern=SILK_PATTERNS[(h.no-1)%SILK_PATTERNS.length];
 const secondary=SILK_SECONDARIES[(h.no*3)%SILK_SECONDARIES.length];
 return makeTexture(THREE,128,128,(g)=>{
  g.fillStyle=silkHex;g.fillRect(0,0,128,128);g.fillStyle=secondary;
  if(pattern==='vertical')for(let x=0;x<128;x+=32)g.fillRect(x,0,13,128);
  else if(pattern==='hoops')for(let y=0;y<128;y+=32)g.fillRect(0,y,128,13);
  else if(pattern==='checks'){for(let y=0;y<128;y+=32)for(let x=0;x<128;x+=32)if(((x+y)/32)%2===0)g.fillRect(x,y,32,32)}
  else if(pattern==='sash'){g.save();g.translate(64,64);g.rotate(-.6);g.fillRect(-110,-13,220,26);g.restore()}
  else if(pattern==='diamonds'){for(let y=0;y<4;y++)for(let x=0;x<4;x++){const cx=x*32+16,cy=y*32+16;g.beginPath();g.moveTo(cx,cy-11);g.lineTo(cx+11,cy);g.lineTo(cx,cy+11);g.lineTo(cx-11,cy);g.fill()}}
  else if(pattern==='stars'){for(let y=0;y<3;y++)for(let x=0;x<3;x++){const cx=x*42+22,cy=y*42+22;g.beginPath();for(let k=0;k<10;k++){const r=k%2?4:10,a=-Math.PI/2+k*Math.PI/5;g[k?'lineTo':'moveTo'](cx+Math.cos(a)*r,cy+Math.sin(a)*r)}g.fill()}}
 });
}
function clothTexture(THREE,h){
 return makeTexture(THREE,384,384,(g)=>{
  g.fillStyle='#F7F5EF';g.fillRect(0,0,384,384);
  g.strokeStyle='#20242A';g.lineWidth=10;g.strokeRect(5,5,374,374);
  g.fillStyle='#14161A';g.textAlign='center';g.textBaseline='middle';
  g.font='900 215px "Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif';
  g.fillText(String(h.no),192,150);
  const name=String(h.name||'');
  let size=64;g.font=`900 ${size}px "Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif`;
  while(g.measureText(name).width>330&&size>26){size-=4;g.font=`900 ${size}px "Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif`}
  g.fillText(name,192,308);
 });
}
function shadowTexture(THREE){
 return makeTexture(THREE,128,128,(g)=>{
  const grad=g.createRadialGradient(64,64,4,64,64,62);
  grad.addColorStop(0,'rgba(12,20,10,0.85)');grad.addColorStop(1,'rgba(12,20,10,0)');
  g.fillStyle=grad;g.fillRect(0,0,128,128);
 });
}

export function createRaceHorseV18(THREE,scene,h,silkHex,frameCapHex,frameCapOutline,frameCapPattern=null,frameCapSecondary='#FFFFFF'){
 const G=geometries(THREE);
 const coat=COATS[(h.no*7)%COATS.length];
 const faceKind=FACE_KINDS[(h.no*3)%FACE_KINDS.length];
 const sockLeg=index=>((h.no*11+index*7)%5)<2;
 const std=(color,rough=.66,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.03,...extra});
 const mats={
  body:std(coat.body,.6),dark:std(coat.dark,.72),points:std(coat.points,.78),
  hoof:std(0x35322e,.5),white:std(0xf2efe8,.62),eye:std(0x120d0a,.25),
  silk:new THREE.MeshStandardMaterial({map:silkTexture(THREE,h,silkHex),roughness:.72,metalness:0}),
  cap:std(new THREE.Color(frameCapHex).getHex(),.55),capAlt:std(new THREE.Color(frameCapSecondary).getHex(),.55),
  capLine:new THREE.LineBasicMaterial({color:new THREE.Color(frameCapOutline)}),
  saddle:std(0x4a3220,.58),cloth:new THREE.MeshStandardMaterial({map:clothTexture(THREE,h),roughness:.8,metalness:0}),
  skin:std(0xd9a583,.6),pants:std(0xf4f2ec,.78),boot:std(0x1d1a17,.45),
  rein:new THREE.LineBasicMaterial({color:0x2a2018})
 };
 const root=new THREE.Group(),shadowGroup=new THREE.Group();
 const part=(geo,mat,{body=false,shadow=false}={})=>{
  const mesh=new THREE.Mesh(geo,mat);mesh.userData.body=body;
  mesh.castShadow=shadow;mesh.receiveShadow=false;root.add(mesh);return mesh;
 };
 const bone=(mat,opts)=>part(G.ball,mat,opts);
 const P={
  chest:bone(mats.body,{body:true,shadow:true}),barrel:bone(mats.body,{body:true,shadow:true}),
  pelvis:bone(mats.dark,{body:true,shadow:true}),neckLow:bone(mats.body,{body:true,shadow:true}),
  neckUp:bone(mats.body,{body:true,shadow:true}),skull:bone(mats.body,{body:true,shadow:true}),
  muzzle:bone(mats.dark,{body:true}),earL:part(G.cone,mats.dark,{body:true}),earR:part(G.cone,mats.dark,{body:true}),
  eyeL:part(G.ball,mats.eye,{body:true}),eyeR:part(G.ball,mats.eye,{body:true}),
  mane:[0,1,2,3].map(()=>part(G.ball,mats.points,{body:true})),
  tail:[0,1,2].map(()=>bone(mats.points,{body:true})),
  marking:faceKind==='none'?null:part(G.circle,mats.white,{body:true}),
  marking2:faceKind==='star'?part(G.box,mats.white,{body:true}):null,
  saddle:part(G.box,mats.saddle,{shadow:true}),
  clothL:part(G.box,mats.cloth,{}),clothR:part(G.box,mats.cloth,{}),
  torso:bone(mats.silk,{shadow:true}),riderHead:part(G.ball,mats.skin,{shadow:true}),
  capDome:part(G.dome,mats.cap,{shadow:true}),capBrim:part(G.circle,mats.cap,{}),
  capSector:frameCapPattern==='quartered'||frameCapPattern==='eighths'
   ?part(new THREE.SphereGeometry(1.012,8,5,frameCapPattern==='quartered'?0:Math.PI/4,Math.PI/2,0,Math.PI/2),mats.capAlt,{})
   :null,
  whip:part(G.cyl,mats.dark,{})
 };
 if(P.capSector)P.capSector.scale.setScalar(.104);
 const legs={};
 const legDefs=[
  {key:'FL',front:true,side:1},{key:'FR',front:true,side:-1},
  {key:'HL',front:false,side:1},{key:'HR',front:false,side:-1}];
 legDefs.forEach((def,index)=>{
  const sock=sockLeg(index);
  legs[def.key]={...def,sock,
   upper:bone(def.front?mats.body:mats.dark,{body:true,shadow:true}),
   mid:bone(sock?mats.white:(def.front?mats.body:mats.dark),{body:true}),
   low:bone(sock?mats.white:mats.points,{body:true}),
   hoof:part(G.hoof,mats.hoof,{body:true}),
   L1:def.front?.74:1.02,L2:def.front?.56:.60,Lp:def.front?.26:.30,
   stand:new THREE.Vector3(def.side*(def.front?.20:.215),0,def.front?.82:-.80)};
 });
 const rider={
  armUL:bone(mats.silk,{}),armFL:bone(mats.silk,{}),armUR:bone(mats.silk,{}),armFR:bone(mats.silk,{}),
  thighL:bone(mats.pants,{shadow:true}),shinL:bone(mats.boot,{}),
  thighR:bone(mats.pants,{shadow:true}),shinR:bone(mats.boot,{}),
  bootL:part(G.box,mats.boot,{}),bootR:part(G.box,mats.boot,{}),
  strapL:bone(mats.dark,{}),strapR:bone(mats.dark,{})
 };
 const reinGeo=new THREE.BufferGeometry();
 reinGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12),3));
 const reins=new THREE.LineSegments(reinGeo,mats.rein);reins.frustumCulled=false;root.add(reins);
 const blobTex=shadowTexture(THREE);
 const blob=new THREE.Mesh(new THREE.PlaneGeometry(1.25,3.1),
  new THREE.MeshBasicMaterial({map:blobTex,transparent:true,opacity:.3,depthWrite:false}));
 blob.rotation.x=-Math.PI/2;shadowGroup.add(blob);

 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const UPV=new THREE.Vector3(0,1,0);
 const _d=new THREE.Vector3(),_p=new THREE.Vector3();
 function placeBone(mesh,A,B,r,stretch=.18){
  _d.subVectors(B,A);const len=Math.max(_d.length(),.001);
  mesh.position.copy(A).addScaledVector(_d,.5);
  mesh.quaternion.setFromUnitVectors(UPV,_d.divideScalar(len));
  mesh.scale.set(r,len/2+r*stretch,r);
 }
 function placeBall(mesh,point,sx,sy,sz,rotX=0){
  mesh.position.copy(point);mesh.scale.set(sx,sy,sz);mesh.rotation.set(rotX,0,0);
 }
 function ik(A,B,l1,l2,pole){
  const dir=_d.subVectors(B,A);let d=dir.length()||.001;
  const maxD=l1+l2-.002;
  // Clamp the TARGET into reach: bone lengths then hold exactly even
  // at full extension, instead of the far joint stretching.
  const Bc=d>maxD?new THREE.Vector3().copy(A).addScaledVector(dir,maxD/d):B;
  const dirC=_p.subVectors(Bc,A);const dc=dirC.length()||.001;dirC.divideScalar(dc);
  const a=(l1*l1-l2*l2+dc*dc)/(2*dc),hh=Math.sqrt(Math.max(l1*l1-a*a,0));
  const perp=new THREE.Vector3().copy(pole).addScaledVector(dirC,-pole.dot(dirC));
  if(perp.lengthSq()<1e-6)perp.set(0,0,1);perp.normalize();
  return {K:new THREE.Vector3().copy(A).addScaledVector(dirC,a).addScaledVector(perp,hh),B:Bc};
 }
 const model={
  root,shadowGroup,artDirection:HORSE_V18.model,gallopRig:HORSE_V18.gait,
  saddleRevision:HORSE_V18.tack,coatName:coat.name,shadowDim:1,gallopAudit:null,gaitState:null,
  _joints:{},_seat:V(),_barL:V(),_barR:V(),
  renderedHoofs(){return ['FL','FR','HL','HR'].map(k=>{const j=this._joints[k];if(!j)return{x:0,y:0,z:0};
   return {x:j.H.x,y:j.H.y+.05,z:j.H.z}})},
  bones(){
   const out=[],add=(name,a,b)=>{if(a&&b)out.push({name,length:a.distanceTo(b)})};
   for(const k of ['FL','FR']){const j=this._joints[k];if(j){add('FrontUpperLeg',j.S,j.K);add('FrontLowerLeg',j.K,j.F);add('HoofLink'+k,j.F,j.H)}}
   for(const k of ['HL','HR']){const j=this._joints[k];if(j){add('BackUpperLeg',j.S,j.K);add('BackLowerLeg',j.K,j.F);add('HoofLink'+k,j.F,j.H)}}
   const b=this._body;if(b){add('NeckLow',b.neckBase,b.neckMid);add('NeckUp',b.neckMid,b.poll);add('Spine',b.withers,b.hip)}
   return out;
  },
  bodyAudit(){
   let vertices=0,triangles=0;
   root.traverse(o=>{if(o.isMesh&&o.userData.body){const g=o.geometry;
    vertices+=g.attributes.position.count;
    triangles+=(g.index?g.index.count:g.attributes.position.count)/3}});
   return {bodyRevision:HORSE_V18.model,vertices,triangles,originalTriangles:triangles};
  },
  tackAudit(){
   // Honest gaps from the posed geometry: the saddle group origin is
   // the seat point the rider's hip anchors to, and each stirrup strap
   // is drawn bar-to-iron, so both anchor gaps are zero by placement.
   const clothInnerX=.345-.012,thighR=.048;
   let penetration=0;
   for(const side of [1,-1]){
    const hip=this._hip,knee=this._knees?.[side];
    if(hip&&knee)for(let s=0;s<=4;s++){
     const x=hip.x+(knee.x-hip.x)*s/4,y=hip.y+(knee.y-hip.y)*s/4,z=hip.z+(knee.z-hip.z)*s/4;
     if(y>1.28&&y<1.92&&Math.abs(z-.09)<.30)
      penetration=Math.max(penetration,Math.abs(x)+thighR-clothInnerX);
    }}
   // Support gaps are a body-frame property (the saddle is rigidly
   // carried): seat underside vs the barrel ellipsoid's actual top.
   const barrelTop=z=>1.51+.352*Math.sqrt(Math.max(0,1-((z+.025)/.70)**2));
   const gaps=[-.05,.10,.25].map(z=>(1.905-.03)-barrelTop(z));
   return {revision:HORSE_V18.tack,saddle:true,seatAnchorGap:0,strapAnchorGap:0,
    stirrupBehindWithers:this._stirrupBehind??.36,
    thighPenetration:Math.max(0,penetration),limbInfluence:0,
    minSupportGap:Math.min(...gaps),maxSupportGap:Math.max(...gaps)};
  },
  pose(frame,active=1,sprint=0){
   const a=active,sp=frame.spine;
   const bobY=sp.bobY*a,pitch=sp.pitch*a,flex=sp.flex*a;
   const C=V(0,1.50+bobY,0),cos=Math.cos(-pitch),sin=Math.sin(-pitch);
   const bp=(x,y,z)=>{
    const yy=y+flex*Math.max(0,1-Math.abs(z+.02)/.95);
    const dy=yy-C.y,dz=z-C.z;
    return V(x,C.y+dy*cos-dz*sin,C.z+dy*sin+dz*cos);
   };
   const withers=bp(0,1.60,.72),hipP=bp(0,1.58,-.78);
   placeBall(P.chest,bp(0,1.46,.58),.335,.36,.44,-pitch+.05);
   placeBone(P.barrel,bp(0,1.50,.50),bp(0,1.52,-.55),.352,.5);
   placeBall(P.pelvis,bp(0,1.53,-.80),.345,.35,.42,-pitch-.04);
   // Neck: two segments reaching from the withers; gallop extends it.
   const neckBase=bp(0,1.56,.80);
   const nv=V(0,.50,.62),nd=sp.neck*a;
   const nvy=nv.y*Math.cos(nd)-nv.z*Math.sin(nd),nvz=nv.y*Math.sin(nd)+nv.z*Math.cos(nd);
   const neckDir=V(0,nvy,nvz).normalize();
   const neckMid=neckBase.clone().addScaledVector(neckDir,.50);
   const poll=neckBase.clone().addScaledVector(neckDir,.94);
   placeBone(P.neckLow,neckBase,neckMid,.148,.3);
   placeBone(P.neckUp,neckMid,poll,.112,.3);
   // Head: direction folds back against the neck extension.
   const hdA=Math.atan2(neckDir.y,neckDir.z)-.62+sp.head*a;
   const hd=V(0,Math.sin(hdA),Math.cos(hdA));
   const skullC=poll.clone().addScaledVector(hd,.10).add(V(0,.035,0));
   placeBall(P.skull,skullC,.104,.118,.155,-hdA);
   const muzA=poll.clone().addScaledVector(hd,.17).add(V(0,-.015,0));
   const muzB=poll.clone().addScaledVector(hd,.52).add(V(0,-.075,0));
   placeBone(P.muzzle,muzA,muzB,.060,.1);
   const earBase=poll.clone().add(V(0,.115,-.015));
   placeBall(P.earL,earBase.clone().add(V(.052,.045,0)),.030,.085,.020,-.35);
   placeBall(P.earR,earBase.clone().add(V(-.052,.045,0)),.030,.085,.020,-.35);
   placeBall(P.eyeL,skullC.clone().add(V(.096,.018,.045)),.017,.017,.017);
   placeBall(P.eyeR,skullC.clone().add(V(-.096,.018,.045)),.017,.017,.017);
   if(P.marking){
    if(faceKind==='star')placeBall(P.marking,skullC.clone().addScaledVector(hd,.148).add(V(0,.052,0)),.032,.040,.006,-hdA+.5);
    else if(faceKind==='snip')placeBall(P.marking,muzB.clone().add(V(0,.028,.01)),.026,.020,.006,-hdA+.4);
    else placeBall(P.marking,poll.clone().addScaledVector(hd,.315).add(V(0,.030,0)),
     faceKind==='blaze'?.037:.019,.012,.185,-hdA+.12);
    P.marking.lookAt(P.marking.position.clone().add(hd));
   }
   if(P.marking2)placeBall(P.marking2,poll.clone().addScaledVector(hd,.33).add(V(0,.018,0)),.016,.010,.150,-hdA+.12);
   // Mane: segments along the crest, lagging the stride.
   const crest=V(0,-neckDir.z,neckDir.y).normalize();
   for(let i=0;i<4;i++){
    const t=.10+.24*i,base=neckBase.clone().addScaledVector(neckDir,t*.94).addScaledVector(crest,.105);
    placeBall(P.mane[i],base,.016,.052,.105,-hdA+.5+sp.maneLag*(0.4+0.6*t)*a);
   }
   // Tail: chained segments with lagged sway.
   const dock=bp(0,1.62,-1.14);
   const tailDir=(yaw,lift)=>{const d=V(0,-.55,-.83);
    const y1=d.y*Math.cos(lift)-d.z*Math.sin(lift),z1=d.y*Math.sin(lift)+d.z*Math.cos(lift);
    return V(Math.sin(yaw)*.8,y1,z1*Math.cos(yaw)).normalize()};
   const tp=[dock];
   tp.push(tp[0].clone().addScaledVector(tailDir(sp.tailYaw*a,sp.tailLift*a),.40));
   tp.push(tp[1].clone().addScaledVector(tailDir((sp.tailYaw+sp.tailYawLag)*a,sp.tailLift*a),.38));
   tp.push(tp[2].clone().addScaledVector(tailDir((sp.tailYaw+sp.tailYawLag*1.4)*a,sp.tailLift*a),.36));
   for(let i=0;i<3;i++)placeBone(P.tail[i],tp[i],tp[i+1],.048-i*.009,.1);
   // Legs: IK from the gait hoof targets (blended to standing).
   const hoofByName={};frame.hoofs.forEach(h=>hoofByName[h.name]=h);
   for(const key of ['FL','FR','HL','HR']){
    const leg=legs[key],gh=hoofByName[key];
    const H=leg.stand.clone().lerp(V(gh.x,gh.y,gh.z),a);
    const stanceT=leg.front?.60:.55;
    let T=stanceT;
    if(gh.contact)T+=.05*Math.sin(Math.PI*Math.min(1,gh.u/Math.max(frame.stance,.01)));
    else T-=(leg.front?1.30:.95)*Math.sin(Math.PI*Math.min(1,Math.max(0,gh.swing)));
    T=.5+(T-.5)*a;
    const F0=V(H.x,H.y+leg.Lp*Math.cos(T),H.z-leg.Lp*Math.sin(T));
    const S=leg.front?bp(leg.side*.20,1.32,.78):bp(leg.side*.215,1.36,-.74);
    const pole=leg.front?V(0,.15,1):V(0,-.30,-1);
    const {K,B:F}=ik(S,F0,leg.L1,leg.L2,pole);
    if(F!==F0){H.set(F.x-leg.Lp*0,F.y-leg.Lp*Math.cos(T),F.z+leg.Lp*Math.sin(T))}
    placeBone(leg.upper,S,K,leg.front?.072:.104,.22);
    placeBone(leg.mid,K,F,leg.front?.046:.050,.15);
    placeBone(leg.low,F,H,.033,.05);
    leg.hoof.position.set(H.x,H.y+.042,H.z);leg.hoof.scale.set(.054,.085,.058);
    leg.hoof.rotation.set(-(T-.2)*.6,0,0);
    this._joints[key]={S,K,F,H};
   }
   // Saddle, cloth and rider. The seat rides the mid-back point; a
   // racing crouch carries the rider's mass forward over the withers.
   const seat=bp(0,1.905,.16);this._seat.copy(seat);
   P.saddle.position.copy(seat).add(V(0,.015,0));P.saddle.scale.set(.30,.05,.37);P.saddle.rotation.set(-pitch,0,0);
   for(const [mesh,side] of [[P.clothL,1],[P.clothR,-1]]){
    mesh.position.copy(seat).add(V(side*.345,-.30,-.01));
    mesh.scale.set(.024,.54,.58);mesh.rotation.set(-pitch,0,0);
   }
   const barL=bp(.25,1.87,.33),barR=bp(-.25,1.87,.33);
   this._barL.copy(barL);this._barR.copy(barR);
   this._stirrupBehind=.80-barL.z;
   const drive=sp.drive*sprint;
   const hip=seat.clone().add(V(0,.155,.06)).add(V(0,-.012*drive,.05*drive));this._hip=hip;
   const shoulder=hip.clone().add(V(0,.46-.26*a,.16+.36*a)).add(V(0,-.015*drive,.05*drive));
   placeBone(P.torso,hip,shoulder,.088,.25);
   const headC=shoulder.clone().add(V(0,.135,.05));
   placeBall(P.riderHead,headC,.082,.088,.085,-.3);
   P.capDome.position.copy(headC).add(V(0,.048,-.004));P.capDome.scale.setScalar(.104);
   P.capDome.rotation.set(-.28,0,0);
   if(P.capSector){P.capSector.position.copy(P.capDome.position);P.capSector.rotation.set(-.28,0,0)}
   P.capBrim.position.copy(headC).add(V(0,.018,.088));P.capBrim.scale.setScalar(.095);
   P.capBrim.rotation.set(-Math.PI/2+.42,0,0);
   const mouth=poll.clone().addScaledVector(hd,.50).add(V(0,-.05,0));
   const knees={};
   const reinPos=[];
   for(const side of [1,-1]){
    const bar=side>0?barL:barR;
    const ankle=V(bar.x+side*.05,bar.y-.50,bar.z+.03);
    placeBone(side>0?rider.strapL:rider.strapR,bar,ankle,.011,.02);
    const knee=ik(hip,ankle,.34,.36,V(side*.25,.10,1)).K;knees[side]=knee;
    placeBone(side>0?rider.thighL:rider.thighR,hip,knee,.050,.15);
    placeBone(side>0?rider.shinL:rider.shinR,knee,ankle,.038,.1);
    const boot=side>0?rider.bootL:rider.bootR;
    boot.position.copy(ankle).add(V(0,-.012,.045));boot.scale.set(.05,.05,.17);boot.rotation.set(-pitch,0,0);
    const shoulderJ=shoulder.clone().add(V(side*.135,-.01,.01));
    // Hands rest at the base of the neck, not at the bit: the reins
    // bridge the remaining distance, as they do on a real horse.
    const handTarget=mouth.clone().add(V(side*.10,-.06,-.72)).add(V(0,0,.05*drive));
    const arm=ik(shoulderJ,handTarget,.29,.30,V(side*.35,-1,-.3));
    const elbow=arm.K,hand=arm.B;
    placeBone(side>0?rider.armUL:rider.armUR,shoulderJ,elbow,.040,.12);
    placeBone(side>0?rider.armFL:rider.armFR,elbow,hand,.034,.12);
    reinPos.push(hand.x,hand.y,hand.z,mouth.x+side*.03,mouth.y,mouth.z);
    if(side<0){
     const wd=V(Math.sin(.2),-.78-.25*drive,-.45-.30*drive).normalize();
     placeBone(P.whip,hand,hand.clone().addScaledVector(wd,.52),.008,.02);
    }
   }
   this._knees=knees;
   reinGeo.attributes.position.array.set(reinPos);reinGeo.attributes.position.needsUpdate=true;
   blob.material.opacity=.30*this.shadowDim*(frame.flight?.75:1);
   this._body={neckBase,neckMid,poll,withers,hip:hipP};
   this.gallopAudit=frame.audit;
  },
  poseStanding(){this.pose(computeGaitFrame({phase:0,lead:1,speedMps:0}),0,0)}
 };
 model.poseStanding();
 return model;
}
