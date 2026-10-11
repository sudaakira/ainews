/* Swan Stakes 2026 — independently auditable jockey / sex / draw factors.
 * Scope: Kyoto 1400m OUTER. The 2021/2022 Hanshin runnings are excluded from
 * draw/sex history. These are conservative sensitivity adjustments, NOT
 * calibrated win probabilities. Never use popularity or betting odds.
 * Sources:
 * JRA official 2016-20/2023-25 Kyoto draw records:
 * https://www.jra.go.jp/keiba/race/094/data.html
 * Kyoto-only sex summary (2016-20/2023-25):
 * https://note.com/pegasus_yakkun/n/n40e9d3ac2595
 * Rider stats Kyoto turf 1400 OUTER 2023-01-01..2025-12-31:
 * https://keiba-course.com/course/kyoto-turf-1400-out/
 */
(function(global){
 'use strict';
 // Starts and on-the-board counts from the JRA Kyoto-only 8-race dataset.
 const DRAW=[
  null,
  {n:15,p3:4},{n:15,p3:5},{n:15,p3:2},{n:15,p3:2},
  {n:15,p3:2},{n:16,p3:1},{n:21,p3:3},{n:22,p3:5}
 ];
 // Kyoto-only sex: 34 female runners, 4 podiums; 100 other runners, 20 podiums.
 // The 8 wins were by male horses. Do not treat absence of female wins as zero ability.
 const SEX={female:{n:34,p3:4},other:{n:100,p3:20}};
 // 2023-2025 course stats from the cited source: 1st+2nd+3rd+unplaced.
 // Missing values remain explicitly unknown (zero effect).
 const RIDERS={
  '松山弘平':[5,5,3,19],
  '武豊':[4,6,4,13],
  '西村淳也':[4,2,5,28],
  '北村友一':[3,4,3,20],
  '鮫島克駿':[3,3,2,22],
  '幸英明':[3,1,5,29],
  '池添謙一':[2,1,2,19]
 };
 // Place-bet return indices (JPY returned per ¥100 staked), separate from ability.
 // Source: course performance, 2023–2025; small auxiliary signal only.
 const RIDER_PLACE_ROI={
  '松山弘平':120,'武豊':112,'西村淳也':101,'北村友一':115,
  '鮫島克駿':88,'幸英明':134,'池添謙一':65
 };
 const SOURCE={
  draw:'https://www.jra.go.jp/keiba/race/094/data.html',
  sex:'https://note.com/pegasus_yakkun/n/n40e9d3ac2595',
  jockey:'https://keiba-course.com/course/kyoto-turf-1400-out/',
  starters:'https://www.jra.go.jp/JRADB/accessD.html?CNAME=pw01dde0108202604051120261012%2FDC'
 };
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const round=n=>Math.round(n*100)/100;
 // Empirical-Bayes-like pseudo-observations limit sampling noise:
 // shrink towards a neutral 18% top-three prior with 25 notional starts.
 // This is a modeling assumption, not a posterior fitted to validation races.
 function shrunkRate(p3,n,prior=.18,priorN=25){
  return (p3+prior*priorN)/(n+priorN);
 }
 function frame(no){
  return no<=12?Math.ceil(no/2):no<=15?7:8;
 }
 function sexOf(h){return h.age.startsWith('牝')?'牝':h.age.startsWith('セ')?'セ':'牡';}
 const drawAverage=24/134;
 const genderAverage=24/134;
 // Effects are score points on the original ~100-point model scale.
 function factors(h,options={}){
  const g=sexOf(h),sexRecord=g==='牝'?SEX.female:SEX.other;
  const draw=frame(h.no),drawRecord=DRAW[draw];
  const jockeyRecord=RIDERS[h.j];
  const weights={
   draw:clamp(Number(options.draw??1),0,2),
   sex:clamp(Number(options.sex??1),0,2),
   jockey:clamp(Number(options.jockey??1),0,2)
  };
  const dRate=shrunkRate(drawRecord.p3,drawRecord.n,drawAverage,30);
  const sRate=shrunkRate(sexRecord.p3,sexRecord.n,genderAverage,55);
  // Relative multipliers, capped at ±1.10 points for draw, ±.55 for sex.
  let d=clamp(4.8*Math.log(dRate/drawAverage),-1.1,1.1);
  let sex=clamp(3.6*Math.log(sRate/genderAverage),-.55,.55);
  // Unknown rider -> neutral, never a negative score from missing data.
  let j=0,jRides=0,jP3=null,roi=null,roiImpact=0;
  if(jockeyRecord){
   jRides=jockeyRecord.reduce((a,b)=>a+b,0);
   const hits=jockeyRecord.slice(0,3).reduce((a,b)=>a+b,0);
   jP3=100*hits/jRides;
   const rate=shrunkRate(hits,jRides,.225,32);
   j=clamp(5.5*Math.log(rate/.225),-1.25,1.25);
   roi=RIDER_PLACE_ROI[h.j]??null;
   if(roi!==null)roiImpact=clamp((roi-100)/100*.55*jRides/(jRides+45),-.22,.22);
  }
  // Small independent same-race familiarity bonus, based on known
  // Kyoto Swan Stakes podiums (2024 and 2025 only); no double ranking.
  const familiarity={'松山弘平':.12,'武豊':.10,'菅原明良':.14,'北村友一':.10,'吉村誠之助':.10};
  const familiar=familiarity[h.j]||0;
  const jockey=clamp((j+familiar+roiImpact)*weights.jockey,-2.5,2.5);
  const sexValue=round(sex*weights.sex),drawValue=round(d*weights.draw);
  const total=round(jockey+sexValue+drawValue);
  return {
   jockey:round(jockey),sex:sexValue,draw:drawValue,total,
   drawNumber:draw,sexLabel:g,
   jockeyRides:jRides,jockeyTop3Pct:jP3===null?null:round(jP3),
   jockeyKnown:!!jockeyRecord,jockeyPlaceRoi:roi,
   historicalDrawPct:round(drawRecord.p3*100/drawRecord.n),
   historicalSexPct:round(sexRecord.p3*100/sexRecord.n)
  };
 }
 global.SWAN_FACTORS=Object.freeze({
  factors,frame,sexOf,DRAW,SEX,RIDERS,SOURCE,
  scope:'京都芝1400m外／スワンS 京都開催8回（2016–20, 2023–25）',
  riderScope:'京都芝1400m外 2023–2025（確認できた騎手のみ）'
 });
})(window);
