const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),M=require('../model.js'),ctx={Intl,Date,market:'us'};vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/market-radar-data.js','utf8'),ctx);
for(const [country,step] of Object.entries({US:100,CA:100,MX:1000,BR:100})){
 assert.equal(M.priceStep(country),step);assert.equal(M.bandLabel(0,country),`0–${step-1}`);assert.equal(M.bandLabel(1,country),`${step}–${step*2-1}`);
 const prices=[0,step-1,step-.01,step,2*step-.01,2*step,null];
 const D={focus:{roster:[],products:prices.map((price,i)=>({country,category:'wash',asin:'B'+String(i).padStart(9,'0'),brand:'Test',price}))},own:{},curated:[]};
 const state={...M.defaults,country,category:'wash',dataset:'focus'};const v=M.select(D,state);assert.deepEqual(v.bins.map(r=>r.count),[3,2,1]);assert.equal(M.select(D,{...state,band:'0'}).rows.length,3);assert.equal(M.select(D,{...state,band:'1'}).rows.length,2);
 ctx.market=country.toLowerCase();ctx.fixture={prices:prices.filter(Number.isFinite).map(price=>({price}))};const bins=vm.runInContext("biBins(fixture,'count')",ctx);assert.deepEqual(Array.from(bins,r=>r.value),[3,2,1]);assert.deepEqual(Array.from(bins,r=>r.label),v.bins.map(r=>r.label));assert.equal(bins.reduce((n,r)=>n+r.value,0),6);
 console.log(`${country}: step ${step}; ${bins.map(r=>r.label).join(' / ')}; boundary and null checks passed`);
}
