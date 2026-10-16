/** Deterministic text commentary driven solely by the visible running order.
 * Never reveals the sampled winner before it crosses the line. */
export function raceCommentary({clock,progress,order,horses,crossed,distance=2000}){
 const byNo=new Map(horses.map(h=>[h.no,h]));
 const name=no=>byNo.get(no)?.name||String(no);
 const leader=order[0],second=order[1],third=order[2];
 const lead=name(leader.no),chaser=second?name(second.no):'',gap=second?(leader.p-second.p)*distance:0;
 const meters=Math.max(0,Math.round((1-progress)*distance/10)*10);
 if(crossed.length)return {key:'winner-'+crossed[0],tone:'winner',title:'WINNER',text:name(crossed[0])+'、いま1着でゴールイン！'+(crossed.length>1?' 続いて'+name(crossed[1])+'！':' 後続も次々とゴールへ！'),winner:crossed[0]};
 if(clock<=0)return {key:'ready',tone:'calm',title:'実況席',text:'京都 芝2000m、秋の一冠へ。各馬ゲートに収まり、スタートを待ちます。'};
 if(progress<.025)return {key:'start',tone:'excited',title:'スタート',text:'ゲートが開いた！ 各馬いっせいに飛び出しました！'};
 if(progress>.94)return {key:'final-'+leader.no+'-'+(gap<1.2),tone:'excited',title:'ゴール目前',text:gap<1.2?lead+'、'+chaser+'！ 並んでいる！ どちらが先か！':lead+'が先頭！ '+chaser+'が追う！ あと'+meters+'m、押し切るか！'};
 if(progress>.835)return {key:'straight-'+leader.no+'-'+Math.floor(meters/80),tone:'excited',title:'直線の攻防',text:gap<2?lead+'と'+chaser+'、先頭争い！ '+(third?name(third.no)+'も迫ってきた！':''):lead+'が先頭に立つ！ '+chaser+'が差を詰められるか！ 残り'+meters+'m！'};
 if(progress>.61)return {key:'downhill-'+leader.no,tone:'charge',title:'坂を下って勝負所',text:'3コーナーの下り！ '+lead+'を先頭に、'+chaser+'が続く。馬群が4コーナーへ向かいます！'};
 if(progress>.50)return {key:'hill-'+leader.no,tone:'charge',title:'京都の坂・3コーナー',text:'各馬、京都の坂を上って3コーナー！ 先頭は'+lead+'。'+chaser+'が射程に捉えています。'};
 const length=order.length>1?(leader.p-order.at(-1).p)*distance:0;
 return {key:'pack-'+leader.no+'-'+Math.floor(progress*10),tone:'calm',title:progress>.29?'向正面の隊列':'1・2コーナー',text:lead+'が先頭、'+chaser+'が続きます。'+(length>35?'縦に長い隊列。後続は脚をためています。':'馬群はひとかたまり。各馬、次の動きに備えます。')};
}
export const ANNOUNCER_SVG=`<svg viewBox="0 0 90 110" aria-hidden="true"><path fill="#233a4d" d="M5 110V88Q10 71 34 69h24q26 6 28 20v21"/><path fill="#faf3df" d="m32 73 13 31 15-31-9-7H40z"/><path fill="#a6c2d0" d="m41 79 5-4 5 4-3 9 5 22H39l5-22z"/><path fill="#e2b490" d="M37 58h20v17l-10 7-12-8z"/><ellipse fill="#efc5a1" cx="47" cy="40" rx="23" ry="29"/><path fill="#242d32" d="M22 42Q14 8 44 5q32-2 28 37L62 24Q42 29 35 17L26 43z"/><path fill="none" stroke="#333c42" stroke-width="2" d="m30 36 10-2m14 0 10 2"/><path stroke="#26363a" stroke-width="3" d="M33 40h4m19 0h4"/><path fill="none" stroke="#ac775c" stroke-width="1.5" d="m47 42-3 9h5m-11 8q8 5 15-1"/><path fill="none" stroke="#172b36" stroke-width="4" d="M20 45V30Q21 4 46 3q28 0 29 29v16M72 49q0 17-17 17"/><rect x="17" y="32" width="8" height="24" rx="4" fill="#374a54"/><rect x="69" y="32" width="8" height="24" rx="4" fill="#374a54"/><rect x="48" y="62" width="12" height="6" rx="3" fill="#182a34"/></svg>`;
