/**
 * JRA-style 200m interval remaining-distance signs, rendered in 3D.
 * NOT generic signboards reading 400 or 600. As defined by the JRA:
 * red '4' on a circular white plate = 400m to finish.
 * Position follows the course model's progress (diagram only, not survey).
 * Visual-only: no alterations to results or speed.
 */
export function createJRAFurlongPosts({THREE,scene,offsetPoint,distance,half}){
 const red=new THREE.MeshLambertMaterial({color:0xc6222b});
 const white=new THREE.MeshLambertMaterial({color:0xfffcf3});
 const dark=new THREE.MeshLambertMaterial({color:0x394d49});
 const unit=new THREE.CylinderGeometry(.115,.115,.36,10);
 const poleGeom=new THREE.CylinderGeometry(.125,.14,2.6,12);
 const created=[];
 for(let meters=200;meters<distance;meters+=200){
  const t=1-meters/distance,group=new THREE.Group();
  group.position.copy(offsetPoint(t,half+2.8,0));
  const pole=new THREE.Mesh(poleGeom,white);pole.position.y=1.3;group.add(pole);
  for(let j=0;j<7;j++){
   const stripe=new THREE.Mesh(unit,j%2===0?red:white);
   stripe.position.set(0,.20+j*.36,0);group.add(stripe);
  }
  // Subtle tripod stabilizer, like real Japanese turf distance posts.
  for(let side of [-1,1]){
   const points=[new THREE.Vector3(0,.68,0),new THREE.Vector3(side*.38,.05,.36)];
   const direction=points[1].clone().sub(points[0]);
   const stand=new THREE.Mesh(new THREE.CylinderGeometry(.034,.043,direction.length(),6),white);
   stand.position.copy(points[0]).addScaledVector(direction,.5);
   stand.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
   group.add(stand);
  }
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,256,256);
  ctx.beginPath();ctx.arc(128,128,113,0,2*Math.PI);ctx.fillStyle='#fffdf7';ctx.fill();
  ctx.lineWidth=7;ctx.strokeStyle='#cecec7';ctx.stroke();
  ctx.fillStyle='#c8252d';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 '+(meters>=1000?'117':'163')+'px sans-serif';
  ctx.fillText(String(meters/100),128,135);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true}));
  sign.position.set(0,2.91,0);sign.scale.set(1.72,1.72,1);
  group.add(sign);
  const nub=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.13,10),dark);
  nub.position.y=2.69;group.add(nub);
  scene.add(group);created.push({meters,digit:meters/100,progress:t,group});
 }
 return created;
}
