/**
 * Racecourse environment v18 — fully procedural 3D grounds built for
 * the v18 engine: striped turf with a worn inside band, continuous
 * rails, a roofed grandstand with a dotted crowd, trees, clouds,
 * distant silhouettes, a detailed starting gate with individual
 * sprung doors, and finish furniture per venue. Kyoto keeps its
 * pond and live Turf Vision through the shared landmark module and
 * its far-side goal board; Hanshin and generic courses use the same
 * environment system with a v18 finish monument.
 *
 * Pure presentation: no race RNG, order or prediction imports.
 */
import {kyotoOuterCourseOffset} from './kyoto-course.js';
import {buildKyotoLandmarks} from './kyoto-landmarks.js';
import {createKyotoGoalBoard} from './kyoto-goal-board.js';
import {createJRAFurlongPosts} from './jra-furlong-posts.js';

export const COURSE_V18=Object.freeze({model:'procedural-course-v18'});

function canvasTexture(THREE,w,h,draw){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 draw(canvas.getContext('2d'),w,h);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
 return texture;
}
/** Mown stripe bands across the running direction + fine grain. */
export function turfTexture(THREE){
 return canvasTexture(THREE,256,256,(g)=>{
  g.fillStyle='#5d8a3c';g.fillRect(0,0,256,256);
  g.fillStyle='#639344';g.fillRect(0,0,256,128);
  for(let i=0;i<5200;i++){
   const x=Math.random()*256,y=Math.random()*256,s=Math.random();
   g.fillStyle=s<.5?'rgba(38,74,26,.16)':'rgba(168,205,120,.13)';
   g.fillRect(x,y,1.6,2.6);
  }
  for(let i=0;i<260;i++){
   g.fillStyle='rgba(120,96,52,.05)';
   g.fillRect(Math.random()*256,Math.random()*256,3,1.4);
  }
 });
}
function signTexture(THREE,text,bg='#1d3a4a',fg='#f2f5ec',w=1024,h=64){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const g=canvas.getContext('2d');
 g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;
 g.textAlign='center';g.textBaseline='middle';
 g.font='700 40px "Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif';
 g.fillText(text,w/2,h/2+2);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

/** Ribbon between two lane functions over progress [t0,t1]. */
function ribbon(THREE,{path,offsetPoint,laneA,laneB,t0=0,t1=1,step=.004,y=.02,material,worn=false,mapT=null}){
 const rows=[];
 for(let u=t0;u<=t1+1e-6;u+=step)rows.push(mapT?mapT(Math.min(u,t1)):Math.min(u,t1));
 const positions=[],colors=[],uvs=[],indices=[];
 const turfA=new THREE.Color(1,1,1),turfWorn=new THREE.Color(.82,.78,.66);
 rows.forEach((t,i)=>{
  const a=offsetPoint(t,laneA(t),y),b=offsetPoint(t,laneB(t),y);
  positions.push(a.x,a.y,a.z,b.x,b.y,b.z);
  const v=t*2400/12;
  uvs.push(0,v,1,v);
  // The inside edge (laneB side) takes the traffic: brown it out.
  const cb=worn?turfWorn:turfA;
  colors.push(turfA.r,turfA.g,turfA.b,cb.r,cb.g,cb.b);
  if(i>0){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.receiveShadow=true;
 return mesh;
}
function railRun(THREE,{offsetPoint,laneAt,t0=0,t1=1,step=.006,material,postMaterial,scene,mapT=null}){
 const rows=[];
 for(let u=t0;u<=t1+1e-6;u+=step)rows.push(mapT?mapT(Math.min(u,t1)):Math.min(u,t1));
 const positions=[],indices=[];
 rows.forEach((t,i)=>{
  const low=offsetPoint(t,laneAt(t),.58),high=offsetPoint(t,laneAt(t),1.04);
  positions.push(low.x,low.y,low.z,high.x,high.y,high.z);
  if(i>0){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const band=new THREE.Mesh(geometry,material);scene.add(band);
 const postCount=170;
 const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.035,1.12,6),postMaterial,postCount);
 const dummy=new THREE.Object3D();
 for(let i=0;i<postCount;i++){
  const u=t0+(t1-t0)*i/(postCount-1),t=mapT?mapT(u):u,p=offsetPoint(t,laneAt(t),.56);
  dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.updateMatrix();
  posts.setMatrixAt(i,dummy.matrix);
 }
 posts.instanceMatrix.needsUpdate=true;scene.add(posts);
 return band;
}

export function buildCourseV18({THREE,scene,config,path,offsetPoint,half,mat,venueName,metricKyoto,outer3000,hanshin,metricTokyo=false,trackEnd=1,trackAt=null,hanshinSpurEnd=0,landmarksOn=false,goalBoardOn=false}){
 const group=new THREE.Group();scene.add(group);
 const turfMat=new THREE.MeshStandardMaterial({map:turfTexture(THREE),roughness:1,metalness:0,vertexColors:true});
 const dirtMat=new THREE.MeshStandardMaterial({color:0x9a7c55,roughness:1,metalness:0,vertexColors:true});
 const outer=t=>kyotoOuterCourseOffset(t);
 // Ground apron.
 const ground=new THREE.Mesh(new THREE.CircleGeometry(760,40),
  new THREE.MeshStandardMaterial({color:0x51763a,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;group.add(ground);
 // Track ribbons.
 if(metricKyoto){
  group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>-half,laneB:t=>half,t1:1,material:turfMat,worn:true,mapT:trackAt}));
  group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>half+2,laneB:()=>half+13.5,t1:1,material:dirtMat,y:.015,mapT:trackAt}));
  group.add(ribbon(THREE,{path,offsetPoint,laneA:t=>outer(t)-half,laneB:t=>outer(t)+half,t1:1,material:turfMat,y:.018,mapT:trackAt}));
 }else if(outer3000||metricTokyo){
  group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>-half,laneB:()=>half,t1:1,material:turfMat,worn:true,mapT:trackAt}));
  if(metricTokyo){
   // Tokyo's dirt course loops inside the turf course.
   group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>-(half+15),laneB:()=>-(half+2.5),t1:1,material:dirtMat,y:.015,mapT:trackAt}));
  }
 }else if(hanshin){
  group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>-half,laneB:()=>half,t1:1,material:turfMat,worn:true,mapT:trackAt}));
  if(hanshinSpurEnd>0)group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>-half,laneB:()=>half,t1:1,material:turfMat,y:.016,mapT:u=>u*hanshinSpurEnd}));
 }else{
  group.add(ribbon(THREE,{path,offsetPoint,laneA:()=>-half,laneB:()=>half,t1:1,material:turfMat,worn:true,mapT:trackAt}));
 }
 // Finish line.
 {
  const a=offsetPoint(1,-half,.035),b=offsetPoint(1,half,.035);
  const dir=path(1);
  const geo=new THREE.BufferGeometry();
  const verts=new Float32Array([
   a.x-dir.dx*.3,a.y,a.z-dir.dz*.3, b.x-dir.dx*.3,b.y,b.z-dir.dz*.3,
   a.x+dir.dx*.3,a.y,a.z+dir.dz*.3, b.x+dir.dx*.3,b.y,b.z+dir.dz*.3]);
  geo.setAttribute('position',new THREE.BufferAttribute(verts,3));
  geo.setIndex([0,1,2,1,3,2]);geo.computeVertexNormals();
  group.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xf5f2e8})));
 }
 // Rails: continuous white bands + posts, inside and outside.
 const railMat=new THREE.MeshStandardMaterial({color:0xeef1ee,roughness:.5,metalness:.05,side:THREE.DoubleSide});
 const postMat=new THREE.MeshStandardMaterial({color:0xd7dcda,roughness:.55,metalness:.2});
 railRun(THREE,{offsetPoint,laneAt:()=>half+.55,material:railMat,postMaterial:postMat,scene:group,mapT:trackAt});
 if(metricKyoto){
  // Kyoto's outer rail follows the outer course flare.
  const rows=[];const step=.006;
  for(let u=0;u<=1+1e-6;u+=step)rows.push(trackAt?trackAt(Math.min(u,1)):Math.min(u,1));
  const positions=[],indices=[];
  rows.forEach((t,i)=>{
   const low=offsetPoint(t,outer(t)-14,.58),high=offsetPoint(t,outer(t)-14,1.04);
   positions.push(low.x,low.y,low.z,high.x,high.y,high.z);
   if(i>0){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry,railMat));
  const outerPosts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.035,1.12,6),postMat,170);
  const dummyPost=new THREE.Object3D();
  for(let i=0;i<170;i++){
   const t=trackAt?trackAt(i/169):i/169;
   const p=offsetPoint(t,outer(t)-14,.9);
   dummyPost.position.set(p.x,p.y-.34,p.z);dummyPost.updateMatrix();
   outerPosts.setMatrixAt(i,dummyPost.matrix);
  }
  outerPosts.instanceMatrix.needsUpdate=true;group.add(outerPosts);
 }else{
  railRun(THREE,{offsetPoint,laneAt:()=>-(half+.55),material:railMat,postMaterial:postMat,scene:group,mapT:trackAt});
 }
 // Furlong posts with readable digits.
 const furlong=createJRAFurlongPosts({THREE,scene:group,offsetPoint,distance:config?.distance||2000,half});
 // Grass tufts just inside the inner rail.
 {
  const blades=new THREE.InstancedMesh(new THREE.ConeGeometry(.05,.5,5),
   new THREE.MeshStandardMaterial({color:0x59863a,roughness:1}),1100);
  const dummy=new THREE.Object3D();
  for(let i=0;i<1100;i++){
   const u=(i*0.61803398875)%1,t=trackAt?trackAt(u):u,lane=half+1.1+((i*37)%10)*.16;
   const p=offsetPoint(t,lane,.22);
   dummy.position.set(p.x,p.y,p.z);
   dummy.rotation.set((i%7)*.04,0,(i%5)*.05);
   dummy.scale.setScalar(.7+((i*13)%10)*.07);dummy.updateMatrix();
   blades.setMatrixAt(i,dummy.matrix);
  }
  blades.instanceMatrix.needsUpdate=true;group.add(blades);
 }
 // Roofed grandstand with a dotted crowd, behind the finish.
 const stand=new THREE.Group();
 {
  const finish=path(1);
  const kyotoLike=metricKyoto||outer3000||hanshin;
  if(metricTokyo)stand.position.set(210,0,finish.z+105);
  else stand.position.set(-35,0,kyotoLike?finish.z+105:150);
  group.add(stand);
  const concrete=new THREE.MeshStandardMaterial({color:0xdfe5dc,roughness:.85});
  const seatA=new THREE.MeshStandardMaterial({color:0x7d9db3,roughness:.8});
  const seatB=new THREE.MeshStandardMaterial({color:0x9db8a4,roughness:.8});
  const glass=new THREE.MeshStandardMaterial({color:0x51707c,roughness:.3,metalness:.35});
  const roofMat=new THREE.MeshStandardMaterial({color:0xf2efe6,roughness:.7});
  const box=(w,h,d,m,x,y,z,occluder=false)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
   mesh.position.set(x,y,z);mesh.userData.cameraOccluder=occluder;stand.add(mesh);return mesh};
  box(216,3,34,concrete,0,1.5,0,true);
  for(let row=0;row<6;row++){
   box(216,1.7,5,row%2?seatB:seatA,0,4+row*1.75,-13+row*4.6,true);
   box(217,.16,5,concrete,0,4.95+row*1.75,-13+row*4.6);
  }
  box(216,2.2,10,glass,0,15.6,-2,true);
  for(let x=-102;x<=102;x+=24)box(.7,12,.7,concrete,x,9,13);
  box(224,.7,44,roofMat,0,17.6,1,true);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(120,7.5),
   new THREE.MeshBasicMaterial({map:signTexture(THREE,venueName==='東京'?'東京競馬場 フジビュースタンド':(venueName||'')+'競馬場')}));
  sign.position.set(0,13.2,-13.6);sign.rotation.y=Math.PI;stand.add(sign);
  const crowd=new THREE.InstancedMesh(new THREE.SphereGeometry(.4,5,4),
   new THREE.MeshStandardMaterial({roughness:.9}),420);
  const dummy=new THREE.Object3D();
  const palette=[0xe8e2d4,0xc7d2dd,0xd9b48f,0xa9bfa5,0xc4a7b8,0x8ea6bd].map(c=>new THREE.Color(c));
  for(let i=0;i<420;i++){
   const row=i%6,col=Math.floor(i/6);
   dummy.position.set(-104+col*3.0,5.4+row*1.75,-13+row*4.6);
   dummy.scale.set(.68,.95,.68);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);
   crowd.setColorAt(i,palette[i%palette.length]);
  }
  crowd.instanceMatrix.needsUpdate=true;
  if(crowd.instanceColor)crowd.instanceColor.needsUpdate=true;
  stand.add(crowd);
 }
 // Trees around the perimeter and hedges on the infield.
 {
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.22,2.6,6),
   new THREE.MeshStandardMaterial({color:0x5d4630,roughness:1}),110);
  const canopies=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.3,1),
   new THREE.MeshStandardMaterial({color:0x446f31,roughness:1,flatShading:true}),110);
  const dummy=new THREE.Object3D();
  for(let i=0;i<110;i++){
   const angle=i*2.39996,radius=400+((i*53)%130);
   const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius*.82+30;
   dummy.position.set(x,1.3,z);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);
   dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
   dummy.position.y=4.4+((i*29)%10)*.22;dummy.scale.setScalar(.8+((i*17)%10)*.05);
   dummy.updateMatrix();canopies.setMatrixAt(i,dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate=true;canopies.instanceMatrix.needsUpdate=true;
  group.add(trunks,canopies);
  const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),
   new THREE.MeshStandardMaterial({color:0x3b8052,roughness:1}),90);
  for(let i=0;i<90;i++){
   const p=offsetPoint(trackAt?trackAt(i/90):i/90,half+5.5,.8);
   dummy.position.set(p.x,p.y,p.z);dummy.scale.set(1.5,.9,1.4);dummy.rotation.set(0,0,0);
   dummy.updateMatrix();hedge.setMatrixAt(i,dummy.matrix);
  }
  hedge.instanceMatrix.needsUpdate=true;group.add(hedge);
 }
 // Clouds (sprites) and a distant silhouette ring softened by fog.
 {
  const cloudTex=canvasTexture(THREE,128,64,(g)=>{
   g.clearRect(0,0,128,64);
   for(const [x,y,r] of [[34,40,20],[62,32,26],[92,40,20],[62,44,24]]){
    const grad=g.createRadialGradient(x,y,2,x,y,r);
    grad.addColorStop(0,'rgba(255,255,255,.85)');grad.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=grad;g.beginPath();g.arc(x,y,r,0,7);g.fill();
   }
  });
  for(let i=0;i<10;i++){
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:.8,depthWrite:false}));
   const angle=i*2.39996;
   sprite.position.set(Math.cos(angle)*(380+(i%4)*70),130+(i%3)*26,Math.sin(angle)*(330+(i%4)*60));
   sprite.scale.set(150,55,1);group.add(sprite);
  }
  // Distant silhouettes sit far outside every venue's camera range
  // (Tokyo's finish camera reaches ~550m from the origin; a nearer
  // ring once swallowed it whole).
  const silhouetteMat=new THREE.MeshBasicMaterial({color:0x7e97a8,fog:true});
  for(let i=0;i<9;i++){
   const angle=i/9*Math.PI*2+.3;
   const isMountain=i%2===0;
   const mesh=isMountain
    ?new THREE.Mesh(new THREE.ConeGeometry(150+(i%3)*55,90+(i%4)*20,5),silhouetteMat)
    :new THREE.Mesh(new THREE.BoxGeometry(150,30+(i%5)*10,40),silhouetteMat);
   mesh.position.set(Math.cos(angle)*900,isMountain?36:14,Math.sin(angle)*800);
   mesh.rotation.y=angle;group.add(mesh);
  }
 }
 // Venue finish furniture.
 let goalBoard=null,landmarks=null;
 if(landmarksOn){
  landmarks=buildKyotoLandmarks(THREE,group,{raceName:config?.name||'京都競馬'});
 }
 if(goalBoardOn){
  goalBoard=createKyotoGoalBoard({THREE,scene:group,offsetPoint,path,half});
 }
 const goalRig=goalBoard?goalBoard.root:new THREE.Group();
 {
  const goalPoint=offsetPoint(1,half+6,0),goalDir=path(1);
  if(!goalBoard){
   goalRig.position.set(goalPoint.x,goalPoint.y,goalPoint.z);
   goalRig.rotation.y=Math.atan2(goalDir.dx,goalDir.dz)+Math.PI/2;
   group.add(goalRig);
  }else goalRig.scale.setScalar(.58);
  if(!goalBoardOn){
   const poleMat=new THREE.MeshStandardMaterial({color:0xf0f2ee,roughness:.4,metalness:.15});
   const accentMat=new THREE.MeshStandardMaterial({color:0xb03a30,roughness:.55});
   for(const sideX of [-3.4,3.4]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,6.4,10),poleMat);
    pole.position.set(sideX,3.2,0);pole.userData.cameraOccluder=true;goalRig.add(pole);
   }
   const beam=new THREE.Mesh(new THREE.BoxGeometry(7.4,.8,.3),accentMat);
   beam.position.set(0,6.2,0);goalRig.add(beam);
   const board=new THREE.Mesh(new THREE.PlaneGeometry(6.8,1.5),
    new THREE.MeshBasicMaterial({map:signTexture(THREE,(venueName||'')+' GOAL','#7a1f1a','#ffffff',1024,96),side:THREE.DoubleSide}));
   board.position.set(0,5.2,0);goalRig.add(board);
  }
 }
 // Tokyo turf vision: a live infield board opposite the home
 // straight, redrawn a few times a second with the race clock and
 // the current leader.
 let tokyoVision=null;
 if(metricTokyo){
  const base=offsetPoint(.93,-(half+30),0);
  const dir=path(.93);
  const g=new THREE.Group();
  g.position.set(base.x,0,base.z);
  g.rotation.y=Math.atan2(-dir.dz,dir.dx);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const board=new THREE.Mesh(new THREE.PlaneGeometry(46,11.5),
   new THREE.MeshBasicMaterial({map:texture}));
  board.position.y=8.5;g.add(board);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(47.5,12.5,.6),
   new THREE.MeshStandardMaterial({color:0x2c3438,roughness:.6}));
  frame.position.set(0,8.5,-.4);g.add(frame);
  for(const sx of [-20,20]){
   const leg=new THREE.Mesh(new THREE.BoxGeometry(1.1,3,.8),
    new THREE.MeshStandardMaterial({color:0x555f63,roughness:.6}));
   leg.position.set(sx,1.5,0);g.add(leg);
  }
  group.add(g);
  tokyoVision={group:g,ctx,texture,last:-1,
   draw(clock,orderNos){
    const stamp=Math.floor(clock*4);
    if(stamp===this.last)return;this.last=stamp;
    const c=this.ctx;c.fillStyle='#10181d';c.fillRect(0,0,1024,256);
    c.fillStyle='#e8f1f4';c.font='700 54px sans-serif';c.textAlign='left';
    c.fillText('東京競馬場',36,72);
    c.font='700 40px sans-serif';c.fillStyle='#9fd8a8';
    c.fillText(config.name||'',36,128);
    const mm=Math.floor(clock/60),ss=(clock%60).toFixed(1).padStart(4,'0');
    c.textAlign='right';c.fillStyle='#ffd76a';c.font='700 84px monospace';
    c.fillText(mm+':'+ss,988,96);
    const leadNo=orderNos?.[0]?.no;
    const leadHorse=config.horses?.find(h=>h.no===leadNo);
    c.textAlign='left';c.font='700 44px sans-serif';c.fillStyle='#e8f1f4';
    c.fillText(leadHorse?('先頭 '+leadHorse.no+' '+leadHorse.name):'',36,206);
    this.texture.needsUpdate=true;
   }};
  tokyoVision.draw(0,[]);
 }
 return {group,goalRig,goalBoard,landmarks,tokyoVision,furlongDigits:furlong.map(f=>f.digit),
  update(clock,orderNos){
   if(landmarks)landmarks.update(clock,orderNos);
   if(tokyoVision)tokyoVision.draw(clock,orderNos);
  }};
}

/** Detailed starting gate: individual sprung front doors per stall. */
export function buildStartingGateV18({THREE,scene,config,HS,startPoint,startDir}){
 const root=new THREE.Group();
 root.position.set(startPoint.x-startDir.dx*3.7,startPoint.y||0,startPoint.z-startDir.dz*3.7);
 root.rotation.y=Math.atan2(startDir.dx,startDir.dz);
 scene.add(root);
 const steel=new THREE.MeshStandardMaterial({color:0xc9d2d6,roughness:.42,metalness:.5});
 const darkSteel=new THREE.MeshStandardMaterial({color:0x51606a,roughness:.5,metalness:.45});
 const doorMat=new THREE.MeshStandardMaterial({color:0x2e7d4f,roughness:.55,metalness:.1});
 const roofMat=new THREE.MeshStandardMaterial({color:0x37505e,roughness:.6,metalness:.2});
 const stallWidth=1.20,depth=2.6,n=HS.length,span=n*stallWidth;
 const doors=[];
 const box=(w,h,d,m,x,y,z,parent=root)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh};
 for(let x=-span/2;x<=span/2+.01;x+=stallWidth)box(.07,2.6,.07,steel,x,1.3,depth/2);
 for(let x=-span/2;x<=span/2+.01;x+=stallWidth)box(.07,2.6,.07,darkSteel,x,1.3,-depth/2);
 box(span+.3,.18,.18,steel,0,2.62,depth/2);
 box(span+.3,.18,.18,darkSteel,0,2.62,-depth/2);
 box(span+.5,.22,depth+.5,roofMat,0,3.05,0);
 const banner=new THREE.Mesh(new THREE.PlaneGeometry(span*.96,1.0),
  new THREE.MeshBasicMaterial({map:signTexture(THREE,config?.name||'START GATE','#274b63','#ffffff',2048,96),side:THREE.DoubleSide}));
 banner.position.set(0,3.72,0);root.add(banner);
 const numberTexture=no=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;
  const g=canvas.getContext('2d');
  g.fillStyle='#f5f3ec';g.fillRect(0,0,128,96);
  g.fillStyle='#191c20';g.font='900 64px sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.fillText(String(no),64,52);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
 };
 for(let i=0;i<n;i++){
  const cx=(i-(n-1)/2)*stallWidth,no=HS[i].no;
  // Rear gate bars.
  for(let b=0;b<3;b++)box(stallWidth-.1,.07,.05,darkSteel,cx,.6+b*.7,-depth/2);
  // Front doors on edge pivots.
  for(const sideSign of [-1,1]){
   const pivot=new THREE.Group();
   pivot.position.set(cx+sideSign*stallWidth/2,0,depth/2);
   root.add(pivot);
   const panel=new THREE.Mesh(new THREE.BoxGeometry(stallWidth/2-.03,1.9,.05),doorMat);
   panel.position.set(-sideSign*(stallWidth/4),1.25,0);panel.castShadow=true;
   pivot.add(panel);
   doors.push({pivot,sideSign});
  }
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.62,.46),
   new THREE.MeshBasicMaterial({map:numberTexture(no)}));
  plate.position.set(cx,2.32,depth/2+.06);root.add(plate);
 }
 const easeOutBack=x=>{const c=1.70158;return 1+ (c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
 return {root,stallWidth,update(clock){
  const k=clock<=0?0:Math.min(1,clock/.55);
  const angle=easeOutBack(k)*1.85;
  for(const d of doors)d.pivot.rotation.y=d.sideSign*angle;
 }};
}
