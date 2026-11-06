/* Optional real-data check. Inputs must be explicitly supplied outside the repository. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),O=require('../research-overlay.js');
const args=process.argv.slice(2),workspace=path.resolve(args[args.indexOf('--workspace')+1]||'.'),repo=path.resolve(__dirname,'..');if(!args.includes('--workspace')||workspace===repo||workspace.startsWith(repo+path.sep))throw Error('Select an external private workspace');
const read=f=>JSON.parse(fs.readFileSync(path.join(workspace,f))),p=read('private-payload.json'),manifest=read('raw-manifest.json');
for(const m of manifest)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(workspace,'raw',m.file))).digest('hex'),m.sha256,m.file);
function source(response){if(response.structuredContent)return response.structuredContent;for(const x of response.content||[])try{return JSON.parse(x.text)}catch{}return {};}
const ids=new Set(),stat=new Set();let fields=0;
for(const r of p.records){assert.equal(O.validate(r),null);const k=O.key(r);assert(!ids.has(k),'duplicate catalogue identity '+k);ids.add(k);if(r.platform==='ml'&&r.counted){assert(!stat.has(r.statisticalKey),'duplicate counted unit');stat.add(r.statisticalKey);}if(!['ml','amazon'].includes(r.platform))continue;
 const raw=read('raw/'+r.sourceFiles[0]),d=source(raw.response),item=(d.records||d.items||[]).find(x=>(x.product_code||x.asin)===r.productId);assert(item,'missing raw identity '+k);
 const keys=r.platform==='ml'?['selling_price','orders_last_30_days','revenue_last_30_days','currency_code','picture_link']:['price','monthlySales','monthlyRevenue','currency','parent','bsr'];for(const key of keys){if(item[key]===undefined)assert(r[key]===undefined||r[key]===null);else if(item[key]===null||typeof item[key]!=='number'||Number.isFinite(item[key])&&item[key]>=0)assert.deepEqual(r[key],item[key],k+' / '+key);fields++;}
 if(r.platform==='amazon')assert.equal(r.metricAggregationEligible,false,'source identity cannot release parent metrics');
}
for(const [id,t]of Object.entries(p.histories)){const d=source(read('raw/'+t.sourceFile).response);assert.equal(t.product_code,id);assert.deepEqual(t.monthly_order_series.map(({month,orders})=>({month,orders})),d.monthly_order_series);assert.equal(t.covered_day_count,d.covered_day_count);assert.deepEqual(t.data_coverage,d.data_coverage);assert(t.monthly_order_series.every(m=>m.month<=p.asOf.slice(0,7)));assert(!t.monthly_price_series&&!t.monthly_revenue_series);}
console.log(JSON.stringify({records:p.records.length,rawFiles:manifest.length,exactSourceFieldComparisons:fields,historyProducts:Object.keys(p.histories).length,qualifiedSourceUnits:stat.size,status:'PASS'}));
