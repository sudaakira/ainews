/** Generate the dated, auditable full report from executed simulation results. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p),'utf8');
const config=(await import('data:text/javascript;base64,'+Buffer.from(read('races/kikka-2026.js')).toString('base64'))).default;
const stamp=config.asOf.slice(0,10).replaceAll('-',''),r=JSON.parse(read('results/kikka-2026-'+stamp+'.json'));
const audit=JSON.parse(read('data/kikka-2026-update-'+stamp+'.json'));
const wet=JSON.parse(read('data/kikka-2026-wet-'+stamp+'.json'));
const base=r.scenarios[0],rank=base.result,marks=['◎','○','▲','☆','△','△','△','△','条件付'];
const f=x=>Number(x).toFixed(1),table=(heads,rows)=>'|'+heads.join('|')+'|\n|'+heads.map(()=> '---').join('|')+'|\n'+rows.map(row=>'|'+row.join('|')+'|').join('\n');
const parts=[
 '# 菊花賞2026｜完全版・条件回帰ループ3D 枠順確定・重馬場想定',
 config.asOf.replace('T',' ').replace('+09:00',' JST')+'照合締切。10/25 京都11R 芝3000m外。出走18頭・正式馬番・枠順・騎手確定。',
 '[3Dを開く](https://sudaakira.github.io/ainews/race-engine/?race=kikka-2026&replay='+stamp+') ／ [10/21版](./kikka-2026-'+config.previousStamp+'.html)',
 '## 更新後の結論',
 rank.slice(0,9).map((h,i)=>(marks[i]||'')+h.no+' '+h.name+' '+f(h.rating)).join(' ＞ '),
 '重馬場はユーザー指定の想定で、当日発表ではない。初期設定は8倍速・ばらつき5・重・速度0・当日バイアス中立。1着率・3着内率は裁量採点と独立した正規乱数によるモデル内出現率であり、校正された的中確率ではない。3Dは抽選順位の映像化で、馬同士の物理的な干渉を計算した実測シミュレーターではない。',
 '## 枠順・騎手・調教後馬体重',
 'JRA公表の確定枠順と調教後馬体重を全18頭反映。体重は計量時の参考値で輸送や調教等で変動し、当日体重とは異なる。増減だけの機械的な加減点はしない。ラージアンサンブルはクラブ連絡482kg、JRA公表481kgを区別し、一覧はJRAの481kgを使用。',
 table(['枠','馬番','馬名','騎手・57kg','調教後kg','前走比','計量日・場所'],config.horses.map(h=>{const w=h.trainingWeight;return [h.frame,h.no,h.name,h.j,w.kg,(w.kg-w.lastKg>0?'+':'')+(w.kg-w.lastKg),w.date+' '+w.location];})),
 '枠色は1白・2黒・3赤・4青・5黄・6緑・7橙・8桃。ロブチェン⑧は青、ダノンヒストリー⑩は黄。7枠・8枠は各3頭。仮番号の登録順から正式馬番へ入れ替え、血統・状態・道悪応答・全戦績の紐付けは馬IDで照合した。',
 '## 今日の最終調整と採点変更',
 '前版締切後に確認できた内容を追加。ゴーイントゥスカイは10/22木曜追い、他17頭の最新調整日は10/21。シートゥサミットは10/17が実質最終で、10/21は軽め。キンググローリー・ショウナンガルフは公開時計集計中心のため、内容の独立裏付けを限定と明記し状態点を維持。他紙のS/A/B評価をそのまま採点へ転写していない。',
 table(['馬番・馬名','調整日','コース・時計','状態素点／前版→今回'],config.horses.map(h=>{const a=audit.rows.find(x=>x.name===h.name),u=a.changes.training;return [h.no+' '+h.name,h.workout.date,h.workout.track+' '+h.workout.clock,u?u.before+'→'+u.after:h.trainingScore+'（維持）'];})),
 '状態素点は総合12点枠内の裁量値。エムズビギン50→84は内容欠測の解消、ナリタエスペランサ45→78は最新の動きによる留保見直しで、過去実績が増えた意味ではない。アスクエジンバラは長距離を意識した負荷と動き、マジョレルブルー・ラージアンサンブル等は余力と前週比を重視。既に前版へ入れたロブチェンなどの同じ調教を、再報道だけで再加点しない。',
 '枠順の素点は中立50に対し35〜62、配点は総合1点だけ。距離損と折り合い・位置取りの裁量仮説で、歴史的枠成績から推定した係数ではない。重なら自動的に内・前有利とはしない。以下の枠差は表示用0.1点丸めを含む。',
 table(['馬名','前版・重','調教更新・枠中立','枠反映・重','調教情報差','枠差','変更素点'],rank.map(h=>{const x=r.comparison.find(x=>x.name===h.name),a=audit.rows.find(x=>x.name===h.name);return [h.name,f(x.previousRating),f(x.updatedUndrawnRating),f(h.rating),f(x.informationDelta),f(x.drawDelta),Object.entries(a.changes).map(([k,v])=>k+' '+v.before+'→'+v.after).join('／')];})),
 '## 全18頭の予想順位',
 table(['順位','印','馬番','馬名','総合点','モデル1着率','モデル3着内率'],rank.map((h,i)=>[i+1,marks[i]||'',h.no,h.name,f(h.rating),f(h.win)+'%',f(h.p3)+'%'])),
 '点数順と出現率順は個別SDにより一致しない。50,000回で0回でも実際に好走不能という意味ではない。',
 '## 重馬場適性の全頭根拠',
 '稍重・重・不良は区別する。soft＝重、heavy＝不良。本人の道悪実走を優先し、血統は補助仮説。京都重2000m勝ちと重3000mの適性を同一視しない。全馬3000mは未経験。戦績は10/18取得分を保持し、今日全走を再取得したとは表示しない。',
 table(['馬番・馬名','道悪実走','重の実出走数','重の素点補正','根拠・留保'],wet.rows.map(w=>[w.no+' '+w.name,w.records.map(x=>x.date+' '+x.venue+' '+x.distance+' '+x.ground+' '+x.finish+'着 '+x.weight+'kg').join('／')||'保持資料に該当なし',w.heavyStarts,Object.entries(w.softAdjustment).map(([k,v])=>k+':'+(v>0?'+':'')+v).join('／'),w.reason])),
 'Forty Ninerはゴーイントゥスカイの母母母父・4代目に確認し、道悪時の血統素点+2のみ。回避馬アルトラムスのNever Bend等を出走馬へ転用しない。未知は不得手の証明ではない。道悪補正は実測から学習した係数ではない。',
 '## 14項目の配点',
 table(['項目','配点','確認状態'],Object.entries(config.featureDefinitions).map(([k,v])=>[v.label,v.weight,v.note])),
 '血統・馬体・走法の参考点を総合点へ再加算していない。JRA最高レーティングは年間ピークの参考表示であり、今回の予想点ではない。騎手・厩舎の同条件集計は小標本を縮小し、未掲載は中立。配点合計100。',
 '## 条件回帰ループ：14条件',
 table(['条件','ばらつき','点数上位3頭'],r.scenarios.map(s=>[s.label,s.options.vol,s.result.slice(0,3).map(h=>h.no+' '+h.name+' '+f(h.rating)).join(' ＞ ')])),
 '各条件50,000回、同seed20261022で比較。右回り改善・バステール実戦バランス改善・状態3頭の上振れは未確認の仮説。状態上振れはエムズビギン88、キンググローリー84、ナリタエスペランサ84とし、前版の「状態80」設定を流用しない。前有利・外差しは仮説で当日の観測ではない。',
 '## 更新差と乱数差を分離',
 '比較の3系列は全て重・速度0・ばらつき5・中立・seed20261021。前版入力を完全保存して再現し、調教更新・枠中立、調教更新・枠反映と比べた。正式馬番へ並べ替えたことだけで乱数の割当が変わらないよう、比較時は各馬を旧登録順に揃え、結果を馬名で結合。公開基準は正式馬番順・seed20261022で、最後の列との違いは情報差だけではなく乱数系列の差も含む。',
 table(['馬名','前版・重','調教更新・枠中立／同乱数','枠反映／同乱数','公開基準／新乱数'],r.comparison.map(x=>[x.name,f(x.previousTop3Pct)+'%',f(x.updatedUndrawnSameSeedPct)+'%',f(x.updatedTop3SameSeedPct)+'%',f(x.updatedTop3DefaultPct)+'%'])),
 table(['ばらつき','ロブチェン1着率','同3着内率'],r.dispersion.map(s=>{const h=s.result.find(h=>h.name==='ロブチェン');return [s.vol,f(h.win)+'%',f(h.p3)+'%'];})),
 '## 同時好走と組み合わせ候補',
 '馬連は同一仮想レースの1・2着、ワイドは両馬3着以内を直接集計。各馬の単独率を掛け合わせていない。実オッズ未取得で期待回収率は算出しない。',
 table(['組み合わせ','馬連・モデル内率','ワイド・モデル内率'],r.pairs.slice(0,12).map(p=>[p.horses.join('－'),f(p.quinellaPct)+'%',f(p.widePct)+'%'])),
 '点数上位3頭の三連複1点：'+r.tickets.trioOnePoint[0].join('－')+'（モデル内出現率'+f(r.tickets.onePointModelHitPct)+'%）。ロブチェンとモデル3着内率上位4頭から2頭の6点：相手'+[...new Set(r.tickets.trioSixPoints.flat().filter(n=>n!=='ロブチェン'))].join('／')+'（同'+f(r.tickets.sixPointModelHitPct)+'%）。実際の的中確率・期待値ではない。絞る取りこぼしがあり、当日確認前の候補。',
 '## 京都3000mと展開',
 'キンググローリー・ナリタエスペランサの先行、シートゥサミットの途中進出を分ける。1周目の坂とスタンド前での折り合い、2度目の坂からの持続力を重視。外枠の距離損は折り合い・進路自由との両面で考える。3Dは公開寸法を基にした3000m・坂2回・直線403.7mの復元モデルで測量値ではない。再生用3分03秒5は予測タイムではない。',
 '## 全18頭の詳細比較'
];
for(const [i,x]of rank.entries()){
 const h=config.horses[x.no-1],s=h.suitability,w=h.trainingWeight,stats=config.factors.riders[h.j],rides=stats?.reduce((a,b)=>a+b,0);
 parts.push('### '+(i+1)+'. '+h.no+' '+h.name+'｜'+f(x.rating)+'点',
 h.frame+'枠'+h.no+'番／'+h.j+'（確定）／'+h.trainer+'／57kg／前走から'+h.rest+'日。JRA2026最高値：'+(h.officialPeakRating?h.officialPeakRating+' '+h.officialPeakDistance:'公表対象値なし。能力ゼロではない')+'。',
 h.latest,h.drawRemark,'重馬場評価：'+h.wetAssessment,'強み：'+h.plus+' 注意：'+h.minus,'5代血統：'+h.bloodNote,
 '血統・馬体・走法の参考点：'+s.blood+'／'+(s.body===null?'未採点':s.body)+'／'+s.gait+'。'+s.bodyEra+'。'+s.headline+'。'+s.caution,
 '調教資料（'+h.workout.verification+'）：'+h.workout.date+' '+h.workout.track+' '+h.workout.clock+'。'+h.workout.content,
 'JRA調教後体重：'+w.kg+'kg、前走'+w.lastKg+'kg、'+w.date+' '+w.location+'計量。採点不使用。',
 '同条件騎手：'+(rides?rides+'騎乗、'+stats.join('-')+'、複勝率'+f((stats[0]+stats[1]+stats[2])/rides*100)+'%、複勝回収率'+(config.factors.riderROI[h.j]??'未確認')+'%。':'掲載集計になく中立。')+' '+config.factors.scope,
 '[全戦績](https://db.netkeiba.com/horse/result/'+h.horseId+'/) ／ [5代血統](https://db.netkeiba.com/horse/ped/'+h.horseId+'/) ／ [最終調整]('+h.workout.source+')'+(h.workout.clockSource?' ／ [時計集計]('+h.workout.clockSource+')':'')+(s.source?' ／ [馬体資料]('+s.source+')':''));
}
parts.push('## 確認範囲・残る情報',
 '登録21頭の戦績143件（実出走142・取消1）、5代62枠×21頭は10/18取得分を継承。出走18頭の最終調整・確定枠順・騎手・調教後体重を10/22に照合。イブキとミッキーファルコンは収得賞金順で除外（非抽選）、アルトラムスは既報の回避で採点対象外。',
 '秋馬体は13頭の10/19写真、2頭の春写真を使用。チャリングクロス・キンググローリー・ショウナンハヤナミは秋立ち写真未確認。エムズビギン・ショウナンガルフの春写真を現在の出来と混同しない。',
 '当日の馬場・内外バイアス・体重・パドック・実オッズは未取得。キンググローリーとショウナンガルフの最終追い内容は公開集計中心で独立裏付け限定。全走の200m個別ラップは未取得。',
 '実行記録：14条件×50,000回＝'+r.totals.scenarioDraws.toLocaleString()+'回。ばらつき3種、別seed2本、旧登録順・同seedの3系列比較、再現性、馬連・ワイド直接集計を別途検証。勝率合計100%、3着内率300%、ワイド全組300%、馬連全組100%。異なる入力またはseedの系列は計'+r.totals.distinctDraws.toLocaleString()+'試行。再利用系列を水増ししない。',
 '[戦績・5代血統JSON](../data/kikka-2026-evidence.json) ／ [適性資料](../data/kikka-2026-suitability-20261019.json) ／ [道悪根拠](../data/kikka-2026-wet-'+stamp+'.json) ／ [採点変更・前版保存](../data/kikka-2026-update-'+stamp+'.json) ／ [全条件結果](../results/kikka-2026-'+stamp+'.json) ／ [CSV](../results/kikka-2026-'+stamp+'.csv)',
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
