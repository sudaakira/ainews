/** Photo-guided racing tack. Geometry is sampled from the actual CC0 torso;
 * the hanging cloth uses torso weights and a moving-thigh contact pass.
 * Reference/limitations: docs/fitted-tack.md. Coordinates below are metres.
 */
export function prepareRacingTack(T,coat,scale){
 coat.updateWorldMatrix(true,false);coat.skeleton.update();
 const g=coat.geometry,positions=[];
 for(let i=0;i<g.attributes.position.count;i++)positions.push(...coat.getVertexPosition(i,new T.Vector3()).applyMatrix4(coat.matrixWorld).multiplyScalar(scale).toArray());
 const surface=new T.BufferGeometry();surface.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(g.index)surface.setIndex(g.index.clone());surface.computeVertexNormals();
 const body=new T.Mesh(surface,new T.MeshBasicMaterial({side:T.DoubleSide}));body.updateMatrixWorld();
 const ray=new T.Raycaster(),worldInverse=coat.matrixWorld.clone().invert(),si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
 const cast=(origin,direction)=>{ray.set(origin,direction);const hit=ray.intersectObject(body,false)[0];if(!hit)throw Error('Tack surface miss '+origin.toArray());return hit};
 const top=(x,z)=>cast(new T.Vector3(x,3,z),new T.Vector3(0,-1,0));
 const radial=(angle,z)=>{const cy=top(0,z).point.y-.34;return cast(new T.Vector3(0,cy,z),new T.Vector3(Math.sin(angle),Math.cos(angle),0))};
 const weights=hit=>{
  const ids=[hit.face.a,hit.face.b,hit.face.c],p=surface.attributes.position;
  const bary=T.Triangle.getBarycoord(hit.point,new T.Vector3().fromBufferAttribute(p,ids[0]),new T.Vector3().fromBufferAttribute(p,ids[1]),new T.Vector3().fromBufferAttribute(p,ids[2]),new T.Vector3());
  const accumulated=new Map();ids.forEach((id,j)=>{for(let k=0;k<4;k++){const index=si.getComponent(id,k),w=sw.getComponent(id,k)*bary.getComponent(j);accumulated.set(index,(accumulated.get(index)||0)+w)}});
  const pairs=[...accumulated].sort((a,b)=>b[1]-a[1]).slice(0,4),total=pairs.reduce((a,b)=>a+b[1],0);while(pairs.length<4)pairs.push([0,0]);return {indices:pairs.map(p=>p[0]),values:pairs.map(p=>p[1]/total)};
 };
 const clothWeights=hit=>{const w=weights(hit),values=w.values.map((value,i)=>/^(Torso\d*|Back|Body)$/.test(coat.skeleton.bones[w.indices[i]].name)?value:0),total=values.reduce((a,b)=>a+b,0);if(total<1e-6)throw Error('Cloth has no torso support');return {indices:w.indices,values:values.map(v=>v/total)}};
 const bindPoint=(point,w)=>{
  const skin=new T.Matrix4();skin.elements.fill(0);
  for(let i=0;i<4;i++){const m=new T.Matrix4().fromArray(coat.skeleton.boneMatrices,w.indices[i]*16);for(let j=0;j<16;j++)skin.elements[j]+=m.elements[j]*w.values[i]}
  skin.premultiply(coat.bindMatrixInverse).multiply(coat.bindMatrix);
  return point.clone().divideScalar(scale).applyMatrix4(worldInverse).applyMatrix4(skin.invert());
 };
 function builder(){
  const p=[],indices=[],skinI=[],skinW=[],uv=[],colors=[],anchors=[];
  return {
   vertex(point,hit,color=0xffffff,tex=[0,0],w=weights(hit)){const v=bindPoint(point,w),base=bindPoint(hit.point,w),c=new T.Color(color),id=p.length/3;p.push(...v.toArray());anchors.push(...base.toArray());skinI.push(...w.indices);skinW.push(...w.values);uv.push(...tex);colors.push(c.r,c.g,c.b);return id},
   face(a,b,c){indices.push(a,b,c)},
   strip(rows,cols,fn){const first=p.length/3;for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++)fn(r/rows,c/cols);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=first+r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1)}return first},
   geometry(){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinI,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(skinW,4));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const underlay=geo.clone();underlay.setAttribute('position',new T.Float32BufferAttribute(anchors,3));return {geo,underlay}}
  };
 }
 // The photo's cloth sits behind the shoulder and ends before the hip.
 // Its hanging hem is level; it must not wrap around the hindquarter.
 const cloth=builder(),leather=builder(),trim=builder(),stirrupVertices={},front=.43,rear=-.42,clothRows=32,clothCols=44;
 for(const side of [1,-1]){
  const hemAngles=Array.from({length:clothCols+1},(_,i)=>{const u=i/clothCols,z=side>0?front+(rear-front)*u:rear+(front-rear)*u;let lo=1.4,hi=2.35;for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(radial(side*mid,z).point.y>1.16)lo=mid;else hi=mid}return (lo+hi)/2});
  cloth.strip(clothRows,clothCols,(r,u)=>{const z=side>0?front+(rear-front)*u:rear+(front-rear)*u;
   const hit=radial(side*r*hemAngles[Math.round(u*clothCols)],z),point=hit.point.clone().addScaledVector(hit.face.normal,.013);
   // A saddlecloth hangs past the barrel; its lower half is not glued to a
   // contracting thigh. Small outward ease keeps the hanging hem clear.
   point.x+=side*(.012*T.MathUtils.smoothstep(r,0,.3)+.025*Math.pow(r,3));
   cloth.vertex(point,hit,0xffffff,[u,(side>0?1:.5)-r*.5],clothWeights(hit));
  });
  // Short, forward-cut racing flaps, lying above the cloth under the knees.
  const flap=leather.strip(12,16,(r,u)=>{const a=.32+r*.65,half=.025+.12*Math.pow(Math.sin(Math.PI*r),.3),z=.18+(u*2-1)*half,hit=radial(side*a,z);leather.vertex(hit.point.clone().addScaledVector(hit.face.normal,.032),hit,0x231e1c)});stirrupVertices[side]=flap+8;
 }
 // The girth follows the entire actual barrel, behind the forelegs.
 leather.strip(48,3,(r,u)=>{const hit=radial(r*Math.PI*2,.25+(u-.5)*.085);leather.vertex(hit.point.clone().addScaledVector(hit.face.normal,.024),hit,0x39291f)});
 const seatRows=16,seatCols=10,seatPoint=(r,u)=>{
  const z=-.18+r*.48,x=(u*2-1)*(.15-.04*r),hit=top(x,z);
  const y=hit.point.y+.035+.025*Math.pow(1-r,6)+.018*Math.pow(r,6);
  return {point:new T.Vector3(x,y,z),hit};
 };
 const upper=leather.strip(seatRows,seatCols,(r,u)=>{const {point,hit}=seatPoint(r,u);leather.vertex(point,hit,0x231e1c)});
 const lower=leather.strip(seatRows,seatCols,(r,u)=>{const {hit}=seatPoint(r,u);leather.vertex(hit.point.clone().addScaledVector(hit.face.normal,.025),hit,0x2b211c)});
 for(let r=0;r<=seatRows;r++)for(let c=0;c<=seatCols;c++)if(r===0||r===seatRows||c===0||c===seatCols){const a=upper+r*(seatCols+1)+c,b=lower+r*(seatCols+1)+c;let next;if(r===0&&c<seatCols)next=1;else if(c===seatCols&&r<seatRows)next=seatCols+1;else if(r===seatRows&&c>0)next=-1;else if(c===0&&r>0)next=-(seatCols+1);if(next!==undefined){leather.face(a,b,a+next);leather.face(a+next,b,b+next)}}
 // Piping outlines the raised cantle, pommel and thin seat rather than a blob.
 const edge=[];for(let i=0;i<=24;i++)edge.push(seatPoint(0,i/24));for(let i=1;i<=32;i++)edge.push(seatPoint(i/32,1));for(let i=23;i>=0;i--)edge.push(seatPoint(1,i/24));for(let i=31;i>=0;i--)edge.push(seatPoint(i/32,0));
 trim.strip(edge.length-1,6,(r,u)=>{const i=Math.round(r*(edge.length-1)),at=edge[i],t=edge[(i+1)%edge.length].point.clone().sub(edge[(i+edge.length-1)%edge.length].point).normalize(),n=new T.Vector3(0,1,0).addScaledVector(t,-t.y).normalize(),b=t.clone().cross(n),a=u*Math.PI*2;trim.vertex(at.point.clone().addScaledVector(n,Math.cos(a)*.004).addScaledVector(b,Math.sin(a)*.004),at.hit,0x554437)});
 body.material.dispose();surface.dispose();
 return {cloth:cloth.geometry(),leather:leather.geometry().geo,trim:trim.geometry().geo,stirrupVertices,seatVertex:upper+Math.floor(seatRows/2)*(seatCols+1)+seatCols/2,revision:'photo-racing-tack-v21'};
}

export function createRacingTack(T,coat,prepared,horse){
 const cv=document.createElement('canvas');cv.width=cv.height=1024;const c=cv.getContext('2d');
 for(const [row,numberX] of [[0,819],[512,205]]){
  c.fillStyle='#8d292d';c.fillRect(0,row,1024,512);
  c.fillStyle='#fff';c.textAlign='center';c.font='900 280px sans-serif';c.fillText(String(horse.no),numberX,row+396,380);
  c.font='900 95px sans-serif';c.fillText(horse.name,row===0?660:364,row+492,690);
 }
 const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
 const make=(geometry,material,name)=>{const m=new T.SkinnedMesh(geometry,material);m.name=name;m.position.copy(coat.position);m.quaternion.copy(coat.quaternion);m.scale.copy(coat.scale);m.bind(coat.skeleton,coat.bindMatrix);m.frustumCulled=false;coat.parent.add(m);return m};
 const cloth=make(prepared.cloth.geo,new T.MeshStandardMaterial({map:texture,roughness:1,side:T.DoubleSide}),'FittedSaddlecloth');
 // The lower cloth is driven by the back, but must drape OUTSIDE a flexing
 // thigh. Resolve that contact in the vertex shader, without CPU skinning
 // every cloth vertex for all 17 runners on every mobile frame.
 const collision={toHorse:{value:new T.Matrix4()},fromHorse:{value:new T.Matrix4()},hipL:{value:new T.Vector4()},kneeL:{value:new T.Vector4()},hipR:{value:new T.Vector4()},kneeR:{value:new T.Vector4()}};
 cloth.material.onBeforeCompile=shader=>{
  for(const [key,uniform] of Object.entries(collision))shader.uniforms['tack_'+key]=uniform;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 tack_toHorse,tack_fromHorse;\nuniform vec4 tack_hipL,tack_kneeL,tack_hipR,tack_kneeR;');
  shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
   vec3 clothHorse=(tack_toHorse*vec4(transformed,1.0)).xyz;
   float clothSide=clothHorse.x>=0.0?1.0:-1.0;
   vec4 thighA=clothSide>0.0?tack_hipL:tack_hipR,thighB=clothSide>0.0?tack_kneeL:tack_kneeR;
   vec2 thighAxis=thighB.yz-thighA.yz;
   float alongThigh=clamp(dot(clothHorse.yz-thighA.yz,thighAxis)/max(dot(thighAxis,thighAxis),0.00001),0.0,1.0);
   vec3 thighCenter=mix(thighA.xyz,thighB.xyz,alongThigh);
   float thighRadius=mix(thighA.w,thighB.w,alongThigh);
   float radialSquared=thighRadius*thighRadius-dot(clothHorse.yz-thighCenter.yz,clothHorse.yz-thighCenter.yz);
   if(radialSquared>0.0)clothHorse.x=clothSide*max(clothSide*clothHorse.x,clothSide*thighCenter.x+sqrt(radialSquared)+0.014);
   transformed=(tack_fromHorse*vec4(clothHorse,1.0)).xyz;
  `);
 };
 cloth.material.customProgramCacheKey=()=> 'torso-cloth-thigh-contact-v21';
 const skinVertex=cloth.getVertexPosition.bind(cloth);
 const contact=p=>{const side=p.x>=0?1:-1,a=collision[side>0?'hipL':'hipR'].value,b=collision[side>0?'kneeL':'kneeR'].value,dy=b.y-a.y,dz=b.z-a.z,t=T.MathUtils.clamp(((p.y-a.y)*dy+(p.z-a.z)*dz)/Math.max(dy*dy+dz*dz,.00001),0,1),cy=a.y+dy*t,cz=a.z+dz*t,r=a.w+(b.w-a.w)*t,squared=r*r-(p.y-cy)**2-(p.z-cz)**2;return squared>0?side*(a.x+(b.x-a.x)*t)+Math.sqrt(squared)+.014:null};
 // Mirror the shader only for inspection/raycast queries; normal rendering
 // keeps the shared skinned geometry on the GPU.
 cloth.getVertexPosition=(id,target)=>{skinVertex(id,target).applyMatrix4(collision.toHorse.value);const edge=contact(target),side=target.x>=0?1:-1;if(edge!==null)target.x=side*Math.max(side*target.x,edge);return target.applyMatrix4(collision.fromHorse.value)};
 let limbInfluence=0;const indices=cloth.geometry.attributes.skinIndex,weights=cloth.geometry.attributes.skinWeight;
 for(let i=0;i<indices.count;i++)for(let j=0;j<4;j++)if(!/^(Torso\d*|Back|Body)$/.test(coat.skeleton.bones[indices.getComponent(i,j)].name))limbInfluence=Math.max(limbInfluence,weights.getComponent(i,j));
 const leather=make(prepared.leather,new T.MeshStandardMaterial({vertexColors:true,roughness:.7,side:T.DoubleSide}),'RacingSaddleAndGirth');
 make(prepared.trim,new T.MeshStandardMaterial({vertexColors:true,roughness:.8,side:T.DoubleSide}),'SaddlePiping');
 const underlay=new T.SkinnedMesh(prepared.cloth.underlay);underlay.bind(cloth.skeleton,cloth.bindMatrix);
 const point=id=>leather.getVertexPosition(id,new T.Vector3()).applyMatrix4(leather.matrixWorld);
 return {revision:prepared.revision,seatPoint:()=>point(prepared.seatVertex),stirrupPoint:side=>point(prepared.stirrupVertices[side]),
  updateContact(root,bones){const inverse=root.matrixWorld.clone().invert();collision.toHorse.value.multiplyMatrices(inverse,cloth.matrixWorld);collision.fromHorse.value.copy(collision.toHorse.value).invert();for(const side of ['L','R'])for(const [key,bone,radius] of [['hip','BackLeg',.19],['knee','BackUpperLeg',.155]]){const p=bones[bone+side].getWorldPosition(new T.Vector3()).applyMatrix4(inverse);collision[key+side].value.set(p.x,p.y,p.z,radius)}},
  audit(){cloth.updateWorldMatrix(true,false);cloth.skeleton.update();underlay.bindMatrix.copy(cloth.bindMatrix);underlay.bindMatrixInverse.copy(cloth.bindMatrixInverse);let min=Infinity,max=0,penetration=0;for(let i=0;i<cloth.geometry.attributes.position.count;i+=7){const p=cloth.getVertexPosition(i,new T.Vector3()),local=p.clone().applyMatrix4(collision.toHorse.value),edge=contact(local);if(edge!==null)penetration=Math.max(penetration,edge-Math.abs(local.x));const a=p.applyMatrix4(cloth.matrixWorld),b=underlay.getVertexPosition(i,new T.Vector3()).applyMatrix4(cloth.matrixWorld),gap=a.distanceTo(b);min=Math.min(min,gap);max=Math.max(max,gap)}return {revision:prepared.revision,saddle:leather.visible,clothVertices:cloth.geometry.attributes.position.count,limbInfluence,thighPenetration:Math.max(0,penetration),minSupportGap:min,maxSupportGap:max}}
 };
}
