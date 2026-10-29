/* Read-only audit. Optional private cache: UWANT_AUDIT_CACHE=/absolute/year-2026. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,process.env.UWANT_AUDIT_OUTPUT||'docs/data-audit-evidence');
fs.mkdirSync(out,{recursive:true});
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const ctx={window:{},console,URL,Intl,Date,market:'ca',rdSamples:[]};vm.createContext(ctx);
function load(f){vm.runInContext(read(f),ctx,{filename:f});}
function get(s){return vm.runInContext(s,ctx);}
for(const f of ['history-metrics.js','radar-validation.js','history-data.js','review-data.js','focus-brands-data.js','own-data.js','sellersprite-products-data.js','sellersprite-live-data.js','competitor-data.js','attached-matrix-data.js','new-model-data.js','research-data.js','brazil-data.js','market-radar-data.js'])load(f);
const H=ctx.window.REVIEW_HISTORY,D=ctx.window.REVIEW_DATA,F=ctx.window.FOCUS_BRANDS,O=ctx.window.REVIEW_OWN,quotes=get('cpRecords'),matrix=get('amSourceData'),raw=json('data.json'),metrics=['parentSales','childSales','parentSalesAmount','childSalesAmount','price','bsr','rating','reviews'];
const records=[],checks=[],summary={asOf:'2026-10-29',commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()};
function check(name,ok,details){checks.push({name,status:ok?'PASS':'FAIL',details});}
function issue(id,r,reason,extra={}){records.push({issue:id,country:r.country,asin:r.asin||r.product_id||'',month:r.month||'',category:r.category||'',parentAsin:r.parentAsin||'',parentBasis:r.parentBasis||'',...extra,reason});}
function csv(file,rows){if(!rows.length){fs.writeFileSync(path.join(out,file),'');return;}const fields=[...new Set(rows.flatMap(Object.keys))],q=v=>'"'+String(v??'').replaceAll('"','""')+'"';fs.writeFileSync(path.join(out,file),'\uFEFF'+[fields,...rows.map(r=>fields.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))].map(a=>a.map(q).join(',')).join('\r\n'));}
const key=r=>[r.country,r.asin,r.month].join('|'),currencies={US:'USD',CA:'CAD',MX:'MXN',BR:'BRL'},seen=new Set;
for(const r of H.rows){
 if(seen.has(key(r)))issue('RAW-DUPLICATE',r,'国家/ASIN/月重复');seen.add(key(r));
 if(r.currency!==currencies[r.country]||r.marketplace!=='Amazon')issue('RAW-SCOPE',r,'币种或平台不匹配');
 if(!/^B[A-Z0-9]{9}$/.test(r.asin)||!/^2026-(0[1-9]|10)$/.test(r.month))issue('RAW-ID-DATE',r,'标识或月份异常');
 for(const m of metrics)if(r[m]!==null&&(!Number.isFinite(r[m])||r[m]<0||m==='rating'&&r[m]>5))issue('RAW-TYPE',r,m+'字段范围异常',{field:m,value:r[m]});
 if(r.parentBasis.includes('同日多个父体'))issue('PARENT-AMBIGUOUS',r,'同日多父体无先后证据，不计样本合计',{parentSales:r.parentSales,parentSalesAmount:r.parentSalesAmount});
 if(r.parentSales!==null&&!r.parentAsin)issue('PARENT-MISSING',r,'有父体月销量但没有父体ID，保留待核',{parentSales:r.parentSales,parentSalesAmount:r.parentSalesAmount});
}
check('历史主键、类型、国家币种和日期',!records.some(r=>r.issue.startsWith('RAW-')),H.rows.length+' rows');
check('双份历史JSON逐字段相同',JSON.stringify(H)===JSON.stringify(json('year-2026/history.json')),'history-data.js vs year-2026/history.json');
const products=H.rows.filter(r=>r.month==='2026-02');
summary.history={products:products.length,rows:H.rows.length,available:H.rows.filter(r=>r.recordStatus==='AVAILABLE').length,parentSales:H.rows.filter(r=>r.parentSales!==null).length,ambiguous:records.filter(r=>r.issue==='PARENT-AMBIGUOUS').length,missingParent:records.filter(r=>r.issue==='PARENT-MISSING').length,zeroMetrics:Object.fromEntries(metrics.map(m=>[m,H.rows.filter(r=>r[m]===0).length])),categories:{},february:[],parentBases:{}};
for(const r of H.rows)summary.history.parentBases[r.parentBasis]=(summary.history.parentBases[r.parentBasis]||0)+1;
const HM=require('../history-metrics.js');
for(const country of Object.keys(currencies)){
 summary.history.categories[country]=Object.fromEntries(['vacuum','wash','fabric','mattress'].map(c=>[c,products.filter(r=>r.country===country&&r.category===c).length]));
 for(const category of ['vacuum','wash','fabric','mattress']){
  const rows=products.filter(r=>r.country===country&&r.category===category),u=HM.metricRows(rows,'units'),v=HM.metricRows(rows,'revenue');
  summary.history.february.push({country,category,catalog:rows.length,available:rows.filter(r=>r.recordStatus==='AVAILABLE').length,prices:rows.filter(r=>r.price!==null).length,parentSales:rows.filter(r=>r.parentSales!==null).length,parentRevenue:rows.filter(r=>r.parentSalesAmount!==null).length,confirmedUnits:u.length,knownSales:u.length?u.reduce((n,r)=>n+r.units,0):null,knownRevenue:v.length?v.reduce((n,r)=>n+r.revenue,0):null});
 }
}
for(const p of products){
 if(p.brandConflict)issue('BRAND-CONFLICT',p,'标题与详情品牌冲突',{title:p.title,sourceBrand:p.sourceBrand});
 if(p.category==='vacuum'&&/\brobot(?:ic)?\b|\brob[oô]\b|shop.?vac|canister|gallon|commercial|industrial|carpet cleaner|ProHeat/i.test(p.title))issue('CATEGORY-REVIEW',p,'标题提示非目标机型，需要原始类目/详情核实，未自动改类',{title:p.title});
 if(p.category==='wash'&&/replacement|filter|roller brush|brush roller|solution|repuesto/i.test(p.title)&&!/vacuum cleaner|floor washer|floor cleaner|aspiradora|aspirador/i.test(p.title))issue('CATEGORY-REVIEW',p,'疑似配件，需详情核实',{title:p.title});
}
const quoted=quotes.map(r=>({id:r.id,country:r.country,brand:r.brand,model:r.model,sku:r.sku,source:r.source,host:new URL(r.source).hostname,currency:r.currency,price:r.price,currencyVerified:r.currencyVerified,checkedAt:r.checkedAt,detectedPlatform:get('biPlatformOf')(r),externalStatus:'NOT_CHECKED',historicalPriceVerified:false}));
const familyGroups=new Map();for(const r of H.rows.filter(r=>r.parentBasis==='历史父体变更记录'&&r.parentAsin)){const k=[r.country,r.month,r.parentAsin].join('|');if(!familyGroups.has(k))familyGroups.set(k,[]);familyGroups.get(k).push(r);}
for(const g of familyGroups.values())for(const field of ['parentSales','parentSalesAmount'])if(new Set(g.filter(r=>Number.isFinite(r[field])).map(r=>r[field])).size>1)for(const r of g)issue('PARENT-VALUE-CONFLICT',r,'同范围同父体返回数值不一致；筛选前隔离',{field,value:r[field],siblings:g.map(x=>x.asin).join(';')});
const internalDuplicates=[];for(const table of ['sales','inventory','event','daily']){const seen=new Set;for(const [i,r] of raw[table].entries()){const k=JSON.stringify(table==='sales'?[r.date,r.channel,r.sku]:table==='daily'?[r.date,r.sku]:r.sku);if(seen.has(k))internalDuplicates.push({table,row:i+1,key:k});seen.add(k);}}
summary.internalDuplicateCandidates=internalDuplicates;csv('internal-duplicate-candidates.csv',internalDuplicates);
// Sales transaction rows have no order ID, so same-day/channel/SKU is a candidate, not proof of duplicate orders.
load('intelligence.js');ctx.localDate=s=>new Date(s+'T00:00:00Z');const runCalendar=read('calendar.js').split('function calendarMonthGrid')[0];vm.runInContext(runCalendar,ctx);
const calendar=get('promotionCalendar'),calendarErrors=get('validateCalendar()');check('全部促销日历结构/日期/来源和假日基线',!calendarErrors.length,calendarErrors);
summary.calendar={rows:calendar.length,sources:Object.keys(get('calendarSources')).length,countries:[...new Set(calendar.map(r=>r.market))],states:Object.fromEntries([...new Set(calendar.map(r=>r.dateState))].map(s=>[s,calendar.filter(r=>r.dateState===s).length])),externalVerification:'not reverified in this audit'};
csv('calendar-evidence.csv',calendar.map(r=>({id:r.id,country:r.market,year:r.year,start:r.start,end:r.end,kind:r.kind,state:r.dateState,checkedAt:r.checkedAt,sources:r.sources.map(k=>get('calendarSources')[k]?.url).join(';'),externalStatus:'NOT_REVERIFIED'})));
const rosterGaps=F.products.filter(p=>!products.some(r=>r.country===p.country&&r.asin===p.asin)).map(p=>({country:p.country,asin:p.asin,category:p.category,parent:p.parent,title:p.title,trackedSiblings:products.filter(r=>r.country===p.country&&r.currentParentAsin===p.parent).map(r=>r.asin).join(';'),status:'历史采集名单缺此ASIN，不复制兄弟商品数值'}));csv('roster-gaps.csv',rosterGaps);summary.rosterGaps=rosterGaps;
summary.focusCoverage={queries:F.queries,accepted:F.products.length,excluded:F.excluded.length,sourceBrandConflicts:F.products.filter(r=>r.sourceBrand&&!String(r.sourceBrand).toLowerCase().includes(r.brand.toLowerCase())).map(r=>({country:r.country,asin:r.asin,brand:r.brand,sourceBrand:r.sourceBrand})),categories:Object.fromEntries(Object.keys(currencies).map(c=>[c,Object.fromEntries(['vacuum','wash','fabric','mattress'].map(k=>[k,F.products.filter(r=>r.country===c&&r.category===k).length]))]))};
summary.quotes={total:quotes.length,countries:Object.fromEntries(['us','mx','ca','br'].map(c=>[c,quotes.filter(r=>r.country===c).length])),channels:[...new Set(quoted.map(r=>r.host))]};
csv('public-quotes.csv',quoted);
const sum=(rows,k)=>rows.reduce((n,r)=>n+r[k],0),inv=raw.inventory;
summary.operations={sources:raw.sources,eventMetadata:raw.eventMetadata,sellOut:{rows:raw.sales.length,units:sum(raw.sales,'units'),minDate:raw.sales.map(r=>r.date).sort()[0],maxDate:raw.sales.map(r=>r.date).sort().at(-1),channels:[...new Set(raw.sales.map(r=>r.channel))],bySku:Object.fromEntries(inv.map(r=>[r.sku,sum(raw.sales.filter(s=>s.sku===r.sku),'units')]))},inventory:{rows:inv.length,available:sum(inv,'available'),allocated:sum(inv,'allocated'),total:sum(inv,'total')},event:Object.fromEntries(['units','sessions','revenue','spend','adRevenue'].map(k=>[k,sum(raw.event,k)])),advertising:raw.advertising};
check('库存明细可用+分配=总库存',inv.every(r=>r.available+r.allocated===r.total),summary.operations.inventory);
check('活动明细对控制合计',Object.keys(summary.operations.event).every(k=>Math.abs(summary.operations.event[k]-raw.eventMetadata.controls[k])<.011),summary.operations.event);
check('库存EAN13校验位',inv.every(r=>{const s=String(r.ean);return /^\d{13}$/.test(s)&&(+s[12]+[...s.slice(0,12)].reduce((n,d,i)=>n+Number(d)*(i%2?3:1),0))%10===0;}),inv.map(r=>({sku:r.sku,ean:r.ean})));
const expected={D:'wash',V:'vacuum',Y:'fabric',M:'mattress'};
const tierReview=ctx.window.ssProducts.filter(r=>r.tier.startsWith('T3')).map(r=>({country:r.market,asin:r.asin,brand:r.brand,tier:r.tier,issue:'原人工T3分组，未取得白牌/OEM身份依据',establishedBrandName:/^(dyson|black\+decker|bissell|levoit|xiaomi|electrolux)$/i.test(r.brand)}));csv('tier-manual-review.csv',tierReview);summary.tierReview={rows:tierReview.length,knownBrandNames:tierReview.filter(r=>r.establishedBrandName).length};
const matrixOffers=[],matrixProblems=[];
for(const [country,bySku] of Object.entries(matrix))for(const [sku,sheet] of Object.entries(bySku))for(const p of sheet.products){
 if(p.country!==country||p.sku!==sku)matrixProblems.push({id:p.id,issue:'country/SKU differs from containing sheet'});
 for(const q of p.offers){matrixOffers.push({country,sku,id:p.id,brand:p.brand,model:p.model,isOwn:p.isOwn,file:p.file,sourceDate:p.loadedAt,sheet:p.sheet,cell:q.cell,platform:q.kind,rawValue:q.value,price:q.price,isTarget:q.isTarget,isRange:q.isRange});if(q.price!==null&&(!Number.isFinite(q.price)||q.price<=0))matrixProblems.push({id:p.id,cell:q.cell,issue:'invalid parsed price'});}
}
check('原表商品国家/SKU与报价类型范围',!matrixProblems.length,matrixProblems);summary.matrix={sheets:Object.values(matrix).reduce((n,m)=>n+Object.keys(m).length,0),offers:matrixOffers.length};csv('matrix-offers.csv',matrixOffers);
const publicRows=get('biPublicRows()');summary.publicAdapters={rows:publicRows.length,byCountry:Object.fromEntries(['us','ca','mx','br'].map(c=>[c,publicRows.filter(r=>r.country===c).length])),brazilSourcesReverified:false};
check('全部公开报价币种/平台、无伪造销量',publicRows.every(r=>r.currency===currencies[r.country.toUpperCase()]&&r.units===null&&r.revenue===null&&r.rank===null),summary.publicAdapters);
const aliases=new Map;for(const r of products){if(!r.brand)continue;const k=r.country+'|'+r.brand.trim().toLowerCase();if(!aliases.has(k))aliases.set(k,new Set);aliases.get(k).add(r.brand);}
csv('brand-aliases.csv',[...aliases].filter(([,v])=>v.size>1).map(([scope,v])=>({scope,original:[...v].join(';'),display:HM.brandName([...v][0]),rule:'大小写别名，仅展示及聚合归一；原始文件不改'})));
csv('sku-mapping.csv',Object.entries(O).flatMap(([country,bySku])=>Object.entries(bySku).map(([sku,r])=>({country,sku,expectedCategory:expected[sku[0]],price:r.price,priceType:r.priceType,date:r.date,source:r.source,matrixExists:!!matrix[country.toLowerCase()]?.[sku]}))));
summary.archives={asOf:D.asOf,markets:Object.fromEntries(Object.entries(D.markets).map(([c,m])=>[c,{products:m.products?.items?.length,period:m.products?.dataMonth,details:m.details?.length}])),focus:{asOf:F.asOf,products:F.products.length,queries:F.queries?.length},curated:ctx.window.ssProducts.length};
const cache=process.env.UWANT_AUDIT_CACHE;
if(cache){
 let compared=0;const mismatch=[],missing=[];
 for(const p of products){const name=p.country+'-'+p.asin+'.json',file=path.join(cache,name);if(!fs.existsSync(file)){missing.push(name);continue;}const rawRecord=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const r of H.rows.filter(r=>r.country===p.country&&r.asin===p.asin))for(const m of metrics){const source=rawRecord.data?.series?.[m]?.find(x=>x.date===r.month)?.value??null;if(source!==r[m])mismatch.push({country:r.country,asin:r.asin,month:r.month,metric:m,source,exported:r[m]});compared++;}
 }
 summary.rawCache={products:products.length-missing.length,fieldComparisons:compared,mismatches:mismatch.length,missing};check('原始MCP缓存对历史字段',!missing.length&&!mismatch.length,summary.rawCache);csv('raw-mismatches.csv',mismatch);
 const rosterFile=path.join(cache,'product-roster.json');if(fs.existsSync(rosterFile)){const roster=JSON.parse(fs.readFileSync(rosterFile));check('采集名单与页面商品/分类/品牌/当前父体一致',roster.length===products.length&&roster.every(p=>{const r=products.find(r=>r.country===p.country&&r.asin===p.asin);return r&&['category','brand','title'].every(k=>r[k]===p[k])&&(r.currentParentAsin||null)===(p.parentAsin||null);}),roster.length);}
}else checks.push({name:'原始MCP缓存对历史字段',status:'NOT_EXECUTED',details:'设置 UWANT_AUDIT_CACHE 访问授权的本地原始缓存；缓存含计费字段，不发布'});
csv('record-issues.csv',records);
csv('february-coverage.csv',summary.history.february);
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const files=walk(root).filter(f=>/\.(?:html|js|cjs|mjs|json|csv|xlsx|css|txt)$/.test(f)&&!f.includes('/docs/data-audit-evidence/'));
csv('file-inventory.csv',files.map(f=>{const b=fs.readFileSync(f);return {file:path.relative(root,f),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}));
summary.inventoryFiles=files.length;summary.issueCounts=Object.fromEntries([...new Set(records.map(r=>r.issue))].map(k=>[k,records.filter(r=>r.issue===k).length]));summary.checks=checks;
fs.writeFileSync(path.join(out,'audit-results.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({commit:summary.commit,history:summary.history.categories,issues:summary.issueCounts,checks},null,2));
if(checks.some(c=>c.status==='FAIL'))process.exitCode=1;
