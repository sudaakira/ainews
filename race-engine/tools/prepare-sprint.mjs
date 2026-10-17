/** Racing gallop retarget, metres, +Z forward; see docs/sprint-v19.md.
 * Rebuild: THREE_PACKAGE=... node prepare-sprint.mjs SOURCE.gltf OUTPUT.glb META.json
 * CC0 mesh/skin retained. This clip is constructed, not motion capture.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const pkg=process.env.THREE_PACKAGE||'/tmp/race-three/node_modules/three';
const T=await import(pathToFileURL(pkg+'/build/three.module.js'));
const {GLTFLoader}=await import(pathToFileURL(pkg+'/examples/jsm/loaders/GLTFLoader.js'));
const {GLTFExporter}=await import(pathToFileURL(pkg+'/examples/jsm/exporters/GLTFExporter.js'));
globalThis.ProgressEvent=class{constructor(t,p){Object.assign(this,p)}};
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result='data:'+b.type+';base64,'+Buffer.from(x).toString('base64');this.onloadend?.()})}};
const [input,output,metadata]=process.argv.slice(2),g=await new GLTFLoader().parseAsync(fs.readFileSync(input,'utf8'),'');
const scene=g.scene,scale=.46,duration=.42,deg=Math.PI/180;
scene.updateMatrixWorld(true);
const bones=[];scene.traverse(b=>{if(b.isBone)bones.push(b)});
const bind=new Map(bones.map(b=>[b.name,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}]));
const bone=n=>scene.getObjectByName(n),pos=b=>b.getWorldPosition(new T.Vector3()).multiplyScalar(scale);
const worldPos=(b,p)=>{b.position.copy(b.parent.worldToLocal(p.clone().divideScalar(scale)));b.updateMatrixWorld(true)};
const turn=(b,angle)=>{const parent=b.parent.getWorldQuaternion(new T.Quaternion()),q=b.getWorldQuaternion(new T.Quaternion());q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),angle));b.quaternion.copy(parent.invert().multiply(q));b.updateMatrixWorld(true)};
const aim=(b,d)=>{const q=b.getWorldQuaternion(new T.Quaternion()),axis=new T.Vector3(0,1,0).applyQuaternion(q),delta=new T.Quaternion().setFromUnitVectors(axis,d.clone().normalize());q.premultiply(delta);b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateMatrixWorld(true)};
const restore=()=>{for(const b of bones){const r=bind.get(b.name);b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s)}scene.updateMatrixWorld(true)};
const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
// Monotone Hermite interpolation: grounded interval is exactly linear; swing
// folds the distal limb first, then unfolds into a low, forward-reaching strike.
function curve(t,keys){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],u=smooth((t-a[0])/(b[0]-a[0]));return [lerp(a[1],b[1],u),lerp(a[2],b[2],u)]}
function joint(a,b,l1,l2,bend){
 const d=b.clone().sub(a),distance=d.length(),n=d.clone().normalize();
 const len=Math.min(distance,l1+l2-.0005),along=(l1*l1-l2*l2+len*len)/(2*len);
 const pole=new T.Vector3(0,0,bend).addScaledVector(n,-bend*n.z).normalize();
 return {k:a.clone().addScaledVector(n,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along))),end:a.clone().addScaledVector(n,len)};
}
const rigs={};
for(const side of ['L','R'])for(const front of [true,false]){
 const upper=bone((front?'FrontUpperLeg':'BackUpperLeg')+side),lower=bone((front?'FrontLowerLeg':'BackLowerLeg')+side),foot=bone((front?'IKFrontLeg':'IKBackLeg')+side);
 rigs[(front?'F':'H')+side]={upper,lower,foot,toe:bone((front?'FF':'FFB')+side),l1:pos(lower).distanceTo(pos(upper)),l2:pos(foot).distanceTo(pos(lower)),footQ:foot.getWorldQuaternion(new T.Quaternion()),lowerToFoot:lower.getWorldQuaternion(new T.Quaternion()).invert().multiply(foot.getWorldQuaternion(new T.Quaternion())),toeQ:bone((front?'FF':'FFB')+side).quaternion.clone()};
}
const hoofVerts={FL:[],FR:[],HL:[],HR:[]};
scene.traverse(m=>{if(!m.isSkinnedMesh||m.material.name!=='Hooves')return;m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++){const v=m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld);hoofVerts[(v.z>0?'F':'H')+(v.x>0?'L':'R')].push([m,i])}});
function feet(){scene.updateMatrixWorld(true);scene.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update()});return Object.entries(hoofVerts).map(([name,refs])=>{const pts=refs.map(([m,i])=>m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld));return {name,x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:Math.min(...pts.map(p=>p.y)),z:pts.reduce((s,p)=>s+p.z,0)/pts.length}})}
function pose(p,lead){
 restore();
 const body=bone('Body');body.position.y-=.10/scale;
 // Small whole-trunk pitch, not a rocking-horse bow. Flight arc peaks in gather.
 turn(bone('Back'),.045*Math.sin(2*Math.PI*(p-.12)));
 turn(bone('Neck1'),.37+.07*Math.sin(2*Math.PI*(p-.16)));
 turn(bone('Neck2'),.08);turn(bone('Head'),-.38-.035*Math.sin(2*Math.PI*p));
 for(const [i,n] of ['Tail1','Tail2','Tail3'].entries())aim(bone(n),new T.Vector3(.035*Math.sin(2*Math.PI*p-i*.6),.08-i*.07+.055*Math.sin(2*Math.PI*p-i*.5),-1));
 const strikes={['H'+(lead==='L'?'R':'L')]:0,['H'+lead]:.20,['F'+(lead==='L'?'R':'L')]:.42,['F'+lead]:.60};
 for(const [name,r] of Object.entries(rigs)){
  const front=name[0]==='F',side=name[1],q=(p-strikes[name]+1)%1,stance=front?.18:.22;
  let z,y;
  if(q<=stance){z=lerp(front?1.26:.18,front?-.05:-1.40,q/stance);y=.16;}
  else{
   const u=(q-stance)/(1-stance);
   [z,y]=front?curve(u,[[0,-.05,.16],[.13,.08,.65],[.32,.62,.92],[.55,1.15,.78],[.80,1.48,.36],[1,1.26,.16]]):curve(u,[[0,-1.40,.16],[.16,-1.65,.48],[.38,-.80,.85],[.63,.33,.55],[.85,.42,.23],[1,.18,.16]]);
  }
  const x=side==='L'?.192:-.192;
  if(front){
   const elbow=pos(r.upper),e=q<=stance?[lerp(.75,.50,q/stance),lerp(.90,.87,q/stance)]:curve((q-stance)/(1-stance),[[0,.50,.87],[.35,.58,1.02],[.70,.77,.98],[1,.75,.90]]);elbow.set(x,e[1],e[0]);
   worldPos(r.upper,elbow);
  }else{
   const femur=bone('BackLeg'+side),hip=pos(femur);
   const femurAngle=q<=stance?lerp(62,-20,q/stance):curve((q-stance)/(1-stance),[[0,-20,0],[.25,5,0],[.6,75,0],[1,62,0]])[0];
   aim(femur,new T.Vector3(0,-Math.cos(femurAngle*deg),Math.sin(femurAngle*deg)));
  }
  const a=pos(r.upper),target=new T.Vector3(x,y,z),j=joint(a,target,r.l1,r.l2,front?1:-1);
  aim(r.upper,j.k.clone().sub(a));aim(r.lower,j.end.clone().sub(j.k));worldPos(r.foot,j.end);
  const pitch=q<=stance?lerp(-.12,.22,q/stance):front?-.45*Math.sin(Math.PI*(q-stance)/(1-stance)):.15;
  const fq=r.footQ.clone().premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pitch));
  if(q>stance){const u=(q-stance)/(1-stance),fold=Math.sin(Math.PI*u)**.7;fq.slerp(r.lower.getWorldQuaternion(new T.Quaternion()).multiply(r.lowerToFoot),fold);}
  r.foot.quaternion.copy(r.foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(fq));r.toe.quaternion.copy(r.toeQ);r.foot.updateMatrixWorld(true);
 }
 const soles=feet(),lowest=Math.min(...soles.map(f=>f.y))*scale;
 // Forelimb launch -> gathered flight -> first hind strike. Never extended flight.
 const air=p>.78?.10*Math.sin(Math.PI*(p-.78)/.22):0;
 // The source's IK hoof bones are siblings of Body, NOT its descendants.
 // Translate every root bone together so sole correction cannot deform a leg.
 for(const b of bones)if(!b.parent.isBone)worldPos(b,pos(b).add(new T.Vector3(0,.006+air-lowest,0)));
 scene.updateMatrixWorld(true);
}
const clips=[];let samples;
for(const lead of ['L','R']){
 const values=new Map(bones.map(b=>[b.name,{position:[],quaternion:[],scale:[]}])),times=[],sampled=[];
 for(let i=0;i<=120;i++){
  const p=(i%120)/120;pose(p,lead);times.push(duration*i/120);sampled.push(feet());
  for(const b of bones){const a=values.get(b.name),q=b.quaternion.clone();if(a.quaternion.length&&q.dot(new T.Quaternion().fromArray(a.quaternion,a.quaternion.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.position.push(...b.position);a.quaternion.push(...q);a.scale.push(...b.scale)}
 }
 const tracks=[];for(const [n,a] of values)tracks.push(new T.VectorKeyframeTrack(n+'.position',times,a.position),new T.QuaternionKeyframeTrack(n+'.quaternion',times,a.quaternion));
 clips.push(new T.AnimationClip('Sprint_'+(lead==='L'?'Left':'Right'),duration,tracks).optimize());if(lead==='L')samples=sampled;
}
restore();const idle=T.AnimationClip.findByName(g.animations,'Idle');
const outputBytes=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[...clips,idle],onlyVisible:false});fs.writeFileSync(output,Buffer.from(outputBytes));
fs.writeFileSync(metadata,JSON.stringify({duration,scale,sourceLead:'left',grounded:true,flight:[.78,1],samples}));
console.log({output,bytes:outputBytes.byteLength,clips:clips.map(c=>c.name)});
