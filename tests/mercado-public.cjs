const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c=require('./library-fixture.cjs')();vm.runInContext(fs.readFileSync('mercado-data.js','utf8'),c);vm.runInContext(fs.readFileSync('mercado.js','utf8'),c);
const D=c.MERCADO_DATA,M=c.ResearchModel,checks=[],test=(name,fn)=>{try{fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',error:e.message});}};
const counts={MX:[8,28,88,38],BR:[41,76,27,245],AR:[20,135,18,38],CL:[20,19,6,109],CO:[22,76,9,59]},categories=['vacuum','wash','fabric','mattress'],currency={MX:'MXN',BR:'BRL',AR:'ARS',CL:'CLP',CO:'COP'};
test('Latest same-type review has 1082 unique country/product IDs and 1081 counting representatives',()=>{
 assert.equal(D.records.length,1082);assert.equal(new Set(D.records.map(r=>r.country+'|'+r.product_code)).size,1082);assert.equal(D.records.filter(r=>r.counted).length,1081);
 for(const [country,n]of Object.entries(counts))categories.forEach((category,i)=>assert.equal(D.records.filter(r=>r.country===country&&r.category===category).length,n[i]));
});
test('Only the four approved household forms enter the public library; removed tool history is absent',()=>{
 const forms={vacuum:'stick',wash:'floor_washer',fabric:'portable_extractor',mattress:'mattress'};assert(D.records.every(r=>r.form===forms[r.category]&&r.scopeReview.status==='included'));
 assert(!D.records.some(r=>r.product_code==='MLB66900996'));assert(!D.trends.MLB66900996);assert.equal(Object.keys(D.trends).length,32);assert.equal(D.excluded.length,0);assert.equal(Object.keys(D.industry).length,0);
});
for(const country of Object.keys(counts))for(const category of categories)for(const shareMetric of ['units','revenue'])test(country+' '+category+' '+shareMetric+' has one deduplicated native-currency denominator',()=>{
 const s={...M.defaults,country,category,platform:'ml',shareMetric},r=c.Mercado.report(s),key=shareMetric==='units'?'orders_last_30_days':'revenue_last_30_days',eligible=D.records.filter(x=>x.country===country&&x.category===category&&x.counted&&typeof x[key]==='number'&&x[key]>=0),expected=eligible.length?eligible.reduce((n,x)=>n+x[key],0):null;
 assert.equal(r.total,expected);assert(r.all.every(x=>x.currency===currency[country]));assert(Math.abs(r.brands.reduce((n,x)=>n+x[1],0)-(r.total||0))<.00001);assert(Math.abs(r.bands.reduce((n,x)=>n+x[1],0)-(r.total||0))<.00001);
});
test('Near-30-day snapshot shares never borrow selected calendar months or Amazon data',()=>{
 const s={...M.defaults,country:'MX',category:'mattress',platform:'ml'},a=c.Mercado.report({...s,startMonth:'2025-01',endMonth:'2025-02'}),b=c.Mercado.report({...s,startMonth:'2026-08',endMonth:'2026-09'});assert.equal(a.total,b.total);assert.equal(D.snapshotPeriod,'NEAR_30_DAYS_UNKNOWN_BOUNDS');assert(!D.records.some(r=>r.asin||r.parentSales));
});
test('History contains only source monthly orders and explicit coverage, without synthetic revenue or prices',()=>{
 for(const [key,t]of Object.entries(D.trends)){assert(D.records.some(r=>r.product_code===key));assert(t.data_coverage);assert(t.monthly_order_series.every(m=>/^20\d\d-\d\d$/.test(m.month)&&typeof m.orders==='number'&&m.orders>=0));assert(!t.monthly_revenue_series&&!t.monthly_price_series);}
});
test('CSV exports include current filters, source date, native currency, counting flag and data nature',()=>{
 const s={...M.defaults,country:'MX',category:'fabric',platform:'ml'},rows=c.Mercado.csvRows(s),h=rows[0];assert(rows.every(r=>r.length===h.length));assert.equal(rows.length-1,88);assert(rows.slice(1).every(r=>r[0]==='MX'&&r[1]==='Mercado Libre'&&r[9]==='MXN'&&r[14]==='2026-11-05'));
 const filtered=c.Mercado.csvRows({...s,evidenceQuery:'Bissell'});assert(filtered.length>1&&filtered.length<rows.length);assert(filtered.slice(1).every(r=>/bissell/i.test(r[6]+' '+r[7])));
});
test('Price boundaries cannot leak between Amazon and Mercado or between currencies',()=>{
 const s={...M.defaults,country:'MX',category:'fabric',platform:'ml',shareBands:'CAD:0,80,160'},a=c.Mercado.report(s),b=c.Mercado.report({...s,mlPriceBands:'MXN:500,1500,5000'}),other=c.Mercado.report({...s,country:'BR',mlPriceBands:'MXN:500,1500,5000'});assert.equal(a.cuts[0],500);assert.equal(b.cuts[1],1500);assert.equal(other.cuts[0],300);assert.equal(a.total,b.total);
});
test('Five-site URLs and 2024/2025 history bounds survive encode, parse and reload state',()=>{
 for(const country of Object.keys(counts)){const s={...M.defaults,page:'market',country,platform:'ml',startMonth:'2024-11',endMonth:'2026-10',mlPriceBands:currency[country]+':100,500'};const p=M.parse(M.encode(s));assert.equal(p.country,country);assert.equal(p.startMonth,'2024-11');assert.equal(p.endMonth,'2026-10');assert.equal(p.mlPriceBands,s.mlPriceBands);}
 assert.equal(M.parse('#page=market&platform=amazon&country=CL').country,'MX');
});
test('Payload excludes raw responses, billing, query filenames, merchant IDs and excluded product bodies',()=>{
 assert(!D.queries&&!D.quota&&!D.token);for(const r of D.records){assert(!r.sourceFiles&&!r.merchant_code&&!r.parcel_weight_kg);assert(r.country&&r.currency&&r.sourceDate);assert(!r.picture_link||r.picture_link.startsWith('https://'));}assert(D.coverage.every(q=>!q.files));
});
const result={passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,checks};console.log(JSON.stringify(result,null,2));if(result.failed)process.exitCode=1;
