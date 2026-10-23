/** Generate the dated full report from executed results and an immutable prior model. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p),'utf8');
const config=(await import('data:text/javascript;base64,'+Buffer.from(read('races/kikka-2026.js')).toString('base64'))).default;
const stamp=config.asOf.slice(0,10).replaceAll('-',''),r=JSON.parse(read('results/kikka-2026-'+stamp+'.json'));
const audit=JSON.parse(read('data/kikka-2026-update-'+stamp+'.json')),wet=JSON.parse(read('data/kikka-2026-wet-'+stamp+'.json'));
const base=r.scenarios[0],rank=base.result,marks=['◎','○','▲','☆','△','△','△','△','条件付'];
const f=x=>Number(x).toFixed(1),date=s=>s.slice(4,6)+'/'+s.slice(6,8);
const table=(heads,rows)=>'|'+heads.join('|')+'|\n|'+heads.map(()=> '---').join('|')+'|\n'+rows.map(row=>'|'+row.join('|')+'|').join('\n');
const t=config.trackObservation;
const parts=[
 '# 菊花賞2026｜完全版・条件回帰ループ3D 10/23更新・重馬場前提',
 config.asOf+' JSTの公表情報を照合。10/25 京都11R 芝3000m外。10/22確定の出走18頭・正式馬番・枠順・騎手を継承。',
 '[更新3Dを開く](https://sudaakira.github.io/ainews/race-engine/?race=kikka-2026&ui='+stamp+'-heavy) ／ ['+date(config.previousStamp)+'版](./kikka-2026-'+config.previousStamp+'.html)',
 '## 更新後の結論',
 rank.slice(0,9).map((h,i)=>(marks[i]||'')+h.no+' '+h.name+' '+f(h.rating)).join(' ＞ '),
 '重馬場はユーザー指定の条件で、当日発表ではない。初期設定は4倍速・ばらつき3・重・速度0・当日バイアス中立。保存試算も基準ばらつき3に揃えた。1着率・3着内率は裁量採点と独立正規乱数による未校正モデル内出現率で、実際の的中確率ではない。ばらつきを小さくすると上位点の馬へ極端に集中するため、後掲の5・8・10・14も併せて読む。',
 '3Dのpack-v1は前馬・ラチ・距離ロス・進路の空きに応じた走路計画を行うが、着順は先に抽選している。詰まりや消耗が着順確率を変える物理予測モデルではない。即ゴール・5カメラ・最新のピクセル実況は維持。',
 '## 金曜の実測と重の想定を分ける',
 table(['項目','10/23発表・観測','採用上の扱い'],[
  ['京都の天候・芝',t.weather+'／'+t.turf+'（12:00現在）','実際の金曜発表。日曜の馬場とは別'],
  ['使用コース',t.course+'コース／'+t.condition,'Aコースを表示。内有利へ自動加点しない'],
  ['クッション値',t.cushion.value+'（10:30測定）','日曜の重の値として代用しない'],
  ['芝含水率','ゴール前'+t.water.goal+'%／4角'+t.water.corner4+'%（10:30）','同上'],
  ['今回の基準条件','重（soft）・中立・速度0','依頼上の仮定。雨量・日曜の予報数値は未入力']
 ]),
 '[JRA京都馬場発表]('+t.source+') ／ [JRA発表の数値・ラジオNIKKEI]('+t.numericSource+')。金曜の良から日曜の重を確定できないので、良・稍重への回復と不良への悪化を別条件で比較する。',
 '## 10/23公表の全18頭レビュー',
 '最終追いの時計・内容は前版を保持。ゴーイントゥスカイは10/22、他17頭は10/21（シートゥサミットの実質最終は10/17で、10/21は軽め）。金曜のキャンターを新しい最終追いに差し替えない。公表日だけ確認できた談話は、取材・調整実施日を10/23と断定しない。',
 table(['馬番・馬名','確認した公表情報','状態点','採点上の扱い'],config.horses.map(h=>[h.no+' '+h.name,'['+h.conditionReview.summary+']('+h.conditionReview.source+')'+(h.conditionReview.eventDate?'':'（取材実施日不詳）'),h.trainingScore+'（維持）',h.conditionReview.assessment])),
 '全18頭の状態素点は据え置き。繰り返し報じられた好調・良化を二重加点しない。エムズビギン／ラージアンサンブルの道悪歓迎と、マジョレルブルーの悪化留保だけを重のラップ・距離素点に小幅反映した裁量仮説。学習された回帰係数ではなく、15番目の条件でこの修正を外せる。',
 table(['馬名','10/22重の総合点','10/23重の総合点','情報差','変更した素点'],rank.map(h=>{const x=r.comparison.find(x=>x.name===h.name),a=audit.rows.find(x=>x.name===h.name);return [h.name,f(x.previousRating),f(h.rating),f(x.informationDelta),Object.entries(a.changes).map(([k,v])=>k+' '+v.before+'→'+v.after).join('／')||'変更なし'];})),
 '## 枠順・騎手・調教後馬体重',
 '10/22のJRA確定情報を継承。新たな変更は確認した公表資料には見当たらないが、当日の出走取消・変更は再確認が必要。調教後体重は計量時点の値で当日体重ではなく、輸送などで変動する。体重の増減だけでは機械的に加減点しない。ラージアンサンブルはクラブ連絡482kgとJRA公表481kgを区別し、表は後者。',
 table(['枠','馬番','馬名','騎手・57kg','調教後kg','前走比','計量日・場所'],config.horses.map(h=>{const w=h.trainingWeight;return [h.frame,h.no,h.name,h.j,w.kg,(w.kg-w.lastKg>0?'+':'')+(w.kg-w.lastKg),w.date+' '+w.location];})),
 '枠色は1白・2黒・3赤・4青・5黄・6緑・7橙・8桃。ロブチェン⑧は青、ダノンヒストリー⑩は黄。枠素点は35〜62、配点は総合1点内の裁量仮説。今回は枠順・枠点に変更なし。重なら自動的に内・前有利とはしない。',
 '## 全18頭の予想順位',
 table(['順位','印','馬番','馬名','総合点','モデル1着率','モデル3着内率'],rank.map((h,i)=>[i+1,marks[i]||'',h.no,h.name,f(h.rating),f(h.win)+'%',f(h.p3)+'%'])),
 '点数順と出現率順は馬ごとのSDにより一致しない。50,000回で0回でも実際に好走不能という意味ではない。現在の乱数モデルは共通の展開ショックや相関も学習していない。',
 '## 重馬場適性の全頭根拠',
 '稍重・重・不良は区別する。soft＝重、heavy＝不良。本人の道悪実走を優先し、血統・陣営見解は補助仮説。京都重2000m勝ちと重3000m適性を同一視しない。全馬3000m未経験。戦績は10/18取得分の保持で、今日全走を再取得したわけではない。',
 table(['馬番・馬名','道悪実走','重の実出走数','重の素点補正','根拠・留保'],wet.rows.map(w=>[w.no+' '+w.name,w.records.map(x=>x.date+' '+x.venue+' '+x.distance+' '+x.ground+' '+x.finish+'着 '+x.weight+'kg').join('／')||'保持資料に該当なし',w.heavyStarts,Object.entries(w.softAdjustment).map(([k,v])=>k+':'+(v>0?'+':'')+v).join('／'),w.reason])),
 'Forty Ninerはゴーイントゥスカイの母母母父・4代目に確認し、道悪時の血統素点+2のみ。回避馬アルトラムスの血統を出走馬へ転用しない。未知は不得手の証明ではない。',
 '## 14項目の配点',
 table(['項目','配点','確認状態'],Object.entries(config.featureDefinitions).map(([k,v])=>[v.label,v.weight,v.note])),
 '血統・馬体・走法の参考点は総合点へ再加算しない。JRA最高レーティングは年間ピークの参考値で、今回の予想点ではない。騎手・厩舎の同条件集計は小標本を縮小し、未掲載は中立。配点合計100。',
 '## 条件回帰ループ：'+r.scenarios.length+'条件',
 table(['条件','ばらつき','点数上位3頭'],r.scenarios.map(s=>[s.label,s.options.vol,s.result.slice(0,3).map(h=>h.no+' '+h.name+' '+f(h.rating)).join(' ＞ ')])),
 '各条件50,000回・同seed'+r.seed+'。通常条件はばらつき3、不良と高不確実性は8。右回り改善、バステールの実戦バランス改善、状態3頭の上振れは未確認の仮説。状態上振れの目標素点はエムズビギン88／キンググローリー84／ナリタエスペランサ84。前有利・外差しも当日観測ではない。道悪談話の修正を外す条件では10/22の重の点数を全18頭で再現する。',
 '## 情報差・ばらつき変更・乱数差を分離',
 '10/22保存版はばらつき5・seed20261022の入力と結果を凍結保存し、そのまま完全再現した。情報差の比較は旧版・新版とも重・速度0・ばらつき3・中立・seed20261022に統一。枠順・馬番・乱数割当は不変で枠差は全頭0。最後の新seed列との違いは乱数差を含む。旧版保存の率から新保存の率への変動を、そのまま情報更新の効果とは解釈しない。',
 table(['馬名','10/22保存／ばらつき5','旧入力／3・同乱数','新入力／3・同乱数','10/23保存／3・新乱数'],r.comparison.map(x=>[x.name,f(x.previousSavedTop3Pct)+'%',f(x.previousTop3Pct)+'%',f(x.updatedTop3SameSeedPct)+'%',f(x.updatedTop3DefaultPct)+'%'])),
 table(['ばらつき','ロブチェン1着率','同3着内率'],r.dispersion.map(s=>{const h=s.result.find(h=>h.name==='ロブチェン');return [s.vol,f(h.win)+'%',f(h.p3)+'%'];})),
 '別seed'+r.independentSeeds.map(s=>s.seed).join('／')+'でも各50,000回を実行した。seedの再現性はモデルの現実への妥当性を保証しない。',
 '## 同時好走と組み合わせ候補',
 '馬連は同一仮想レースの1・2着、ワイドは両馬3着以内を直接集計し、単独率を掛け合わせていない。実オッズ未取得で期待回収率は算出不可。以下はモデル比較用の候補で、購入推奨額や利益保証ではない。',
 table(['組み合わせ','馬連・モデル内率','ワイド・モデル内率'],r.pairs.slice(0,12).map(p=>[p.horses.join('－'),f(p.quinellaPct)+'%',f(p.widePct)+'%'])),
 '点数上位3頭の三連複1点：'+r.tickets.trioOnePoint[0].join('－')+'（モデル内出現率'+f(r.tickets.onePointModelHitPct)+'%）。ロブチェンとモデル3着内率上位4頭から2頭の6点：相手'+[...new Set(r.tickets.trioSixPoints.flat().filter(n=>n!=='ロブチェン'))].join('／')+'（同'+f(r.tickets.sixPointModelHitPct)+'%）。実際の的中確率・期待値ではなく、絞る取りこぼしがある。',
 '## 京都3000m・自然な馬群と展開',
 'キンググローリー・ナリタエスペランサの先行と、シートゥサミットの途中進出を分ける。1周目の坂とスタンド前での折り合い、2度目の坂からの持続力を重視。外枠の距離損は折り合い・進路自由との両面で考える。',
 '3Dは公開寸法に基づく3000m・坂2回・直線403.7mの復元モデルで測量値ではない。固定レーンでなく、前馬の後ろ・ラチ・進路の空き・コーナー距離ロスを考慮したpack-v1を保持。重想定では急な切り返しを抑える。詰まりや消耗から予想率を再計算するものではない。再生用3分03秒5は予測タイムではない。[馬群モデルの根拠・限界・検証](https://github.com/sudaakira/ainews/blob/main/race-engine/docs/pack-dynamics.md)',
 '## 全18頭の詳細比較'
];
for(const [i,x]of rank.entries()){
 const h=config.horses[x.no-1],s=h.suitability,w=h.trainingWeight,stats=config.factors.riders[h.j],rides=stats?.reduce((a,b)=>a+b,0);
 parts.push('### '+(i+1)+'. '+h.no+' '+h.name+'｜'+f(x.rating)+'点',
 h.frame+'枠'+h.no+'番／'+h.j+'／'+h.trainer+'／57kg／前走から'+h.rest+'日（レース当日基準）。JRA2026最高値：'+(h.officialPeakRating?h.officialPeakRating+' '+h.officialPeakDistance:'公表対象値なし。能力ゼロではない')+'。',
 h.latest,h.drawRemark,'重馬場評価：'+h.wetAssessment,'強み：'+h.plus+' 注意：'+h.minus,'5代血統：'+h.bloodNote,
 '血統・馬体・走法の参考点：'+s.blood+'／'+(s.body===null?'未採点':s.body)+'／'+s.gait+'。'+s.bodyEra+'。'+s.headline+'。'+s.caution,
 '最終調整資料（'+h.workout.verification+'）：'+h.workout.date+' '+h.workout.track+' '+h.workout.clock+'。'+h.workout.content,
 'JRA調教後体重：'+w.kg+'kg、前走'+w.lastKg+'kg、'+w.date+' '+w.location+'計量。体重自体は採点不使用。',
 '同条件騎手：'+(rides?rides+'騎乗、'+stats.join('-')+'、複勝率'+f((stats[0]+stats[1]+stats[2])/rides*100)+'%、複勝回収率'+(config.factors.riderROI[h.j]??'未確認')+'%。':'掲載集計になく中立。')+' '+config.factors.scope,
 '[10/23公表情報]('+h.latestSource+')'+(h.conditionReview.eventDateNote?'。'+h.conditionReview.eventDateNote:'')+' ／ [全戦績](https://db.netkeiba.com/horse/result/'+h.horseId+'/) ／ [5代血統](https://db.netkeiba.com/horse/ped/'+h.horseId+'/) ／ [最終調整]('+h.workout.source+')'+(h.workout.clockSource?' ／ [時計集計]('+h.workout.clockSource+')':'')+(s.source?' ／ [馬体資料]('+s.source+')':''));
}
parts.push('## 確認範囲・未確定項目',
 '登録21頭の戦績143件（実出走142・取消1）、5代62枠×21頭は10/18取得分を継承。出走18頭の最終調整・枠順・騎手・調教後体重は10/22照合値を保持し、10/23公表の全頭談話と確認できた金曜調整を追加。イブキとミッキーファルコンは収得賞金順の除外（非抽選）、アルトラムスは既報の回避。',
 '秋馬体は13頭の10/19写真、2頭の春写真を使用。チャリングクロス・キンググローリー・ショウナンハヤナミは秋立ち写真未確認。エムズビギン・ショウナンガルフの春写真を現在の出来と混同しない。',
 '日曜当日の馬場・内外バイアス・体重・パドック・実オッズは未取得。金曜の馬場発表は当日欄の代用ではない。キンググローリー・ショウナンガルフの最終追い内容は公開時計集計中心で独立裏付け限定。全走200m個別ラップは未取得。',
 '実行記録：'+r.scenarios.length+'条件×50,000回＝'+r.totals.scenarioDraws.toLocaleString()+'回。ばらつき'+r.dispersion.length+'種、別seed2本、旧版保存結果の完全再現、同seedの旧新版比較、馬連・ワイド・三連複の直接集計を別途実行。異なる入力またはseedの系列は計'+r.totals.distinctDraws.toLocaleString()+'試行（重複系列を除外）。勝率合計100%、3着内率300%、ワイド全組300%、馬連全組100%。これは統計的な予測精度の検証ではない。',
 '[戦績・5代血統JSON](../data/kikka-2026-evidence.json) ／ [適性資料](../data/kikka-2026-suitability-20261019.json) ／ [道悪根拠](../data/kikka-2026-wet-'+stamp+'.json) ／ [採点変更・前版入力保存](../data/kikka-2026-update-'+stamp+'.json) ／ [全条件結果](../results/kikka-2026-'+stamp+'.json) ／ [CSV](../results/kikka-2026-'+stamp+'.csv)',
 '## 出典',...Object.entries(config.sources).map(([title,url])=>'['+title+']('+url+')')
);
const md=parts.join('\n\n')+'\n',escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=s=>escape(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
const html=parts.map(s=>{
 if(s.startsWith('|')){const rows=s.split('\n').filter((_,i)=>i!==1).map((line,i)=>'<tr>'+line.slice(1,-1).split('|').map(v=>'<'+(i?'td':'th')+'>'+inline(v)+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('');return '<div class="scroll"><table>'+rows+'</table></div>';}
 const m=s.match(/^(#{1,3}) (.*)$/);return m?'<h'+m[1].length+'>'+inline(m[2])+'</h'+m[1].length+'>':'<p>'+inline(s)+'</p>';
}).join('\n');
const document='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>菊花賞2026 '+config.asOf.slice(5,10)+'更新・完全版</title><style>body{margin:0;background:#f3f5f4;color:#24332e;font:16px/1.85 -apple-system,BlinkMacSystemFont,"Hiragino Sans",Meiryo,sans-serif}main{max-width:1120px;margin:auto;padding:36px 24px 70px;background:white}h1{font-size:27px;border-left:6px solid #a72a36;padding-left:16px}h2{font-size:22px;margin-top:40px;border-bottom:2px solid #ccd5cf}h3{margin-top:30px;color:#135843}.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #d7dfda;padding:9px;min-width:80px}th{background:#e7efea;text-align:left}a{color:#08634f}@media(max-width:600px){main{padding:22px 16px}h1{font-size:24px}table{min-width:640px}}@media print{.scroll{overflow:visible}table{min-width:0}h2,h3{break-after:avoid}}</style><main>'+html+'</main></html>';
writeFileSync(resolve(root,'reports/kikka-2026-'+stamp+'.md'),md);
writeFileSync(resolve(root,'reports/kikka-2026-'+stamp+'.html'),document);
console.log(JSON.stringify({report:stamp,horses:rank.length,scenarios:r.scenarios.length,characters:md.length}));
