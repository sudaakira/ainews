/**
 * Broadcast-inspired ORIGINAL race shot list.
 * Progress-based so 16x playback still sees 9 comprehensible beats in ~8s.
 * Never changes the simulator, its horse speeds, finish order, or RNG.
 * Reference: Cygames storyboard talk, objective long-shot -> character focus.
 */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'gate',until:.070,kicker:'START',label:'発走',view:'pack',side:5.8,height:4.3,ahead:19.0,fov:56}),
 Object.freeze({id:'launch',until:.175,kicker:'BREAK',label:'先行争い',view:'pack',side:-3.1,height:2.9,ahead:16.0,fov:52}),
 Object.freeze({id:'long',until:.326,kicker:'FIELD',label:'馬群の隊列',view:'field',side:15.0,height:10.8,ahead:29.0,fov:61}),
 Object.freeze({id:'close',until:.469,kicker:'CHASE',label:'先頭を追う',view:'duel',side:5.0,height:3.2,ahead:14.1,fov:49}),
 Object.freeze({id:'reverse',until:.598,kicker:'TACTICS',label:'位置取り',view:'field',side:-15.1,height:8.2,ahead:28.0,fov:63}),
 Object.freeze({id:'bend',until:.731,kicker:'3RD TURN',label:'勝負どころ',view:'field',side:18.0,height:11.3,ahead:30.0,fov:58}),
 Object.freeze({id:'turn',until:.842,kicker:'FINAL TURN',label:'直線へ',view:'duel',side:6.6,height:4.8,ahead:20.0,fov:53}),
 Object.freeze({id:'dash',until:.931,kicker:'LAST 400',label:'叩き合い',view:'duel',side:-3.7,height:3.1,ahead:14.7,fov:50}),
 Object.freeze({id:'line',until:1.000,kicker:'GOAL',label:'ゴール前',view:'duel',side:3.7,height:3.8,ahead:19.1,fov:53}),
 Object.freeze({id:'finish',until:Infinity,kicker:'RESULT',label:'確定着順',view:'duel',side:6.5,height:4.7,ahead:22.0,fov:54})
]);
export function chooseRaceShot(progress){
 const p=Number.isFinite(progress)?Math.min(1,Math.max(0,progress)):0;
 return RACE_SHOT_LIST.find(s=>p<s.until)||RACE_SHOT_LIST.at(-1);
}
