// Horse model v4: cohesive thoroughbred silhouette, soft organic limbs, natural head and racing tack.
// This is intentionally a different mesh generator from the original ellipsoid horse.
export function createRaceHorse(T,scene,h,silkHex){
 const root=new T.Group(),anim=new T.Group();root.add(anim);
 const coats=[0x858b8e,0x603c32,0x835139,0x9b6141,0xb77950,0x727479,0x663a2d,0x9c6d48,0x4c3d39,0x915d45,0x593b30,0x9b7b57,0x754d3b,0x6b4d40,0x825b4b,0xa1785b,0x524038,0x9c8169];
 const coatColor=coats[h.no-1],coat=new T.MeshStandardMaterial({color:coatColor,roughness:.91}),
  dark=new T.MeshStandardMaterial({color:new T.Color(coatColor).multiplyScalar(.72),roughness:.96}),
  light=new T.MeshStandardMaterial({color:new T.Color(coatColor).multiplyScalar(1.13),roughness:.9}),
  mane=new T.MeshStandardMaterial({color:h.no%4===0?0x5e4230:0x29272b,roughness:1}),
  hoof=new T.MeshStandardMaterial({color:0x2a2929,roughness:.76}),
  tack=new T.MeshStandardMaterial({color:0x302525,roughness:.9}),
  saddle=new T.MeshStandardMaterial({color:0x20316e,roughness:.85}),
  silver=new T.MeshStandardMaterial({color:0xdce1d9,metalness:.35,roughness:.36}),
  white=new T.MeshStandardMaterial({color:0xf6f1e6,roughness:.94}),
  skin=new T.MeshStandardMaterial({color:0xe5b594,roughness:.95}),
  silk=new T.MeshStandardMaterial({color:silkHex,roughness:.86}),
  helmet=new T.MeshStandardMaterial({color:silkHex,roughness:.49});
 // One shared subtle coat texture gives the horse skin some natural variation without network assets.
 const coatCanvas=document.createElement('canvas');coatCanvas.width=128;coatCanvas.height=128;
 const coatCtx=coatCanvas.getContext('2d');coatCtx.fillStyle='#f6f6f2';coatCtx.fillRect(0,0,128,128);
 let noiseSeed=159+h.no*107;const rand=()=>{noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;return noiseSeed/4294967296};
 for(let i=0;i<2600;i++){
  const x=rand()*128,y=rand()*128;
  coatCtx.fillStyle=rand()>.52?'rgba(255,255,255,.11)':'rgba(55,45,35,.065)';
  coatCtx.fillRect(x,y,.4+rand()*2,.6+rand()*2);
 }
 const coatTex=new T.CanvasTexture(coatCanvas);coatTex.colorSpace=T.SRGBColorSpace;
 coat.map=coatTex;dark.map=coatTex;light.map=coatTex;
 const sphere=new T.SphereGeometry(1,20,16);
 function oval(parent,material,x,y,z,rx,ry,rz){
  const o=new T.Mesh(sphere,material);o.position.set(x,y,z);o.scale.set(rx,ry,rz);parent.add(o);return o;
 }
 function stick(parent,a,b,r1,r2,material){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);
  const mesh=new T.Mesh(new T.CylinderGeometry(r2,r1,d.length(),9),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
  parent.add(mesh);return mesh;
 }
 function loft(parent,material,stations,sides=20){
  // Cubic subdivision produces a genuinely smooth horse silhouette, not stacked spheres.
  const v=[],uv=[],ix=[],smooth=[];
  const cubic=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for(let i=0;i<stations.length-1;i++){
   for(let q=0;q<4;q++){
    const t=q/4;
    smooth.push(stations[i].map((_,j)=>cubic(stations[Math.max(0,i-1)][j],stations[i][j],stations[i+1][j],stations[Math.min(stations.length-1,i+2)][j],t)));
   }
  }
  smooth.push(stations[stations.length-1]);
  smooth.forEach(([x,y,z,rx,ry],i)=>{
   for(let k=0;k<=sides;k++){
    const a=k/sides*Math.PI*2;
    v.push(x+Math.cos(a)*Math.max(.02,rx),y+Math.sin(a)*Math.max(.02,ry),z);
    uv.push(k/sides,i/(smooth.length-1));
   }
  });
  for(let i=0;i<smooth.length-1;i++)for(let k=0;k<sides;k++){
   const a=i*(sides+1)+k,b=a+sides+1;
   ix.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
  const m=new T.Mesh(g,material);m.material.side=T.DoubleSide;parent.add(m);return m;
 }
 // Horse-shaped backline, barrel, chest and quarters: one continuous anatomical mesh.
 loft(anim,coat,[
  [0,1.66,-1.82,.09,.14],[0,1.66,-1.56,.43,.48],
  [0,1.63,-1.25,.62,.65],[0,1.56,-.80,.65,.65],
  [0,1.56,-.22,.61,.62],[0,1.57,.35,.61,.65],
  [0,1.67,.82,.64,.68],[0,1.77,1.12,.49,.55],
  [0,1.88,1.34,.25,.29],[0,1.94,1.43,.04,.06]
 ]);
 // Chest and shoulder muscles, pronounced hindquarters, a smooth tucked belly.
 // Smooth shoulders and haunches; avoid separate protruding sphere-shaped joints.
 for(const side of [-1,1]){
  const shoulder=oval(anim,coat,side*.35,1.55,.78,.29,.51,.45);shoulder.rotation.x=-.12;
  const haunch=oval(anim,coat,side*.34,1.57,-1.18,.30,.50,.47);haunch.rotation.x=.10;
 }
 // The neck grows naturally out of the withers, with a sloped topline.
 loft(anim,coat,[
  [0,1.85,.85,.38,.42],[0,1.96,1.10,.40,.49],
  [0,2.12,1.35,.38,.53],[0,2.31,1.53,.32,.48],
  [0,2.49,1.68,.29,.37],[0,2.58,1.78,.22,.26]
 ]);
 // A separate animated head with a true equine elongated nose and strong jaw.
 const headRig=new T.Group();headRig.position.set(0,2.61,1.68);anim.add(headRig);
 loft(headRig,coat,[
  [0,.15,-.42,.16,.22],[0,.12,-.24,.31,.37],
  [0,.06,.02,.35,.41],[0,-.10,.30,.31,.36],
  [0,-.27,.58,.25,.27],[0,-.41,.87,.23,.19],
  [0,-.46,1.09,.27,.19],[0,-.46,1.23,.23,.14]
 ]);
 oval(headRig,coat,0,-.05,-.14,.34,.36,.33);
 oval(headRig,dark,0,-.50,1.14,.245,.13,.18);
 oval(headRig,light,0,-.49,1.23,.22,.065,.11);
 // Two pointed horse ears with pink-brown interiors.
 const inner=new T.MeshStandardMaterial({color:0x906c69,roughness:1});
 for(const side of [-1,1]){
  stick(headRig,[side*.24,.40,-.24],[side*.29,.88,-.30],.105,.025,coat);
  stick(headRig,[side*.29,.49,-.10],[side*.30,.81,-.18],.055,.012,inner);
  // Glossy dark almond eyes, eyelids, distinct muzzle and nostrils.
  oval(headRig,dark,side*.326,.09,.17,.060,.092,.13);
  oval(headRig,new T.MeshPhysicalMaterial({color:0x171315,roughness:.17,clearcoat:.8}),side*.370,.10,.18,.049,.073,.088);
  oval(headRig,white,side*.406,.14,.24,.015,.021,.018);
  oval(headRig,coat,side*.330,.21,.15,.070,.035,.13);
  oval(headRig,new T.MeshStandardMaterial({color:0x2a2020,roughness:.85}),side*.229,-.43,1.13,.061,.043,.032);
  oval(headRig,light,side*.18,-.54,1.08,.11,.025,.05);
  // Subtle cheeks and eyelids rather than giant bulging eyes.
  oval(headRig,coat,side*.25,-.16,-.03,.16,.21,.27);
 }
 // Forelock, mane, blaze and noseband.
 // Low-profile forelock and a continuous short mane, no porcupine-like spikes.
 for(let i=0;i<5;i++){
  const x=(i-2)*.095;
  const lock=oval(headRig,mane,x,.41,.06,.095,.17,.15);lock.rotation.x=-.32;
 }
 for(let i=0;i<9;i++){
  const z=1.51-i*.105,y=2.54-i*.073;
  const crest=oval(anim,mane,0,y,z,.095,.105,.14);crest.rotation.x=-.32;
 }
 if(h.no%3===0){
  loft(headRig,white,[[0,.38,.37,.05,.06],[0,.10,.47,.085,.12],[0,-.22,.64,.06,.09],[0,-.43,.90,.035,.055]],9);
 }
 for(const side of [-1,1]){
  stick(headRig,[side*.34,.30,-.08],[side*.28,-.41,1.07],.027,.027,tack);
  stick(headRig,[side*.30,-.43,1.06],[side*.30,-.50,1.23],.027,.027,tack);
  oval(headRig,silver,side*.30,-.46,1.10,.045,.045,.04);
 }
 stick(headRig,[-.30,-.44,1.09],[.30,-.44,1.09],.03,.03,tack);
 // Animated tail with tapered tuft, swaying independently.
 const tailRig=new T.Group();tailRig.position.set(0,1.87,-1.69);anim.add(tailRig);
 stick(tailRig,[0,0,0],[0,-.34,-.40],.11,.07,mane);
 for(let i=-2;i<=2;i++){
  const strand=oval(tailRig,mane,i*.045,-.63,-.62,.095,.45,.13);
  strand.rotation.x=-.42;strand.rotation.z=i*.09;
 }
 // Four independently animated legs: muscled upper limb, tapered cannon, defined fetlock and hoof.
 const legs=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const hip=new T.Group();hip.position.set(side*.39,1.38,front?.80:-1.22);anim.add(hip);
  const upperLength=front?.64:.59;
  const upper=oval(hip,coat,0,-upperLength*.48,0,front?.145:.19,upperLength*.58,.17);
  upper.rotation.x=front?-.09:.15;
  const knee=new T.Group();knee.position.set(0,-upperLength,front?.06:-.07);hip.add(knee);
  oval(knee,coat,0,0,0,.115,.12,.115);
  const cannon=oval(knee,coat,0,-.27,.07,.082,.31,.082);cannon.rotation.x=-.10;
  oval(knee,coat,0,-.56,.13,.09,.11,.10);
  const foot=oval(knee,hoof,0,-.65,.23,.145,.105,.235);
  foot.rotation.x=-.13;
  legs.push({pivot:hip,knee,front,side});
 }
 // Dark navy numbered saddlecloths with visible white numbers on both sides.
 oval(anim,tack,0,2.17,-.20,.60,.13,.73);
 const c=document.createElement('canvas');c.width=256;c.height=256;
 const g=c.getContext('2d');g.fillStyle='#152d78';g.fillRect(0,0,256,256);
 g.strokeStyle='#f1f2f4';g.lineWidth=9;g.strokeRect(8,8,240,240);
 g.fillStyle='#fff';g.font='bold 175px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(h.no),128,136);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 const cloth=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});
 for(const side of [-1,1]){
  const panel=new T.Mesh(new T.PlaneGeometry(1.21,1.05),cloth);
  panel.position.set(side*.735,1.84,-.24);panel.rotation.y=side*Math.PI/2;anim.add(panel);
 }
 // Real jockey in a low racing crouch, distinct helmet, goggles, silks, boots and hands.
 const rider=new T.Group();anim.add(rider);
 oval(rider,white,0,2.40,-.45,.36,.24,.34); // breeches
 const torso=oval(rider,silk,0,2.75,.12,.35,.45,.39);torso.rotation.x=.61;
 const bib=new T.Mesh(new T.BoxGeometry(.46,.32,.055),white);bib.position.set(0,2.77,.46);bib.rotation.x=-.40;rider.add(bib);
 oval(rider,skin,0,3.10,.50,.205,.24,.22);
 oval(rider,helmet,0,3.31,.47,.26,.19,.27);
 oval(rider,helmet,0,3.27,.68,.23,.048,.16);
 for(const side of [-1,1]){
  stick(rider,[side*.26,2.91,.30],[side*.41,2.64,.82],.12,.09,silk);
  oval(rider,white,side*.42,2.60,.88,.12,.11,.12);
  stick(rider,[side*.30,2.45,-.43],[side*.50,2.08,.12],.17,.12,white);
  stick(rider,[side*.50,2.08,.12],[side*.54,1.85,.39],.13,.09,hoof);
  oval(rider,hoof,side*.54,1.83,.46,.11,.12,.23);
  oval(rider,hoof,side*.11,3.13,.71,.082,.069,.043);
  oval(rider,new T.MeshStandardMaterial({color:0x9fcad6,metalness:.16,roughness:.26}),side*.11,3.13,.75,.061,.046,.018);
  stick(rider,[side*.42,2.60,.90],[side*.31,2.41,1.17],.017,.012,tack);
  stick(rider,[side*.31,2.41,1.17],[side*.36,2.20,2.36],.012,.009,tack);
 }
 // A soft contact shadow anchors every galloping horse to the turf.
 const shadow=new T.Mesh(new T.CircleGeometry(1,24),new T.MeshBasicMaterial({color:0x173721,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}));
 shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.02,1.85,1);shadow.position.y=-.06;root.add(shadow);
 // Smaller number marker; saddlecloth remains the primary identifier.
 const label=document.createElement('canvas');label.width=128;label.height=128;
 const lg=label.getContext('2d');lg.fillStyle='#16306c';lg.beginPath();lg.arc(64,64,54,0,Math.PI*2);lg.fill();
 lg.strokeStyle='#fff';lg.lineWidth=6;lg.stroke();lg.fillStyle='#fff';lg.font='bold 66px sans-serif';lg.textAlign='center';lg.textBaseline='middle';lg.fillText(String(h.no),64,67);
 const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(label),transparent:true,depthTest:false}));
 sprite.position.set(0,3.92,0);sprite.scale.set(1.18,1.18,1);root.add(sprite);
 scene.add(root);
 return {root,anim,headRig,tailRig,legs,sprite};
}