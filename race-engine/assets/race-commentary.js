/** Deterministic text commentary driven solely by the visible running order.
 * Never reveals the sampled winner before it crosses the line. */
export function raceCommentary({clock,progress,order,horses,crossed,distance=2000,venue="京都",surface="芝"}){
 const byNo=new Map(horses.map(h=>[h.no,h]));
 const name=no=>byNo.get(no)?.name||String(no);
 const leader=order[0],second=order[1],third=order[2];
 const lead=name(leader.no),chaser=second?name(second.no):'',gap=second?(leader.p-second.p)*distance:0;
 const meters=Math.max(0,Math.ceil((1-progress)*distance/10)*10);
 if(crossed.length)return {key:'winner-'+crossed[0],tone:'winner',title:'WINNER',text:name(crossed[0])+'、いま1着でゴールイン！'+(crossed.length>1?' 続いて'+name(crossed[1])+'！':' 後続も次々とゴールへ！'),winner:crossed[0]};
 if(clock<=0)return {key:'ready',tone:'calm',title:'実況席',text:venue+' '+surface+distance+'m。各馬ゲートに収まり、スタートを待ちます。'};
 if(progress<.025)return {key:'start',tone:'excited',title:'スタート',text:'ゲートが開いた！ 各馬いっせいに飛び出しました！'};
 if(progress>.94)return {key:'final-'+leader.no+'-'+(gap<1.2),tone:'excited',title:'ゴール目前',text:gap<1.2?lead+'、'+chaser+'！ 並んでいる！ どちらが先か！':lead+'が先頭！ '+chaser+'が追う！ あと'+meters+'m、押し切るか！'};
 if(progress>.835)return {key:'straight-'+leader.no+'-'+Math.floor(meters/80),tone:'excited',title:'直線の攻防',text:gap<2?lead+'と'+chaser+'、先頭争い！ '+(third?name(third.no)+'も迫ってきた！':''):lead+'が先頭に立つ！ '+chaser+'が差を詰められるか！ 残り'+meters+'m！'};
 if(progress>.61)return {key:'downhill-'+leader.no,tone:'charge',title:'坂を下って勝負所',text:'3コーナーの下り！ '+lead+'を先頭に、'+chaser+'が続く。馬群が4コーナーへ向かいます！'};
 if(progress>.50)return {key:'hill-'+leader.no,tone:'charge',title:'京都の坂・3コーナー',text:'各馬、京都の坂を上って3コーナー！ 先頭は'+lead+'。'+chaser+'が射程に捉えています。'};
 const length=order.length>1?(leader.p-order.at(-1).p)*distance:0;
 return {key:'pack-'+leader.no+'-'+Math.floor(progress*10),tone:'calm',title:progress>.29?'向正面の隊列':'1・2コーナー',text:lead+'が先頭、'+chaser+'が続きます。'+(length>35?'縦に長い隊列。後続は脚をためています。':'馬群はひとかたまり。各馬、次の動きに備えます。')};
}
/** Original cel-shaded broadcast portrait, kept as crisp editable vector art. */
export const ANNOUNCER_SVG=`<svg viewBox="0 0 160 184" aria-hidden="true" focusable="false" class="announcer-portrait">
 <defs>
  <linearGradient id="announcer-backdrop" x2="1" y2="1"><stop stop-color="#315751"/><stop offset="1" stop-color="#122f35"/></linearGradient>
  <linearGradient id="announcer-suit" x2=".8" y2="1"><stop stop-color="#334963"/><stop offset="1" stop-color="#172536"/></linearGradient>
  <linearGradient id="announcer-hair" x2=".7" y2="1"><stop stop-color="#34475a"/><stop offset=".5" stop-color="#1a2838"/><stop offset="1" stop-color="#101c29"/></linearGradient>
  <linearGradient id="announcer-skin" x2="1" y2=".6"><stop stop-color="#f1c3a0"/><stop offset="1" stop-color="#ffdfb8"/></linearGradient>
 </defs>
 <path fill="url(#announcer-backdrop)" d="M0 0h160v184H0z"/>
 <path fill="none" stroke="#c6ad6c" stroke-opacity=".2" d="M-15 135 155-20M10 184 170 24M62 184 180 76"/>
 <path fill="#72a792" opacity=".1" d="M0 0h78L0 78z"/>
 <path fill="#142536" stroke="#10212e" stroke-width="2" d="m14 184 7-40q3-15 27-24l20-8h34l27 13q15 9 18 24l8 35z"/>
 <path fill="url(#announcer-suit)" d="m14 184 8-39q3-13 27-22l26-9h22l31 12q16 9 19 27l7 31z"/>
 <path fill="#172335" d="m67 110-11 18 26 56h30l-14-73z"/>
 <path fill="#fff8e9" d="m72 111 13 8 15-10 9 18-13 57H80l-17-58z"/>
 <path fill="#be8b6e" d="m71 90 2 24 13 12 15-16-2-28z"/>
 <path fill="#f0bd96" d="m78 101 1 12 8 8 12-12-1-12z"/>
 <path fill="#8f3442" stroke="#602837" stroke-width="1" d="m86 124 8-2 5 9-6 8 10 45H79l7-45-5-8z"/>
 <path fill="#bd5960" d="m87 129 5-3 3 5-5 5zM89 142h3l5 36-10 6z"/>
 <path fill="#e7bd70" d="m85 154 14-3 1 3-14 3z"/>
 <path fill="#d7e2dd" d="m72 110 14 15-8 11-13-17zM101 109l-9 16 10 9 7-17z"/>
 <path fill="#fbfaf0" d="m73 112 12 13-7 8-10-14zM101 112l-7 13 7 6 5-13z"/>
 <path fill="#435c75" d="m67 115-16 9-5 21 12-3-5 13 31 29-19-50zM105 112l21 13 8 21-13-1 7 13-28 26 8-48z"/>
 <path fill="none" stroke="#6f8393" stroke-width="1.2" d="m57 125-6 17 12-4-6 17 24 25M120 128l9 15-13-2 7 16-21 24"/>
 <path fill="#f4eee0" d="m121 151 16-3-1 8-16 2z"/>
 <path fill="#d1ae6b" d="m46 142 3 1-2 5-3-1z"/>
 <path fill="#c78e6d" stroke="#9e6c53" stroke-width="1" d="M54 65q-8-6-9 5-1 14 11 15l7-9z"/>
 <path fill="url(#announcer-skin)" stroke="#b57e61" stroke-width="1.4" d="M59 36q15-20 41-8 19 11 17 36l-2 14-8 19-14 12-13-2-17-13-7-20z"/>
 <path fill="#df9d79" d="m58 51 9-6-3 22 7 25 13 14-5 1-17-15-6-19z"/>
 <path fill="#e6a381" d="m111 67-6 18-10 7-9-3 4 10 10 2 10-12z"/>
 <path fill="#fff0cd" d="m76 42 16-5 13 9 2 11-17-3-15 2z" opacity=".6"/>
 <path fill="url(#announcer-hair)" stroke="#0e1d2b" stroke-width="2" stroke-linejoin="round" d="m54 72-6-16 2-22 9-12 17-9 24 3 18 12 4 17-5 17-5-14-13-12-7 10-13-8-15 13-4 20z"/>
 <path fill="#476075" d="m57 35 16-13 22-1 15 8-19-5-15 5-13 12z"/>
 <path fill="#263c50" d="m98 21-20 12-9 14 15-10 10 5 10-11 12 14-4-13z"/>
 <path fill="none" stroke="#5c7383" stroke-width="1.5" stroke-linecap="round" d="m62 35 14-10 17-1M75 37l9-8"/>
 <path fill="#24333d" d="m68 55 4-2 15 6-2 3-16-4zM96 59l13-5 2 3-14 5z"/>
 <path fill="#fffaf0" stroke="#644a3f" stroke-width="1.2" d="m69 64 6-1 9 3-5 3-7-1zM96 65l7-2 6 1-5 5-6-1z"/>
 <path fill="#293a43" d="m77 63 4 1v4l-4 1zM100 64l4 1v4l-4-1z"/>
 <path fill="#fff" d="M78 64h1v2h-1zM101 65h1v2h-1z"/>
 <path fill="none" stroke="#b47e60" stroke-width="1.5" stroke-linecap="round" d="m92 63-2 15 6 2M70 74l8 1M102 76l5-1"/>
 <g class="announcer-mouth-calm"><path fill="none" stroke="#985e4d" stroke-width="2" stroke-linecap="round" d="m83 89 8 2 9-4"/><path stroke="#f9d4af" stroke-width="1.5" d="m87 95 8-1"/></g>
 <g class="announcer-mouth-speaking"><path fill="#733d39" stroke="#985e4d" stroke-width="1.5" d="m81 86 20-1-4 12-8 2-6-5z"/><path fill="#fff9df" d="m83 87 15-1-1 4-13 1z"/><path fill="#ce817c" d="m87 96 9-2-1 3-5 1z"/></g>
 <path fill="none" stroke="#101d29" stroke-width="8" d="M50 65V43q0-29 31-30 34 0 37 31v22"/>
 <path fill="none" stroke="#82979d" stroke-width="2.2" d="M49 49v-7q2-25 31-25 30 0 34 24"/>
 <path fill="#172734" stroke="#0d1924" stroke-width="2" d="M45 52h10q6 0 6 6v22q0 6-6 6H45q-5 0-5-5V59q0-7 5-7z"/>
 <path fill="#476071" d="M44 57h8v24h-8z"/>
 <path fill="#bac8c6" d="M44 57h3v21h-3z"/>
 <path fill="#172734" stroke="#0d1924" stroke-width="2" d="M113 52h5q6 0 6 6v20q0 5-6 5h-5z"/>
 <path fill="#59717c" d="M116 57h4v20h-4z"/>
 <path fill="none" stroke="#172b35" stroke-width="4" stroke-linecap="round" d="M119 78q-3 19-16 19H93"/>
 <path fill="none" stroke="#92a8aa" stroke-width="1.2" d="M120 79q-3 16-16 16H96"/>
 <rect x="87" y="93" width="15" height="8" rx="4" fill="#1a2932" stroke="#829795" stroke-width="1"/>
 <path stroke="#60777c" d="M91 95v4m3-4v4m3-4v4"/>
 <path fill="#f3cca9" stroke="#a87358" stroke-width="1.5" d="m25 131 1-25 10-21 3-17q1-4 4-2 2 1 1 5l-1 14 4-8q2-3 4-1 2 1 0 5l-4 10 4-5q3-2 4 1t-2 6l-7 10-4 22-4 13z"/>
 <path fill="none" stroke="#ce9e7b" stroke-width="1.2" stroke-linecap="round" d="m37 87-3 12m9-11-4 12m7-7-6 10m-13 13 8 3"/>
 <path fill="#f4f1e6" d="m24 126 18 6-4 12-18-5z"/>
 <path fill="#304b64" stroke="#172b3e" stroke-width="1.5" d="m19 136 22 7-9 41H4z"/>
 <path fill="none" stroke="#597287" d="m22 144-7 35"/>
 <circle cx="27" cy="150" r="1.5" fill="#d7b873"/>
 <circle cx="25" cy="157" r="1.5" fill="#d7b873"/>
</svg>`;
