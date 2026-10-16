/** Presentation timing only. Sampled finishing order and forecast stay in core/. */
export const FINISH_GAP=.00135;
export function runOutProgress(rank,secondsAfterFinish,duration){
 return 1-rank*FINISH_GAP+Math.max(0,secondsAfterFinish)/duration;
}
export function playbackEnd(duration,fieldSize){
 // All runners clear the fixed finish camera before playback goes idle.
 return duration*(1+(fieldSize-1)*FINISH_GAP+.16);
}
export function playbackRate(selectedRate,clock,duration){
 // Gentle slow-motion run-out, never a freeze; the HUD shows the actual rate.
 const p=clock/duration;
 return p>=.94?Math.min(selectedRate,2):p>=.8358?Math.min(selectedRate,4):selectedRate;
}
export function finishCrossings(rank,clock,duration){
 const elapsed=Math.max(0,clock-duration);
 return clock<duration?[]:rank.filter((_,i)=>elapsed+1e-8>=i*FINISH_GAP*duration);
}
