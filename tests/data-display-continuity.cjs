const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),F=require('./library-fixture.cjs');
const c=F();c.location={hostname:'public.example'};
for(const f of ['mercado-data.js','market-insights.js','published-research-data.js','research-overlay.js','research-snapshot.js','mercado.js','market-decision-model.js','market-overview-layout.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
c.REVIEW_DATA.history=c.AmazonResearch.mergeHistory(c.REVIEW_HISTORY);
const base={...c.ResearchModel.defaults,page:'market',view:'overview',country:'CA',platform:'amazon',category:'vacuum',competitionGroup:'all',dataset:'2026-09',startMonth:'2026-01',endMonth:'2026-09'};
// A valid URL option must affect all three leader paths: monthly, snapshot and profiles.
for(const patch of [{},{country:'BR',platform:'ml'},{country:'US',category:'fabric'}]){
 const s={...base,...patch},cat=s.platform==='ml'?null:c.catalog(s),r=c.MarketDecisionModel.report(s,cat),rows=top=>c.MarketOverviewLayout.leaderRows({...s,marketTop:String(top)},cat,r).rows;
 const five=rows(5),ten=rows(10),twenty=rows(20);assert(five.length>0);assert(ten.length>five.length);assert(twenty.length>=ten.length);assert(twenty.length<=20);
 assert.deepEqual(ten.slice(0,5).map(x=>x.id),five.map(x=>x.id));assert.equal(rows(999).length,five.length);
}
// Real source case: 442 units belong to one parent and are counted at another ASIN.
// The differing revenue values remain conflicted; no revenue reference may be released.
const s={...base,country:'US',dataset:'2026-08',startMonth:'',endMonth:'',historyProduct:'B0HCZJV1NJ'},cat=c.catalog(s),selected=c.MonthlyWorkbench.selected(cat,s),before=JSON.stringify(cat.metricSourceRows),summary=c.MonthlyRange.summary(selected,s,{universe:cat.metricSourceRows}),html=c.MonthlyWorkbench.render(cat,s);
assert.equal(summary.units,74259);assert(html.includes('所属商品组销量参考（不另计）'));assert(html.includes('442<small>商品组 B0HG1XM6VL</small>'));assert(html.includes('不是单个ASIN销量，不另加到区间合计'));assert(!html.includes('所属商品组销售额参考 / USD（不另计）'));
assert.equal(JSON.stringify(cat.metricSourceRows),before);assert.equal(c.MonthlyRange.summary(selected,s,{universe:cat.metricSourceRows}).units,74259);
const group=selected.filter(r=>r.parentAsin==='B0HG1XM6VL');assert.equal(group.length,2);
const renderGroup=rows=>c.MonthlyWorkbench.render({...cat,metricSourceRows:rows},s);
assert(renderGroup(group.map(r=>({...r,parentSales:0}))).includes('0<small>商品组 B0HG1XM6VL</small>'),'A real zero is still a valid group reference');
assert(!renderGroup(group.map((r,i)=>({...r,parentSales:i?443:442}))).includes('data-monthly-group-reference'),'Conflicting units must remain unknown');
assert(!renderGroup(group.map(r=>({...r,quarantinedHistory:true}))).includes('data-monthly-group-reference'),'Quarantined history must remain excluded');
assert(!renderGroup(group.map(r=>({...r,parentBasis:'当前关系，历史未核实'}))).includes('data-monthly-group-reference'),'Current family identity cannot prove historical ownership');
// A rank-only module must have an explicit place in the final shared overview.
const profile=c.MarketWorkbench.rows(c.catalog(base),c.MarketIntelligence.cleanScope(base))[0];assert(profile);
c.UWANT_PRIVATE_CAPTURE={access:'personal_local_only',sourceRankSnapshots:['2026-08','2026-09'].map((month,i)=>({country:'CA',platform:'amazon',category:'vacuum',month,categoryId:'synthetic-continuity-fixture',requestedTopN:100,items:[{asin:profile.productId,title:'Synthetic test fixture',ranking:2-i,avgPrice:100}]}))};
assert(c.MarketSummary.overview(c.catalog(base),base).includes('data-overview-preserve="leaders"'));
console.log('PASS display continuity: three Top5/10/20 paths, real 442-unit sibling group reference without extra counting, conflicted revenue/units and quarantine isolation, explicit rank-module preservation.');
