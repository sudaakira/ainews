// Thoroughbred v5 — complete replacement model. Local forward is +Z, up +Y.
// Horse body is an organic loft, not a pile of intersecting spheres.
// Four limbs have matching hip/knee/hoof geometry and support analytical gallop.
export function createRaceHorse(T,scene,h,silkHex){
 const root=new T.Group(),anim=new T.Group();root.add(anim);
 const coatColors=[0x848b91,0x593a30,0x815038,0x995e40,0xb2764c,0x686e75,0x633a30,0x976b4c,0x473b38,0x8b5a40,0x593d35,0x977759,0x754b37,0x69483d,0x805b48,0xa1795c,0x50403a,0x977e66];
 const base=coatColors[(h.no-1)%coatColors.length];
 const coat=new T.MeshStandardMaterial({color:base,roughness:.85});
 const shade=new T.MeshStandardMaterial({color:new T.Color(base).multiplyScalar(.76),roughness:.92});
 const highlight=new T.MeshStandardMaterial({color:new T.Color(base).multiplyScalar(1.13),roughness:.87});
 const mane=new T.MeshStandardMaterial({color:h.no%4===0?0x533a2c:0x302724,roughness:1});
 const hoofMat=new T.MeshStandardMaterial({color:0x26282b,roughness:.72});
 const leather=new T.MeshStandardMaterial({color:0x2c2220,roughness:.9});
 const cream=new T.MeshStandardMaterial({color:0xf2eee6,roughness:.88});
 const silk=new T.MeshStandardMaterial({color:silkHex,roughness:.74});
 const metal=new T.MeshStandardMaterial({color:0xced1cb,metalness:.35,roughness:.45});
 const pink=new T.MeshStandardMaterial({color:0x916a67,roughness:1});
 const eyeMat=new T.MeshPhysicalMaterial({color:0x241914,roughness:.17,clearcoat:.8});
 // Super Famicom-inspired 16px palette texture, tiled with nearest-neighbour filtering.
 // Per-coat 3-tone clusters make the horse look painted rather than plastic.
 function pixelCoat(hex){
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
  const ctx=canvas.getContext('2d');
  const c=new T.Color(hex),baseRgb='#'+c.getHexString();
  ctx.fillStyle=baseRgb;ctx.fillRect(0,0,32,32);
  const shadeHex='#'+c.clone().multiplyScalar(.80).getHexString();
  const lightHex='#'+c.clone().lerp(new T.Color(0xffffff),.16).getHexString();
  // Deterministic pixel clusters, no random flickering between frames.
  for(let y=0;y<32;y+=4)for(let x=0;x<32;x+=4){
   const seed=(x*13+y*19+(h.no||1)*7)%17;
   if(seed<4){ctx.fillStyle=shadeHex;ctx.fillRect(x,y,4,2);ctx.fillRect(x+2,y+2,2,2)}
   else if(seed>13){ctx.fillStyle=lightHex;ctx.fillRect(x,y,4,2)}
  }
  const tex=new T.CanvasTexture(canvas);
  tex.wrapS=T.RepeatWrapping;tex.wrapT=T.RepeatWrapping;
  tex.magFilter=T.NearestFilter;tex.minFilter=T.NearestFilter;
  tex.generateMipmaps=false;tex.colorSpace=T.SRGBColorSpace;
  return tex;
 }
 coat.map=pixelCoat(base);coat.color.set(0xffffff);coat.flatShading=true;coat.needsUpdate=true;
 shade.flatShading=true;highlight.flatShading=true;
 mane.flatShading=true;hoofMat.flatShading=true;
 const sphere=new T.SphereGeometry(1,12,9);

 const ell=(parent,material,x,y,z,sx,sy,sz)=>{
  const mesh=new T.Mesh(sphere,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
 };
 const box=(parent,material,x,y,z,sx,sy,sz)=>{
  const mesh=new T.Mesh(new T.BoxGeometry(sx,sy,sz),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 const tube=(parent,material,a,b,radA,radB)=>{
  const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);
  const m=new T.Mesh(new T.CylinderGeometry(radB,radA,v.length(),10),material);
  m.position.copy(p.add(q).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());parent.add(m);return m;
 };
 // Rounded Catmull-Rom rings: body cross-sections in the XY plane, advancing +Z.
 function loft(parent,material,rings,segments=18,steps=4){
  const points=[];
  const cr=(a,b,c,d,t)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for(let i=0;i<rings.length-1;i++)for(let q=0;q<steps;q++){
   const t=q/steps;
   points.push(rings[i].map((_,j)=>cr(rings[Math.max(0,i-1)][j],rings[i][j],rings[i+1][j],rings[Math.min(rings.length-1,i+2)][j],t)));
  }
  points.push(rings[rings.length-1]);
  const v=[],uv=[],idx=[];
  points.forEach(([x,y,z,rx,ry],i)=>{
   for(let k=0;k<=segments;k++){
    const a=2*Math.PI*k/segments;
    v.push(x+Math.cos(a)*Math.max(.01,rx),y+Math.sin(a)*Math.max(.01,ry),z);
    uv.push(k/segments,i/(points.length-1));
   }
  });
  for(let i=0;i<points.length-1;i++)for(let k=0;k<segments;k++){
   const a=i*(segments+1)+k,b=a+segments+1;
   idx.push(a,a+1,b,a+1,b+1,b);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new T.Mesh(g,material);parent.add(m);return m;
 }
 // Stylized 16-bit racehorse proportions: round compact barrel, distinct rump,
 // deep shoulder, SHORT arched neck. The profile must read at mobile-screen size.
 loft(anim,coat,[
  [0,1.63,-1.58,.06,.08],[0,1.60,-1.41,.42,.45],
  [0,1.57,-1.10,.58,.59],[0,1.54,-.65,.61,.62],
  [0,1.55,-.10,.60,.61],[0,1.58,.37,.59,.62],
  [0,1.65,.76,.60,.66],[0,1.73,1.02,.48,.55],
  [0,1.83,1.17,.24,.32],[0,1.89,1.20,.035,.06]
 ]);
 // The shorter neck avoids the giraffe/crocodile silhouette of the old horse.
 loft(anim,coat,[
  [0,1.83,.78,.39,.43],[0,1.95,1.00,.38,.43],
  [0,2.12,1.19,.33,.38],[0,2.30,1.34,.27,.32],
  [0,2.43,1.42,.22,.24],[0,2.50,1.46,.14,.15]
 ]);
 for(const side of [-1,1]){
  ell(anim,coat,side*.39,1.45,.72,.25,.42,.36);
  ell(anim,coat,side*.38,1.42,-1.11,.27,.47,.40);
 }
 // Derby Stallion 2-inspired original character proportions.
 // No long tapered mesh: rounded forehead + cheek + short downturned muzzle.
 const headRig=new T.Group();headRig.position.set(0,2.45,1.42);anim.add(headRig);
 // Forehead slopes only slightly forward; a round cheek gives a gentle expression.
 const skull=ell(headRig,coat,0,.04,.17,.325,.37,.31);
 skull.rotation.x=-.16;
 ell(headRig,coat,0,-.20,.25,.315,.32,.30);
 // Short nasal bridge, deliberately less than half the previous snout length.
 const bridge=ell(headRig,coat,0,-.35,.41,.225,.31,.22);
 bridge.rotation.x=.31;
 // Rounded velvety muzzle, lips and two small nostrils.
 ell(headRig,highlight,0,-.55,.53,.265,.18,.20);
 ell(headRig,shade,0,-.675,.56,.22,.065,.13);
 for(const side of [-1,1]){
  // Eye patch and bright oversized eyes. Readable at 150px horse height.
  ell(headRig,shade,side*.284,.100,.225,.065,.113,.116);
  ell(headRig,eyeMat,side*.325,.105,.245,.060,.098,.102);
  ell(headRig,cream,side*.375,.147,.294,.023,.029,.026);
  ell(headRig,coat,side*.287,.202,.215,.064,.025,.105);
  // Upright triangular-ish ears with inner ear, softened at the tip.
  const ear=ell(headRig,coat,side*.20,.49,-.06,.13,.26,.12);
  ear.rotation.z=-side*.13;
  const inner=ell(headRig,pink,side*.215,.53,.016,.058,.14,.037);
  inner.rotation.z=-side*.13;
  ell(headRig,shade,side*.202,-.54,.697,.042,.033,.021);
  // Delicate bridle and bit, away from the eyes.
  tube(headRig,leather,[side*.26,.01,.04],[side*.22,-.52,.55],.012,.012);
  ell(headRig,metal,side*.228,-.52,.55,.024,.025,.024);
 }
 tube(headRig,leather,[-.23,-.56,.59],[.23,-.56,.59],.015,.015);
 // Forelock and short mane, with rounded tuft tips.
 for(let i=0;i<6;i++){
  const tuft=ell(headRig,mane,(i-2.5)*.079,.34,.23,.070,.13,.115);
  tuft.rotation.x=-.25;
 }
 for(let i=0;i<10;i++){
  const z=1.42-i*.067,y=2.48-i*.060;
  const tuft=ell(anim,mane,0,y,z,.085,.115,.115);
  tuft.rotation.x=-.25;
 }
 // White blaze for some horses, with geometry laid on the short forehead.
 if(h.no%4===1){
  ell(headRig,cream,0,.04,.479,.045,.21,.020);
  ell(headRig,cream,0,-.26,.587,.038,.10,.018);
 }
 const tailRig=new T.Group();tailRig.position.set(0,1.78,-1.66);anim.add(tailRig);
 tube(tailRig,mane,[0,0,0],[0,-.26,-.34],.095,.070);
 for(let i=-2;i<=2;i++){
  const t=ell(tailRig,mane,i*.055,-.51,-.53,.075,.37,.12);
  t.rotation.x=-.35;t.rotation.z=i*.07;
 }
 // The thigh and forearm are each a single organic tapered section.
 // Hinge positions exactly match the IK segment lengths below.
 const legs=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const upper=front?.66:.66,lower=.68;
  const pivot=new T.Group();pivot.position.set(side*.39,1.35,front?.77:-1.18);anim.add(pivot);
  const muscle=ell(pivot,coat,0,-upper*.40,0,front?.17:.22,upper*.55,.18);
  const knee=new T.Group();knee.position.set(0,-upper,0);pivot.add(knee);
  ell(knee,coat,0,0,0,.112,.115,.105);
  const cannon=ell(knee,coat,0,-lower*.48,0,.091,lower*.53,.090);
  ell(knee,coat,0,-lower+.07,.015,.09,.13,.09);
  const foot=ell(knee,hoofMat,0,-lower+.025,.13,.155,.105,.205);
  foot.rotation.x=-.13;
  legs.push({pivot,knee,front,side,upper,lower});
 }
 // Jockey and saddlecloth (18 unique race numbers).
 ell(anim,leather,0,2.17,-.24,.58,.12,.66);
 const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#172b76';g.fillRect(0,0,256,256);g.strokeStyle='#f5f5f0';g.lineWidth=8;g.strokeRect(8,8,240,240);
 g.fillStyle='#fff';g.font='bold 174px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(h.no),128,135);
 const clothTex=new T.CanvasTexture(c);clothTex.colorSpace=T.SRGBColorSpace;clothTex.magFilter=T.NearestFilter;clothTex.minFilter=T.NearestFilter;clothTex.generateMipmaps=false;
 const clothMat=new T.MeshBasicMaterial({map:clothTex,side:T.DoubleSide});
 for(const side of [-1,1]){
  const p=new T.Mesh(new T.PlaneGeometry(1.17,1.00),clothMat);
  p.position.set(side*.655,1.87,-.22);p.rotation.y=side*Math.PI/2;anim.add(p);
 }
 const rider=new T.Group();anim.add(rider);
 ell(rider,cream,0,2.36,-.43,.30,.22,.31);
 const torso=ell(rider,silk,0,2.69,.10,.29,.39,.32);torso.rotation.x=.63;
 ell(rider,new T.MeshStandardMaterial({color:0xe4b291,roughness:.95}),0,3.02,.44,.18,.22,.19);
 ell(rider,silk,0,3.25,.42,.24,.17,.26);
 ell(rider,silk,0,3.20,.63,.24,.05,.13);
 for(const side of [-1,1]){
  tube(rider,silk,[side*.25,2.82,.30],[side*.37,2.57,.75],.11,.08);
  ell(rider,cream,side*.37,2.56,.77,.10,.10,.10);
  tube(rider,cream,[side*.25,2.34,-.44],[side*.43,2.06,.10],.13,.10);
  tube(rider,hoofMat,[side*.43,2.06,.10],[side*.47,1.85,.31],.095,.075);
  ell(rider,hoofMat,side*.48,1.83,.38,.09,.10,.18);
  tube(rider,leather,[side*.35,2.57,.79],[side*.22,2.05,2.16],.014,.010);
 }
 // Ground shadow and unobtrusive number sprite.
 const shadow=new T.Mesh(new T.CircleGeometry(1,20),new T.MeshBasicMaterial({color:0x173c20,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;shadow.scale.set(1,1.65,1);root.add(shadow);
 const label=document.createElement('canvas');label.width=128;label.height=128;const lg=label.getContext('2d');
 lg.fillStyle='#17306e';lg.beginPath();lg.arc(64,64,53,0,Math.PI*2);lg.fill();lg.strokeStyle='#fff';lg.lineWidth=6;lg.stroke();
 lg.fillStyle='#fff';lg.font='bold 64px sans-serif';lg.textAlign='center';lg.textBaseline='middle';lg.fillText(String(h.no),64,67);
 const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(label),transparent:true,depthTest:false}));
 sprite.position.set(0,3.70,0);sprite.scale.set(1.02,1.02,1);root.add(sprite);
 scene.add(root);
 return {root,anim,headRig,tailRig,legs,sprite,shadow};
}
