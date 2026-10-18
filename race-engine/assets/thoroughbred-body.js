/** Photo-guided, continuous Thoroughbred surface over the unchanged v19 rig.
 * Shared once by every runner. All dimensions below are bind-pose metres.
 * No animation, bone transform, foot, race-state or camera is modified here.
 */
export function rebuildThoroughbred(T,geometry,scale=.46){
 const p=geometry.attributes.position,c=geometry.attributes.color,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
 let vertices=[],faces=[],lookup=new Map();const remap=[];
 const blend=(items)=>{const v={p:[0,0,0],c:[0,0,0],w:new Map()};for(const [a,f] of items){for(let k=0;k<3;k++){v.p[k]+=a.p[k]*f;v.c[k]+=a.c[k]*f}for(const [id,w] of a.w)v.w.set(id,(v.w.get(id)||0)+w*f)}return v};
 // The CC0 export duplicates vertices per face/material. Reconnect the actual
 // surface before subdivision; smoothing disconnected triangles makes cracks.
 for(let i=0;i<p.count;i++){
  const point=[p.getX(i),p.getY(i),p.getZ(i)],key=point.map(v=>v.toFixed(5)).join(',');
  if(!lookup.has(key)){const w=new Map();for(let k=0;k<4;k++){const id=si.getComponent(i,k);w.set(id,(w.get(id)||0)+sw.getComponent(i,k))}lookup.set(key,vertices.length);vertices.push({p:point,c:[c.getX(i),c.getY(i),c.getZ(i)],w})}remap.push(lookup.get(key));
 }
 const index=geometry.index;for(let i=0;i<(index?index.count:p.count);i+=3){const f=[0,1,2].map(k=>remap[index?index.getX(i+k):i+k]);if(new Set(f).size===3)faces.push(f)}
 const originalTriangles=faces.length;
 // Two genuine Loop subdivisions, including normalized/interpolated skin
 // weights. They replace the faceted silhouette, not just its vertex normals.
 for(let level=0;level<2;level++){
  const neighbours=vertices.map(()=>new Set()),edges=new Map(),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
  for(const f of faces)for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],o=f[(k+2)%3],key=edgeKey(a,b);neighbours[a].add(b);neighbours[b].add(a);if(!edges.has(key))edges.set(key,{a,b,opposite:[]});edges.get(key).opposite.push(o)}
  const boundary=vertices.map(()=>[]);for(const e of edges.values())if(e.opposite.length!==2){boundary[e.a].push(e.b);boundary[e.b].push(e.a)}
  const next=vertices.map((v,i)=>{const n=neighbours[i].size,b=boundary[i];if(b.length===2)return blend([[v,.75],[vertices[b[0]],.125],[vertices[b[1]],.125]]);if(b.length||!n)return v;const beta=n===3?3/16:3/(8*n);return blend([[v,1-n*beta],...[...neighbours[i]].map(j=>[vertices[j],beta])])});
  for(const e of edges.values()){e.id=next.length;next.push(blend(e.opposite.length===2?[[vertices[e.a],.375],[vertices[e.b],.375],...e.opposite.map(i=>[vertices[i],.125])]:[[vertices[e.a],.5],[vertices[e.b],.5]]))}
  const nextFaces=[];for(const [a,b,c] of faces){const ab=edges.get(edgeKey(a,b)).id,bc=edges.get(edgeKey(b,c)).id,ca=edges.get(edgeKey(c,a)).id;nextFaces.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}vertices=next;faces=nextFaces;
 }
 const gauss=(v,center,width)=>Math.exp(-(((v-center)/width)**2)),smooth=T.MathUtils.smoothstep;
 const positions=[],colors=[],skinIndices=[],skinWeights=[];
 for(const v of vertices){
  let [x,y,z]=v.p.map(v=>v*scale);const side=Math.sign(x),ax=Math.abs(x);
  // Deep heart-girth immediately behind a sloping shoulder, rising rearward
  // into the flank. A racehorse is neither a cylindrical barrel nor a box.
  const barrel=gauss(z,.08,.48)*gauss(y,1.29,.35),shoulder=gauss(z,.51,.23)*gauss(y,1.31,.28),quarter=gauss(z,-.54,.25)*gauss(y,1.36,.29);
  const sideSurface=smooth(ax,0,.14);
  x+=side*sideSurface*(.042*barrel+.038*shoulder+.052*quarter);
  y-=.048*gauss(z,.27,.36)*gauss(y,1.02,.17);
  y+=.055*gauss(z,-.21,.28)*gauss(y,1.02,.16);
  // Withers, long back and rounded croup, with a subtle lumbar transition.
  y+=.045*gauss(z,.39,.20)*gauss(y,1.62,.13)-.023*gauss(z,-.16,.27)*gauss(y,1.62,.13)+.045*quarter*gauss(y,1.56,.16);
  z-=.032*quarter*gauss(z,-.69,.18);
  // Muscles follow the shoulder's oblique axis and the gluteal mass; shallow
  // grooves separate scapula, triceps and gaskin without bolted-on ellipsoids.
  const scapula=gauss(z-(.46+(y-1.35)*-.60),0,.105)*gauss(y,1.34,.27);
  const triceps=gauss(z,.43,.15)*gauss(y,1.05,.16);
  const glute=gauss(z,-.60,.16)*gauss(y,1.43,.16),haunchGroove=gauss(z-(-.48+(y-1.25)*.65),0,.045)*gauss(y,1.28,.22);
  x+=side*sideSurface*(.034*scapula+.025*triceps-.016*gauss(z,.28,.045)*gauss(y,1.35,.20)+.024*glute-.012*haunchGroove);
  // A finer, arched neck (crest distinct from the lower throat), cheek and
  // long muzzle. Head endpoints stay in place so the existing reins still fit.
  x*=1-.10*gauss(z,.94,.24)*gauss(y,1.65,.28);
  y+=.028*gauss(z,.81,.22)*gauss(y,1.80,.14);
  x+=side*.012*gauss(z,1.22,.11)*gauss(y,1.82,.12);
  // Preserve the tendons and joints of the lower legs; subdividing a very
  // thin tube otherwise makes it uniformly pencil-thin at the carpus/hock.
  const lower=1-smooth(y,.55,.91),front=z>0,axis=front?.193:.192;
  if(y>.21&&y<.86){const joint=.010*gauss(y,front?.54:.61,.075);x+=side*joint*gauss(ax,axis,.09)*lower}
  positions.push(x/scale,y/scale,z/scale);
  // Bay coat darkens naturally at crest, ventral line and distal limbs.
  const darkLeg=(1-smooth(y,.35,.87))*.31,back=.13*gauss(y,1.63,.12)*gauss(z,0,.8),warm=.06*barrel;
  const shade=1-darkLeg-back+warm;colors.push(v.c[0]*shade,v.c[1]*shade,v.c[2]*shade);
  const weights=[...v.w].sort((a,b)=>b[1]-a[1]).slice(0,4),total=weights.reduce((s,p)=>s+p[1],0);while(weights.length<4)weights.push([0,0]);skinIndices.push(...weights.map(p=>p[0]));skinWeights.push(...weights.map(p=>p[1]/total));
 }
 const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('color',new T.Float32BufferAttribute(colors,3));result.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));result.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights,4));result.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vertices.length*2),2));result.setIndex(faces.flat());result.computeVertexNormals();result.computeBoundingSphere();
 result.userData={bodyRevision:'photo-thoroughbred-v24',originalTriangles,triangles:faces.length};return result;
}

/** Soft outdoor reflection light, shared by all coats (no baked photo texture).
 * A broad sky strip makes the shoulder/croup curvature readable, unlike the
 * old uniformly matte plastic. It doesn't replace the scene's actual lights.
 */
export function coatEnvironment(T){
 const size=64,faces=[];
 for(let face=0;face<6;face++){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d'),im=c.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1;
   const d=new T.Vector3(...[[1,-v,-u],[-1,-v,u],[u,1,v],[u,-1,-v],[u,-v,1],[-u,-v,-1]][face]).normalize();
   const sky=T.MathUtils.smoothstep(d.y,-.05,.45),strip=Math.exp(-(((d.y-.50)/.16)**2))*(.35+.65*Math.max(0,d.x));
   const i=(y*size+x)*4;im.data[i]=Math.min(255,55+sky*105+strip*80);im.data[i+1]=Math.min(255,61+sky*108+strip*80);im.data[i+2]=Math.min(255,49+sky*128+strip*70);im.data[i+3]=255;
  }c.putImageData(im,0,0);faces.push(canvas);
 }
 const texture=new T.CubeTexture(faces);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

/** Individually tapered locks replace the source's solid polygonal tail/mane.
 * The same Tail/Neck bone matrices drive them: no secondary animation added.
 */
export function rebuildHorseHair(T,mesh,body,scale=.46){
 const p=[],si=[],sw=[],uv=[],index=[],bones=mesh.skeleton.bones;
 const id=name=>bones.findIndex(b=>b.name===name),v=new T.Vector3();
 const bonePoint=name=>bones[id(name)].getWorldPosition(new T.Vector3()).multiplyScalar(scale);
 function strand(points,weights,radius,sides=4){
  const first=p.length/3;
  for(let r=0;r<points.length;r++){
   const t=r/(points.length-1),at=points[r],tangent=points[Math.min(r+1,points.length-1)].clone().sub(points[Math.max(0,r-1)]).normalize();
   const a=new T.Vector3(1,0,0).addScaledVector(tangent,-tangent.x).normalize(),b=tangent.clone().cross(a),width=radius*(.85+.15*Math.sin(Math.PI*t))*Math.pow(1-t,.65)+.00035;
   for(let k=0;k<sides;k++){const angle=k/sides*Math.PI*2,q=at.clone().addScaledVector(a,Math.cos(angle)*width).addScaledVector(b,Math.sin(angle)*width*.65).divideScalar(scale);p.push(...q.toArray());si.push(...weights[r].i);sw.push(...weights[r].w);uv.push(k/sides,t);if(r&&k<sides){const n=first+r*sides+k,prev=n-sides,next=first+r*sides+(k+1)%sides;index.push(prev,n,prev-k+(k+1)%sides,prev-k+(k+1)%sides,n,next)}}
  }
 }
 const tailNames=Array.from({length:7},(_,i)=>'Tail'+(i+1)),tail=tailNames.map(bonePoint),curve=new T.CatmullRomCurve3(tail);
 for(let lock=0;lock<64;lock++){
  const angle=lock*2.3999632297,spread=.046*Math.sqrt((lock+.5)/64),points=[],weights=[];
  for(let r=0;r<=24;r++){const t=r/24,q=curve.getPoint(t);q.x+=Math.cos(angle)*spread*(.5+Math.sin(Math.PI*t))+.012*Math.sin(t*8+angle)*t;q.z+=Math.sin(angle)*spread*(.6+t);q.y-=.07*t*t*(lock%4)/3;points.push(q);const boneT=t*6,a=Math.min(5,Math.floor(boneT)),f=boneT-a;weights.push({i:[id(tailNames[a]),id(tailNames[a+1]),0,0],w:[1-f,f,0,0]})}strand(points,weights,.007);
 }
 // Ray-sample the remodeled crest, so every mane root sits on the new neck.
 const geo=body.clone();geo.scale(scale,scale,scale);const surface=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));surface.updateMatrixWorld();const ray=new T.Raycaster();
 const bp=body.attributes.position,bi=body.attributes.skinIndex,bw=body.attributes.skinWeight;
 for(let lock=0;lock<26;lock++){
  const z=.60+lock/25*.52;ray.set(new T.Vector3(.004,2.5,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(surface)[0];if(!hit)continue;
  const ids=[hit.face.a,hit.face.b,hit.face.c],nearest=ids.reduce((a,b)=>v.fromBufferAttribute(bp,a).multiplyScalar(scale).distanceToSquared(hit.point)<new T.Vector3().fromBufferAttribute(bp,b).multiplyScalar(scale).distanceToSquared(hit.point)?a:b);
  const weights={i:Array.from({length:4},(_,k)=>bi.getComponent(nearest,k)),w:Array.from({length:4},(_,k)=>bw.getComponent(nearest,k))},points=[];
  const length=.045+.025*(.5+.5*Math.sin(lock*2.3));for(let r=0;r<=5;r++){const t=r/5;points.push(hit.point.clone().add(new T.Vector3((lock%3-1)*.008*t,length*t,-.04*t*t)))}strand(points,points.map(()=>weights),.012,4);
 }
 geo.dispose();surface.material.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(p,3));result.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));result.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));result.setIndex(index);result.computeVertexNormals();return result;
}
