/** Reproduce frozen pre-draw rankings, sensitivity runs and ticket counts. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=resolve(import.meta.dirname??new URL('.',import.meta.url).pathname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const moduleURL=p=>'data:text/javascript;base64,'+Buffer.from(read(p).replace(/from ['"](\.[^'"]+)['"]/g,(_,spec)=>"from '"+moduleURL(relative(root,resolve(root,dirname(p),spec.split('?')[0])))+"'")).toString('base64');
const load=p=>import(moduleURL(p));
const [{default:config},{createFactors},{createRegression},{createSimulator}]=await Promise.all([
 load('races/kikka-2026.js'),load('core/factors.js'),load('core/regression.js'),load('core/simulator.js')
]);
const evidence=JSON.parse(read('data/kikka-2026-evidence.json'));
const F=createFactors(config),loop=createRegression(config,F),sim=createSimulator(config,loop);
const seed=config.seed,count=50000;
assert.equal(evidence.horses.length,21);
assert.equal(evidence.horses.reduce((s,h)=>s+h.records.length,0),143);
for(const h of evidence.horses){
 assert.equal(h.pedigree.length,62);
 assert.equal(new Set(h.pedigree.map(p=>p.path)).size,62);
 assert.ok(h.records.every(r=>r.date<='2026/10/18'));
}
const scenarios=config.scenarios.map(s=>{
 const result=sim.simulate({...s.options,weights:loop.DEFAULTS},count,seed);
 assert.ok(Math.abs(result.reduce((s,h)=>s+h.win,0)-100)<1e-8);
 assert.ok(Math.abs(result.reduce((s,h)=>s+h.p3,0)-300)<1e-8);
 return {...s,count,seed,result:result.sort((a,b)=>b.rating-a.rating||a.no-b.no)};
});
const base=scenarios[0];
assert.deepEqual(sim.simulate({...base.options,weights:loop.DEFAULTS},count,seed).sort((a,b)=>b.rating-a.rating||a.no-b.no),base.result);
const dispersion=[6,10,14].map(vol=>({vol,result:sim.simulate({...base.options,vol,weights:loop.DEFAULTS},count,seed)}));
// Common random numbers, same seed and n: only assumptions change.
const totals={scenarioDraws:scenarios.length*count,dispersionDraws:dispersion.length*count,distinctDraws:scenarios.length*count+2*count,reproducibilityExtraDraws:count};
const independentSeeds=[20261019,20261020].map(seed=>({seed,result:sim.simulate({...base.options,weights:loop.DEFAULTS},count,seed)}));
totals.seedValidationDraws=independentSeeds.length*count;
totals.distinctDraws+=totals.seedValidationDraws;
const names=Object.fromEntries(config.horses.map(h=>[h.name,h.no]));
const core=['ダノンヒストリー','マジョレルブルー','シートゥサミット','コンジェスタス'];
const tickets=[];
for(let i=0;i<core.length;i++)for(let j=i+1;j<core.length;j++)tickets.push(['ロブチェン',core[i],core[j]]);
assert.equal(tickets.length,6);
const ticketHitRate=(tickets)=>{
 const r=sim.random(seed),scores=config.horses.map(h=>loop.evaluate(h,base.options).rating);
 const keys=new Set(tickets.map(t=>t.map(n=>names[n]).sort((a,b)=>a-b).join('-')));let hits=0;
 for(let i=0;i<count;i++){
  const order=sim.runRace(r,base.options,scores).slice(0,3).sort((a,b)=>a-b).join('-');
  if(keys.has(order))hits++;
 }
 return hits/count*100;
};
const threeBox=['ロブチェン','ダノンヒストリー','マジョレルブルー'];
const trioTickets=[threeBox];
const output={race:config.id,asOf:config.asOf,count,seed,totals,calibrated:false,method:'Subjective evidence-weighted score + independent Gaussian ranking noise. 3D animates a sampled ranking; no physical race interactions are modeled.',scenarios,dispersion,independentSeeds,tickets:{trioOnePoint:trioTickets,trioSixPoints:tickets,onePointModelHitPct:ticketHitRate(trioTickets),sixPointModelHitPct:ticketHitRate(tickets),actualOdds:null,expectedReturn:null}};
mkdirSync(resolve(root,'results'),{recursive:true});
writeFileSync(resolve(root,'results/kikka-2026-20261018.json'),JSON.stringify(output,null,2)+'\n');
const rows=[['scenario','no_provisional','horse','rating','win_pct_model','top3_pct_model']];
for(const s of scenarios)for(const h of s.result)rows.push([s.id,h.no,h.name,h.rating,h.win.toFixed(3),h.p3.toFixed(3)]);
writeFileSync(resolve(root,'results/kikka-2026-20261018.csv'),'\ufeff'+rows.map(r=>r.join(',')).join('\n')+'\n');
console.log(JSON.stringify({totals,baseline:base.result,tickets:output.tickets},null,2));
