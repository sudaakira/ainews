/** Kyoto inner course landmarks for the 3D TV broadcast.
 * The 64.0m × 10.8m turf vision matches JRA's published specification.
 * Pond contour and landmarks are artistic reconstructions, NOT surveyed GIS.
 * No external image assets and no offsite requests.
 */
export function buildKyotoLandmarks(THREE,scene,{raceName='秋華賞'}={}){
 const landmarks={};
 const line=(pts,color,radius=.1)=>{
  const curve=new THREE.CatmullRomCurve3(pts.map(q=>new THREE.Vector3(...q)));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(32,pts.length*2),radius,5),
   new THREE.MeshStandardMaterial({color,roughness:.7}));
  scene.add(mesh);return mesh;
 };
 // Kyōto's central pond: irregular kidney shape, defined entirely in world
 // meters. The previous featureless ellipse was hidden in a flat green lawn.
 const pondX=-26,pondZ=-15,n=68;
 const ring=(sx,sz)=>{
  const pts=[];
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2;
   const ripple=1+.055*Math.sin(a*3+.3)+.038*Math.sin(5*a-1.2)+.045*Math.cos(7*a+.7);
   const bend=9*Math.sin(a)**2;
   pts.push([pondX+Math.cos(a)*sx*ripple+bend,
    pondZ+Math.sin(a)*sz*ripple+5*Math.cos(2*a)]);
  }
  return pts;
 };
 const shapeMesh=(coords,color,level,extra={})=>{
  const shape=new THREE.Shape();
  coords.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.07,
     transparent:Boolean(extra.opacity),opacity:extra.opacity??1,side:THREE.DoubleSide,depthWrite:!extra.opacity}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=level;
  scene.add(mesh);return mesh;
 };
 // Ground is y=-0.32: all features sit just above it. A broad stone rim,
 // reeds and light reflections make the pond readable on mobile.
 const shore=ring(106,56),edge=ring(99,50),water=ring(94,46);
 shapeMesh(shore,0x817b58,-.17);
 shapeMesh(edge,0xb9bf91,-.14);
 landmarks.pond=shapeMesh(water,0x398596,-.105);
 landmarks.pond.userData.kyotoLandmark='pond';
 const shoreOutline=water.map(([x,z])=>[x,-.075,z]);shoreOutline.push(shoreOutline[0]);
 line(shoreOutline,0xc5d9bc,.25);
 // Shallow light stripes hint at sun glitter; geometry stays static at 8x.
 const shimmerMat=new THREE.MeshBasicMaterial({color:0xe6f8ee,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
 const shimmer=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,.28),shimmerMat,22);
 const shimmerObj=new THREE.Object3D();
 for(let i=0;i<22;i++){
  const xx=pondX-69+(i*17)%143,zz=pondZ-24+(i*13)%55;
  shimmerObj.position.set(xx,-.071,zz);
  shimmerObj.rotation.set(-Math.PI/2,0,(i%3-1)*.06);
  shimmerObj.scale.set(3+(i%4)*1.8,1,1);
  shimmerObj.updateMatrix();shimmer.setMatrixAt(i,shimmerObj.matrix);
 }
 shimmer.instanceMatrix.needsUpdate=true;scene.add(shimmer);
 // One draw call for all 84 shoreline reeds: do not hurt mobile 8x playback.
 const reedMat=new THREE.MeshStandardMaterial({color:0x557743,roughness:1,side:THREE.DoubleSide});
 const reeds=new THREE.InstancedMesh(new THREE.ConeGeometry(.13,1.6,3),reedMat,84);
 const reedObj=new THREE.Object3D(),shoreReeds=ring(102,52);
 for(let i=0;i<84;i++){
  const r=shoreReeds[i%n];
  reedObj.position.set(r[0],.4,r[1]);
  reedObj.rotation.set(0,0,.1*Math.sin(i*1.83));
  reedObj.scale.set(1,1+(i%5)*.1125,1);
  reedObj.updateMatrix();reeds.setMatrixAt(i,reedObj.matrix);
 }
 reeds.instanceMatrix.needsUpdate=true;scene.add(reeds);
 // Large infield 'Multi-screen Turf Vision' 64m × 10.8m (official JRA).
 // Near the home stretch: face points toward the spectator/outside-rail
 // cameras (+z). The position is a schematic visual placement.
 const w=64,h=10.8,screenX=-123,screenZ=122,bottom=7.5;
 const frameGroup=new THREE.Group();
 frameGroup.position.set(screenX,0,screenZ);
 const steel=new THREE.MeshStandardMaterial({color:0x526570,metalness:.48,roughness:.58});
 const black=new THREE.MeshStandardMaterial({color:0x101b27,metalness:.16,roughness:.34});
 const addBox=(x,y,z,bw,bh,bd,m)=>{
  const o=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),m);
  o.position.set(x,y,z);frameGroup.add(o);return o;
 };
 for(const x of [-25,0,25])addBox(x,6.6,-.9,1.45,13.2,1.9,steel);
 addBox(0,bottom+h/2,-.4,w+3.5,h+2.5,1.45,steel);
 addBox(0,bottom+h/2,.40,w+1,h+1,.35,black);
 const canvas=document.createElement('canvas');
 canvas.width=1536;canvas.height=260;
 const ctx=canvas.getContext('2d');
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=4;
 const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}));
 face.position.set(0,bottom+h/2,.69);frameGroup.add(face);
 // Access stairs on the back, base engineering and speaker hood.
 for(const x of [-29,29]){
  addBox(x,1.35,-1.8,2.3,2.7,3.0,steel);
  addBox(x,4.0,-1.55,.17,4,.17,black);
 }
 frameGroup.userData.kyotoLandmark='turf-vision';
 scene.add(frameGroup);
 landmarks.turfVision=frameGroup;
 let lastKey='';
 function update(clock,order=[]){
  const key=Math.floor((Number(clock)||0)/1.5)+'/'+order.slice(0,5).map(x=>x.no).join(',');
  if(key===lastKey)return;
  lastKey=key;
  ctx.fillStyle='#041720';ctx.fillRect(0,0,1536,260);
  ctx.fillStyle='#0a3847';ctx.fillRect(0,0,1536,11);
  ctx.fillStyle='#d8eff1';ctx.font='bold 55px sans-serif';
  ctx.fillText('KYOTO',44,79);
  ctx.fillStyle='#b0d5bc';ctx.font='bold 28px sans-serif';
  ctx.fillText('TURF VISION',50,120);
  ctx.fillStyle='#ffffff';ctx.font='bold 56px sans-serif';
  ctx.fillText(raceName,370,84);
  ctx.font='29px sans-serif';ctx.fillStyle='#a9cbd2';
  ctx.fillText('京都競馬場  芝 2000m',375,134);
  ctx.fillStyle='#1c5060';ctx.fillRect(20,174,1494,62);
  ctx.font='bold 30px sans-serif';ctx.fillStyle='#effff7';ctx.fillText('LEAD',35,216);
  for(let i=0;i<5;i++){
   const no=order[i]?.no??i+1;
   const x=200+i*259;
   ctx.fillStyle=['#f5e8b9','#b7d8ea','#eaaabb','#cee6b6','#cdb4ea'][i];
   ctx.fillRect(x,181,58,46);
   ctx.fillStyle='#162b33';ctx.font='bold 33px sans-serif';ctx.fillText(String(no),x+10,216);
   ctx.font='bold 24px sans-serif';ctx.fillStyle='#e4f3f2';ctx.fillText((i+1)+'位',x+69,213);
  }
  tex.needsUpdate=true;
 }
 update(0,[]);
 return {pond:landmarks.pond,turfVision:frameGroup,update,
  audit:{pondCenter:{x:pondX,z:pondZ},pondWidth:212,pondDepth:112,
   visionScreenWidth:w,visionScreenHeight:h,visionLocation:{x:screenX,z:screenZ},
   source:'JRA 64.0m × 10.8m; positions approximate'}};
}
