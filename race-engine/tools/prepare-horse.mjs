/** One-time, reproducible preparation of Quaternius CC0 Horse.gltf.
 * node prepare-horse.mjs INPUT.gltf OUTPUT.glb [metadata.json]
 * Requires three@0.160.0 (THREE_PACKAGE may point to that package directory).
 * Preserves authored Gallop and Idle; creates a reflected right-lead clip
 * in the ORIGINAL bind frame, never by negating guessed Euler joint angles.
 */
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const pkg=process.env.THREE_PACKAGE||'/tmp/race-three/node_modules/three';
const T=await import(pathToFileURL(pkg+'/build/three.module.js'));
const {GLTFLoader}=await import(pathToFileURL(pkg+'/examples/jsm/loaders/GLTFLoader.js'));
const {GLTFExporter}=await import(pathToFileURL(pkg+'/examples/jsm/exporters/GLTFExporter.js'));
globalThis.ProgressEvent=class{constructor(type,props){Object.assign(this,props)}};
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result='data:'+b.type+';base64,'+Buffer.from(x).toString('base64');this.onloadend?.()})}};
const [input,output,metaFile]=process.argv.slice(2),bytes=fs.readFileSync(input);
const gltf=await new GLTFLoader().parseAsync(bytes.toString('utf8'),'');
const scene=gltf.scene;scene.updateMatrixWorld(true);const bones=[];scene.traverse(o=>{if(o.isBone)bones.push(o)});
const rest=new Map(bones.map(b=>[b.name,b.matrixWorld.clone()]));
const restInv=new Map([...rest].map(([k,m])=>[k,m.clone().invert()]));
const flip=new T.Matrix4().makeScale(-1,1,1),swap=n=>n.endsWith('L')?n.slice(0,-1)+'R':n.endsWith('R')?n.slice(0,-1)+'L':n;
const original=T.AnimationClip.findByName(gltf.animations,'Gallop');original.name='Gallop_Left';
const mixer=new T.AnimationMixer(scene);const action=mixer.clipAction(original).play();
const values=new Map(bones.map(b=>[b.name,{position:[],quaternion:[],scale:[]}])) , times=[];
for(let frame=0;frame<=36;frame++){
 const t=original.duration*frame/36;times.push(t);mixer.setTime(frame===36?0:t);scene.updateMatrixWorld(true);
 const target=new Map();
 for(const b of bones){const source=scene.getObjectByName(swap(b.name));target.set(b.name,flip.clone().multiply(source.matrixWorld).multiply(restInv.get(source.name)).multiply(flip).multiply(rest.get(b.name)))}
 for(const b of bones){const parent=target.get(b.parent.name)||b.parent.matrixWorld;const local=parent.clone().invert().multiply(target.get(b.name)),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();local.decompose(p,q,s);const a=values.get(b.name);if(a.quaternion.length){const old=new T.Quaternion().fromArray(a.quaternion,a.quaternion.length-4);if(old.dot(q)<0)q.set(-q.x,-q.y,-q.z,-q.w)}a.position.push(...p);a.quaternion.push(...q);a.scale.push(...s);}
}
const tracks=[];for(const [name,a] of values){tracks.push(new T.VectorKeyframeTrack(name+'.position',times,a.position),new T.QuaternionKeyframeTrack(name+'.quaternion',times,a.quaternion),new T.VectorKeyframeTrack(name+'.scale',times,a.scale))}
const right=new T.AnimationClip('Gallop_Right',original.duration,tracks);
const idle=T.AnimationClip.findByName(gltf.animations,'Idle');
mixer.stopAllAction();scene.updateMatrixWorld(true);
for(const clip of [original,right,idle]){
 clip.tracks=clip.tracks.filter(track=>{
  const size=track.getValueSize(),arr=track.values;let constant=true;for(let i=size;i<arr.length;i++)if(Math.abs(arr[i]-arr[i%size])>1e-5){constant=false;break}
  if(!constant)return true;
  const [name,prop]=track.name.split('.'),obj=scene.getObjectByName(name);const bind=obj[prop].toArray();return bind.some((v,i)=>Math.abs(v-arr[i])>1e-5);
 });clip.optimize();
}
const buf=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[original,right,idle],onlyVisible:false});fs.writeFileSync(output,Buffer.from(buf));
// Inspect real skinned hoof vertices, not guessed bone endpoints.
const hoofVerts={FL:[],FR:[],HL:[],HR:[]};scene.updateMatrixWorld(true);scene.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update()});
scene.traverse(m=>{if(!m.isSkinnedMesh||m.material.name!=='Hooves')return;for(let i=0;i<m.geometry.attributes.position.count;i++){const p=m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld);hoofVerts[(p.z>0?'F':'H')+(p.x>0?'L':'R')].push({m,i})}});
const samples=[];action.play();const N=120;
for(let i=0;i<=N;i++){
 mixer.setTime(i===N?0:original.duration*i/N);scene.updateMatrixWorld(true);scene.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update()});
 const feet=Object.entries(hoofVerts).map(([name,verts])=>{
  const pts=verts.map(({m,i})=>m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld));
  return {name,x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:Math.min(...pts.map(p=>p.y)),z:pts.reduce((s,p)=>s+p.z,0)/pts.length};
 });samples.push(feet);
}
const meta={creator:'Quaternius',license:'CC0-1.0',sourceSHA256:createHash('sha256').update(bytes).digest('hex'),assetSHA256:createHash('sha256').update(Buffer.from(buf)).digest('hex'),duration:original.duration,scale:.46,sourceLead:'left',samples};
if(metaFile)fs.writeFileSync(metaFile,JSON.stringify(meta));console.log(JSON.stringify({bytes:buf.byteLength,sourceSHA256:meta.sourceSHA256,assetSHA256:meta.assetSHA256,clips:[original,right,idle].map(a=>[a.name,a.tracks.length])},null,2));
