// Kyoto Racecourse-inspired full-scene 3D environment. Coordinates match the simulator's turf route.
export function buildScenery(T,scene,mat){
 const cream=mat(0xf5f3ed),glass=mat(0x87b5c9),steel=mat(0x708895),navy=mat(0x335c73),green=mat(0x43935c),sand=mat(0xb99469),dirt=mat(0x9a7855);
 const addBox=(parent,w,h,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o};
 const ground=new T.Mesh(new T.PlaneGeometry(600,440),mat(0x52965b));ground.rotation.x=-Math.PI/2;ground.position.y=-.35;scene.add(ground);
 // Continuous western bend joins the existing 1400m race path into a complete oval.
 const leftVerts=[],leftIdx=[],leftWidth=12.8,steps=72;
 for(let i=0;i<=steps;i++){
  const t=i/steps,angle=Math.PI*t,x=-87-38*Math.sin(angle),z=33.4-67.4*t;
  const dx=-38*Math.PI*Math.cos(angle),dz=-67.4,den=Math.hypot(dx,dz);
  for(const side of [-1,1])leftVerts.push(x-side*leftWidth*dz/den,.035,z+side*leftWidth*dx/den);
  if(i<steps){const k=i*2;leftIdx.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const leftGeo=new T.BufferGeometry();leftGeo.setAttribute('position',new T.Float32BufferAttribute(leftVerts,3));leftGeo.setIndex(leftIdx);leftGeo.computeVertexNormals();
 const leftTrack=new T.Mesh(leftGeo,new T.MeshLambertMaterial({color:0x4eaa67,side:T.DoubleSide}));scene.add(leftTrack);
 // Inner turf loop and dirt loop: closed nested ribbons, plus their inner rails.
 function oval(x0,x1,radZ,material,width,rail){
  const mid=(x0+x1)/2,rx=(x1-x0)/2,points=[];
  for(let i=0;i<160;i++){let a=i/160*Math.PI*2;points.push(new T.Vector3(mid+rx*Math.cos(a),-.08,radZ*Math.sin(a)))}
  const curve=new T.CatmullRomCurve3(points,true,'centripetal');
  const verts=[],indices=[],edges=[[],[]];
  for(let i=0;i<=160;i++){
   const t=i/160,p=curve.getPoint(t),tan=curve.getTangent(t),den=Math.hypot(tan.x,tan.z)||1;
   for(let side of [-1,1]){
    const x=p.x-side*width*.5*tan.z/den,z=p.z+side*width*.5*tan.x/den;
    verts.push(x,.0,z);edges[(side+1)/2].push(new T.Vector3(x,.5,z));
   }
   if(i<160){let k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
  scene.add(new T.Mesh(g,new T.MeshLambertMaterial({color:material,side:T.DoubleSide})));
  if(rail)for(const edge of edges){const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge),160,.07,4,false),cream);scene.add(line)}
 }
 oval(-102,50,19,0x63b46e,11,true); // Inner turf
 oval(-84,35,8,0x9f805e,8,false);  // Dirt
 // Inner green island and garden, with a pond in the center.
 const island=new T.Mesh(new T.CircleGeometry(14,40),mat(0x70b77b));island.rotation.x=-Math.PI/2;island.position.set(-28,.08,0);island.scale.set(2.8,1,1);scene.add(island);
 const pond=new T.Mesh(new T.CircleGeometry(6,40),new T.MeshStandardMaterial({color:0x65bed6,roughness:.28,metalness:.1}));pond.rotation.x=-Math.PI/2;pond.position.set(-33,.11,0);pond.scale.set(2.3,1,1);scene.add(pond);
 for(let i=0;i<16;i++){let a=i*Math.PI/8;let flower=new T.Mesh(new T.SphereGeometry(.55,6,5),mat(i%2?0xffe07c:0xff89b2));flower.position.set(-28+24*Math.cos(a),.35,12*Math.sin(a));scene.add(flower)}
 // Kyoto's main grandstand on the home straight: Station Side and Goal Side wings.
 const stand=new T.Group();stand.position.z=66;scene.add(stand); // Set the grandstand well behind the outside rail and all tracking cameras.
 addBox(stand,172,3,31,cream,-8,1.5,78);
 addBox(stand,171,15,26,glass,-8,10.2,83);
 for(let k=0;k<4;k++){
  addBox(stand,173,.65,34,cream,-8,4.2+k*3.5,79);
  addBox(stand,170,.48,3,navy,-8,4.4+k*3.5,65);
 }
 for(let k=0;k<6;k++)addBox(stand,170,.65,3,k%2?cream:steel,-8,4.4+k*1.4,61-k*3);
 const roof=addBox(stand,186,1.6,47,cream,-8,22.8,73);roof.rotation.x=-.07;
 for(let x=-85;x<=70;x+=21)addBox(stand,.7,20,.7,steel,x,11.7,92);
 // Clearly visible grandstand roof sign, facing the infield.
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f7f4';ctx.fillRect(0,0,1024,256);
 ctx.textAlign='center';ctx.fillStyle='#1f6459';ctx.font='bold 80px sans-serif';ctx.fillText('KYOTO RACECOURSE',512,116);
 ctx.font='bold 62px sans-serif';ctx.fillText('京都競馬場',512,209);
 const signTex=new T.CanvasTexture(canvas);signTex.colorSpace=T.SRGBColorSpace;
 const sign=new T.Mesh(new T.PlaneGeometry(66,16),new T.MeshBasicMaterial({map:signTex,side:T.DoubleSide}));sign.position.set(-8,15,57);stand.add(sign);
 // Colorful spectator terraces, instanced to keep 16x playback responsive.
 const people=new T.InstancedMesh(new T.SphereGeometry(.55,6,5),new T.MeshLambertMaterial({color:0xffffff}),70*6);
 const dummy=new T.Object3D(),colors=[0xf07589,0xffd278,0x6ebfd9,0xffffff,0x9170bb,0x65bd86,0xf6a56b,0x5275b3];
 for(let row=0;row<6;row++)for(let i=0;i<70;i++){
  let n=row*70+i;dummy.position.set(-92+i*2.42,5+row*1.4,61-row*3);dummy.scale.set(.85,.95,.85);dummy.updateMatrix();people.setMatrixAt(n,dummy.matrix);
  people.setColorAt(n,new T.Color(colors[(i*7+row*13)%colors.length]));
 }
 stand.add(people);
 // Infield 64m turf-vision inspired giant video screen and its support columns.
 const screen=new T.Group();screen.position.set(18,0,0);scene.add(screen);
 addBox(screen,29,13,1.6,navy,0,14,0);
 addBox(screen,27.5,11.3,.4,mat(0x17374d),0,14,-1.1);
 addBox(screen,2,9,2,steel,-11,4.5,0);addBox(screen,2,9,2,steel,11,4.5,0);
 const cv=document.createElement('canvas');cv.width=768;cv.height=320;const cg=cv.getContext('2d');
 cg.fillStyle='#114b49';cg.fillRect(0,0,768,320);cg.textAlign='center';
 cg.fillStyle='#e9e8a5';cg.font='bold 90px sans-serif';cg.fillText('KYOTO',384,135);
 cg.fillStyle='#ffffff';cg.font='bold 54px sans-serif';cg.fillText('SWAN STAKES',384,225);
 const vt=new T.CanvasTexture(cv);vt.colorSpace=T.SRGBColorSpace;
 const vision=new T.Mesh(new T.PlaneGeometry(27.5,11.3),new T.MeshBasicMaterial({map:vt,side:T.DoubleSide}));
 vision.position.set(0,14,-1.38);screen.add(vision);
 // Paddock and entrance facilities set behind the moved grandstand to prevent camera occlusion.
 const paddock=new T.Mesh(new T.RingGeometry(10.5,13,56),mat(0xd7c5a3));paddock.rotation.x=-Math.PI/2;paddock.position.set(-87,-.17,190);paddock.scale.set(1.7,1,1);scene.add(paddock);
 addBox(scene,27,10,19,cream,67,5,190);addBox(scene,30,1,21,navy,67,10.5,190);
 const trees=[];for(let i=0;i<18;i++)trees.push([-138+i*16,i%2?177:-99]);
 for(let i=0;i<9;i++)trees.push([95+i*7,-86+i*21]);
 const leaves=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshLambertMaterial({color:0x69b77b}),trees.length*2);
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.36,.48,5,6),mat(0x997258),trees.length);
 trees.forEach(([x,z],i)=>{
  dummy.position.set(x,2.3,z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<2;j++){dummy.position.set(x+(j?1:-.8),5.2+j*.6,z);dummy.scale.set(3,3,3);dummy.updateMatrix();leaves.setMatrixAt(i*2+j,dummy.matrix);leaves.setColorAt(i*2+j,new T.Color(j?0x4ca65b:0x78c884))}
 });
 scene.add(leaves,trunks);

 // More recognizable race-day landmarks. Decorative layout is illustrative, not surveyed.
 const stone=mat(0xd9d8ce),red=mat(0xd75163),gold=mat(0xffd268),blue=mat(0x439ec5),asphalt=mat(0x87908d),whiteLine=mat(0xfaf7e9);
 const sphereGeo=new T.SphereGeometry(1,8,6);
 const ball=(parent,x,y,z,sx,sy,sz,m)=>{
  const o=new T.Mesh(sphereGeo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
 };
 // Entrance plaza behind the main grandstand, ticket counters, awnings and turnstiles.
 addBox(scene,183,.18,44,stone,-7,-.16,182);
 for(let i=0;i<8;i++){
  const x=-80+i*21;
  addBox(scene,15,5,7,cream,x,2.5,181);
  addBox(scene,15,.55,10,i%2?red:blue,x,5.4,179);
  for(let k=0;k<3;k++)addBox(scene,2.6,1.9,.15,glass,x-4.2+k*4.2,2.6,177.35);
  addBox(scene,.25,2.3,3,steel,x+7,1.15,175);
 }
 // Elevated covered walkway and a small pedestrian bridge.
 addBox(scene,130,.7,6,stone,-7,8.2,183);
 addBox(scene,130,.45,9,cream,-7,12.6,183);
 for(let x=-68;x<=55;x+=12){
  addBox(scene,.35,4.1,.35,steel,x,10.35,180.2);
  addBox(scene,.35,4.1,.35,steel,x,10.35,185.8);
 }
 // Paddock detail: circular rail, small inner grass island and benches.
 const paddockCenter=new T.Vector3(-87,0,190);
 const paddockCurve=[];
 for(let i=0;i<=64;i++){let a=i/64*Math.PI*2;paddockCurve.push(new T.Vector3(paddockCenter.x+19*Math.cos(a),1.15,paddockCenter.z+13*Math.sin(a)))}
 scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(paddockCurve,true),64,.12,5,true),cream));
 const paddockGrass=new T.Mesh(new T.CircleGeometry(10,40),green);paddockGrass.rotation.x=-Math.PI/2;paddockGrass.position.set(-87,-.12,190);paddockGrass.scale.set(1.6,1,1);scene.add(paddockGrass);
 for(let i=0;i<8;i++){let a=i*Math.PI/4;let x=-87+24*Math.cos(a),z=190+19*Math.sin(a);
  addBox(scene,3,.32,1.2,stone,x,.36,z);addBox(scene,3,1,.22,navy,x,.98,z+(.3*Math.sign(Math.sin(a))))}
 // Giant racecourse clock by the finish straight.
 const clockGroup=new T.Group();clockGroup.position.set(65,0,50);scene.add(clockGroup);
 addBox(clockGroup,1.6,14,1.6,steel,0,7,0);
 const clockFace=new T.Mesh(new T.CylinderGeometry(4.5,4.5,.7,32),cream);clockFace.rotation.x=Math.PI/2;clockFace.position.set(0,16,0);clockGroup.add(clockFace);
 const clockDark=mat(0x24485c);
 ball(clockGroup,0,16,-.47,.4,.4,.13,clockDark);
 for(let n=0;n<12;n++){let a=n*Math.PI/6;ball(clockGroup,3.5*Math.sin(a),16+3.5*Math.cos(a),-.48,.19,.19,.11,clockDark)}
 const minute=addBox(clockGroup,.24,2.9,.17,clockDark,0,17.45,-.52);minute.rotation.z=-.35;
 const hour=addBox(clockGroup,.30,1.8,.18,clockDark,-.6,16.7,-.56);hour.rotation.z=.75;
 // Two simple photo-finish camera towers and floodlight arrays.
 const lights=mat(0xf8f8df);
 for(const [x,z] of [[-94,49],[75,47],[-105,-50],[89,-51]]){
  addBox(scene,1.5,29,1.5,steel,x,14.5,z);
  addBox(scene,12,.8,1.5,navy,x,29.2,z);
  for(let k=0;k<6;k++)addBox(scene,1.55,1.15,.4,lights,x-4.7+k*1.9,29.2,z-.85);
  addBox(scene,2,2.1,2,cream,x,25.3,z);
 }
 // Turf-vision perimeter flowers, low hedges and vibrant sponsor boards.
 const hedgeGeo=new T.BoxGeometry(2.8,1.0,1.1);
 const hedgeCount=100,hedges=new T.InstancedMesh(hedgeGeo,new T.MeshLambertMaterial({color:0x348e50}),hedgeCount);
 for(let i=0;i<hedgeCount;i++){
  let a=i*Math.PI*2/hedgeCount,x=-29+43*Math.cos(a),z=24*Math.sin(a);
  dummy.position.set(x,.46,z);dummy.rotation.y=a;dummy.scale.set(1,1,1);dummy.updateMatrix();hedges.setMatrixAt(i,dummy.matrix)
 }
 scene.add(hedges);
 const flowerColors=[mat(0xf18da4),mat(0xffd86c),mat(0xf8f5ed),mat(0x9f86d8)];
 const flowerGeo=new T.SphereGeometry(.48,6,5);
 for(let c=0;c<4;c++){
  const count=55,patch=new T.InstancedMesh(flowerGeo,flowerColors[c],count);
  for(let i=0;i<count;i++){
   let x=-77+(i%11)*6.8,z=39+Math.floor(i/11)*1.8+c*2.5;
   dummy.position.set(x,.45,z);dummy.scale.set(.9,.75,.9);dummy.rotation.set(0,0,0);dummy.updateMatrix();patch.setMatrixAt(i,dummy.matrix)
  }
  scene.add(patch)
 }
 const adPalette=[red,blue,gold,green,navy];
 for(let i=0;i<22;i++){
  const x=-94+i*8.5;
  addBox(scene,7,2.3,.35,adPalette[i%5],x,1.4,45);
  addBox(scene,6.5,.24,.4,cream,x,2.65,45);
 }
 // Small service road and low-poly parked support vehicles behind the stands.
 addBox(scene,194,.11,14,asphalt,-8,-.19,213);
 const carBody=[mat(0xf2e9d8),red,blue,mat(0x75b79e),gold],wheel=mat(0x30363a);
 for(let i=0;i<13;i++){
  const x=-92+i*14.5,z=210+(i%2)*3.1,body=carBody[i%carBody.length];
  addBox(scene,6,1.8,3.2,body,x,1.15,z);
  addBox(scene,3.6,1.45,2.8,glass,x-.25,2.62,z);
  for(const sx of [-2.0,2.0])for(const sz of [-1.65,1.65])ball(scene,x+sx,.55,z+sz,.64,.64,.28,wheel);
 }
 // Start-area flags, finish-area bunting and camera platform.
 for(let i=0;i<24;i++){
  let x=-94+i*7.7,z=52;
  addBox(scene,.12,4,.12,cream,x,2,z);
  const flag=addBox(scene,2.0,.9,.10,i%3===0?red:i%3===1?blue:gold,x+1,3.35,z);
  flag.rotation.y=i%2?.10:-.10;
 }
 addBox(scene,7,5,5,steel,87,2.5,61);
 addBox(scene,8,2,7,navy,87,6,61);
 // Animated-looking fountain made of translucent blue water droplets.
 const fountainMat=new T.MeshLambertMaterial({color:0x8ce0f1,transparent:true,opacity:.76});
 const basin=new T.Mesh(new T.CylinderGeometry(6,6,1.1,24),stone);basin.position.set(34,.25,192);scene.add(basin);
 const water=new T.Mesh(new T.CylinderGeometry(5.5,5.5,.13,24),blue);water.position.set(34,.85,192);scene.add(water);
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9;
  ball(scene,34+2.8*Math.cos(a),2.5+((i%3)*.8),192+2.8*Math.sin(a),.38,1.8,.38,fountainMat)
 }

 // Clouds over the far horizon.
 const cloudMaterial=new T.MeshBasicMaterial({color:0xffffff,fog:false}),puff=new T.SphereGeometry(1,8,6);
 for(let i=0;i<8;i++){let cloud=new T.Group();cloud.position.set(-185+i*55,56+i%3*10,-195-i%2*25);
  for(let j=0;j<4;j++){let o=new T.Mesh(puff,cloudMaterial);o.position.set((j-1.5)*4,Math.sin(j)*1.7,0);o.scale.set(6,3.3,3.4);cloud.add(o)}scene.add(cloud)}
 return {stand,screen,trees:trees.length};
}