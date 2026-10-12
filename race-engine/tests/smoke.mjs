// Run locally or in GitHub Actions: node race-engine/tests/smoke.mjs
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname??new URL('.',import.meta.url).pathname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const load=(p)=>import('data:text/javascript;base64,'+Buffer.from(read(p)).toString('base64'));
const [{createFactors},{createRegression},{createSimulator}]=await Promise.all([
 load('core/factors.js'),load('core/regression.js'),load('core/simulator.js')
]);
for(const id of ['swan-2026','sample-demo','tokyo-20261012-11','tokyo-20261012-12','kyoto-20261012-12','shuka-2026']){
 const {default:config}=await load('races/'+id+'.js');
 const factor=createFactors(config),regression=createRegression(config,factor),sim=createSimulator(config,regression);
 const options={pace:0,speed:2,vol:10,ground:'good',bias:'neutral',weights:regression.DEFAULTS};
 const result=sim.simulate(options,5000,20261012),again=sim.simulate(options,5000,20261012);
 assert.equal(result.length,config.horses.length);
 assert.deepEqual(result,again,'seeded Monte Carlo must be reproducible');
 assert.ok(Math.abs(result.reduce((n,p)=>n+p.p3,0)-300)<1e-6);
 assert.equal(regression.FEATURES.length,14);
 assert.equal(regression.FEATURES.reduce((n,f)=>n+f.weight,0),100);
 assert.ok(result.every(x=>Number.isFinite(x.rating)&&Number.isFinite(x.p3)));
 assert.ok(config.horses.every(h=>Number.isFinite(regression.evaluate(h,options).rating)));
 if(id==='swan-2026'){
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,3,3]);
  assert.equal(factor.frame(config.horses[17]),8);
 }else if(id==='tokyo-20261012-11'){
  assert.equal(config.name,'オクトーバーステークス');
  assert.equal(config.date,'2026-10-12');
  assert.equal(config.distance,2000);
  assert.equal(config.direction,'左');
  assert.equal(config.courseView,'tokyo-2000');
  assert.equal(config.horses.length,18);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.j&&h.trainer&&h.father&&h.mfather));
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,3,3]);
  assert.equal(config.demo,false);
  assert.ok(config.sources.JRA.startsWith('https://'));
  assert.ok(config.notes.includes('暫定'));
 }else if(id==='tokyo-20261012-12'){
  assert.equal(config.raceNumber,12);
  assert.equal(config.venue,'東京');
  assert.equal(config.surface,'ダート');
  assert.equal(config.distance,1300);
  assert.equal(config.direction,'左');
  assert.equal(config.demo,false);
  assert.equal(config.horses.length,16);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.j&&h.father&&h.mfather));
  assert.ok(config.notes.includes('暫定'));
  assert.equal(config.inputs[9][0],94);
  assert.ok(config.sources.JRA.startsWith('https://'));
 }else if(id==='kyoto-20261012-12'){
  assert.equal(config.date,'2026-10-12');
  assert.equal(config.venue,'京都');
  assert.equal(config.raceNumber,12);
  assert.equal(config.surface,'ダート');
  assert.equal(config.distance,1200);
  assert.equal(config.direction,'右');
  assert.equal(config.demo,false);
  assert.equal(config.horses.length,16);
  assert.deepEqual(factor.frameSizes,[2,2,2,2,2,2,2,2]);
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.j&&h.trainer&&h.father&&h.mfather));
  assert.ok(config.horses.every(h=>['B','C'].includes(h.training)));
  assert.ok(config.notes.includes('暫定'));
  assert.equal(config.horses[15].name,'カネコメファミリー');
  assert.ok(config.sources.JRA.startsWith('https://'));
 }else if(id==='shuka-2026'){
  assert.equal(config.date,'2026-10-18');
  assert.equal(config.distance,2000);
  assert.equal(config.horses.length,18);
  assert.equal(config.provisionalDraw,true);
  assert.equal(config.demo,false);
  assert.equal(config.horses[0].name,'エンネ');
  assert.equal(config.horses[15].name,'モンローウォーク');
  assert.ok(config.notes.includes('仮番号'));
  assert.ok(config.horses.every((h,i)=>h.no===i+1&&h.kg===55&&h.age==='牝3'&&h.j&&h.trainer&&h.father&&h.mfather));
  assert.ok(config.horses.every(h=>Number.isFinite(h.rest)&&h.rest>=0));
  const one=config.horses[0],differentPseudoFrame={...one,no:18};
  for(const bias of ['inside','outside']){
   const s={...options,bias};
   assert.equal(regression.scores(one,s).bias,regression.scores(differentPseudoFrame,s).bias,'pseudo frames cannot affect track bias');
  }
 }else{
  assert.equal(config.demo,true,'sample must be clearly fictional');
  assert.ok(config.horses.every(h=>factor.factors(h).total===0),'unavailable factors must be neutral');
  assert.deepEqual(factor.frameSizes,[1,1,1,1,1,1]);
 }
 const zero={...options,weights:Object.fromEntries(regression.FEATURES.map(f=>[f.id,0]))};
 assert.equal(regression.evaluate(config.horses[0],zero).rating,50);
 console.log(id+': '+config.horses.length+' horses / deterministic 5000 draws / 14 factors ✓');
}
const html=read('index.html'),app=read('app.js'),render=read('renderer.js');
for(const name of ['core/factors.js','core/regression.js','core/simulator.js','assets/horse-anime.js','assets/chibi-gallop.js','assets/kyoto-scenery.js'])assert.ok(existsSync(resolve(root,name)),name+' must exist');
assert.match(html,/await import\('\.\/app\.js\?v=/);
assert.match(html,/await import\('\.\/renderer\.js\?v=/);
assert.match(render,/stallCount=HS.length/);
assert.match(render,/horseV3Ready=models.length===HS.length/);
assert.match(app,/const HS=config.horses/);
assert.match(app,/config\.provisionalDraw/);
assert.match(read('core/regression.js'),/verifiedDraw/);
for(const source of [app,render])assert.doesNotThrow(()=>new Function(source));
assert.match(read('../swan-2026/index.html'),/race-engine\/\?race=swan-2026/);
assert.match(render,/config.direction==='左'/);
assert.match(render,/config.courseView==='tokyo-2000'/);
console.log('Shared UI references, Tokyo left-hand course, variable gates and legacy link ✓');
