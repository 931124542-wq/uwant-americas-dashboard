const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),F=require('./library-fixture.cjs');
const c=F();c.location={hostname:'public.example'};for(const f of ['mercado-data.js','market-insights.js','published-research-data.js','research-overlay.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);c.REVIEW_DATA.history=c.AmazonResearch.mergeHistory(c.REVIEW_HISTORY);
const expected={CA:{vacuum:[38405,5330501.66],wash:[3962,1367138.47],fabric:[63676,7251035.25]},MX:{wash:[1228,10764825.62]},US:{vacuum:[408677,54585318.94933],wash:[7966,3611273.71]}};
let checked=0,missing=0;
for(const country of ['CA','MX','US','BR'])for(const category of ['vacuum','wash','fabric','mattress'])for(const shareMetric of ['revenue','units'])for(const period of [{startMonth:'2026-01',endMonth:'2026-09'}, {}, {dataset:'archive'}]){
 const s={...c.ResearchModel.defaults,page:'market',view:'overview',platform:'amazon',country,category,dataset:'2026-09',shareMetric,...period},catalog=c.catalog(s),x=c.MarketSummary.overviewStats(catalog,s),html=c.MarketSummary.overview(catalog,s),charts=c.SampleSharesUI.render(catalog,s);
 assert.deepEqual([...html.matchAll(/data-market-kpi="([^"]+)"/g)].map(m=>m[1]),['revenue','units','price','parents']);
 assert(!html.includes('market-catalogue-kpis'),'Directory fields must never replace sales KPIs');
 assert.equal((charts.match(/data-share-chart="/g)||[]).length,2,'Both sales chart positions survive missing data');
 assert(!charts.includes('brand-coverage-bars'),'Listing counts are not sales shares');
 assert(html.includes('market-catalogue-reference')&&html.includes('原类目报告与来源参考'));
 assert(!/undefined|NaN/.test(html+charts));
 if(x.selected.total===null){missing++;assert(charts.includes('data-share-export disabled'));assert.equal((charts.match(/data-share-state="missing"/g)||[]).length,2);assert(!charts.includes('data-share-drill='));}
 if(period.startMonth){const value=expected[country]?.[category];if(value){assert.equal(x.units.total,value[0]);assert(Math.abs(x.revenue.total-value[1])<.00001);}else{assert.equal(x.units.total,null);assert.equal(x.revenue.total,null);assert(html.includes('data-market-kpi="revenue"><span>样本销售额估算 · '+x.selected.currency+'</span><strong class="market-kpi-missing">—</strong>'));}}
 checked++;
}
const s={...c.ResearchModel.defaults,page:'market',platform:'amazon',country:'MX',category:'vacuum',dataset:'2026-09',startMonth:'2026-01',endMonth:'2026-09'},catalog=c.catalog(s),x=c.MarketSummary.overviewStats(catalog,s),snapshot=c.MarketSummary.snapshot(s);
assert.equal(snapshot.stat.totalRevenue,10200593.41);assert.equal(x.revenue.total,null,'Independent category snapshot must not fill a monthly sales gap');assert(c.MarketSummary.overview(catalog,s).includes('data-original-category-report'));
const history=c.REVIEW_DATA.history;c.REVIEW_DATA.history={...history,rows:history.rows.map(r=>({...r,parentSales:r.parentSales===null?null:0,parentSalesAmount:r.parentSalesAmount===null?null:0}))};
const zeroScope={...s,country:'CA'},z=c.SampleSalesShares.report(c.REVIEW_DATA.history,zeroScope);assert.equal(z.total,0);const zero=c.SampleSharesUI.render(c.catalog(zeroScope),zeroScope);assert.equal((zero.match(/data-share-state="zero"/g)||[]).length,2);assert(!zero.includes('data-share-export disabled'),'Real zero-valued facts remain exportable');assert(!zero.includes('brand-share-visual'),'A zero denominator cannot draw a pie');c.REVIEW_DATA.history=history;
console.log(`PASS Amazon country consistency: ${checked} scopes, ${missing} truthful missing states; six known markets, stable KPI/chart semantics, independent snapshots and real-zero exports`);
