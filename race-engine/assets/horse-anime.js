/** V19: Quaternius CC0 skin, rebuilt racing sprint, articulated rider.
 * Metres, forward +Z. Rendering only; no prediction/RNG/race-position imports.
 * Asset provenance and conversion are in docs/gallop-v16.md and tools/.
 */
import {prepareRacingTack,createRacingTack} from './racing-tack.js?v=photo-body-v24';
import {rebuildThoroughbred,rebuildHorseHair,coatEnvironment} from './thoroughbred-body.js?v=24';
let source,helpers,loading;
const SCALE=.46;
export async function preloadRaceHorse(T){
 if(loading)return loading;
 loading=(async()=>{
  const clothFont=new FontFace('RaceCloth',`url(${new URL('./models/racing-cloth-bold.woff',import.meta.url).href})`,{weight:'900'});
  document.fonts.add(await clothFont.load());
  const [{GLTFLoader},skeleton,geometry]=await Promise.all([
   import('../vendor/GLTFLoader.js'),import('../vendor/SkeletonUtils.js'),import('../vendor/BufferGeometryUtils.js')]);
  const [gltf,motion]=await Promise.all([
   new GLTFLoader().loadAsync(new URL('./models/horse-sprint-v19.glb?v=19.2',import.meta.url).href),
   fetch(new URL('./models/sprint-motion-v19.json?v=19.2',import.meta.url)).then(r=>{if(!r.ok)throw Error('Horse motion '+r.status);return r.json()})]);
  helpers={clone:skeleton.clone,merge:geometry.mergeGeometries};
  gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update()});
  const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
  const main=meshes.find(m=>m.material.name==='Main').material.color;
  const bodyGeometry=rebuildThoroughbred(T,helpers.merge(meshes.filter(m=>/^Main/.test(m.material.name)).map(m=>{const g=m.geometry.clone(),color=m.material.color,rgb=new Float32Array(g.attributes.position.count*3);for(let i=0;i<rgb.length;i+=3)rgb.set([color.r/main.r,color.g/main.g,color.b/main.b],i);g.setAttribute('color',new T.BufferAttribute(rgb,3));return g}),false),SCALE);
  const coat=[],fixed=[],feet={FL:[],FR:[],HL:[],HR:[]};let fixedOffset=0;
  let mouth=new T.Vector3(),mouthCount=0;
  for(const mesh of meshes){
   const g=mesh.material.name==='Hair'?rebuildHorseHair(T,mesh,bodyGeometry,SCALE):mesh.geometry.clone(),c=mesh.material.color.clone(),isCoat=/^Main/.test(mesh.material.name);
   g.deleteAttribute('uv');
   g.setAttribute('skinIndex',new T.Uint16BufferAttribute(g.attributes.skinIndex.array,4));
   if(isCoat)c.setRGB(c.r/main.r,c.g/main.g,c.b/main.b);
   const rgb=new Float32Array(g.attributes.position.count*3);
   for(let i=0;i<g.attributes.position.count;i++){
    rgb.set([c.r,c.g,c.b],i*3);
    if(mesh.material.name==='Hooves'){
     const v=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);
     feet[(v.z>0?'F':'H')+(v.x>0?'L':'R')].push(fixedOffset+i);
    }
    if(mesh.material.name==='Muzzle'){mouth.add(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));mouthCount++}
   }
   g.setAttribute('color',new T.BufferAttribute(rgb,3));(isCoat?coat:fixed).push(g);
   if(!isCoat)fixedOffset+=g.attributes.position.count;
  }
  mouth.divideScalar(mouthCount);gltf.scene.getObjectByName('Head').worldToLocal(mouth);
  const first=meshes[0];
  const environment=coatEnvironment(T);
  for(const [name,parts] of [['RaceHorseCoat',coat],['RaceHorseDetails',fixed]]){
   const geo=name==='RaceHorseCoat'?bodyGeometry:helpers.merge(parts,false);
   // Weld normals across the source's duplicated flat-shaded vertices without
   // changing positions, skin weights or topology. No cylindrical limb pieces.
   const sum=new Map(),p=geo.attributes.position,n=geo.attributes.normal;
   for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>x.toFixed(5)).join(',');let v=sum.get(key);if(!v){v=new T.Vector3();sum.set(key,v)}v.add(new T.Vector3(n.getX(i),n.getY(i),n.getZ(i)))}
   for(const v of sum.values())v.normalize();
   for(let i=0;i<p.count;i++){const v=sum.get([p.getX(i),p.getY(i),p.getZ(i)].map(x=>x.toFixed(5)).join(','));n.setXYZ(i,v.x,v.y,v.z)}
   const m=new T.SkinnedMesh(geo,new T.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:name==='RaceHorseCoat'?.39:.78,metalness:0,clearcoat:name==='RaceHorseCoat'?.32:0,clearcoatRoughness:.4,envMap:name==='RaceHorseCoat'?environment:null,envMapIntensity:.6}));
   m.name=name;m.position.copy(first.position);m.quaternion.copy(first.quaternion);m.scale.copy(first.scale);m.bind(first.skeleton,first.bindMatrix);m.frustumCulled=false;first.parent.add(m);
  }
  meshes.forEach(m=>m.removeFromParent());
  const tack=prepareRacingTack(T,gltf.scene.getObjectByName('RaceHorseCoat'),SCALE);
  source={gltf,motion,feet,mouth,tack};return source;
 })();return loading;
}
function interpolateFeet(phase){
 const samples=source.motion.samples,n=samples.length-1,x=((phase%1)+1)%1*n,a=Math.floor(x),f=x-a;
 return samples[a].map((p,i)=>{const q=samples[(a+1)%n][i];return {name:p.name,x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f,z:p.z+(q.z-p.z)*f}});
}
function floorOffset(phase){
 if(source.motion.grounded)return 0;
 const p=((phase%1)+1)%1;
 const at=t=>.004-Math.min(...interpolateFeet(t).map(f=>f.y*SCALE));
 // Only the gathered-flight interval is unsupported. Preserve its authored
 // vertical arc; do NOT pull the lowest airborne foot down onto the ground.
 if(p>.185&&p<.365){const u=(p-.185)/.18;return at(.185)*(1-u)+at(.365)*u}
 return at(p);
}
export function createRaceHorse(T,scene,h,silkHex,frameCapHex='#89929b',frameCapOutline='#28323a',frameCapPattern=null,frameCapSecondary='#ffffff'){
 if(!source)throw Error('preloadRaceHorse must finish before constructing runners');
 const root=new T.Group(),anim=new T.Group();root.add(anim);root.rotation.order='YXZ';
 const asset=helpers.clone(source.gltf.scene);asset.scale.setScalar(SCALE);anim.add(asset);
 const colors=[0x7e8589,0x30221e,0x51301f,0x683a24,0x30251f,0x63666a,0x35231f,0x63402a,0x252123,0x4b2d20,0x382720,0x715038,0x543320,0x39271f,0x4f3424,0x71452e,0x2d231e,0x654934];
 const coat=asset.getObjectByName('RaceHorseCoat');coat.material=coat.material.clone();coat.material.color.setHex(colors[(h.no-1)%colors.length]);
 const details=asset.getObjectByName('RaceHorseDetails'),bones={};asset.traverse(o=>{if(o.isBone)bones[o.name]=o});
 const mixer=new T.AnimationMixer(asset),actions={};
 for(const [key,name] of [['left','Sprint_Left'],['right','Sprint_Right'],['idle','Idle']]){
  const clip=T.AnimationClip.findByName(source.gltf.animations,name);if(!clip)throw Error('Missing '+name);
  actions[key]=mixer.clipAction(clip).play();actions[key].paused=true;
 }
 const toon=c=>new T.MeshStandardMaterial({color:c,roughness:.82});
 const leather=toon(0x231e1c),white=toon(0xf4f1e4),silk=toon(silkHex),skin=toon(0xdcb18c),cap=toon(frameCapHex),black=toon(0x17212a),metal=toon(0xc5c7bd);
 const sphere=new T.SphereGeometry(1,12,8);
 const ell=(parent,m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(sphere,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o};
 const segment=(parent,m,r1,r2)=>{const o=new T.Mesh(new T.CylinderGeometry(r1,r2,1,8),m);parent.add(o);return o};
 const up=new T.Vector3(0,1,0),v=new T.Vector3(),inverse=new T.Matrix4();
 const connect=(m,a,b)=>{v.copy(b).sub(a);const length=v.length();m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,v.multiplyScalar(1/Math.max(length,1e-8)));m.scale.y=length};
 function combine(parent){
  const geos=[];for(const m of [...parent.children]){if(!m.isMesh)continue;m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix),rgb=new Float32Array(g.attributes.position.count*3),c=m.material.color;for(let i=0;i<rgb.length;i+=3)rgb.set([c.r,c.g,c.b],i);g.setAttribute('color',new T.BufferAttribute(rgb,3));geos.push(g);parent.remove(m)}
  if(geos.length)parent.add(new T.Mesh(helpers.merge(geos,false),new T.MeshStandardMaterial({vertexColors:true,roughness:.8})));
 }
 const tack=createRacingTack(T,coat,source.tack,h);
 const saddle=new T.Group();saddle.name='RacingSeatFrame';root.add(saddle);
 const rider=new T.Group();root.add(rider);
 const neck=segment(rider,skin,.045,.04);
 const torso=ell(rider,silk,0,0,0,.145,.24,.115),pelvis=ell(rider,white,0,0,0,.15,.08,.14);
 const head=new T.Group();rider.add(head);
 ell(head,skin,0,0,0,.093,.115,.09);ell(head,cap,0,.09,-.006,.116,.075,.111);ell(head,cap,0,.065,.092,.116,.012,.05);ell(head,black,0,.015,.078,.092,.026,.022);
 if(frameCapPattern){const sections=frameCapPattern==='quartered'?4:8,secondary=toon(frameCapSecondary);for(let i=0;i<sections;i++){const m=new T.Mesh(new T.SphereGeometry(1,8,6,i*2*Math.PI/sections,2*Math.PI/sections,0,Math.PI/2),i%2?secondary:cap);m.position.set(0,.09,-.006);m.scale.set(.117,.076,.112);head.add(m)}}
 combine(head);
 const limbs=[];
 for(const side of [-1,1]){
  const boot=ell(rider,black,0,0,0,.044,.045,.085),hand=ell(rider,skin,0,0,0,.034,.032,.037);
  const stirrup=new T.Mesh(new T.TorusGeometry(.042,.008,5,12),metal);root.add(stirrup);
  const reinGeo=new T.BufferGeometry().setFromPoints(Array.from({length:9},()=>new T.Vector3()));const rein=new T.Line(reinGeo,new T.LineBasicMaterial({color:0x261e19}));root.add(rein);rein.frustumCulled=false;
  const strap=segment(root,leather,.008,.008);
  limbs.push({side,thigh:segment(rider,white,.060,.047),shin:segment(rider,black,.046,.033),upper:segment(rider,silk,.045,.037),fore:segment(rider,silk,.036,.025),boot,hand,stirrup,rein,strap});
 }
 // Soft, ground-plane shadows stay beneath the real soles, never orbit a joint.
 const sc=document.createElement('canvas');sc.width=sc.height=64;const sg=sc.getContext('2d'),grad=sg.createRadialGradient(32,32,1,32,32,31);grad.addColorStop(0,'rgba(20,34,17,.55)');grad.addColorStop(.5,'rgba(20,34,17,.25)');grad.addColorStop(1,'rgba(20,34,17,0)');sg.fillStyle=grad;sg.fillRect(0,0,64,64);const shadowTex=new T.CanvasTexture(sc);
 const makeShadow=(x,z)=>{const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:1}));m.rotation.x=-Math.PI/2;m.position.y=.007;m.scale.set(x,z,1);root.add(m);return m};
 const shadow=makeShadow(1.15,2.9),footShadows=Array.from({length:4},()=>makeShadow(.26,.30));
 const localPoint=(bone,out=new T.Vector3())=>{bone.getWorldPosition(out);return out.applyMatrix4(inverse)};
 const joint=(a,b,l1,l2,pole)=>{const d=b.clone().sub(a),len=Math.max(.0001,d.length());d.divideScalar(len);const along=Math.min(l1,(l1*l1-l2*l2+len*len)/(2*len));const normal=pole.clone().addScaledVector(d,-pole.dot(d)).normalize();return a.clone().addScaledVector(d,along).addScaledVector(normal,Math.sqrt(Math.max(0,l1*l1-along*along)))};
 const model={root,anim,asset,rider,shadow,gallopRig:'racing-sprint-v19',artDirection:'photo-thoroughbred-v24',bodyAudit:()=>({...coat.geometry.userData,vertices:coat.geometry.attributes.position.count}),gaitState:null};
 model.showEquipment=visible=>{rider.visible=saddle.visible=visible;for(const l of limbs)for(const key of ['stirrup','rein','strap'])l[key].visible=visible;for(const name of ['FittedSaddlecloth','RacingSaddleAndGirth','SaddlePiping'])asset.getObjectByName(name).visible=visible};
 model.pose=(phase,active,rightWeight,sprint=0)=>{
  actions.left.setEffectiveWeight(active*(1-rightWeight));actions.right.setEffectiveWeight(active*rightWeight);actions.idle.setEffectiveWeight(1-active);
  actions.left.time=actions.right.time=phase*source.motion.duration;actions.idle.time=0;mixer.update(0);
  asset.position.y=floorOffset(phase)*active;root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
  const aft=localPoint(bones.Torso),fore=localPoint(bones.Torso3);
  const pitch=-Math.atan2(fore.y-aft.y,fore.z-aft.z);saddle.position.copy(tack.seatPoint().applyMatrix4(inverse));saddle.rotation.x=pitch;
  const sy=saddle.position.y,sz=saddle.position.z;
  // Racing seat absorbs the back's movement; boots follow the stirrups while
  // knees/elbows articulate. The rider is not a rigid bobbing statuette.
  const hipY=sy+.22-(sy-1.49)*.56*active;
  const hip=new T.Vector3(0,hipY,sz-.16);
  const shoulder=new T.Vector3(0,hipY+.02+.31*(1-active),sz+.40+.035*sprint);
  pelvis.position.copy(hip);connect(torso,hip,shoulder);torso.scale.y*=.55;
  head.position.copy(shoulder).add(new T.Vector3(0,.11,.13));head.rotation.x=-pitch*.18;connect(neck,shoulder.clone().add(new T.Vector3(0,.01,.04)),head.position.clone().add(new T.Vector3(0,-.075,-.02)));
  const mouth=bones.Head.localToWorld(source.mouth.clone()).applyMatrix4(inverse);
  for(const l of limbs){
   // Racing feet belong below the forward stirrup bars by the withers.
   // A rearward offset from the seat center puts the entire jockey too far aft.
   const x=l.side,bar=tack.stirrupPoint(x).applyMatrix4(inverse);
   const ankle=new T.Vector3(x*.34,sy-.27,bar.z),hipSide=hip.clone().add(new T.Vector3(x*.12,0,0));
   const knee=joint(hipSide,ankle,.35,.35,new T.Vector3(x*.45,0,1));
   connect(l.thigh,hipSide,knee);connect(l.shin,knee,ankle);l.boot.position.copy(ankle).add(new T.Vector3(0,-.015,.04));l.boot.rotation.x=.13;
   l.stirrup.position.copy(ankle).add(new T.Vector3(0,-.027,.025));l.stirrup.rotation.y=Math.PI/2;
   connect(l.strap,bar,l.stirrup.position);
   const hand=new T.Vector3(x*.14,sy+.12+(mouth.y-1.5)*.18,sz+.62+(mouth.z-1.4)*.10);
   const shoulderSide=shoulder.clone().add(new T.Vector3(x*.11,0,0));const elbow=joint(shoulderSide,hand,.245,.245,new T.Vector3(0,-1,-.45));
   connect(l.upper,shoulderSide,elbow);connect(l.fore,elbow,hand);l.hand.position.copy(hand);
   const bit=mouth.clone().add(new T.Vector3(x*.085,0,.015)),a=l.rein.geometry.attributes.position;
   for(let i=0;i<9;i++){const t=i/8;v.copy(hand).lerp(bit,t);v.y-=.045*Math.sin(Math.PI*t);a.setXYZ(i,v.x,v.y,v.z)}a.needsUpdate=true;
  }
  const sampled=interpolateFeet(phase),byName=Object.fromEntries(sampled.map(p=>[p.name,p]));
  const hoofs=sampled.map((p,i)=>{const mirrored=byName[p.name[0]+(p.name[1]==='L'?'R':'L')];const mix=(a,b)=>a+(b-a)*rightWeight;return {name:p.name,front:p.name[0]==='F',side:p.name[1]==='L'?1:-1,hoofX:p.x*SCALE,hoofY:mix(p.y,mirrored.y)*SCALE+asset.position.y,hoofZ:mix(p.z,mirrored.z)*SCALE,contact:active>.95&&mix(p.y,mirrored.y)*SCALE+asset.position.y<.028}});
  const flight=active>.95&&hoofs.every(p=>p.hoofY>.035);
  shadow.material.opacity=flight?.64:.88;
  hoofs.forEach((f,i)=>{const m=footShadows[i];m.position.set(f.hoofX,.008,f.hoofZ);m.material.opacity=active*Math.max(0,.85-f.hoofY*3.5)});
  root.updateMatrixWorld(true);
  tack.updateContact(root,bones);
  model.gallopAudit={phase,lead:rightWeight*2-1,flight,noHoofContact:flight,hoofs,sampledFrom:'constructed-racing-sprint-v19'};
 };
 model.renderedHoofs=()=>{
  root.updateMatrixWorld(true);details.skeleton.update();const inv=root.matrixWorld.clone().invert();
  return Object.entries(source.feet).map(([name,indices])=>{const pts=indices.map(i=>details.getVertexPosition(i,new T.Vector3()).applyMatrix4(details.matrixWorld).applyMatrix4(inv));return {name,y:Math.min(...pts.map(v=>v.y)),x:pts.reduce((n,v)=>n+v.x,0)/pts.length,z:pts.reduce((n,v)=>n+v.z,0)/pts.length}});
 };
 model.boneLengths=()=>{root.updateMatrixWorld(true);const lengths=Object.values(bones).filter(b=>b.parent.isBone).map(b=>({name:b.name,length:b.getWorldPosition(new T.Vector3()).distanceTo(b.parent.getWorldPosition(new T.Vector3()))}));for(const side of ['L','R'])for(const end of ['Front','Back'])lengths.push({name:'HoofLink'+end+side,length:bones[end+'LowerLeg'+side].getWorldPosition(new T.Vector3()).distanceTo(bones['IK'+end+'Leg'+side].getWorldPosition(new T.Vector3()))});return lengths};
 model.tackAudit=()=>{const inv=root.matrixWorld.clone().invert(),withers=bones.Torso3.getWorldPosition(new T.Vector3()).applyMatrix4(inv),feet=limbs.map(l=>l.stirrup.getWorldPosition(new T.Vector3()).applyMatrix4(inv));return {...tack.audit(),stirrupBehindWithers:withers.z-feet.reduce((sum,p)=>sum+p.z,0)/feet.length,seatAnchorGap:saddle.getWorldPosition(new T.Vector3()).distanceTo(tack.seatPoint()),strapAnchorGap:Math.max(...limbs.map(l=>l.strap.localToWorld(new T.Vector3(0,-.5,0)).distanceTo(tack.stirrupPoint(l.side))))}};
 model.pose(0,0,0);scene.add(root);return model;
}
