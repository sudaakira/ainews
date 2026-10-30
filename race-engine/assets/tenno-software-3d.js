
/** Perspective Canvas compatibility renderer for the SAME animated THREE scene.
 * CPU skinning and depth sorting; dense decorative instances/shadows omitted. */
export function createSoftwareRenderer(T){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 let width=1,height=1,pixelRatio=1;
 const vp=new T.Matrix4(),world=new T.Vector3(),instance=new T.Matrix4(),combined=new T.Matrix4(),sun=new T.Vector3(-.3,.85,.4).normalize();
 const byte=c=>Math.round(Math.max(0,Math.min(1,c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055))*255);
 const project=(x,y,z)=>{const e=vp.elements,w=e[3]*x+e[7]*y+e[11]*z+e[15];if(w<=.1)return null;return {x:((e[0]*x+e[4]*y+e[8]*z+e[12])/w*.5+.5)*width,y:(.5-(e[1]*x+e[5]*y+e[9]*z+e[13])/w*.5)*height,d:w,wx:x,wy:y,wz:z}};
 function texture(img,uv,p){
  if(!img?.width||!img?.height||!uv)return false;
  const x0=uv[0][0]*img.width,y0=(1-uv[0][1])*img.height,x1=uv[1][0]*img.width,y1=(1-uv[1][1])*img.height,x2=uv[2][0]*img.width,y2=(1-uv[2][1])*img.height;
  const den=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(den)<.0001)return false;
  const solve=k=>[(p[0][k]*(y1-y2)+p[1][k]*(y2-y0)+p[2][k]*(y0-y1))/den,(p[0][k]*(x2-x1)+p[1][k]*(x0-x2)+p[2][k]*(x1-x0))/den,(p[0][k]*(x1*y2-x2*y1)+p[1][k]*(x2*y0-x0*y2)+p[2][k]*(x0*y1-x1*y0))/den];
  const a=solve('x'),b=solve('y');ctx.save();ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();ctx.clip();ctx.transform(a[0],b[0],a[1],b[1],a[2],b[2]);ctx.drawImage(img,0,0);ctx.restore();return true;
 }
 function render(scene,camera){
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#9dd8f0');sky.addColorStop(.37,'#c5e7ef');sky.addColorStop(.38,'#70a855');sky.addColorStop(1,'#4e944a');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const triangles=[];
  function faces(mesh,matrix){
   const geo=mesh.geometry,mat=mesh.material;if(!geo?.attributes.position||Array.isArray(mat)||!mat||mat.visible===false||mat.opacity<.75)return;
   if(mat.transparent&&mat.map)return;
   const pa=geo.attributes.position,index=geo.index,uv=geo.attributes.uv,colors=geo.attributes.color;
   if(mesh.isSkinnedMesh)mesh.skeleton.update();
   const points=new Array(pa.count);
   for(let i=0;i<pa.count;i++){if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,world);else world.fromBufferAttribute(pa,i);world.applyMatrix4(matrix);points[i]=project(world.x,world.y,world.z)}
   const n=index?index.count:pa.count,c=mat.color||{r:1,g:1,b:1},img=mat.map?.image;
   const textured=img&&(img.tagName==='CANVAS'||img.tagName==='IMG')&&uv;
   for(let i=0;i<n;i+=3){
    const ids=index?[index.getX(i),index.getX(i+1),index.getX(i+2)]:[i,i+1,i+2],p=ids.map(j=>points[j]);
    if(p.some(q=>!q)||p.every(q=>q.x< -5)||p.every(q=>q.x>width+5)||p.every(q=>q.y< -5)||p.every(q=>q.y>height+5))continue;
    if(Math.abs((p[1].x-p[0].x)*(p[2].y-p[0].y)-(p[1].y-p[0].y)*(p[2].x-p[0].x))<.035)continue;
    const ax=p[1].wx-p[0].wx,ay=p[1].wy-p[0].wy,az=p[1].wz-p[0].wz,bx=p[2].wx-p[0].wx,by=p[2].wy-p[0].wy,bz=p[2].wz-p[0].wz,nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,nl=Math.hypot(nx,ny,nz)||1;
    const light=.62+.38*Math.max(0,(nx*sun.x+ny*sun.y+nz*sun.z)/nl);let r=c.r,g=c.g,b=c.b;
    if(colors&&mat.vertexColors){r*=ids.reduce((a,j)=>a+colors.getX(j),0)/3;g*=ids.reduce((a,j)=>a+colors.getY(j),0)/3;b*=ids.reduce((a,j)=>a+colors.getZ(j),0)/3}
    const d=(p[0].d+p[1].d+p[2].d)/3,fog=Math.min(.30,Math.max(0,d-100)/1200),color='rgb('+[r*.95,g*.98,b].map((v,i)=>byte(v*light*(1-fog)+[.56,.78,.84][i]*fog)).join(',')+')';
    triangles.push({p,d,color,img:textured?img:null,uv:textured?ids.map(j=>[uv.getX(j),uv.getY(j)]):null});
   }
  }
  scene.traverseVisible(o=>{if(!o.isMesh)return;if(o.isInstancedMesh){if(o.count>60)return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);combined.multiplyMatrices(o.matrixWorld,instance);faces(o,combined)}}else faces(o,o.matrixWorld)});
  triangles.sort((a,b)=>b.d-a.d);
  for(const t of triangles){if(t.img&&texture(t.img,t.uv,t.p))continue;const p=t.p;ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();ctx.fill()}
  canvas.dataset.triangles=String(triangles.length);
 }
 return {domElement:canvas,isSoftware:true,capabilities:{getMaxAnisotropy:()=>1},setPixelRatio(r){pixelRatio=Math.min(1,r)},setSize(w,h){width=w;height=h;canvas.width=Math.round(w*pixelRatio);canvas.height=Math.round(h*pixelRatio)},render};
}
