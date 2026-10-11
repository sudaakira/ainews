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
 const sphere=new T.SphereGeometry(1,18,14);
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
 // Slightly oversized hindquarters, lean midsection, broad shoulder: racehorse proportions.
 loft(anim,coat,[
  [0,1.67,-1.74,.07,.10],[0,1.64,-1.54,.42,.47],
  [0,1.60,-1.25,.58,.61],[0,1.57,-.83,.62,.63],
  [0,1.58,-.33,.55,.56],[0,1.60,.20,.55,.57],
  [0,1.67,.62,.61,.66],[0,1.76,.96,.59,.62],
  [0,1.87,1.19,.37,.45],[0,1.97,1.29,.05,.08]
 ]);
 // Neck is a sloping, tapered continuous mesh that connects to the shoulder.
 loft(anim,coat,[
  [0,1.85,.85,.37,.42],[0,1.98,1.09,.39,.46],
  [0,2.16,1.31,.36,.44],[0,2.37,1.49,.29,.39],
  [0,2.53,1.63,.25,.29],[0,2.61,1.70,.18,.19]
 ]);
 // Subtle shoulder and thigh contours blend into the continuous body.
 for(const side of [-1,1]){
  ell(anim,coat,side*.38,1.43,.78,.235,.42,.37);
  ell(anim,coat,side*.38,1.45,-1.22,.255,.46,.42);
 }
 // Derby Stallion 2-inspired cute racehorse: compact head, round cheek,
 // broad gentle forehead, short muzzle and readable eyes from the side camera.
 // This is a stylized 3D interpretation, not an extracted copyrighted sprite.
 const headRig=new T.Group();headRig.position.set(0,2.60,1.64);anim.add(headRig);
 loft(headRig,coat,[
  [0,.10,-.28,.09,.13],[0,.14,-.16,.27,.29],
  [0,.11,.00,.34,.39],[0,-.05,.15,.33,.37],
  [0,-.24,.29,.275,.29],[0,-.45,.40,.23,.23],
  [0,-.62,.48,.205,.19],[0,-.70,.57,.215,.155],
  [0,-.73,.66,.235,.14]
 ],22,5);
 // A soft jawline and gently rounded cheeks make the silhouette approachable.
 ell(headRig,coat,0,-.20,.12,.35,.33,.30);
 ell(headRig,highlight,0,-.72,.63,.27,.19,.19);
 ell(headRig,shade,0,-.825,.63,.205,.06,.12);
 for(const side of [-1,1]){
  // Oversized but almond-shaped glossy eyes, with warm eyelids and a highlight.
  ell(headRig,shade,side*.301,.055,.13,.071,.113,.111);
  ell(headRig,eyeMat,side*.345,.065,.15,.068,.100,.101);
  ell(headRig,cream,side*.403,.116,.205,.023,.028,.023);
  ell(headRig,coat,side*.308,.166,.13,.065,.026,.105);
  // Soft upright ears with smaller contrasting interiors.
  const ear=ell(headRig,coat,side*.21,.53,-.20,.14,.28,.13);
  ear.rotation.z=-side*.16;
  const inside=ell(headRig,pink,side*.215,.56,-.105,.067,.17,.038);
  inside.rotation.z=-side*.16;
  // Rounded nostrils on the muzzle, not at the end of a long crocodile snout.
  ell(headRig,shade,side*.201,-.685,.699,.050,.035,.027);
  // A narrow unobtrusive bridle; leave the eyes and cheeks visible.
  tube(headRig,leather,[side*.30,.14,-.09],[side*.20,-.67,.59],.015,.014);
  ell(headRig,metal,side*.20,-.68,.59,.027,.027,.027);
 }
 tube(headRig,leather,[-.21,-.70,.62],[.21,-.70,.62],.018,.018);
 // Soft forelock and short continuous mane.
 for(let i=0;i<5;i++){
  const tuft=ell(headRig,mane,(i-2)*.083,.40,.01,.075,.13,.15);tuft.rotation.x=-.24;
 }
 for(let i=0;i<11;i++){
  const z=1.56-i*.083,y=2.53-i*.060;
  const tuft=ell(anim,mane,0,y,z,.078,.105,.13);tuft.rotation.x=-.28;
 }
 if(h.no%4===1){
  loft(headRig,cream,[[0,.23,.14,.02,.03],[0,.04,.20,.056,.08],[0,-.28,.35,.042,.07],[0,-.61,.52,.022,.035]],9,3);
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
  const muscle=ell(pivot,coat,0,-upper*.40,0,front?.14:.19,upper*.55,.145);
  const knee=new T.Group();knee.position.set(0,-upper,0);pivot.add(knee);
  ell(knee,coat,0,0,0,.112,.115,.105);
  const cannon=ell(knee,coat,0,-lower*.48,0,.075,lower*.53,.075);
  ell(knee,coat,0,-lower+.07,.015,.09,.13,.09);
  const foot=ell(knee,hoofMat,0,-lower+.025,.13,.135,.105,.22);
  foot.rotation.x=-.13;
  legs.push({pivot,knee,front,side,upper,lower});
 }
 // Jockey and saddlecloth (18 unique race numbers).
 ell(anim,leather,0,2.17,-.24,.58,.12,.66);
 const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#172b76';g.fillRect(0,0,256,256);g.strokeStyle='#f5f5f0';g.lineWidth=8;g.strokeRect(8,8,240,240);
 g.fillStyle='#fff';g.font='bold 174px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(h.no),128,135);
 const clothTex=new T.CanvasTexture(c);clothTex.colorSpace=T.SRGBColorSpace;
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
