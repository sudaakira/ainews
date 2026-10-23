/** Clean cel-racing broadcast. All positions and results are read from the shared engine. */
import {chooseRaceShot,courseShotCuts,raceCameraPose,followLockedCameraPose} from './race-shotlist.js?v=pack-v1-camera-v28';
import {finishCrossings} from './race-playback.js?v=kyoto-v11-1';

export function createRaceCinematics({THREE,scene,stage,models,config,capFor,path,route,routeLength}){
 const cuts=courseShotCuts(route,routeLength,config);
 const duration=Number(config.duration)||80;
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 // Viewport metadata only. All visible HUD lives in separate DOM flow rows.
 const ui=document.createElement('div');ui.id='race-cinematic-overlay';
 ui.setAttribute('aria-hidden','true');stage.append(ui);

 // Original simplified course furniture, soft colored grandstand and hedge rows.
 // Geometry belongs to this app; no game assets or logos are embedded.
 if(config.courseView!=='kyoto-1400-outer'){
  const stadium=new THREE.Group();stadium.position.set(-35,0,config.venue==='京都'&&[2000,3000].includes(config.distance)?path(1).z+105:150);scene.add(stadium);
  const material=c=>new THREE.MeshToonMaterial({color:c});
  const concrete=material(0xe8eee4),seat=material(0x92b6bb),glass=material(0x59939e),roof=material(0xf8f7e4);
  const box=(w,h,d,m,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.userData.cameraOccluder=true;stadium.add(mesh);};
  box(210,3,32,concrete,0,1.5,0);
  for(let row=0;row<5;row++){
   box(210,1.8,5,row%2?glass:seat,0,4+row*1.8,-12+row*5);
   box(211,.16,5,concrete,0,5+row*1.8,-12+row*5);
  }
  box(218,.6,39,roof,0,15,2);
  for(let x=-98;x<=98;x+=28)box(.65,11,.65,concrete,x,8.5,12);
  const crowd=new THREE.InstancedMesh(new THREE.SphereGeometry(.4,5,4),material(0xffffff),360);
  const dummy=new THREE.Object3D(),palette=[0xe8eee8,0xe59d74,0x8ea9d2,0xf3ce76,0xbb91ac];
  for(let i=0;i<360;i++){
   const row=i%5,col=Math.floor(i/5);
   dummy.position.set(-102+col*2.87,5.5+row*1.8,-12+row*5);
   dummy.scale.set(.65,.9,.65);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);
   crowd.setColorAt(i,new THREE.Color(palette[i%palette.length]));
  }
  stadium.add(crowd);
  const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),material(0x3b8052),90);
  for(let i=0;i<90;i++){
   const p=path(i/90),lane=19;
   dummy.position.set(p.x-p.dz*lane,p.y+.8,p.z+p.dx*lane);
   dummy.scale.set(1.5,.9,1.4);dummy.updateMatrix();hedge.setMatrixAt(i,dummy.matrix);
  }
  scene.add(hedge);
 }
 // A small amount of grass kicked up by the hooves, without luminous trails.
 const perHorse=3,chips=new THREE.InstancedMesh(new THREE.PlaneGeometry(.11,.20),
  new THREE.MeshBasicMaterial({color:0x93c15b,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}),models.length*perHorse);
 chips.frustumCulled=false;scene.add(chips);const dummy=new THREE.Object3D();
 let lastShot='',lastMode='';
 let previousClock=0;
 let lockedRig=null,cameraRebases=0;
 function update({clock,progress,order,finishOrder,frameDt,camera,desired,look,rate}){
  // Preserve the original seek/reset detection independently of the moved HUD.
  const seeked=Math.abs(clock-previousClock)>3||clock<previousClock;
  previousClock=clock;
  const p=Math.max(0,Math.min(1,progress)),shot=chooseRaceShot(p,cuts);let cut=shot.id!==lastShot;
  if(cut){ui.dataset.shot=shot.id;lastShot=shot.id;}
  const crossed=finishCrossings(finishOrder,clock,duration),runningOut=clock>duration;
  ui.dataset.phase=clock<=0?'gate':runningOut?'run-out':shot.id;
  // iPhone-first TV dolly: fixed-angle and fixed lens within each shot.
  // Only cut transitions, seek/replay, and aspect changes reset the rig.
  const gateMode=shot.id==='start'&&clock<=1.8?'gate':'running';
  const mustRebase=cut||seeked||!lockedRig||
   lockedRig.mode!==gateMode||Math.abs(lockedRig.aspect-camera.aspect)>.015;
  if(mustRebase){
   const base=raceCameraPose({shot,progress:p,order,path,aspect:camera.aspect,
    clock,direction:config.direction,distance:config.distance,venue:config.venue});
   lockedRig={pose:{...base,shotId:shot.id},startLeaderProgress:order[0].p,startLeaderLane:order[0].lane,
    mode:gateMode,aspect:camera.aspect};
   cameraRebases++;cut=true;lastMode=base.mode;
  }
  const pose=followLockedCameraPose(lockedRig,order,path,{
   distance:config.distance,venue:config.venue,direction:config.direction});
  desired.set(pose.position.x,pose.position.y,pose.position.z);
  look.set(pose.look.x,pose.look.y,pose.look.z);
  // Camera zoom and shift get the same framerate-independent damping as
  // position/look in renderer.js. No instantaneous optical jumps at 8x.
  let j=0;
  for(let i=0;i<models.length;i++)for(let k=0;k<perHorse;k++,j++){
   const root=models[i].root,t=(clock*.16+i*.37+k/perHorse)%1;
   dummy.position.copy(root.position);
   dummy.position.x-=Math.sin(root.rotation.y)*(1.2+t*2.4);
   dummy.position.z-=Math.cos(root.rotation.y)*(1.2+t*2.4);
   dummy.position.y+=.12+Math.sin(t*Math.PI)*.45;
   dummy.rotation.set(-Math.PI/2+t,(i+k)*1.7,0);
   const size=clock>.05&&!reduced()?(1-t)*.8:.0001;
   dummy.scale.setScalar(size);dummy.updateMatrix();chips.setMatrixAt(j,dummy.matrix);
  }
  chips.instanceMatrix.needsUpdate=true;
  window.RACE_CINEMATIC_DEBUG={shot:shot.id,progress:p,rate,cut,scriptedCuts:5,
   mode:'mobile-locked-rail-dolly-v19',cuts,position:shot.label,runOut:runningOut,crossed:crossed.length,
   cameraRebases,lockedDirection:true,lockedLens:true,
   sideOn:shot.ahead===0,pose};
  return {cut,shot:shot.id,fov:pose.fov,lensShiftX:pose.lensShiftX||0};
 }
 return {update};
}
