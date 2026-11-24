const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process'),F=require('./library-fixture.cjs');
function load(){const c=F();c.location={hostname:'public.example'};for(const f of ['mercado-data.js','market-insights.js','published-research-data.js','research-overlay.js','research-snapshot.js','mercado-history.js','mercado-coverage-summary.js','mercado.js','market-decision-model.js','market-validation.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);c.REVIEW_DATA.history=c.AmazonResearch.mergeHistory(c.REVIEW_HISTORY);return c;}
const c=load(),data=c.MERCADO_DATA,original=JSON.stringify(data),scope={...c.ResearchModel.defaults,page:'market',view:'overview',country:'BR',platform:'ml',category:'wash',own:'D600',dataset:'2026-09',startMonth:'2026-01',endMonth:'2026-09'},r=c.MarketValidation.audit(scope,s=>c.catalog(s));
assert.equal(r.rows.length,56);assert.equal(r.supported,36);assert.equal(r.available,26);assert.equal(r.missing,10);assert.equal(r.errors,0);assert.equal(r.notApplicable,20);
assert.equal(c.MarketIntegrity.reviewed.length,106);assert.equal(c.MarketIntegrity.exclusions(data.records).length,106);assert.equal(data.records.length,7304);assert.equal(c.Mercado.rows(scope).length,228);assert.equal(c.MarketDecisionModel.report(scope).units.total,289);assert.equal(c.MarketDecisionModel.report(scope).revenue.total,676961);
const narrowed={...scope,evidenceRelation:'not_a_form',evidenceQuery:'Dyson',evidenceBrand:'Dyson',productType:'dry',marketQuick:'sameprice'};
assert.deepEqual(c.MarketValidation.audit(narrowed,s=>c.catalog(s)),r,'An unrelated active page filter must not narrow an all-market audit');
const chileWash=r.rows.find(x=>x.country==='CL'&&x.platform==='ml'&&x.category==='wash');
assert.equal(chileWash.products,228);assert.equal(chileWash.units,71);assert.equal(chileWash.revenue,36661023);
assert.equal(data.records.find(x=>x.product_code==='MLC2022458480').orders_last_30_days,1);
const mexicoVac=r.rows.find(x=>x.country==='MX'&&x.platform==='ml'&&x.category==='vacuum');
assert.equal(mexicoVac.details.incompleteQueries,2);assert.equal(mexicoVac.details.unfetchedReportedPages,49);
assert.equal(mexicoVac.details.extraUnits,499);assert.equal(mexicoVac.positiveUnitRecords,5);
const retail=c.MarketValidation.localCatalogue(scope,s=>c.catalog(s));
assert.equal(retail.length,28);assert(retail.find(x=>x.country==='MX'&&x.category==='vacuum').channels.some(x=>x.label==='Liverpool México'));
assert.equal(retail.find(x=>x.country==='CL'&&x.category==='wash').channels.length,0);
const accessory=data.records.find(x=>x.product_code==='MLB5266551189');assert.equal(accessory.counted,true);assert.equal(accessory.orders_last_30_days,1);assert.equal(accessory.revenue_last_30_days,208);assert(!c.ResearchSnapshot.eligible(accessory,data,'orders_last_30_days'));assert.equal(c.Mercado.csvRows({...scope,evidenceQuery:accessory.product_code}).length,1);
const machine=data.records.find(x=>x.product_code==='MCO2481573162');assert(machine&&c.MarketIntegrity.allows(machine),'A compatibility word alone cannot reject an image-confirmed machine');
const genuine=c.Mercado.rows(scope).find(x=>c.ResearchSnapshot.eligible(x,data,'orders_last_30_days'));
assert(c.ResearchSnapshot.eligible({...genuine,orders_last_30_days:0},data,'orders_last_30_days'));assert(!c.ResearchSnapshot.eligible({...genuine,currency:'USD'},data,'orders_last_30_days'));assert(!c.ResearchSnapshot.eligible({...genuine,orders_last_30_days:null},data,'orders_last_30_days'));
data.records.push({...genuine,product_code:'MLB999999999999'});assert(c.MarketValidation.audit(scope,s=>c.catalog(s)).errors>0,'Duplicate statistical keys must fail the gate');data.records.pop();
const mexicoMonths={...scope,country:'MX',category:'vacuum',startMonth:'2026-09',endMonth:'2026-11'};
const listingHistory=c.MercadoHistory.selection(mexicoMonths,c.Mercado.rows(mexicoMonths),data);
const monthTotals=history=>Array.from(
 c.MercadoHistory.sampleExportRows(history,mexicoMonths).filter(row=>row[0]==='月份'),
 row=>[row[6],row[7],row[8]]
);
assert.deepEqual(monthTotals(listingHistory),[['2026-09',314,9],['2026-10',253,6],['2026-11',null,0]]);
const mak=listingHistory.profiles.find(p=>p.product.product_code==='MLM18995515');
const aliasId='MLM9999999999',september=mak.months.find(m=>m.month==='2026-09');
const alias={product:{...mak.product,product_code:aliasId,counted:false},source:{...mak.source,product_code:aliasId},months:[september]};
assert.deepEqual(monthTotals({...listingHistory,profiles:[alias,...listingHistory.profiles]}),monthTotals(listingHistory));
assert.deepEqual(monthTotals({...listingHistory,profiles:[...listingHistory.profiles,{...alias,months:[{...september,orders:400}]}]}),
 [['2026-09',310,8],['2026-10',253,6],['2026-11',null,0]],'Conflicting monthly aliases must not be summed or substituted');
const directSample={...listingHistory,profiles:[{...mak,months:[{...september,orders:0}]}]};
assert.deepEqual(monthTotals(directSample),[['2026-09',0,1],['2026-10',null,0],['2026-11',null,0]],'Reported zero and unavailable history are different');
const incomplete={...mak,source:{...mak.source,data_coverage:{...mak.source.data_coverage,coverage_end_date:'2026-09-25'}},months:[september]};
assert.deepEqual(monthTotals({...listingHistory,profiles:[incomplete]}),[['2026-09',null,0],['2026-10',null,0],['2026-11',null,0]]);
const partialWindow={...mak.source,covered_day_count:30,data_coverage:{
 ...mak.source.data_coverage,full_coverage:false,covered_day_count:30,
 coverage_start_date:'2026-09-01',coverage_end_date:'2026-09-30'
}};
const septemberOnly={...listingHistory,profiles:[{
 ...mak,source:partialWindow,months:[{...september,monthStatus:'closed_daily_completeness_unknown'}]
}]};
assert.deepEqual(monthTotals(septemberOnly),[['2026-09',4,1],['2026-10',null,0],['2026-11',null,0]],'A shorter continuous source window can verify a whole month');
const gapped={...partialWindow,data_coverage:{...partialWindow.data_coverage,coverage_end_date:'2026-10-01'}};
assert.deepEqual(monthTotals({...septemberOnly,profiles:[{...septemberOnly.profiles[0],source:gapped}]}),
 [['2026-09',null,0],['2026-10',null,0],['2026-11',null,0]],'A gap between the coverage endpoints prevents the same inference');
assert.equal(JSON.stringify(data),original,'Review and audit must not mutate source records or histories');
const csv=c.MarketValidation.csv(r);assert.equal(csv.length,57);assert(csv.slice(1).filter(x=>x[3]===false).every(x=>x[5]===null&&x[6]===null),'Unavailable markets cannot become zero sales');assert(r.rows.filter(x=>x.status==='missing_sales').every(x=>x.units===null&&x.revenue===null));
for(const p of [...fs.readdirSync('.').filter(f=>f.endsWith('-data.js')),'data.json'])assert.equal(cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim(),cp.execFileSync('git',['rev-parse','b144d08:'+p],{encoding:'utf8'}).trim(),p+' original source file changed');
console.log('PASS market integrity: 56 platform scopes, 28 local retail scopes, 106 accessory exclusions, isolated filters/snapshots, original totals, coverage and immutable source files.');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(r,null,2));
