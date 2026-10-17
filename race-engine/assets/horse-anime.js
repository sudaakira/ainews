/** Original anatomical cel thoroughbred. Metre scale, forward +Z.
 * Continuous torso/neck surfaces, articulated scapula/knee/hock, racing crouch.
 * No assets from the reference game are used. */
export function createRaceHorse(T,scene,h,silkHex,frameCapHex='#89929b',frameCapOutline='#28323a',frameCapPattern=null,frameCapSecondary='#ffffff'){
 const root=new T.Group(),anim=new T.Group();root.add(anim);
 const colors=[0x777d82,0x382722,0x703f28,0x914b2c,0xa96337,0x5c6063,0x452922,0x825232,0x2a2526,0x6b3722,0x47302a,0x9b7050,0x71422b,0x4f3027,0x6a4431,0x986644,0x352823,0x8b6b52];
 const base=colors[(h.no-1)%colors.length],shades=[100,168,225,255];
 const gradient=new T.DataTexture(new Uint8Array(shades.flatMap(v=>[v,v,v,255])),4,1,T.RGBAFormat);gradient.needsUpdate=true;gradient.minFilter=gradient.magFilter=T.NearestFilter;
 const toon=c=>new T.MeshToonMaterial({color:c,gradientMap:gradient});
 const coat=toon(base),legShade=toon(new T.Color(base).multiplyScalar(.78)),dark=toon(new T.Color(base).multiplyScalar(.63)),mane=toon(0x211c1b),hoof=toon(0x282626),white=toon(0xf0eee3),leather=toon(0x262126),skin=toon(0xe0b591),silk=toon(silkHex),cap=toon(frameCapHex),black=toon(0x17212a);
 const sphere=new T.SphereGeometry(1,14,10);
 const ell=(parent,m,x,y,z,a,b,c)=>{const o=new T.Mesh(sphere,m);o.position.set(x,y,z);o.scale.set(a,b,c);parent.add(o);return o};
 const bone=(parent,m,a,b,r1,r2)=>{const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),o=new T.Mesh(new T.CylinderGeometry(r2,r1,v.length(),8),m);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());parent.add(o);return o};
 function loft(parent,m,rings){
  const v=[],idx=[],n=20;
  for(const [y,z,rx,ry] of rings)for(let k=0;k<=n;k++){const a=k*2*Math.PI/n;v.push(Math.cos(a)*rx,y+Math.sin(a)*ry,z)}
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<n;k++){const a=i*(n+1)+k,b=a+n+1;idx.push(a,a+1,b,a+1,b+1,b)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();
  const nm=g.getAttribute('normal');for(let i=0;i<rings.length;i++){const a=i*(n+1),b=a+n,p=new T.Vector3(nm.getX(a)+nm.getX(b),nm.getY(a)+nm.getY(b),nm.getZ(a)+nm.getZ(b)).normalize();nm.setXYZ(a,p.x,p.y,p.z);nm.setXYZ(b,p.x,p.y,p.z)}
  const mesh=new T.Mesh(g,m);parent.add(mesh);return mesh;
 }
 loft(anim,coat,[[1.36,-.91,.03,.05],[1.34,-.80,.23,.30],[1.32,-.63,.32,.36],[1.27,-.39,.34,.33],[1.25,-.12,.31,.30],[1.30,.16,.32,.37],[1.35,.38,.30,.39],[1.40,.55,.23,.31],[1.43,.66,.05,.11]]);
 // Neck rises from the chest and tapers to the poll, with a clear throat latch.
 loft(anim,coat,[[1.41,.35,.24,.31],[1.54,.48,.23,.34],[1.71,.61,.20,.32],[1.86,.72,.16,.27],[1.98,.80,.125,.20],[2.04,.87,.08,.10]]);
 for(const side of [-1,1]){
  const shoulder=ell(anim,coat,side*.20,1.29,.36,.15,.29,.25);shoulder.rotation.x=-.3;
  ell(anim,coat,side*.20,1.32,-.65,.17,.28,.24);
 }
 const headRig=new T.Group();headRig.position.set(0,2.03,.88);anim.add(headRig);
 const skull=ell(headRig,coat,0,-.06,.09,.14,.22,.18);skull.rotation.x=-.3;
 const face=ell(headRig,coat,0,-.25,.27,.107,.27,.125);face.rotation.x=-.65;
 ell(headRig,dark,0,-.435,.405,.12,.095,.105);
 ell(headRig,dark,0,-.48,.32,.09,.045,.15);
 const ears=[];
 for(const side of [-1,1]){
  ell(headRig,black,side*.128,-.07,.19,.025,.018,.033);
  ell(headRig,white,side*.145,-.066,.2,.004,.005,.009);
  ell(headRig,black,side*.099,-.425,.475,.019,.022,.014);
  const rig=new T.Group();rig.position.set(side*.09,.13,.015);headRig.add(rig);
  const ear=ell(rig,coat,0,.105,0,.044,.14,.045);ear.rotation.x=.13;
  ell(rig,dark,0,.12,.035,.021,.08,.012);ears.push({rig,side});
  bone(headRig,leather,[side*.13,.06,.03],[side*.12,-.42,.38],.009,.009);
  ell(headRig,white,side*.12,-.40,.38,.021,.021,.018);
 }
 if(h.no%3!==0){const blaze=ell(headRig,white,0,-.19,.235,.025,.20,.012);blaze.rotation.x=-.65}
 bone(headRig,leather,[-.11,-.40,.43],[.11,-.40,.43],.012,.012);
 // Separate crest strands are hinged so their motion trails head and torso.
 const maneStrands=[];
 for(let i=0;i<8;i++){
  const rig=new T.Group();rig.position.set(0,1.68+i*.047,.38+i*.062);anim.add(rig);
  ell(rig,mane,0,.005,0,.045,.11,.10);
  maneStrands.push({rig,phase:i*.24});
 }
 ell(headRig,mane,0,.14,.065,.10,.08,.11);
 const tailStrands=[],tailRig=new T.Group();tailRig.position.set(0,1.54,-.83);anim.add(tailRig);
 for(let i=0;i<5;i++){
  const rig=new T.Group();rig.position.set((i-2)*.026,-.03,-.10-i*.032);tailRig.add(rig);
  const tuft=ell(rig,mane,0,-.11,-.16,.037,.09,.27);tuft.rotation.x=-.35;
  tailStrands.push({rig,phase:i*.31});
 }
 const legs=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const pivot=new T.Group();pivot.position.set(side*.22,front?1.17:1.24,front?.40:-.63);anim.add(pivot);
  const legCoat=side===-1?legShade:coat; // distinguish far/near silhouettes in side views
  const upper=front?.74:.80,lower=front?.90:.92;
  bone(pivot,legCoat,[0,0,0],[0,-upper,0],front?.095:.13,.045);
  const muscle=ell(pivot,legCoat,0,-.16,front?0:.035,front?.085:.12,.24,.105);muscle.rotation.x=front?0:-.2;
  const knee=new T.Group();knee.position.set(0,-upper,0);pivot.add(knee);
  ell(knee,dark,0,0,0,.050,.055,.055);
  bone(knee,legCoat,[0,0,0],[0,-lower+.09,.01],.035,.027);
  if(h.no%3!==0)bone(knee,white,[0,-lower+.20,.01],[0,-lower+.045,.02],.031,.035);
  // Counter-rotating distal hoof: the sole stays level while planted.
  const hoofRig=new T.Group();hoofRig.position.set(0,-lower+.025,0);knee.add(hoofRig);
  ell(hoofRig,hoof,0,0,.045,.047,.045,.065);
  legs.push({pivot,knee,hoofRig,upper,lower,front,side});
 }
 ell(anim,leather,0,1.64,-.10,.29,.055,.34);
 // Each flank has its own legible saddlecloth and reins, without floating labels.
 const cv=document.createElement('canvas');cv.width=256;cv.height=192;const g=cv.getContext('2d');g.fillStyle='#192632';g.fillRect(0,0,256,192);g.fillStyle='#ffffff';g.textAlign='center';g.font='bold 126px sans-serif';g.fillText(String(h.no),128,132);g.font='bold 20px sans-serif';g.fillText(h.name,128,171,240);
 const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
 for(const side of [-1,1]){const cloth=new T.Mesh(new T.PlaneGeometry(.62,.44),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));cloth.position.set(side*.325,1.41,-.12);cloth.rotation.y=side*Math.PI/2;anim.add(cloth)}
 const rider=new T.Group();anim.add(rider);
 // Folded racing seat: hip behind the shoulder, torso pitched towards the neck.
 const body=ell(rider,silk,0,1.99,.10,.16,.25,.13);body.rotation.x=.90;
 ell(rider,white,0,1.77,-.14,.19,.10,.20);
 ell(rider,skin,0,2.20,.34,.105,.13,.10);
 ell(rider,cap,0,2.30,.33,.125,.08,.12);
 ell(rider,cap,0,2.27,.44,.125,.014,.055);
 ell(rider,black,0,2.22,.427,.10,.032,.015);
 if(frameCapPattern){
  const sections=frameCapPattern==='quartered'?4:8,secondary=toon(frameCapSecondary);
  for(let i=0;i<sections;i++){const m=new T.Mesh(new T.SphereGeometry(1,8,8,i*2*Math.PI/sections,2*Math.PI/sections,0,Math.PI/2),i%2?secondary:cap);m.position.set(0,2.30,.33);m.scale.set(.126,.081,.121);rider.add(m)}
 }
 for(const side of [-1,1]){
  bone(rider,silk,[side*.13,2.05,.15],[side*.16,1.91,.46],.055,.039);
  ell(rider,skin,side*.16,1.89,.48,.043,.035,.035);
  bone(rider,white,[side*.13,1.78,-.14],[side*.32,1.54,.12],.07,.047);
  bone(rider,black,[side*.32,1.54,.12],[side*.34,1.24,-.05],.047,.033);
  ell(rider,black,side*.34,1.23,.0,.045,.04,.08);
  bone(rider,leather,[side*.16,1.89,.48],[side*.12,1.63,1.25],.006,.006);
  bone(anim,white,[side*.30,1.54,-.11],[side*.31,1.02,-.09],.015,.015);
 }
 const shadow=new T.Mesh(new T.CircleGeometry(1,24),new T.MeshBasicMaterial({color:0x172c19,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;shadow.scale.set(.46,1.23,1);root.add(shadow);
 scene.add(root);
 return {root,anim,rider,headRig,tailRig,legs,ears,maneStrands,tailStrands,flutter:null,sprite:null,shadow,artDirection:'thoroughbred-cel-v11',gallopRig:'four-beat-ik-v1'};
}
