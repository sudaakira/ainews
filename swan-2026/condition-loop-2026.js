/* Swan Stakes adjustable 100-point condition-regression loop (illustrative v1).
 * NOT a fitted or validated predictor. Current 18 entrants have partial notes:
 * five-generation pedigrees, full sectional timing, direct matchups and full
 * trainer records are unavailable. Such fields use visibly labeled hypotheses
 * or neutral values. Do not present these as measured statistics.
 */
(function(global){
 'use strict';
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 const round=x=>Math.round(x*10)/10;
 const F=global.SWAN_FACTORS;
 if(!F)throw new Error('Historical factor module must load before condition loop');
 const FEATURES=[
  {id:'course',label:'同コース・距離実績',weight:20,confidence:'暫定',note:'京都芝1400mの実績を優先。近走メモから推定した初期点'},
  {id:'recent',label:'近走能力・クラス',weight:17,confidence:'暫定',note:'既存の暫定能力指数を100点換算。精密なレーティングではない'},
  {id:'lap',label:'ラップ・直接対戦',weight:10,confidence:'一部',note:'上がり・レコード・直接対戦のメモのみ。全走のラップと時計は未取得'},
  {id:'training',label:'調教・状態',weight:12,confidence:'一部',note:'既存A/B/C評価を換算。最終・1週前の詳細時計は未入力'},
  {id:'blood',label:'血統・馬場適性',weight:8,confidence:'暫定',note:'父・母父からの暫定評価。5代血統すべての照合は未実施'},
  {id:'pace',label:'先行力・展開',weight:6,confidence:'仮説',note:'脚質・展開・高速馬場で変化。実際の位置取りは未確定'},
  {id:'rider',label:'騎手・同条件回収率',weight:5,confidence:'一部',note:'確認できた騎手だけの京都外1400m複勝率・複回。未確認は中立'},
  {id:'stable',label:'厩舎・仕上げ',weight:5,confidence:'仮説',note:'厩舎評価は暫定主観点。年度別重賞・同コース成績は未校正'},
  {id:'draw',label:'枠順・コース取り',weight:4,confidence:'過去傾向',note:'京都開催スワンS枠別入着率を縮小補正'},
  {id:'sex',label:'牡馬・牝馬傾向',weight:2,confidence:'過去傾向',note:'京都開催の牡牝別入着率。小標本を縮小補正'},
  {id:'load',label:'斤量',weight:3,confidence:'入力値',note:'2026年出馬表に記載した負担重量を使用'},
  {id:'rotation',label:'ローテ・休養',weight:3,confidence:'一部',note:'前走からの間隔のみ。故障・手術・当日の馬体は未検証'},
  {id:'distance',label:'距離変更・1400適性',weight:3,confidence:'暫定',note:'1400m好走メモからの距離適性推定'},
  {id:'bias',label:'当日馬場バイアス',weight:2,confidence:'未確認',note:'初期値は中立。前有利・外差し等は利用者が選ぶ仮説'}
 ];
 if(FEATURES.reduce((sum,f)=>sum+f.weight,0)!==100)throw new Error('Default weights must total 100');
 // Each row: [course, lap, two-generation pedigree proxy, stable opinion,
 // 1400m distance adaptability]. Provisional—not measured race statistics.
 const INPUTS={
   1:[96,73,55,58,96], 2:[79,72,56,56,91],
   3:[57,47,63,57,58], 4:[73,90,62,55,67],
   5:[42,39,66,70,34], 6:[94,85,61,54,97],
   7:[24,30,50,55,31], 8:[63,60,73,71,49],
   9:[99,96,64,62,98],10:[72,78,55,63,84],
  11:[54,71,60,55,47],12:[88,70,57,54,93],
  13:[65,79,62,55,86],14:[98,93,56,70,97],
  15:[52,75,67,63,49],16:[59,50,67,56,77],
  17:[68,83,63,57,46],18:[55,77,65,72,50]
 };
 const SPEED={1:1,2:.7,3:-.3,4:.8,5:-.8,6:1.1,7:-1,8:.1,9:1.5,10:.9,11:-.2,12:.6,13:1,14:1.4,15:-.4,16:-.1,17:.5,18:.1};
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
  const inp=INPUTS[h.no];
  if(!inp)throw new Error('Missing horse '+h.no);
  const f=F.factors(h,{jockey:1,sex:1,draw:1});
  const pace=clamp(Number(scenario.pace??0),-3,3);
  const speed=clamp(Number(scenario.speed??2),0,3);
  const ground=scenario.ground||'good';
  const bias=scenario.bias||'neutral';
  const style=h.style;
  const favPace=style==='逃げ'?-1.0:style==='好位'?-.52:style==='差し'?.92:.28;
  const fastAdapt=(SPEED[h.no]??0)*(speed-1.5)*4;
  let paceScore=clamp(62+favPace*pace*9+fastAdapt,20,95);
  if(ground!=='good'){
   // The missing five-generation pedigree and measured wet-track form are NOT
   // fabricated. Only suppress the dry, ultra-fast-track advantage.
   paceScore=clamp(paceScore-fastAdapt*.65,20,95);
  }
  let biasScore=50;
  if(bias==='inside'){
   const front=style==='逃げ'?1:style==='好位'?.6:style==='中団'?.05:-.65;
   biasScore=clamp(50+23*front+(f.drawNumber<=3?8:f.drawNumber>=7?-8:0),25,82);
  }else if(bias==='outside'){
   const late=style==='差し'?1:style==='中団'?.6:style==='好位'?-.20:-.65;
   biasScore=clamp(50+22*late+(f.drawNumber>=7?8:f.drawNumber<=3?-6:0),24,82);
  }
  const rest=h.rest;
  const rotation=rest<=18?43:rest<=80?70:rest<=110?61:rest<=150?47:rest<=200?38:24;
  const state={A:87,B:67,C:43}[h.training]??50;
  return {
   course:inp[0],
   recent:clamp(55+(h.base-103)*2.8,15,96),
   lap:inp[1],
   training:state,
   blood:inp[2],
   pace:paceScore,
   rider:clamp(50+f.jockey*19,15,85),
   stable:inp[3],
   draw:clamp(50+f.draw*24,17,83),
   sex:clamp(50+f.sex*34,15,85),
   load:clamp(50+(57-Number(h.kg))*5,30,70),
   rotation,
   distance:inp[4],
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
  return {features:FEATURES.length,defaultWeight:100,
   unverified:['完全5代血統','厩舎の定量成績','全出走の直接対戦・ラップ','当日馬場バイアス','当週/1週前調教全時計']};
 }
 global.SWAN_LOOP=Object.freeze({FEATURES,INPUTS,DEFAULTS,BIASES,GROUNDS,
  scores,evaluate,weights,baselineWeights,docSummary});
})(window);
