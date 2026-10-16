// Dedicated painted anime eye decal. Shared across all 18 horses to keep GPU memory low.
// Three.js planes wrap the cheek diagonally, readable from side and front 3/4 views.
let sharedEyeTexture=null;
function paintedEye(T){
 if(sharedEyeTexture)return sharedEyeTexture;
 const c=document.createElement('canvas');c.width=192;c.height=224;
 const g=c.getContext('2d');
 g.clearRect(0,0,192,224);
 g.fillStyle='#38222b';
 g.beginPath();g.moveTo(18,121);
 g.bezierCurveTo(5,66,39,20,91,18);
 g.bezierCurveTo(149,11,180,62,177,122);
 g.bezierCurveTo(177,178,135,213,91,210);
 g.bezierCurveTo(43,204,19,166,18,121);g.fill();
 g.fillStyle='#fff5ef';
 g.beginPath();g.moveTo(32,122);
 g.bezierCurveTo(28,75,53,33,93,32);
 g.bezierCurveTo(140,28,162,70,162,122);
 g.bezierCurveTo(162,160,138,193,95,195);
 g.bezierCurveTo(58,194,34,165,32,122);g.fill();
 const ir=g.createLinearGradient(0,54,0,192);
 ir.addColorStop(0,'#34202b');ir.addColorStop(.45,'#633625');
 ir.addColorStop(.80,'#c17c40');ir.addColorStop(1,'#ffcb70');
 g.fillStyle=ir;g.beginPath();g.ellipse(99,126,58,70,0,0,Math.PI*2);g.fill();
 g.strokeStyle='#623527';g.lineWidth=4;g.stroke();
 g.fillStyle='#261620';g.beginPath();g.ellipse(99,115,32,55,0,0,Math.PI*2);g.fill();
 const grad=g.createLinearGradient(0,45,0,127);
 grad.addColorStop(0,'#34202a');grad.addColorStop(1,'rgba(52,32,42,0)');
 g.fillStyle=grad;g.beginPath();g.ellipse(94,76,67,35,0,0,Math.PI*2);g.fill();
 g.fillStyle='#fff';g.beginPath();g.ellipse(75,84,22,29,-.25,0,Math.PI*2);g.fill();
 g.beginPath();g.ellipse(119,150,12,16,.15,0,Math.PI*2);g.fill();
 g.fillStyle='#fff1de';g.beginPath();g.arc(132,100,5,0,Math.PI*2);g.fill();
 g.strokeStyle='#34212a';g.lineWidth=11;g.lineCap='round';
 g.beginPath();g.moveTo(21,89);g.bezierCurveTo(52,14,144,12,171,94);g.stroke();
 g.lineWidth=5;g.beginPath();g.moveTo(25,91);g.lineTo(11,70);g.moveTo(39,64);g.lineTo(23,41);g.stroke();
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
 t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
 t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
 sharedEyeTexture=t;return t;
}
// Anime pony v17 soft-plush — original 3D chibi character based on the requested
// illustrated design direction (large expressive eyes, rosy muzzle, tiny rider).
// Coordinates: forward +Z, up +Y. Four articulated legs stay compatible with
// chibi-gallop-v1.js and the 18-horse Kyoto race simulator.
export function createRaceHorse(T,scene,h,silkHex,frameCapHex='#89929B',frameCapOutline='#28323A',frameCapPattern=null,frameCapSecondary='#FFFFFF'){
 const root=new T.Group(),anim=new T.Group();root.add(anim);
 const coatColors=[0x848b91,0x593a30,0x815038,0x995e40,0xb2764c,0x686e75,0x633a30,0x976b4c,0x473b38,0x8b5a40,0x593d35,0x977759,0x754b37,0x69483d,0x805b48,0xa1795c,0x50403a,0x977e66];
 const base=coatColors[(h.no-1)%coatColors.length];
 // Hand-painted anime proportions; broad cel-shaded highlights rather than pixelated noise.
 // All 18 coats retain their own color while eye highlights, blush and face stay readable.
 // Gentle eight-step shading: the old four hard bands exaggerated geometry seams.
 // Keep anime illustration colour without a plastic polygon-faceted surface.
 const shades=[118,147,168,188,207,222,237,255];
 const gradient=new T.DataTexture(new Uint8Array(
  shades.flatMap(v=>[v,v,v,255])
 ),shades.length,1,T.RGBAFormat);gradient.needsUpdate=true;
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
 function loft(parent,material,rings,segments=36,steps=6){
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
  // The ring duplicates angle 0 at 2pi for UVs. Smooth the two normals:
  // otherwise each ring displays a visible vertical seam in grazing light.
  const normal=g.getAttribute('normal');
  if(normal){
   for(let row=0;row<points.length;row++){
    const a=row*(segments+1),b=a+segments;
    let nx=normal.getX(a)+normal.getX(b),ny=normal.getY(a)+normal.getY(b),nz=normal.getZ(a)+normal.getZ(b);
    const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
    normal.setXYZ(a,nx,ny,nz);normal.setXYZ(b,nx,ny,nz);
   }
   normal.needsUpdate=true;
  }
  const m=new T.Mesh(g,material);parent.add(m);return m;
 }
 // v17 SOFT PLUSH body. All of the shoulders, rump and belly are now one
 // continuous organic surface; the old pasted-on ellipsoids caused obvious
 // intersecting "lumps" and harsh dark seams around the hips.
 // More radial faces and finely spaced profiles produce an even silhouette.
 loft(anim,coat,[
  [0,1.74,-1.49,.025,.035],
  [0,1.67,-1.42,.25,.31],
  [0,1.64,-1.32,.42,.46],
  [0,1.62,-1.22,.56,.59],
  [0,1.59,-1.07,.68,.70],
  [0,1.57,-.87,.76,.77],
  [0,1.56,-.63,.795,.805],
  [0,1.55,-.37,.815,.825],
  [0,1.55,-.08,.82,.835],
  [0,1.57,.19,.81,.83],
  [0,1.61,.43,.77,.80],
  [0,1.66,.64,.71,.76],
  [0,1.72,.82,.61,.69],
  [0,1.80,.97,.48,.57],
  [0,1.87,1.09,.28,.35],
  [0,1.92,1.16,.025,.045]
 ],40,6);
 // Short, softly arched neck. Its wide lower rings are buried inside the
 // continuous torso instead of sitting visibly atop it as a second cylinder.
 loft(anim,coat,[
  [0,1.90,.72,.43,.40],
  [0,1.97,.84,.44,.44],
  [0,2.04,.99,.43,.45],
  [0,2.15,1.12,.39,.41],
  [0,2.26,1.23,.34,.37],
  [0,2.36,1.33,.29,.31],
  [0,2.45,1.39,.23,.25],
  [0,2.50,1.43,.14,.17]
 ],36,6);
 // Shoulder and haunch volume live in the loft itself; no overlapping
 // side-spheres or bright "patch" blobs on the outside of the coat.
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
  // A hand-painted decal avoids the old round black-button-eyed look.
  const eyeMat=new T.MeshBasicMaterial({map:paintedEye(T),transparent:true,
    side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const eye=new T.Mesh(new T.PlaneGeometry(.425,.475),eyeMat);
  eye.position.set(side*.396,.085,.242);eye.rotation.y=side*1.08;headRig.add(eye);
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
 // Layered flowing tail — a fan of glossy manga hair, not rigid sticks.
 const tailRig=new T.Group();tailRig.position.set(0,1.83,-1.44);anim.add(tailRig);
 ell(tailRig,mane,0,-.090,-.275,.192,.197,.40);
 for(let i=-3;i<=3;i++){
  const x=i*.072;
  const tuftBase=ell(tailRig,i%2?maneLight:mane,x,-.17,-.52,.088,.120,.38);
  tuftBase.rotation.x=-.16;tuftBase.rotation.y=i*.035;
  tuft(tailRig,mane,x*1.32,-.24,-.83-(3-Math.abs(i))*.042,
   .080,.37,.084,-1.25,i*.07);
 }
 // Short stout cartoon legs. Preserve the four-pose hierarchy for
 // chibi-gallop-v1.js, but physically lower the hip pivots as we shorten
 // the bones so the resting hoof still touches the ground.
 const legs=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const upper=front?.56:.58,lower=.58;
  const pivot=new T.Group();
  pivot.position.set(side*.45,1.025,front?.67:-.98);
  pivot.scale.set(1.23,.91,1.12);anim.add(pivot);
  // Rounded plush upper limb with a gentle taper into the knee.
  const muscle=ell(pivot,coat,0,-upper*.37,0,front?.245:.275,upper*.66,.215);
  const knee=new T.Group();knee.position.set(0,-upper,0);pivot.add(knee);
  // Reduce the bulging knee/ankle spheres that made the legs look jointed
  // like chunky Lego pieces, while retaining the reliable pivot hierarchy.
  ell(knee,coat,0,0,0,.136,.137,.129);
  const cannon=ell(knee,coat,0,-lower*.44,0,.123,lower*.60,.119);
  ell(knee,coat,0,-lower+.080,.012,.110,.133,.120);
  // Cute white fetlocks and chunky black hooves, still legible in motion.
  if((h.no+side+(front?0:2))%3!==0){
   ell(knee,cream,0,-lower*.75,.009,.143,.173,.140);
  }
  const foot=lined(knee,hoofMat,0,-lower+.025,.13,.175,.112,.204);
  foot.rotation.x=-.13;
  legs.push({pivot,knee,front,side,upper,lower});
 }
 // Jockey and saddlecloth (18 unique race numbers).
 ell(anim,leather,0,2.35,-.24,.57,.12,.65);
 const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#493177';g.fillRect(0,0,256,256);g.strokeStyle='#f5f5f0';g.lineWidth=8;g.strokeRect(8,8,240,240);
 g.fillStyle='#fff';g.font='bold 174px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(h.no),128,135);
 const clothTex=new T.CanvasTexture(c);clothTex.colorSpace=T.SRGBColorSpace;clothTex.magFilter=T.NearestFilter;clothTex.minFilter=T.NearestFilter;clothTex.generateMipmaps=false;
 const clothMat=new T.MeshBasicMaterial({map:clothTex,side:T.DoubleSide});
 for(const side of [-1,1]){
  const p=new T.Mesh(new T.PlaneGeometry(1.17,1.00),clothMat);
  p.position.set(side*.827,1.88,-.18);p.rotation.y=side*Math.PI/2;anim.add(p);
 }
 // Cute anime/chibi jockey. A full-face helmet, shiny eyes and flying hair
 // match the reference illustration while the original silks remain per runner.
 const rider=new T.Group();anim.add(rider);
 const skin=toon(0xffd3b5),skinShade=toon(0xe3a793);
 const helmetFrame=toon(frameCapHex),helmetTrim=toon(frameCapOutline),helmetSecondary=toon(frameCapSecondary);
 const boot=toon(0x292930),glove=toon(0x30313c);
 const hair=toon(h.no%3===0?0x623d32:h.no%3===1?0x50352f:0x865238);
 const saddle=ell(rider,leather,0,2.36,-.25,.56,.10,.64);
 ell(rider,cream,0,2.36,-.43,.30,.23,.30);
 const torso=ell(rider,silk,0,2.69,.07,.30,.33,.30);torso.rotation.x=.58;
 // Big round face, around 65% of helmet width.
 lined(rider,skin,0,3.035,.455,.295,.283,.278);
 ell(rider,skinShade,0,2.844,.618,.18,.061,.12);
 // Tiny friendly mouth and two large shining eyes on the facing side.
 ell(rider,skinShade,0,2.988,.726,.045,.018,.012);
 for(const side of [-1,1]){
  ell(rider,shine,side*.124,3.068,.694,.070,.095,.025);
  ell(rider,iris,side*.121,3.060,.721,.055,.079,.023);
  ell(rider,pupil,side*.122,3.058,.739,.038,.065,.015);
  ell(rider,shine,side*.104,3.099,.756,.018,.021,.009);
  ell(rider,cheekPink,side*.235,2.989,.645,.024,.045,.048);
  // Side locks behind the cheeks and streamed back in the wind.
  ell(rider,hair,side*.267,3.040,.295,.091,.205,.116);
  ell(rider,hair,side*.34,2.975,.05,.12,.118,.28);
  tuft(rider,hair,side*.35,2.92,-.16,.11,.29,.11,-1.17,side*.15);
 }
 // JRA official frame-coloured jockey cap. Body/crown/front panel/peak use
 // the SAME frame colour. The narrow contrasting seam keeps white and black
 // identifiable against bright/dark surroundings, without changing silks.
 if(frameCapPattern==='quartered'||frameCapPattern==='eighths'){
  const sections=frameCapPattern==='quartered'?4:8;
  // Real geometric sectors (not a flat decal): alternate frame colour and
  // white; 1枠 uses light blue as the JRA exception. Shared mesh position
  // prevents seams becoming uncoloured on the animated helmet.
  const shell=ell(rider,outlineMat,0,3.335,.423,.384,.225,.354);
  shell.renderOrder=-1;
  for(let q=0;q<sections;q++){
   const geometry=new T.SphereGeometry(1,Math.max(5,24/sections),14,q*2*Math.PI/sections,2*Math.PI/sections,0,Math.PI);
   const part=new T.Mesh(geometry,q%2===0?helmetFrame:helmetSecondary);
   part.position.set(0,3.335,.423);part.scale.set(.367,.208,.337);rider.add(part);
  }
  ell(rider,helmetSecondary,0,3.438,.493,.092,.112,.287);
 }else{
  lined(rider,helmetFrame,0,3.335,.423,.367,.208,.337);
  ell(rider,helmetFrame,0,3.438,.493,.092,.112,.287);
 }
 ell(rider,helmetTrim,0,3.265,.725,.363,.038,.090);
 // Front peak is also frame-coloured, including white, black, and pink.
 ell(rider,helmetFrame,0,3.275,.745,.330,.032,.128);
 ell(rider,metal,.29,3.272,.660,.035,.027,.025);
 // Arm + reins: lean forward into the run, tucked like a game character.
 for(const side of [-1,1]){
  tube(rider,silk,[side*.24,2.81,.24],[side*.355,2.59,.64],.122,.100);
  ell(rider,glove,side*.357,2.576,.651,.111,.103,.109);
  tube(rider,cream,[side*.25,2.34,-.40],[side*.40,2.085,.11],.133,.106);
  tube(rider,boot,[side*.40,2.085,.11],[side*.43,1.85,.30],.106,.084);
  ell(rider,boot,side*.43,1.83,.362,.112,.109,.18);
  tube(rider,leather,[side*.353,2.581,.65],[side*.31,2.02,2.11],.014,.012);
 }
 // Ground shadow and unobtrusive number sprite.
 const shadow=new T.Mesh(new T.CircleGeometry(1,20),new T.MeshBasicMaterial({color:0x173c20,transparent:true,opacity:.20,depthWrite:false,side:T.DoubleSide}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;shadow.scale.set(1,1.65,1);root.add(shadow);
 const label=document.createElement('canvas');label.width=128;label.height=128;const lg=label.getContext('2d');
 lg.fillStyle='#17306e';lg.beginPath();lg.arc(64,64,53,0,Math.PI*2);lg.fill();lg.strokeStyle='#fff';lg.lineWidth=6;lg.stroke();
 lg.fillStyle='#fff';lg.font='bold 64px sans-serif';lg.textAlign='center';lg.textBaseline='middle';lg.fillText(String(h.no),64,67);
 const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(label),transparent:true,depthTest:false}));
 sprite.position.set(0,4.04,0);sprite.scale.set(.73,.73,1);root.add(sprite);
 scene.add(root);
 return {root,anim,rider,headRig,tailRig,legs,sprite,shadow,artDirection:'anime-pony-v17-softplush'};
}
