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
 const stand=new T.Group();scene.add(stand);
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
 // Paddock outside the home straight, a gate building, pathways, and rows of trees.
 const paddock=new T.Mesh(new T.RingGeometry(10.5,13,56),mat(0xd7c5a3));paddock.rotation.x=-Math.PI/2;paddock.position.set(-87,-.17,130);paddock.scale.set(1.7,1,1);scene.add(paddock);
 addBox(scene,27,10,19,cream,67,5,126);addBox(scene,30,1,21,navy,67,10.5,126);
 const trees=[];for(let i=0;i<18;i++)trees.push([-138+i*16,i%2?102:-99]);
 for(let i=0;i<9;i++)trees.push([95+i*7,-86+i*21]);
 const leaves=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshLambertMaterial({color:0x69b77b}),trees.length*2);
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.36,.48,5,6),mat(0x997258),trees.length);
 trees.forEach(([x,z],i)=>{
  dummy.position.set(x,2.3,z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<2;j++){dummy.position.set(x+(j?1:-.8),5.2+j*.6,z);dummy.scale.set(3,3,3);dummy.updateMatrix();leaves.setMatrixAt(i*2+j,dummy.matrix);leaves.setColorAt(i*2+j,new T.Color(j?0x4ca65b:0x78c884))}
 });
 scene.add(leaves,trunks);
 // Clouds over the far horizon.
 const cloudMaterial=new T.MeshBasicMaterial({color:0xffffff,fog:false}),puff=new T.SphereGeometry(1,8,6);
 for(let i=0;i<8;i++){let cloud=new T.Group();cloud.position.set(-185+i*55,56+i%3*10,-195-i%2*25);
  for(let j=0;j<4;j++){let o=new T.Mesh(puff,cloudMaterial);o.position.set((j-1.5)*4,Math.sin(j)*1.7,0);o.scale.set(6,3.3,3.4);cloud.add(o)}scene.add(cloud)}
 return {stand,screen,trees:trees.length};
}