/** Reusable seeded Monte Carlo rankings (not calibrated probabilities). */
export function createSimulator(config,loop){
 const horses=config.horses;
 if(!Array.isArray(horses)||horses.length<3||horses.length>18)throw Error('出走頭数は3〜18頭');
 const ids=new Set(horses.map(x=>x.no));
 if(ids.size!==horses.length||horses.some((h,i)=>h.no!==i+1||!h.name))throw Error('馬番は1からの連番');
 const random=seed=>()=>{let t=seed+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
 const norm=r=>Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(6.283185*r());
 function runRace(r,s={},computed){
  const powers=computed||horses.map(h=>loop.evaluate(h,s).rating);
  return horses.map((h,i)=>({no:h.no,score:powers[i]+norm(r)*Math.max(1,Number(h.sd)||10)*(Number(s.vol)||10)/10}))
   .sort((a,b)=>b.score-a.score||a.no-b.no).map(x=>x.no);
 }
 function simulate(s={},count=20000,seed=20261012){
  if(!Number.isInteger(count)||count<1||count>100000)throw Error('Simulation count out of range');
  const r=random(seed),rOff=random(seed),rank=horses.map(()=>[0,0,0]),without=horses.map(()=>[0,0,0]);
  const scores=horses.map(h=>loop.evaluate(h,s).rating);
  const plain={...s,weights:loop.baselineWeights(s)};
  const offScores=horses.map(h=>loop.evaluate(h,plain).rating);
  for(let t=0;t<count;t++){
   const on=runRace(r,s,scores),off=runRace(rOff,s,offScores);
   for(let k=0;k<3;k++){rank[on[k]-1][k]++;without[off[k]-1][k]++}
  }
  return horses.map((h,i)=>({no:h.no,name:h.name,rating:scores[i],
   win:rank[i][0]/count*100,p3:rank[i].reduce((a,b)=>a+b,0)/count*100,
   baseP3:without[i].reduce((a,b)=>a+b,0)/count*100
  }));
 }
 return Object.freeze({random,norm,runRace,simulate,horseCount:horses.length});
}
