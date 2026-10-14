/** Reusable 14-factor regression model. All scores are uncalibrated. */
export function createRegression(config,F){
 'use strict';
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 const round=x=>Math.round(x*10)/10;
 if(!F)throw new Error('Course factor engine is required');
 const FEATURES=[
  {id:'course',label:'同コース・距離実績',weight:20,confidence:'暫定',note:'対象レースの実績を優先。近走メモから推定した初期点'},
  {id:'recent',label:'近走能力・クラス',weight:17,confidence:'暫定',note:'既存の暫定能力指数を100点換算。精密なレーティングではない'},
  {id:'lap',label:'ラップ・直接対戦',weight:10,confidence:'一部',note:'上がり・レコード・直接対戦のメモのみ。全走のラップと時計は未取得'},
  {id:'training',label:'調教・状態',weight:12,confidence:'一部',note:'既存A/B/C評価を換算。最終・1週前の詳細時計は未入力'},
  {id:'blood',label:'血統・馬場適性',weight:8,confidence:'暫定',note:'父・母父からの暫定評価。5代血統すべての照合は未実施'},
  {id:'pace',label:'先行力・展開',weight:6,confidence:'仮説',note:'脚質・展開・高速馬場で変化。実際の位置取りは未確定'},
  {id:'rider',label:'騎手・同条件回収率',weight:5,confidence:'一部',note:'確認できた騎手だけの対象レース複勝率・複回。未確認は中立'},
  {id:'stable',label:'厩舎・仕上げ',weight:5,confidence:'仮説',note:'厩舎評価は暫定主観点。年度別重賞・同コース成績は未校正'},
  {id:'draw',label:'枠順・コース取り',weight:4,confidence:'過去傾向',note:'対象レース枠別入着率を縮小補正'},
  {id:'sex',label:'牡馬・牝馬傾向',weight:2,confidence:'過去傾向',note:'対象レースの牡牝別入着率。小標本を縮小補正'},
  {id:'load',label:'斤量',weight:3,confidence:'入力値',note:'対象レースに記載した負担重量を使用'},
  {id:'rotation',label:'ローテ・休養',weight:3,confidence:'一部',note:'前走からの間隔のみ。故障・手術・当日の馬体は未検証'},
  {id:'distance',label:'距離変更・距離適性',weight:3,confidence:'暫定',note:'距離実績メモからの距離適性推定'},
  {id:'bias',label:'当日馬場バイアス',weight:2,confidence:'未確認',note:'初期値は中立。前有利・外差し等は利用者が選ぶ仮説'}
 ];
 if(FEATURES.reduce((sum,f)=>sum+f.weight,0)!==100)throw new Error('Default weights must total 100');
 // Race-local proxies must be explicitly provided. Missing fields stay neutral (50).
 const INPUTS=config.inputs||{};
 const SPEED=config.speedAdapt||{};
 const DEFAULTS=Object.fromEntries(FEATURES.map(f=>[f.id,1]));
 const BIASES={neutral:'当日情報なし・中立',inside:'内・先行優勢',outside:'外・差し優勢'};
 const GROUNDS={good:'良（高速想定）',yielding:'稍重',soft:'重',heavy:'不良'};
 const SKILLS={};
 function weights(options={}){
  const w={};
  for(const f of FEATURES)w[f.id]=clamp(Number(options.weights?.[f.id]??1),0,2);
  return w;
 }
 function scores(h,scenario={}){
  const inp=INPUTS[h.no]||[];
  const f=F.factors(h,{jockey:1,sex:1,draw:1});
  const pace=clamp(Number(scenario.pace??0),-3,3);
  const speed=clamp(Number(scenario.speed??2),0,3);
  const ground=scenario.ground||'good';
  const bias=scenario.bias||'neutral';
  const style=h.style||'';
  const favPace=style==='逃げ'?-1.0:style==='好位'?-.52:style==='差し'?.92:.28;
  const fastAdapt=(SPEED[h.no]??0)*(speed-1.5)*4;
  let paceScore=style?clamp(62+favPace*pace*9+fastAdapt,20,95):50;
  // Optional race-specific prior: Kyoto Shuka Sho previous-race 4th-corner position.
  // Front 0-3-2-50 vs behind 8-5-6-65 in eight KYOTO editions.
  // Lap/ability and current style already capture much of this evidence, so
  // apply a SMALL, Beta-style shrunk correction only to the existing pace factor.
  // Never infer previous corner from registration-order pseudo horse numbers.
  const prior=config.historicalTrends?.kyotoPrev4c, n0=Number(config.historicalTrends?.priorN??50);
  if(prior&&Number.isInteger(h.lastRace4c)&&h.lastRace4c>0&&n0>=1){
    const front=prior.front,behind=prior.behind;
    const count=rec=>rec.w+rec.p2+rec.p3+rec.other;
    const hit=rec=>rec.w+rec.p2+rec.p3;
    const allN=count(front)+count(behind),allP=hit(front)+hit(behind);
    if(allN>0){
      const avg=allP/allN, rec=h.lastRace4c<=4?front:behind;
      const posterior=(hit(rec)+n0*avg)/(count(rec)+n0);
      const delta=clamp((posterior-avg)*35,-3,3);
      paceScore=clamp(paceScore+delta,20,95);
    }
  }
  if(ground!=='good'){
   // The missing five-generation pedigree and measured wet-track form are NOT
   // fabricated. Only suppress the dry, ultra-fast-track advantage.
   paceScore=clamp(paceScore-fastAdapt*.65,20,95);
  }
  let biasScore=50;
  // Registration-order pseudo numbers must never affect lane bias.
  const verifiedDraw=!config.provisionalDraw;
  if(bias==='inside'){
   const front=style==='逃げ'?1:style==='好位'?.6:style==='中団'?.05:-.65;
   biasScore=clamp(50+23*front+(verifiedDraw?(f.drawNumber<=3?8:f.drawNumber>=7?-8:0):0),25,82);
  }else if(bias==='outside'){
   const late=style==='差し'?1:style==='中団'?.6:style==='好位'?-.20:-.65;
   biasScore=clamp(50+22*late+(verifiedDraw?(f.drawNumber>=7?8:f.drawNumber<=3?-6:0):0),24,82);
  }
  const rest=Number.isFinite(Number(h.rest))&&h.rest!==null&&h.rest!==undefined?Number(h.rest):null;
  let rotation=rest===null?50:rest<=18?43:rest<=80?70:rest<=110?61:rest<=150?47:rest<=200?38:24;
  let state={A:87,B:67,C:43}[h.training]??50;
  // Evidence-backed intermediate workout score avoids an unjustified full B→A leap.
  if(Number.isFinite(h.trainingScore))state=clamp(h.trainingScore,15,96);
  // Recent serious illness plus extended absence is a top-level fitness
  // uncertainty, not merely a few points of spacing/layoff variance.
  // This is a cautious model assumption, not a veterinary diagnosis.
  const fitnessRisk=rest!==null&&rest>=120&&/肺出血|屈腱炎|骨折/.test(h.minus||'');
  if(fitnessRisk){state=Math.min(state,36);rotation=Math.min(rotation,24);}

  return {
   course:Number.isFinite(inp[0])?inp[0]:50,
   recent:Number.isFinite(Number(h.base))&&h.base!==null?clamp(55+(h.base-103)*2.8,15,96):50,
   lap:Number.isFinite(inp[1])?inp[1]:50,
   training:state,
   blood:Number.isFinite(inp[2])?inp[2]:50,
   pace:paceScore,
   rider:clamp(50+f.jockey*19,15,85),
   stable:Number.isFinite(inp[3])?inp[3]:50,
   draw:clamp(50+f.draw*24,17,83),
   sex:clamp(50+f.sex*34,15,85),
   load:h.kg===null||h.kg===undefined?50:clamp(50+((config.standardWeight??57)-Number(h.kg))*5,30,70),
   rotation,
   distance:Number.isFinite(inp[4])?inp[4]:50,
   bias:biasScore
  };
 }
 function evaluate(h,scenario={}){
  const values=scores(h,scenario),w=weights(scenario);
  let active=0,total=0;
  const detail={};
  for(const f of FEATURES){
   const effective=f.weight*w[f.id];
   active+=effective;
   total+=values[f.id]*effective;
   detail[f.id]={score:round(values[f.id]),effectiveWeight:round(effective)};
  }
  // Display the ACTUAL normalized weights after all user multipliers.
  // Sliders change relative importance; the reported column always sums to ~100.
  for(const f of FEATURES){
   detail[f.id].rawWeight=detail[f.id].effectiveWeight;
   detail[f.id].effectiveWeight=active?round(f.weight*w[f.id]/active*100):0;
  }
  const overall=active?total/active:50;
  return {no:h.no,rating:round(clamp(overall,0,100)),rawRating:overall,
   detail,activeWeight:round(active),basis:'未校正の条件回帰ループ暫定モデル'};
 }
 function baselineWeights(options={}){
  const w={...weights(options)};
  for(const id of ['rider','sex','draw'])w[id]=0;
  return w;
 }
 function docSummary(){
  return {features:FEATURES.length,defaultWeight:100,race:config.id,
   unverified:['完全5代血統','厩舎の定量成績','全出走の直接対戦・ラップ','当日馬場バイアス','当週/1週前調教全時計','人気・オッズ（期待値の評価不可）']};
 }
 return Object.freeze({FEATURES,INPUTS,DEFAULTS,BIASES,GROUNDS,
  scores,evaluate,weights,baselineWeights,docSummary});
}
