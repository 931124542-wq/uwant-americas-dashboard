/* Public package boundary. No network or private source reads. */
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const c={window:{}};vm.createContext(c);for(const f of ['research-evidence-data.js','amazon-research-data.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
assert(c.window.RESEARCH_EVIDENCE.quarantinedHistory.every(p=>p.rows.length===0&&p.currentPriceObservation===null));
for(const f of ['history-data.js','history-metrics.js','review-data.js','own-data.js','focus-brands-data.js','data.json','competitor-data.js'])assert.equal(cp.execFileSync('git',['hash-object',f],{encoding:'utf8'}).trim(),cp.execFileSync('git',['rev-parse','7c00ee3:'+f],{encoding:'utf8'}).trim(),f);
for(const f of ['competition-model.js','competition-evidence-data.js','capture.json','ledger.json'])assert(!fs.existsSync(f),f);
const path=require('node:path');
for(const entry of ['index.html','business-guide/index.html','market-history/index.html','operations/index.html']){
 const html=fs.readFileSync(entry,'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css))(?:\?v=([^"]+))?"/g)){
  const asset=path.join(path.dirname(entry),match[1]);
  assert(fs.existsSync(asset),entry+' → '+asset);
  if(match[2])assert.equal(match[2],crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0,12),entry+' → '+asset);
 }
}
const A=require('../amazon-research-model');for(const country of ['CA','MX','US','BR'])for(const platform of ['ml','bestbuy','official','retail','unknown']){const scope={country,platform,category:'fabric',dataset:'2026-02'},base={observed:[],candidates:[]},out=A.integrate(base,{scope,data:c.window.AMAZON_RESEARCH,Q:{}});assert.deepEqual(out.scope,scope);assert.deepEqual(out.observed,[]);}
cp.execFileSync(process.execPath,['scripts/build-public-market-history.cjs','--check']);
require('./market-price-continuity.cjs');
console.log('PASS: restricted source files excluded; original production files unchanged; drafts excluded; resource hashes match; non-Amazon country/platform scope preserved.');
