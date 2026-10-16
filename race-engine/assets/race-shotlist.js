/**
 * Race Director v8: 16x means FOUR comprehensible compositions only.
 * 1. ALL starters 2. 2nd turn close 3. 4th turn position 4. final SIDE.
 * Camera never flips to the other side; long straight framed on goal board.
 * No races, scores, weights or probabilities change.
 */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'start',until:.18,kicker:'START',label:'スタート・全頭',view:'pack',side:0,height:17.0,ahead:68.0,fov:67}),
 Object.freeze({id:'second-turn',until:.52,kicker:'2ND TURN',label:'2コーナー・馬群接近',view:'pack',side:5.0,height:7.5,ahead:23.0,fov:49}),
 Object.freeze({id:'fourth-turn',until:.82,kicker:'4TH TURN',label:'4コーナー・位置取り',view:'field',side:8.0,height:8.8,ahead:27.0,fov:54}),
 Object.freeze({id:'straight',until:1,kicker:'HOME STRAIGHT',label:'直線・横から追走',view:'duel',side:24.0,height:5.1,ahead:2.5,fov:43}),
 Object.freeze({id:'result',until:Infinity,kicker:'FINISH',label:'ゴール',view:'duel',side:29.0,height:5.3,ahead:0,fov:45})
]);
export function chooseRaceShot(progress){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 return RACE_SHOT_LIST.find(s=>p<s.until)||RACE_SHOT_LIST.at(-1);
}
