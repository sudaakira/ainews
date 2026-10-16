/**
 * JRA official frame-colour convention for every race using the shared engine.
 * Frame number (枠番), NEVER the horse number or its racing-silk colour, owns the cap.
 * When the draw has not been determined, show neutral grey instead of guessing.
 */
export const JRA_JOCKEY_CAPS=Object.freeze([
 null,
 Object.freeze({frame:1,name:'白',hex:'#FFFFFF',text:'#171C23',outline:'#273341'}),
 Object.freeze({frame:2,name:'黒',hex:'#111111',text:'#FFFFFF',outline:'#F2F3F5'}),
 Object.freeze({frame:3,name:'赤',hex:'#E62931',text:'#FFFFFF',outline:'#262A33'}),
 Object.freeze({frame:4,name:'青',hex:'#1561C2',text:'#FFFFFF',outline:'#243140'}),
 Object.freeze({frame:5,name:'黄',hex:'#FFD600',text:'#1E242A',outline:'#2D3540'}),
 Object.freeze({frame:6,name:'緑',hex:'#009944',text:'#FFFFFF',outline:'#213A2D'}),
 Object.freeze({frame:7,name:'橙',hex:'#F28C00',text:'#202A33',outline:'#3E2D16'}),
 Object.freeze({frame:8,name:'桃',hex:'#EE8FAB',text:'#18232B',outline:'#492933'})
]);
export const UNKNOWN_JOCKEY_CAP=Object.freeze({frame:null,name:'枠未確定',hex:'#89929B',text:'#FFFFFF',outline:'#28323A'});
export function jockeyCap(horse,config={},resolveFrame){
 if(config.provisionalDraw===true)return UNKNOWN_JOCKEY_CAP;
 const explicit=Number(horse?.frame);
 const inferred=typeof resolveFrame==='function'?Number(resolveFrame(horse)):NaN;
 const number=Number.isInteger(explicit)&&explicit>=1&&explicit<=8?explicit:inferred;
 if(!Number.isInteger(number)||number<1||number>8)return UNKNOWN_JOCKEY_CAP;
 const primary=JRA_JOCKEY_CAPS[number];
 // JRA exceptional helmets (同枠・同一勝負服): configure explicitly only
 // after the official entry sheet confirms quartered/eight-part dyeing.
 // Never infer an exceptional pattern from neighbouring horses alone.
 const pattern=horse?.capPattern;
 if(pattern==='quartered'||pattern==='eighths'){
  return Object.freeze({...primary,pattern,secondary:number===1?'#74D3E8':'#FFFFFF'});
 }
 return primary;
}
