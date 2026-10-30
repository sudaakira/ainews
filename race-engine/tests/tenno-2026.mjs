
import assert from 'node:assert/strict';
import fs from 'node:fs';
import c from '../races/tenno-aki-2026.js';
import {createFactors} from '../core/factors.js';
import {createRegression} from '../core/tenno-regression-2026.js';
import {createSimulator} from '../core/tenno-simulator-2026.js';
import {tokyoPath} from '../assets/tenno-tokyo-course.js';
const loop=createRegression(c,createFactors(c)),sim=createSimulator(c,loop);
assert.equal(c.horses.length,17);assert.equal(c.scenarios.length,15);
assert.deepEqual(c.horses.map(h=>h.no),Array.from({length:17},(_,i)=>i+1));
assert.deepEqual(c.horses.map(h=>h.frame),[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,8]);
assert.equal(loop.FEATURES.reduce((a,f)=>a+f.weight,0),100);
const stored=JSON.parse(fs.readFileSync(new URL('../results/tenno-aki-20261030.json',import.meta.url)));
for(const s of c.scenarios)for(const h of c.horses)assert.equal(loop.evaluate(h,s.options).rating,h.baseline+(c.pointScenarios[s.id].deltas[h.no]||0));
const result=sim.simulate(c.scenarios[0].options,50000,20261030).sort((a,b)=>b.rating-a.rating||a.no-b.no);
assert.deepEqual(result,stored.scenarios[0].rows);
const x=sim.simulate({...c.scenarios[0].options,vol:3},1000,20261030),y=sim.simulate({...c.scenarios[0].options,vol:12},1000,20261030);assert.deepEqual(x,y);
for(const s of stored.scenarios){assert.ok(Math.abs(s.rows.reduce((a,h)=>a+h.win,0)-100)<1e-7);assert.ok(Math.abs(s.rows.reduce((a,h)=>a+h.p3,0)-300)<1e-7);}
const q=tokyoPath(1-525.9/2000),g=tokyoPath(1);assert.ok(Math.abs(Math.hypot(g.x-q.x,g.z-q.z)-525.9)<.001);
for(let i=0;i<=1000;i++){const p=tokyoPath(i/1000);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(p.dx,p.dz)-1)<1e-8);}
console.log('PASS: 17 horses / 15 conditions / exact seeded 50000-trial baseline / replay variance separation / Tokyo straight geometry');
