
const c=window.RACE_CONFIG,$=id=>document.getElementById(id);
if(c?.id==='tenno-aki-2026'){
 document.title='天皇賞（秋）2026｜10/30更新・全17頭の条件回帰ループ3D';
 document.querySelector('.live-head strong').textContent='天皇賞（秋）2026　東京11R';
 const forecast=document.querySelector('main section.card');
 forecast.querySelector('h2').innerHTML='全17頭のモデル内3着出現率｜<span id="count">50,000回</span>';
 forecast.querySelector('p').textContent='基準点＋選択条件による未校正の抽選値。映像のばらつきと分析用誤差幅は独立です。';
 document.querySelector('.breakdown summary').textContent='8項目・全17頭の採点表';
 document.querySelector('.horse-list>p').textContent='全17頭の近走・1週前と最終調教・5代血統の注目経路・金曜情報を比較。';
 const docs=document.querySelector('.card.links');
 docs.insertAdjacentHTML('afterbegin','<p><a href="./reports/tenno-aki-20261030.html" target="_blank"><b>完全版予想書</b></a> ／ <a href="./results/tenno-aki-20261030.csv" download>全頭CSV</a> ／ <a href="./data/tenno-aki-20261030-inputs.json" download>入力データ</a></p>');
 for(const p of docs.querySelectorAll('p'))if(p.textContent.includes('汎用模式図で実際の競馬場'))p.textContent='東京Bの公表寸法を基準にした模式形状。曲率・勾配・ゴール板は測量・現物の完全再現ではありません。';
 const summary=document.createElement('section');summary.className='card tenno-summary';
 summary.innerHTML='<p class="tenno-date">10月30日（金）公開分を反映 ／ 11月1日 15:40発走</p><h2>◎⑦マスカレードボール　○①クロワデュノール</h2><p>▲⑥セイウンハーデス　☆⑪シェイクユアハート　△③レガレイラ。①⑦は1点差で同格に近い評価。</p><p><b>金曜の東京芝：良・Bコース</b>　クッション値9.9／含水率15.3%・13.4%。日曜の値は未確定。</p><p><a href="./reports/tenno-aki-20261030.html" target="_blank">完全版予想書・買い目を見る</a></p>';
 document.querySelector('.premium-nav').insertAdjacentElement('afterend',summary);
 const condition=document.createElement('p');condition.className='tenno-condition';forecast.prepend(condition);
 const update=()=>{const s=c.scenarios.find(s=>s.id===$('race-scenario').value);condition.textContent=(s?.label||'S0')+'：'+(s?.note||'');};
 $('race-scenario').addEventListener('change',update);update();
 const vol=$('vol'),vl=vol.previousElementSibling;if(vl?.tagName==='LABEL')vl.firstChild.textContent='映像の抽選ばらつき ';
 vol.insertAdjacentHTML('afterend','<p class="small">初期値3。映像の抽選順位だけに作用し、分析用の出現率には影響しません。</p>');
 const speed=$('speed');speed.style.display='none';speed.previousElementSibling.style.display='none';
 document.querySelector('.live-note').textContent='仮想レース｜東京B・模式形状｜時計は映像用';
 // Tokyo narration uses the correct corner sequence instead of Kyoto hill text.
 const speech=$('race-commentary-text');const correct=()=>{if(speech.textContent.includes('京都の坂')||speech.textContent.includes('3コーナーの下り'))speech.textContent='3コーナーから4コーナー。いよいよ東京の長い直線へ！';};
 new MutationObserver(correct).observe(speech,{childList:true,characterData:true,subtree:true});
 const style=document.createElement('style');style.textContent='.tenno-summary{border-top:4px solid #c2a04a}.tenno-date{font-size:12px;color:#4c5970}.tenno-summary h2{font-size:clamp(16px,2vw,21px);line-height:1.6}.tenno-condition{border-left:4px solid #b58f31;padding:8px 12px;background:#fff7df;color:#273a55}';document.head.append(style);
}
