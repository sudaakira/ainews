// Lightweight stylized Kyoto racecourse scenery for the WebGL race simulator.
export function buildScenery(T,scene,mat){
 const white=mat(0xf5f5f1),glass=mat(0x83bad0),steel=mat(0x7d929d),navy=mat(0x37627a);
 const box=(g,w,h,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o};
 const c=document.createElement('canvas');c.width=1024;c.height=192;
 const ctx=c.getContext('2d');ctx.fillStyle='#f9faf6';ctx.fillRect(0,0,1024,192);
 ctx.textAlign='center';ctx.fillStyle='#296a61';ctx.font='bold 87px sans-serif';ctx.fillText('KYOTO RACECOURSE',512,102);
 ctx.fillStyle='#427e7b';ctx.font='bold 46px sans-serif';ctx.fillText('京都競馬場',512,165);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const signMat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});
 const colors=[0xf16e81,0xffce6c,0x5ebdd6,0xffffff,0x8d73b3,0x65c782,0xf49e63,0x547eb5];
 function stand(z,side){
  const g=new T.Group();scene.add(g);
  box(g,168,2,23,white,-8,1.4,z);
  box(g,168,10,22,glass,-8,8,z+side*4);
  for(let k=0;k<4;k++){
   box(g,170,.55,29,white,-8,4+k*3.2,z+side*1);
   box(g,168,.4,3,navy,-8,4.4+k*3.2,z-side*10);
  }
  for(let k=0;k<5;k++)box(g,168,.55,3,k%2?white:steel,-8,5+k*1.15,z-side*(13+k*3));
  const roof=box(g,179,1.3,45,white,-8,19,z-side*6);roof.rotation.x=-side*.08;
  for(let x=-80;x<70;x+=24)box(g,.7,16,.7,steel,x,10,z+side*8);
  const sign=new T.Mesh(new T.PlaneGeometry(51,9.5),signMat);sign.position.set(-8,12.8,z-side*13.9);sign.rotation.y=side===-1?Math.PI:0;g.add(sign);
  const count=50*5,people=new T.InstancedMesh(new T.SphereGeometry(.55,6,5),new T.MeshLambertMaterial({color:0xffffff}),count);
  const dummy=new T.Object3D();
  for(let row=0;row<5;row++)for(let i=0;i<50;i++){
   const n=row*50+i;dummy.position.set(-87+i*3.16,5.0+row*1.15,z-side*(13+row*3));
   dummy.updateMatrix();people.setMatrixAt(n,dummy.matrix);people.setColorAt(n,new T.Color(colors[(i*7+row*11)%colors.length]));
  }
  g.add(people);
  for(let x=-75;x<70;x+=18){box(g,.12,4,.12,white,x,21,z+side*4);box(g,1.7,.85,.08,mat((x+100)%2?0xf17485:0x54a6cc),x+.85,22.5,z+side*4)}
 }
 stand(72,1);stand(-72,-1);
 const trees=[];
 for(let i=0;i<20;i++)trees.push([-110+(i%10)*24,i<10?111:-111]);
 for(let i=0;i<12;i++){let a=i*Math.PI/6;trees.push([108+Math.cos(a)*18,Math.sin(a)*103])}
 const leaves=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshLambertMaterial({color:0x6fba76}),trees.length*2);
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.35,.43,5,6),mat(0x96745c),trees.length);
 const d=new T.Object3D();
 trees.forEach(([x,z],i)=>{
  d.position.set(x,2.2,z);d.scale.set(1,1,1);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);
  for(let j=0;j<2;j++){d.position.set(x+(j?1:-.7),5.2+j*.6,z);d.scale.set(3,3,3);d.updateMatrix();leaves.setMatrixAt(i*2+j,d.matrix);leaves.setColorAt(i*2+j,new T.Color(j?0x49a75b:0x7bc983))}
 });
 scene.add(leaves,trunks);
 const cloudMat=new T.MeshBasicMaterial({color:0xffffff,fog:false}),puffGeo=new T.SphereGeometry(1,8,6);
 for(let i=0;i<7;i++){const cloud=new T.Group();cloud.position.set(-175+i*54,48+i%3*12,-180-i%2*25);
  for(let j=0;j<4;j++){let p=new T.Mesh(puffGeo,cloudMat);p.position.set((j-1.5)*4,Math.sin(j)*1.6,0);p.scale.set(6,3.4,3.4);cloud.add(p)}scene.add(cloud)}
}