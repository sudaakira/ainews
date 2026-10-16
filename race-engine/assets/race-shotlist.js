/**
 * Kyoto-style continuous geographical race coverage at 16x.
 * Only FOUR race shots plus the finish hold; camera never crosses the track
 * axis, preventing the viewer from mistaking the racing direction.
 * Pure camera metadata: no prediction or horse-motion calculations.
 */
export const RACE_SHOT_LIST=Object.freeze([
 Object.freeze({id:'establish',until:.18,kicker:'全頭・スタート',label:'スタンド前 → 1コーナー',view:'pack',side:0,height:16,ahead:63,fov:66}),
 Object.freeze({id:'follow',until:.70,kicker:'馬群を追走',label:'1・2角 → 向正面 → 3角',view:'field',side:8,height:12,ahead:38,fov:60}),
 Object.freeze({id:'turn',until:.85,kicker:'勝負どころ',label:'3・4コーナー',view:'field',side:8,height:9,ahead:31,fov:56}),
 Object.freeze({id:'duel',until:1,kicker:'ラスト直線',label:'直線 → ゴール',view:'duel',side:5,height:3.2,ahead:14.1,fov:49}),
 Object.freeze({id:'finish',until:Infinity,kicker:'確定着順',label:'ゴール',view:'duel',side:5,height:3.8,ahead:16,fov:51})
]);
export function chooseRaceShot(progress){
 const p=Number.isFinite(progress)?Math.min(1,Math.max(0,progress)):0;
 return RACE_SHOT_LIST.find(s=>p<s.until)||RACE_SHOT_LIST.at(-1);
}
