/**
 * Kyoto Centennial Park (2023–present) turf finishing marker — original
 * procedural 3D interpretation based on JRA facility photos.
 * The REAL turf marker uses nested dark-green / ivory racetrack-loop arches,
 * vertical "KYOTO" text and floodlights. It is NOT an overhead race gate.
 * Reference: https://kyotokeiba-grandopen.com/highlight/
 * https://www.nikkansports.com/keiba/photonews/photonews_nsInc_202304100001046-4.html
 * Track positions are schematic (not surveyed GIS).
 */
export function createKyotoGoalBoard({THREE,scene,offsetPoint,path,half}){
 const root=new THREE.Group();
 root.position.copy(offsetPoint(1,-(half+3.7),0));
 const finishDir=path(1);
 root.rotation.y=Math.atan2(finishDir.dx,finishDir.dz);
 scene.add(root);

 const outer=new THREE.MeshStandardMaterial({color:0x0a4a3b,roughness:.34,metalness:.1});
 const inner=new THREE.MeshStandardMaterial({color:0xf7f8ef,roughness:.55,metalness:.05});
 const dark=new THREE.MeshStandardMaterial({color:0x153d35,roughness:.56});
 const gray=new THREE.MeshStandardMaterial({color:0x9ab5b0,roughness:.42,metalness:.3});

 const arch=(width,height,offsetZ,material,radius)=>{
  const pts=[];
  // A pair of legs joined by a gently squared / course-shaped rounded apex.
  const n=14;
  pts.push(new THREE.Vector3(-width,0,offsetZ));
  pts.push(new THREE.Vector3(-width,height-1.35,offsetZ));
  for(let i=0;i<=n;i++){
   const a=Math.PI-(Math.PI*i/n);
   pts.push(new THREE.Vector3(width*Math.cos(a),height-1.35+1.35*Math.sin(a),offsetZ));
  }
  pts.push(new THREE.Vector3(width,0,offsetZ));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,64,radius,10,false),material);
  root.add(mesh);
 };
 // Outer layered green/white racecourse silhouette, green outline remains
 // recognizably different from the old broad generic horseshoe monument.
 arch(1.64,10.25,.0,outer,.38);
 arch(1.35,9.45,.23,inner,.25);
 arch(1.09,8.78,.40,outer,.18);
 for(const side of [-1,1]){
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(.82,.50,1.03),dark);
  plinth.position.set(side*1.48,.25,0);root.add(plinth);
 }

 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=768;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#f5f7ef';ctx.fillRect(0,0,256,768);
 ctx.fillStyle='#1b5747';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='500 107px Georgia,serif';ctx.fillText('K',128,102);
 ctx.fillText('Y',128,222);ctx.fillText('O',128,343);
 ctx.fillText('T',128,464);ctx.fillText('O',128,587);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const namePanel=new THREE.Mesh(new THREE.PlaneGeometry(.51,5.4),
  new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
 namePanel.position.set(1.35,4.95,.52);root.add(namePanel);

 // Light mast and six floodlights standing BEHIND the looping board.
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.095,.13,4.6,9),inner);
 mast.position.set(-.9,11.65,-.34);root.add(mast);
 for(let row=0;row<3;row++)for(let col=0;col<2;col++){
  const flood=new THREE.Mesh(new THREE.BoxGeometry(.52,.33,.22),gray);
  flood.position.set(-1.38+col*.54,12.15+row*.63,-.12);root.add(flood);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(.40,.23,.04),
   new THREE.MeshBasicMaterial({color:0xffefbc}));
  glass.position.set(flood.position.x,flood.position.y,.01);root.add(glass);
 }

 // A THIN WHITE LINE aligned across the course (local X transverse).
 const lineRoot=new THREE.Group();lineRoot.position.copy(offsetPoint(1,0,.065));
 lineRoot.rotation.y=Math.atan2(finishDir.dx,finishDir.dz);
 const line=new THREE.Mesh(new THREE.BoxGeometry(half*2,.04,.16),
  new THREE.MeshBasicMaterial({color:0xffffff}));
 lineRoot.add(line);scene.add(lineRoot);

 // Little goal-edge white posts outside the running corridor.
 for(const sign of [-1,1]){
  const base=offsetPoint(1,sign*(half+1),0);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.09,.10,3.3,9),inner);
  pole.position.copy(base);pole.position.y+=1.65;scene.add(pole);
 }

 return {root,lineRoot,atProgress:1,authenticReference:'Kyoto 2023 green-white concentric loop'};
}
