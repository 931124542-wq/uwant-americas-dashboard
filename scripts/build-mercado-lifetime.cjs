/* Project the cumulative order field onto already published, exact listing observations. */
const fs = require('node:fs');
const vm = require('node:vm');
const {resolve} = require('node:path');

const root = resolve(__dirname, '..');
const [baseFile, mainFile, supplementFile, outputFile] = process.argv.slice(2);
if (!outputFile) throw new Error('Expected three normalized archive paths and an output path.');
const context = {URL, location:{hostname:'public.example'}};
context.window = context;
vm.createContext(context);
for (const file of ['market-integrity.js','mercado-data.js','published-research-data.js','research-overlay.js','research-snapshot.js']) {
  vm.runInContext(fs.readFileSync(resolve(root,file),'utf8'),context,{filename:file});
}

const archive = new Map([
  ['2026-11-05',baseFile],
  ['2026-11-06',mainFile],
  ['2026-11-12',supplementFile]
].map(([date,file]) => {
  const source = JSON.parse(fs.readFileSync(file,'utf8'));
  if (source.asOf !== date) throw new Error('Archive date mismatch for '+date);
  return [date,new Map(source.records.filter(row=>row.product_code).map(row=>[row.product_code,row]))];
}));
const matches = [
  'country','category','currency','form','statisticalKey','product_name',
  'orders_last_30_days','revenue_last_30_days'
];
const projected = [];
const keys = new Set();
const audit = {observations:0, invalidCumulative:0, decreasingListings:0, projectedListings:0};
for (const product of context.MERCADO_DATA.records) {
  if (!context.MarketIntegrity.allows(product) || product.counted!==true || product.statIsolationReason ||
      product.catalogueOnly || product.sourceScopeTier==='adjacent' || !product.statisticalKey) continue;

  const good = [];
  for (const published of context.ResearchSnapshot.observations(product)) {
    const original = archive.get(published.sourceDate)?.get(product.product_code);
    if (!original || !matches.every(key=>original[key]===published[key]) ||
        published.counted!==true || published.statIsolationReason || original.statIsolationReason) continue;
    const units = original.lifetime_orders;
    if (!Number.isSafeInteger(units) || units<0 || units<(published.orders_last_30_days??0)) {
      audit.invalidCumulative++;
      continue;
    }
    good.push([published.sourceDate, units]);
    audit.observations++;
  }
  if (!good.length) continue;
  if (good.some((row,index)=>index>0&&row[1]<good[index-1][1])) {
    audit.decreasingListings++;
    continue;
  }
  const key = [product.country,product.category,product.statisticalKey].join('|');
  if (keys.has(key)) throw new Error('Multiple published representatives for '+key);
  keys.add(key);
  projected.push([product.product_code,good.at(-1)]);
}
audit.projectedListings = projected.length;
const rows = Object.fromEntries(projected.sort(([a],[b])=>a.localeCompare(b)));
const source = {source:'大麦数据',period:'listing_lifetime_orders',rows};
fs.writeFileSync(outputFile,'window.MERCADO_LIFETIME_OBSERVATIONS='+JSON.stringify(source)+';\n');
console.log(JSON.stringify(audit));
