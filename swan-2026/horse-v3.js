// Horse model v3: custom skinned-looking loft meshes, equine profiles and jockeys.
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
  [0,1.65,-1.75,.08,.15],[0,1.70,-1.53,.50,.57],
  [0,1.68,-1.16,.74,.74],[0,1.61,-.60,.73,.71],
  [0,1.58,0,.66,.67],[0,1.62,.49,.72,.76],
  [0,1.72,.92,.69,.71],[0,1.80,1.15,.47,.55],
  [0,1.90,1.36,.22,.30],[0,1.97,1.45,.035,.06]
 ]);
 // Chest and shoulder muscles, pronounced hindquarters, a smooth tucked belly.
 for(const side of [-1,1]){
  const shoulder=oval(anim,coat,side*.46,1.55,.72,.35,.63,.50);shoulder.rotation.x=-.20;
  const haunch=oval(anim,coat,side*.46,1.61,-1.15,.41,.65,.57);haunch.rotation.x=.13;
  oval(anim,light,side*.53,1.25,-.60,.10,.24,.49);
 }
 // Forward, sloping muscular neck; sculpted with a tapered smooth tube.
 const neck=oval(anim,coat,0,2.12,1.27,.44,.89,.45);neck.rotation.x=-.53;
 oval(anim,coat,0,2.34,1.57,.34,.61,.34).rotation.x=-.43;
 // A separate animated head with a true equine elongated nose and strong jaw.
 const headRig=new T.Group();headRig.position.set(0,2.70,1.69);anim.add(headRig);
 loft(headRig,coat,[
  [0,.15,-.42,.17,.24],[0,.12,-.23,.38,.45],
  [0,.05,.02,.42,.50],[0,-.13,.33,.34,.40],
  [0,-.31,.62,.265,.29],[0,-.48,.89,.24,.20],
  [0,-.52,1.13,.285,.20],[0,-.52,1.28,.24,.13]
 ]);
 oval(headRig,coat,0,-.05,-.15,.43,.43,.36);
 oval(headRig,dark,0,-.57,1.18,.275,.16,.20);
 oval(headRig,light,0,-.51,1.24,.26,.095,.13);
 // Two pointed horse ears with pink-brown interiors.
 const inner=new T.MeshStandardMaterial({color:0x906c69,roughness:1});
 for(const side of [-1,1]){
  const ear=stick(headRig,[side*.25,.48,-.25],[side*.29,1.04,-.32],.14,.045,coat);
  stick(headRig,[side*.30,.57,-.10],[side*.29,.96,-.17],.07,.025,inner);
  // Glossy dark almond eyes, eyelids, distinct muzzle and nostrils.
  oval(headRig,dark,side*.385,.11,.19,.085,.15,.18);
  oval(headRig,new T.MeshPhysicalMaterial({color:0x171315,roughness:.14,clearcoat:1}),side*.436,.12,.215,.071,.112,.112);
  oval(headRig,white,side*.486,.18,.28,.025,.033,.027);
  oval(headRig,coat,side*.393,.265,.18,.09,.04,.17);
  oval(headRig,new T.MeshStandardMaterial({color:0x2a2020,roughness:.85}),side*.245,-.48,1.15,.075,.062,.044);
  oval(headRig,light,side*.21,-.60,1.08,.14,.04,.07);
  // Cheek muscles make the face look alive, not like a spherical cartoon.
  oval(headRig,coat,side*.30,-.18,-.03,.21,.28,.33);
 }
 // Forelock, mane, blaze and noseband.
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.12;
  stick(headRig,[x,.50,-.15],[x*.92,.69,.22],.085,.018,mane);
 }
 for(let i=0;i<13;i++){
  const z=1.38-i*.14,y=2.48-i*.04;
  const hair=stick(anim,[0,y,z],[0,y+.22,z-.11],.095,.018,mane);
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
 stick(tailRig,[0,0,0],[0,-.34,-.46],.12,.07,mane);
 for(let i=-2;i<=2;i++){
  stick(tailRig,[i*.04,-.31,-.46],[i*.10,-.99,-.94],.095,.009,mane);
 }
 // Four independently animated legs: muscled upper limb, tapered cannon, defined fetlock and hoof.
 const legs=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const hip=new T.Group();hip.position.set(side*.47,1.45,front?.81:-1.23);anim.add(hip);
  const upperLength=front?.73:.67;
  oval(hip,coat,0,-.24,0,front?.22:.30,.40,.24);
  stick(hip,[0,-.05,0],[0,-upperLength,front?.08:-.10],front?.21:.26,.115,coat);
  const knee=new T.Group();knee.position.set(0,-upperLength,front?.08:-.10);hip.add(knee);
  oval(knee,coat,0,0,0,.14,.14,.14);
  stick(knee,[0,-.06,0],[0,-.61,.12],.115,.065,coat);
  oval(knee,coat,0,-.61,.13,.095,.13,.10);
  const foot=new T.Mesh(new T.BoxGeometry(.25,.20,.39),hoof);foot.position.set(0,-.74,.24);knee.add(foot);
  oval(knee,hoof,0,-.79,.38,.13,.09,.21);
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
 oval(rider,skin,0,3.16,.51,.245,.30,.26);
 oval(rider,helmet,0,3.41,.48,.30,.23,.31);
 oval(rider,helmet,0,3.35,.73,.28,.065,.19);
 for(const side of [-1,1]){
  stick(rider,[side*.26,2.91,.30],[side*.41,2.64,.82],.12,.09,silk);
  oval(rider,white,side*.42,2.60,.88,.12,.11,.12);
  stick(rider,[side*.30,2.45,-.43],[side*.50,2.08,.12],.17,.12,white);
  stick(rider,[side*.50,2.08,.12],[side*.54,1.85,.39],.13,.09,hoof);
  oval(rider,hoof,side*.54,1.83,.46,.11,.12,.23);
  oval(rider,hoof,side*.13,3.17,.76,.11,.095,.052);
  oval(rider,new T.MeshStandardMaterial({color:0x9fcad6,metalness:.16,roughness:.26}),side*.13,3.18,.81,.08,.065,.02);
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