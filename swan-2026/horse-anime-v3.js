// Thoroughbred v5 — complete replacement model. Local forward is +Z, up +Y.
// Horse body is an organic loft, not a pile of intersecting spheres.
// Four limbs have matching hip/knee/hoof geometry and support analytical gallop.
export function createRaceHorse(T,scene,h,silkHex){
 const root=new T.Group(),anim=new T.Group();root.add(anim);
 const coatColors=[0x848b91,0x593a30,0x815038,0x995e40,0xb2764c,0x686e75,0x633a30,0x976b4c,0x473b38,0x8b5a40,0x593d35,0x977759,0x754b37,0x69483d,0x805b48,0xa1795c,0x50403a,0x977e66];
 const base=coatColors[(h.no-1)%coatColors.length];
 // Hand-painted anime proportions; broad cel-shaded highlights rather than pixelated noise.
 // All 18 coats retain their own color while eye highlights, blush and face stay readable.
 const gradient=new T.DataTexture(new Uint8Array([
  104,104,104,255, 161,161,161,255, 226,226,226,255, 255,255,255,255
 ]),4,1,T.RGBAFormat);gradient.needsUpdate=true;
 gradient.minFilter=T.NearestFilter;gradient.magFilter=T.NearestFilter;
 gradient.generateMipmaps=false;
 const color=v=>new T.Color(v);
 const toon=v=>new T.MeshToonMaterial({color:v,gradientMap:gradient});
 const coat=toon(base);
 const shade=toon(color(base).multiplyScalar(.71));
 const highlight=toon(color(base).lerp(color(0xffe4bf),.28));
 const mane=toon(h.no%4===0?0x644030:0x402725);
 const maneLight=toon(h.no%4===0?0x9b6748:0x775039);
 const hoofMat=toon(0x332f38);
 const leather=toon(0x38292c);
 const cream=toon(0xfff4e2);
 const muzzle=toon(0xffd9c9);
 const muzzleShade=toon(0xe8ad9c);
 const cheekPink=new T.MeshBasicMaterial({color:0xf09aa5,transparent:true,opacity:.55,depthWrite:false});
 const silk=toon(silkHex);
 const metal=new T.MeshStandardMaterial({color:0xe7d5a9,metalness:.28,roughness:.45});
 const pink=toon(0xe89d88);
 const sclera=new T.MeshBasicMaterial({color:0xfff8f3});
 const iris=toon(0x9a582f);
 const irisLight=new T.MeshBasicMaterial({color:0xd58a51});
 const pupil=new T.MeshBasicMaterial({color:0x24151d});
 const shine=new T.MeshBasicMaterial({color:0xffffff});
 const outlineMat=new T.MeshBasicMaterial({color:0x422b2b,side:T.BackSide});
 const sphere=new T.SphereGeometry(1,20,14);
 const cone=new T.ConeGeometry(1,1,7);
 const ell=(parent,material,x,y,z,sx,sy,sz)=>{
  const mesh=new T.Mesh(sphere,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
 };
 // Inverted backface shells give a thin hand-drawn line on major silhouettes.
 const lined=(parent,material,x,y,z,sx,sy,sz)=>{
  const shape=ell(parent,material,x,y,z,sx,sy,sz);
  const shell=ell(parent,outlineMat,x,y,z,sx+.017,sy+.017,sz+.017);
  shell.renderOrder=-1;return shape;
 };
 const tuft=(parent,material,x,y,z,rx,ry,rz,tiltX=0,tiltZ=0)=>{
  const m=new T.Mesh(cone,material);
  m.position.set(x,y,z);m.scale.set(rx,ry,rz);m.rotation.x=tiltX;m.rotation.z=tiltZ;
  parent.add(m);return m;
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
 // Reference direction: large friendly eyes, tiny muzzle, fluffy forelock.
 // Proportions are deliberately stylized, not anatomy-accurate.
 const headRig=new T.Group();headRig.position.set(0,2.45,1.39);
 headRig.scale.set(1.48,1.36,1.32);anim.add(headRig);
 const skull=lined(headRig,coat,0,.045,.105,.353,.373,.326);
 skull.rotation.x=-.10;
 ell(headRig,coat,0,-.205,.215,.331,.335,.307);
 const nose=ell(headRig,coat,0,-.356,.405,.261,.282,.257);
 nose.rotation.x=.25;
 // Rounded peach mouth as in the supplied character sheet.
 lined(headRig,muzzle,0,-.548,.568,.301,.212,.246);
 ell(headRig,muzzleShade,0,-.692,.609,.256,.065,.146);
 ell(headRig,leather,0,-.699,.738,.138,.019,.013); // subtle smiling mouth
 for(const side of [-1,1]){
  // The eye is a layered anime iris, not a single glossy black bead.
  // Nearer camera sees: ink lid, warm sclera, iris, pupil, two catchlights.
  lined(headRig,shade,side*.330,.083,.237,.060,.193,.190);
  ell(headRig,sclera,side*.362,.084,.245,.068,.173,.172);
  ell(headRig,iris,side*.418,.067,.265,.065,.146,.141);
  ell(headRig,irisLight,side*.468,.028,.291,.019,.083,.076);
  ell(headRig,pupil,side*.471,.067,.278,.041,.110,.090);
  ell(headRig,shine,side*.508,.139,.324,.027,.034,.031);
  ell(headRig,shine,side*.505,.019,.249,.012,.016,.015);
  // Ink eyebrows and warm blush make the pony appear expressive.
  const eyebrow=ell(headRig,mane,side*.345,.303,.211,.034,.018,.148);
  eyebrow.rotation.x=-side*.18;
  ell(headRig,cheekPink,side*.310,-.233,.351,.032,.066,.092);
  // Upright furry ears with strawberry-pink inner ears.
  const ear=lined(headRig,coat,side*.235,.496,-.111,.149,.328,.139);
  ear.rotation.z=-side*.16;
  const inside=ell(headRig,pink,side*.250,.545,-.028,.070,.193,.058);
  inside.rotation.z=-side*.16;
  // Tiny round nostrils, one on each side of the muzzle.
  ell(headRig,muzzleShade,side*.223,-.544,.773,.052,.033,.025);
  // Thin unobtrusive reins and metallic bit; eyes remain unobstructed.
  tube(headRig,leather,[side*.278,.002,.085],[side*.229,-.54,.653],.011,.013);
  ell(headRig,metal,side*.234,-.539,.665,.026,.025,.027);
 }
 tube(headRig,leather,[-.249,-.586,.725],[.249,-.586,.725],.016,.016);
 // Wide ivory blaze makes the face recognizable at mobile sizes.
 if(h.no%4!==2){
  const blaze=ell(headRig,cream,0,.105,.427,.090,.245,.025);
  blaze.rotation.x=.10;
  ell(headRig,cream,0,-.233,.553,.060,.109,.027);
 }
 // Fluffy forelock with tapered highlights, soft rounded bases.
 for(let k=0;k<7;k++){
  const x=(k-3)*.084,ry=.20+(k%3)*.047;
  ell(headRig,mane,x,.372,.289,.105,.118,.131);
  tuft(headRig,k%3===0?maneLight:mane,x,.465,.320,
   .100,ry,.118,.70,(k-3)*.09);
 }
 // Forehead side fringe, separated from the eyes.
 for(const side of [-1,1]){
  ell(headRig,mane,side*.345,.339,.075,.112,.169,.165);
  tuft(headRig,mane,side*.366,.449,.075,.098,.27,.115,
       side===1?-.18:.24,side*.27);
 }
 // Neck crest is light and tufted so the horse reads as a character.
 for(let i=0;i<9;i++){
  const z=1.45-i*.09,y=2.46-i*.069;
  ell(anim,mane,0,y,z,.107,.101,.111);
  tuft(anim,i%3===0?maneLight:mane,0,y+.067,z-.02,.086,.20,.10,
   -.20,i%2===0?.19:-.16);
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
  // Chunky short legs: raise readability and conceal fine joint noise.
  // IK lengths stay unchanged inside local space; only the visual puppet is scaled.
  const pivot=new T.Group();pivot.position.set(side*.40,1.20,front?.77:-1.18);
  pivot.scale.set(1.13,.89,1.08);anim.add(pivot);
  const muscle=ell(pivot,coat,0,-upper*.40,0,front?.21:.255,upper*.57,.20);
  const knee=new T.Group();knee.position.set(0,-upper,0);pivot.add(knee);
  ell(knee,coat,0,0,0,.112,.115,.105);
  const cannon=ell(knee,coat,0,-lower*.48,0,.112,lower*.54,.104);
  ell(knee,coat,0,-lower+.07,.015,.09,.13,.09);
  const foot=ell(knee,hoofMat,0,-lower+.025,.13,.168,.114,.200);
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
 const shadow=new T.Mesh(new T.CircleGeometry(1,20),new T.MeshBasicMaterial({color:0x173c20,transparent:true,opacity:.20,depthWrite:false,side:T.DoubleSide}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;shadow.scale.set(1,1.65,1);root.add(shadow);
 const label=document.createElement('canvas');label.width=128;label.height=128;const lg=label.getContext('2d');
 lg.fillStyle='#17306e';lg.beginPath();lg.arc(64,64,53,0,Math.PI*2);lg.fill();lg.strokeStyle='#fff';lg.lineWidth=6;lg.stroke();
 lg.fillStyle='#fff';lg.font='bold 64px sans-serif';lg.textAlign='center';lg.textBaseline='middle';lg.fillText(String(h.no),64,67);
 const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(label),transparent:true,depthTest:false}));
 sprite.position.set(0,3.70,0);sprite.scale.set(.92,.92,1);root.add(sprite);
 scene.add(root);
 return {root,anim,headRig,tailRig,legs,sprite,shadow};
}
