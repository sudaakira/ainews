/** Racing sprint playback v21: race-clock-locked stride + secondary motion.
 * Pure presentation, independent of race RNG.
 *
 * v17.2 port (from the rejected v18 experiment, kept at the user's
 * direction): the stride phase is locked to the RACE clock. One race
 * second advances the phase by exactly `cadence` cycles, where cadence
 * derives from the horse's actual ground speed and the clip's measured
 * authored stride length (see gallop-sync.js), so the stance hoof's
 * backward speed matches the ground at every playback rate. v20
 * advanced the phase on wall-clock frameDt instead: at the default 4x
 * playback the legs turned at roughly a quarter of the travel rate and
 * the horses looked like they were gliding ("slow, not running").
 * Strobing at 16x is accepted as inherent to fast-forward.
 *
 * Determinism: a backward jump resets the state (as v20 did); a large
 * forward jump re-derives the phase from the race clock itself
 * (seed + raceTime x cadence) instead of integrating across the seek.
 * The gait lab drives a stationary race clock (raceTime fixed), so an
 * explicit frameDt step remains for that inspection mode only — it is
 * taken solely when the race clock does not advance while playing,
 * which never happens in the race renderer during playback. */
import {strideCadence,secondaryMotion,clipFootSpeed} from './gallop-sync.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const frac=x=>((x%1)+1)%1;
export function updateGallop(model,raceTime,visualTime,number,raceProgress=0,options={}){
 const active=smooth((raceTime-.05)/.72),target=options.lead==='left'?0:1;
 const speedMps=Number.isFinite(options.speedMps)?options.speedMps:17;
 const cadence=strideCadence(speedMps);
 if(!model.gaitState||raceTime<model.gaitState.clock-.002||raceTime<=0){
  model.gaitState={phase:(number*.61803398875)%1,lead:target,time:visualTime,clock:raceTime,change:null};
 }
 const state=model.gaitState;
 const rawDt=raceTime-state.clock;
 let dt=0;
 if(rawDt>.5){
  // Seek / fast-forward jump: re-derive the phase deterministically
  // from the race clock instead of integrating across the jump.
  state.phase=frac(number*.61803398875+raceTime*cadence);
  state.change=null;
 }else if(rawDt>0){
  dt=rawDt;
  state.phase=frac(state.phase+dt*cadence);
 }else if(options.playing&&Number.isFinite(options.frameDt)&&options.frameDt>0){
  // Gait-lab inspection drive (stationary race clock). Never taken in
  // the race renderer while playing: there the race clock advances.
  dt=Math.min(options.frameDt,.06);
  state.phase=frac(state.phase+dt*cadence);
 }
 state.clock=raceTime;state.time=visualTime;
 // Change leads only in gathered suspension, never swap a weight-bearing limb.
 if(dt&&state.phase>.80&&state.phase<.85&&!state.change&&Math.abs(state.lead-target)>.01)state.change={from:state.lead,to:target,t:0};
 if(state.change){const c=state.change;c.t+=dt*cadence/.105;state.lead=c.from+(c.to-c.from)*smooth(c.t);if(c.t>=1){state.lead=c.to;state.change=null}}
 model.pose(state.phase,active,state.lead,smooth((raceProgress-.76)/.20),secondaryMotion(state.phase));
 model.gallopAudit.cadence=cadence;
 model.gallopAudit.strideLength=speedMps>0?speedMps/cadence:0;
 model.gallopAudit.slipRatio=speedMps>0?clipFootSpeed(cadence)/speedMps:1;
}
