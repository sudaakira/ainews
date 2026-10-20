/** Generate the dated, auditable full report from executed simulation results. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p),'utf8');
const config=(await import('data:text/javascript;base64,'+Buffer.from(read('races/kikka-2026.js')).toString('base64'))).default;
const stamp=config.asOf.slice(0,10).replaceAll('-',''),r=JSON.parse(read('results/kikka-2026-'+stamp+'.json'));
const audit=JSON.parse(read('data/kikka-2026-update-'+stamp+'.json'));
const base=r.scenarios[0],rank=base.result,marks=['◎','○','▲','☆','△','△','△','△','条件付'];
const f=x=>Number(x).toFixed(1),table=(heads,rows)=>'|'+heads.join('|')+'|\n|'+heads.map(()=> '---').join('|')+'|\n'+rows.map(row=>'|'+row.join('|')+'|').join('\n');
const parts=[
 '# 菊花賞2026｜完全版・条件回帰ループ3D 更新版',
 config.asOf.replace('T',' ').replace('+09:00',' JST')+'を情報締切として更新。10/25 京都11R 芝3000m外。登録21頭・想定18頭。番号・騎手は仮。',
 '## 現時点の結論',
 rank.slice(0,9).map((h,i)=>(marks[i]||'')+h.name+f(h.rating)).join(' ＞ ')+'。上位に差があっても、未校正モデル上の序列であり確実性を示さない。',
 '[3Dを開く](https://sudaakira.github.io/ainews/race-engine/?race=kikka-2026&replay='+stamp+') ／ [前版と比較](./kikka-2026-'+config.previousStamp+'.html)',
 '## 今日の確認と評価変更',
 '10/20の公開情報を締切時点で照合。コンジェスタスは良化談話から状態86→88。ジャスティンシカゴは心肺・乳酸測定への陣営談話から延長適性80→83とする仮説。数値・測定方法は非公開で確定的な科学的優位とはしない。キンググローリーは10/15新聞取材で10/14の単走内容を新たに確認し状態50→78。これは今日の新しい追い切りではない。ロブチェン・バステールの軽い調整だけでは点数を変えない。エムズビギン50・ナリタエスペランサ45は継承。',
 '配点は従来と同じ100点。血統10点枠は前版を継承し、状態12点・延長7点の中でのみ更新した。血統・馬体・走法の三項目の適性総合点を、この総合評価へ加算していない。JRA最高値も参考表示にとどめ、同じ近走を二重加算しない。各点は裁量仮説であり学習済みの回帰係数ではない。',
 table(['馬名','10/19総合','更新総合','差','変更した素点'],rank.map(h=>{const x=r.comparison.find(x=>x.name===h.name),a=audit.rows.find(x=>x.name===h.name);return [h.name,f(x.previousRating),f(h.rating),(x.delta>0?'+':'')+f(x.delta),Object.entries(a.changes).map(([k,v])=>k+' '+v.before+'→'+v.after).join('、')||'据え置き'];})),
 '## 今日の照合履歴',
 table(['馬名','区分','報道日／対象日','照合日時'],audit.rows.map(a=>[a.name,a.kind,a.publishedAt+'／'+(a.eventDate||'新規なし'),a.reviewedAt])),
 'retainedは今日の新情報が確認できず前版を継承した行。new-reportは新しい報道、newly-verified-earlier-reportは過去の報道の欠測修正。検索の公開抜粋までしか取得できた記事は、その範囲に限って参照し、有料本文を確認したとはしない。',
 '## 基準条件と全18頭',
 '良・高速想定／展開と当日バイアスは中立。初期設定8倍速・ばらつき5。各条件50,000回、seed '+r.seed+'。1着率・3着内率は未校正モデルの出現率。50,000回で0回でも実際に好走できないという意味ではない。点数順と率順は個別SDにより一致しない。',
 table(['順位','印','仮番','馬名','総合点','モデル1着率','モデル3着内率'],rank.map((h,i)=>[i+1,marks[i]||'',h.no,h.name,f(h.rating),f(h.win)+'%',f(h.p3)+'%'])),
 '## 14項目の配点',
 table(['項目','配点','確認状態'],Object.entries(config.featureDefinitions).map(([k,v])=>[v.label,v.weight,v.note])),
 '## 条件回帰ループ：12条件',
 '各条件を同じseedで比較。前有利と外差しの条件は当日観測ではなく仮説。右回り改善・バステール回復・状態不確実馬の良化は、確認できた事実と混同しない。',
 table(['条件','ばらつき','点数上位3頭'],r.scenarios.map(s=>[s.label,s.options.vol,s.result.slice(0,3).map(h=>h.name+' '+f(h.rating)).join(' ＞ ')])),
 '## 数値が動いた理由を分ける',
 '前版・更新版とも初期ばらつき5。下表の前版と更新版・同seedは、ばらつき5・seed20261019・各50,000回を共通にして採点変更の影響だけを比較した。更新版・現seedは20261020。ばらつき10・14の感度比較も別掲する。',
 table(['馬名','前版3着内率・5','更新版3着内率・5／同seed','更新版3着内率・5／現seed'],r.comparison.map(x=>[x.name,f(x.previousTop3Pct)+'%',f(x.updatedTop3SameSeedPct)+'%',f(x.updatedTop3DefaultPct)+'%'])),
 table(['ばらつき仮定','ロブチェン・モデル1着率','同3着内率'],r.dispersion.map(s=>{const h=s.result.find(h=>h.name==='ロブチェン');return [s.vol,f(h.win)+'%',f(h.p3)+'%'];})),
 '## 馬連・ワイドの同時好走',
 '同一の仮想レースで1・2着に入る組を馬連、両馬が3着以内に入る組をワイドとして直接集計。単独の3着内率を掛け合わせていない。実オッズは未発売・未取得のため、期待回収率は計算しない。',
 table(['組み合わせ','馬連・モデル出現率','ワイド・モデル出現率'],r.pairs.slice(0,12).map(p=>[p.horses.join('－'),f(p.quinellaPct)+'%',f(p.widePct)+'%'])),
 '相手4頭はモデル3着内率の高い順に選択：'+[...new Set(r.tickets.trioSixPoints.flat().filter(n=>n!=='ロブチェン'))].join('／')+'。三連複はロブチェン＋この4頭から2頭の6点（モデル的中率'+f(r.tickets.sixPointModelHitPct)+'%）。点数上位3頭の1点は'+r.tickets.trioOnePoint[0].join('－')+'（同'+f(r.tickets.onePointModelHitPct)+'%）。周辺馬との差は小さく、4頭へ絞る取りこぼしも残る。未校正モデルの出現率であり実際の的中確率・期待値ではない。枠・最終調教・実オッズ確認前の暫定候補。',
 '## 京都3000m・馬場と展開',
 'キンググローリーとナリタエスペランサが逃げ候補。シートゥサミットは途中の捲りを分けて考える。1周目の坂・スタンド前で折り合い、2周目の坂から下りで加速を持続できるかを重視。3Dは公開寸法を基に3000m・坂2回・直線403.7mを再現した復元モデルで、測量データではない。映像用の3分03秒5は予測時計ではない。',
 '10/25の馬場・枠順・当週最終追いは未確定。前週内回り2000mの結果やクッション値だけで、翌週外回り3000mの偏りを決めない。基準は中立とし、良高速・持続戦・稍重・重・前有利・外差しを比較する。Forty Niner・Never Bendは良で特別加点せず、道悪でも祖先名だけで適性を確定しない。',
 '## 全18頭の完全比較'
 ];
 for(const [i,x]of rank.entries()){
  const h=config.horses[x.no-1],s=h.suitability,stats=config.factors.riders[h.j],rides=stats?.reduce((a,b)=>a+b,0),roi=config.factors.riderROI[h.j];
  parts.push('### '+(i+1)+'. '+h.name+'｜'+f(x.rating)+'点',h.j+'（想定）／'+h.trainer+'／'+h.kg+'kg／前走から'+h.rest+'日。JRA2026最高値：'+(h.officialPeakRating?h.officialPeakRating+' '+h.officialPeakDistance:'対象レースの公表最高値なし。能力ゼロを意味しない')+'。',h.latest,'強み：'+h.plus+' 注意：'+h.minus,'5代血統：'+h.bloodNote,'血統・馬体・走法の参考点：'+s.blood+'／'+(s.body===null?'未採点':s.body)+'／'+s.gait+'。'+s.bodyEra+'。'+s.headline+'。'+s.caution,'追い切り資料（'+h.workout.verification+'）：'+(h.workout.date||'日付未確認')+' '+(h.workout.track||'')+' '+(h.workout.clock||'詳細未確認')+'。'+h.workout.content,'同条件騎手：'+(rides?rides+'騎乗、'+stats.join('-')+'、複勝率'+f((stats[0]+stats[1]+stats[2])/rides*100)+'%、複勝回収率'+(roi??'未確認')+'%。':'既存の掲載集計になく中立。')+' 集計期間・少数標本は下記参照。','[全戦績](https://db.netkeiba.com/horse/result/'+h.horseId+'/) ／ [5代血統](https://db.netkeiba.com/horse/ped/'+h.horseId+'/)'+(s.source?' ／ [馬体資料]('+s.source+')':'')+' ／ [調教資料]('+h.workout.source+')');
 }
 parts.push('## 確認範囲・残る情報',
 '全21頭の戦績143件（実出走142戦・取消1件）、5代62枠×21頭を10/18版から継承。戦績・血統の元データ取得日時を保持し、10/20に全走を新規取得したとは表示しない。最新の出走想定・談話と照合した。アルトラムスは左後肢跛行による回避、イブキ・ミッキーファルコンは除外対象のまま。',
 '馬体評価は前版の別分析で確認した13頭の10/19公開写真、2頭の春写真を参照。チャリングクロス・キンググローリー・ショウナンハヤナミは秋の立ち写真未確認。エムズビギン・ショウナンガルフは春写真で、現在の出来を確認した点ではない。血統95点のチャリングクロスを総合95点と読み替えない。',
 '騎手・厩舎の同条件集計は既存スナップショットを継承。'+config.factors.scope+' 一人の高回収率を馬の能力と同一視しない。',
 '実行記録：12条件×50,000回＝600,000回。ばらつき3種・別seed2本・旧版と同seed比較・再現性・馬連/ワイドの同時集計を別途実行。勝率合計100%、3着内率合計300%、ワイド全組合計300%、馬連全組合計100%を検証。独立したパラメータとseedの組は'+r.totals.distinctDraws.toLocaleString()+'試行で、同じ系列の再利用を水増ししない。',
 '[全戦績・5代血統JSON](../data/kikka-2026-evidence.json) ／ [10/19適性資料](../data/kikka-2026-suitability-20261019.json) ／ [採点変更履歴](../data/kikka-2026-update-'+stamp+'.json) ／ [全シナリオ結果](../results/kikka-2026-'+stamp+'.json) ／ [CSV](../results/kikka-2026-'+stamp+'.csv)',
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
