/** Skeletal playback controller v16. Pure presentation, independent of race RNG. */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
export function updateGallop(model,raceTime,visualTime,number,raceProgress=0,options={}){
 const active=smooth((raceTime-.05)/.72),target=options.lead==='left'?0:1;
 const cadence=clamp((Number.isFinite(options.speedMps)?options.speedMps:15)/7.1,1.65,2.55);
 if(!model.gaitState||visualTime<model.gaitState.time-.002||raceTime<=0){
  model.gaitState={phase:(number*.61803398875)%1,lead:target,time:visualTime,change:null};
 }
 const state=model.gaitState,dt=clamp(Number.isFinite(options.frameDt)?(options.playing?options.frameDt:0):visualTime-state.time,0,.06);
 state.time=visualTime;state.phase=(state.phase+dt*cadence)%1;
 // Change leads only in gathered suspension, never swap a weight-bearing limb.
 if(dt&&state.phase>.205&&state.phase<.26&&!state.change&&Math.abs(state.lead-target)>.01)state.change={from:state.lead,to:target,t:0};
 if(state.change){const c=state.change;c.t+=dt*cadence/.105;state.lead=c.from+(c.to-c.from)*smooth(c.t);if(c.t>=1){state.lead=c.to;state.change=null}}
 model.pose(state.phase,active,state.lead,smooth((raceProgress-.76)/.20));
 model.gallopAudit.cadence=cadence;
}
