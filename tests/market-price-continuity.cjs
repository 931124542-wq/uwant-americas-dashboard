/* Public data continuity checks used by the release contract. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = require('./library-fixture.cjs')();
context.location = {hostname:'public.example'};
for(const file of [
  'market-currency.js','mercado-data.js','market-insights.js','published-research-data.js',
  'research-overlay.js','research-snapshot.js','mercado-public-catalogue.js',
  'mercado.js','mercado-history.js','mercado-coverage-summary.js'
]){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

const {Mercado,ResearchSnapshot,MERCADO_DATA,MarketCurrency,SampleSalesShares,ResearchModel} = context;
const history = context.AmazonResearch.mergeHistory(context.REVIEW_HISTORY);
const categories = ['fabric','wash','vacuum','mattress'];
const countries = ['MX','BR','AR','CL','CO','US','CA'];
const step = {fabric:500,wash:1000,vacuum:1000,mattress:500};

for(const category of categories){
  const scope = {country:'MX',category};
  const width = step[category];
  assert.equal(ResearchModel.priceBandRule(scope).step,width);
  assert.equal(ResearchModel.categoryPriceBand(scope,width-0.01).index,0);
  assert.equal(ResearchModel.categoryPriceBand(scope,width).index,1);
}
for(const country of countries)for(const category of categories){
  assert(ResearchModel.priceBandRule({country,category}));
  const scope = {...ResearchModel.defaults,country,category,dataset:'2026-10',startMonth:'2026-01',endMonth:'2026-10'};
  if(context.MarketIntegrity.applicable(country,'ml')){
    const ml = {...scope,platform:'ml',mlPriceBands:'MXN:500,1000,2000,4000,8000'};
    const rows = Mercado.rows(ml);
    for(const shareMetric of ['units','revenue']){
      const report = Mercado.report({...ml,shareMetric});
      const raw = rows.filter(row=>ResearchSnapshot.eligible(row,MERCADO_DATA,report.metric));
      const facts = raw.map(row=>shareMetric==='units'?row[report.metric]:
        MarketCurrency.amount(row[report.metric],country,row.currency,row.sourceDate)).filter(value=>value!==null);
      const total = facts.length?facts.reduce((sum,value)=>sum+value,0):null;
      assert.equal(report.all.length,facts.length,country+'/'+category+'/'+shareMetric);
      assert.equal(report.total,total);
      if(total!==null)assert(Math.abs(report.bands.reduce((sum,[,value])=>sum+(value??0),0)-total)<1e-6);
    }
    const rolling = context.MercadoCoverageSummary.revenueSnapshots(ml,rows,MERCADO_DATA);
    const latest = rolling.find(batch=>batch.date===(MERCADO_DATA.researchSnapshot||MERCADO_DATA.asOf));
    assert.equal(latest?.units??null,Mercado.report({...ml,shareMetric:'units'}).total);
  }
  if(context.MarketIntegrity.applicable(country,'amazon')){
    for(const shareMetric of ['units','revenue']){
      const report=SampleSalesShares.report(history,{...scope,platform:'amazon',shareMetric});
      if(report.total!==null)assert(Math.abs(report.prices.reduce((sum,band)=>sum+band.value,0)-report.total)<1e-6);
    }
  }
}
assert.equal(Mercado.currencyFor('AR'),'USD');
assert.equal(MarketCurrency.rate('2026-11-06'),MarketCurrency.rate('2026-11-05'));
console.log('PASS market price continuity: 36 scopes, exact source totals, price allocation, rolling units and display currency.');
