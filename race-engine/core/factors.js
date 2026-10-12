/**
 * Shared race-course tendency calculator.
 * Works without historic data: missing/unsupported numbers produce zero bonus.
 * Data should be scoped to the selected course and race. No fake ROI.
 */
export function createFactors(config) {
 const hist=config.factors||{};
 const DRAW=hist.draw||[], SEX=hist.sex||{}, RIDERS=hist.riders||{};
 const RIDER_PLACE_ROI=hist.riderROI||{}, familiarity=hist.familiarity||{};
 const ordered=config.horses.slice().sort((a,b)=>a.no-b.no),field=ordered.length;
 const sizes=Array(Math.min(8,field)).fill(1);
 for(let extras=field-sizes.length;extras>0;extras--) {
  // Allocate added runners to outside frame first; 18 runners becomes 2/2/2/2/2/2/3/3.
  const candidate=sizes.length-1-((field-sizes.length-extras)%sizes.length);
  sizes[candidate]++;
 }
 const frames=new Map();let k=0;
 sizes.forEach((count,idx)=>{for(let j=0;j<count;j++)frames.set(ordered[k++].no,idx+1)});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const round=x=>Math.round(x*100)/100;
 const shrink=(hits,n,prior,n0)=>(hits+prior*n0)/(n+n0);
 const sexOf=h=>String(h.age||'').startsWith('牝')?'牝':String(h.age||'').startsWith('セ')?'セ':'牡';
 const frame=h=>Number(h.frame)||frames.get(h.no)||1;
 const drawRecords=DRAW.filter(x=>x&&x.n>0);
 const drawTotal=drawRecords.reduce((a,x)=>a+x.n,0),drawHits=drawRecords.reduce((a,x)=>a+x.p3,0);
 const sexRecords=Object.values(SEX).filter(x=>x&&x.n>0);
 const sexTotal=sexRecords.reduce((a,x)=>a+x.n,0),sexHits=sexRecords.reduce((a,x)=>a+x.p3,0);
 const drawAvg=drawTotal?drawHits/drawTotal:0.18,sexAvg=sexTotal?sexHits/sexTotal:.18;
 function factors(h,options={}){
  const g=sexOf(h),drawNumber=frame(h),dr=DRAW[drawNumber],sr=SEX[g==='牝'?'female':'other'],r=RIDERS[h.j];
  const wd=clamp(Number(options.draw??1),0,2),ws=clamp(Number(options.sex??1),0,2),wj=clamp(Number(options.jockey??1),0,2);
  const d=dr?.n>0?clamp(4.8*Math.log(shrink(dr.p3,dr.n,drawAvg,30)/drawAvg),-1.1,1.1):0;
  const sex=sr?.n>0?clamp(3.6*Math.log(shrink(sr.p3,sr.n,sexAvg,55)/sexAvg),-.55,.55):0;
  let j=0,jRides=0,jP3=null,roi=null;
  if(Array.isArray(r)&&r.length===4){
   jRides=r.reduce((a,b)=>a+b,0);
   if(jRides>0){
    const hits=r[0]+r[1]+r[2];jP3=100*hits/jRides;
    j=clamp(5.5*Math.log(shrink(hits,jRides,.225,32)/.225),-1.25,1.25);
    roi=RIDER_PLACE_ROI[h.j]??null;
    if(roi!==null)j+=clamp((roi-100)/100*.55*jRides/(jRides+45),-.22,.22);
   }
  }
  j=clamp((j+(familiarity[h.j]||0))*wj,-2.5,2.5);
  return {
   jockey:round(j),sex:round(sex*ws),draw:round(d*wd),
   total:round(j+sex*ws+d*wd),drawNumber,sexLabel:g,
   jockeyRides:jRides,jockeyTop3Pct:jP3===null?null:round(jP3),
   jockeyKnown:jRides>0,jockeyPlaceRoi:roi,
   historicalDrawPct:dr?.n?round(100*dr.p3/dr.n):null,
   historicalSexPct:sr?.n?round(100*sr.p3/sr.n):null
  };
 }
 return Object.freeze({factors,frame,sexOf,DRAW,SEX,RIDERS,SOURCE:hist.sources||{},
  scope:hist.scope||'対象コースの過去データ未設定（中立）',
  frameSizes:sizes,fieldSize:field});
}
