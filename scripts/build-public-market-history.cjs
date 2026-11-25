/* Project already published statistics into the stand-alone monthly viewer. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

process.chdir(path.join(__dirname,'..'));
const root=require('../tests/library-fixture.cjs')();
root.location={hostname:'public.example'};
for(const file of ['mercado-data.js','market-insights.js','published-research-data.js','research-overlay.js',
  'research-snapshot.js','mercado-public-catalogue.js','mercado.js','mercado-history.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),root,{filename:file});
}
assert.equal(root.PRIVATE_RESEARCH.access,'public_sanitized');
const mercadoData=root.MERCADO_DATA,history=root.AmazonResearch.mergeHistory(root.REVIEW_HISTORY);
const countries=['MX','CA','US','BR','AR','CL','CO'];
const categories=['wash','vacuum','fabric','mattress'];
const base={...root.ResearchModel.defaults,competitionGroup:'all',productType:'all',shareMetric:'revenue'};
const amazon={rows:[],rankMonths:[],openMonths:[],dates:{}};
const mercado={scopes:{},products:{},dates:{}};
const micro=value=>Number.isFinite(value)?Math.round(value*1_000_000):null;
const total=values=>values.some(value=>value!==null)?values.reduce((sum,value)=>sum+(value??0),0):null;
const dates=values=>values.map(value=>String(value??'').slice(0,10)).filter(value=>/^20\d\d-\d\d-\d\d$/.test(value)).sort();
const idOk=id=>/^[A-Z0-9]{10}$/.test(id||'');
const titles=new Map(history.rows.map(row=>[[row.country,row.category,row.month,row.asin].join('|'),row.title]));
const earliest=Object.values(mercadoData.trends).flatMap(t=>t.monthly_order_series.map(row=>row.month)).sort()[0];
const domains={MX:'mercadolibre.com.mx',BR:'mercadolivre.com.br',AR:'mercadolibre.com.ar',CL:'mercadolibre.cl',CO:'mercadolibre.com.co'};

function safeMercadoLink(product){
  try{
    const url=new URL(product.detail_link),domain=domains[product.country];
    if(url.protocol!=='https:'||url.username||url.password||url.port||
       !(url.hostname===domain||url.hostname.endsWith('.'+domain)))return '';
    url.searchParams.delete('matt_tool');
    url.searchParams.delete('ua');
    return url.href;
  }catch{return '';}
}

for(const country of countries)for(const category of categories){
  const key=[country,category].join('|');
  if(root.MarketIntegrity.applicable(country,'amazon')){
    const scope={...base,country,category,platform:'amazon',dataset:'2026-10',startMonth:'2026-01',endMonth:'2026-10'};
    const facts=root.SampleSalesShares.report(history,scope).facts;
    const grouped=new Map();
    for(const fact of facts){
      if(!grouped.has(fact.month))grouped.set(fact.month,[]);
      grouped.get(fact.month).push(fact);
    }
    for(const [month,groups] of [...grouped].sort(([a],[b])=>a.localeCompare(b))){
      if(groups.some(fact=>fact.open)){
        amazon.openMonths.push([country,category,month]);
        continue;
      }
      const items=groups.map(fact=>{
        const listing=fact.asins.find(idOk);
        assert(idOk(fact.parentAsin)&&listing);
        const title=titles.get([country,category,month,listing].join('|'))||fact.brand||listing;
        const quote=fact.priceIndex!==null&&new Set(fact.prices).size===1?micro(fact.prices[0]):null;
        return [fact.parentAsin,listing,fact.units,micro(fact.revenue),quote,String(title).slice(0,120)];
      });
      amazon.rows.push([country,category,month,total(items.map(item=>item[2])),total(items.map(item=>item[3])),items.length]);
      amazon.rankMonths.push([country,category,month,items]);
      const last=dates([amazon.dates[key],...groups.flatMap(fact=>fact.sourceDates)]).at(-1);
      if(last)amazon.dates[key]=last;
    }
  }
  if(root.MarketIntegrity.applicable(country,'ml')){
    const scope={...base,country,category,platform:'ml',startMonth:earliest,endMonth:'2026-10'};
    const products=root.Mercado.rows(scope);
    const selection=root.MercadoHistory.selection(scope,products,mercadoData);
    const sample=root.MercadoHistory.monthlySample(selection);
    const usedDates=[];
    mercado.scopes[key]=sample.months.filter(row=>row.units!==null).map(row=>[
      row.month,row.units,row.groups.map(({key,product,orders,source})=>{
        const id=product.product_code;
        if(!mercado.products[id])mercado.products[id]=[
          [product.brand_label,product.model||id].filter(Boolean).join(' · '),safeMercadoLink(product),product.modelGroup||id];
        usedDates.push(source.sourceDate||source.data_coverage?.coverage_end_date);
        return [key,id,orders];
      })]);
    mercado.dates[key]=dates(usedDates).at(-1)||null;
  }
}

const output='window.UWANT_PUBLIC_HISTORY='+JSON.stringify({amazon,mercado}).replaceAll('<','\\u003c')+';\n';
const file='market-history/public-history.js';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),output,'Refresh the published monthly data from the canonical public sources.');
else fs.writeFileSync(file,output);
console.log(JSON.stringify({
  amazonScopes:new Set(amazon.rows.map(([country,category])=>country+'|'+category)).size,
  amazonMonths:amazon.rows.length,
  amazonExcludedOpenMonths:amazon.openMonths.length,
  mercadoScopes:Object.keys(mercado.scopes).length,
  mercadoMonths:Object.values(mercado.scopes).reduce((n,rows)=>n+rows.length,0),
  mercadoProducts:Object.keys(mercado.products).length,
  mercadoProductMonths:Object.values(mercado.scopes).flatMap(x=>x).reduce((n,row)=>n+row[2].length,0)
}));
