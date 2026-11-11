/* Decision facts derived only from the existing qualified source units. */
(function(root){
 const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0,own=b=>String(b||'').trim().toUpperCase()==='UWANT';
 const unknown=b=>!b||/未识别|待核|unknown|generic/i.test(b),currency=c=>({MX:'MXN',CA:'CAD',US:'USD',BR:'BRL',AR:'ARS',CL:'CLP',CO:'COP'})[c];
 const median=xs=>{const a=xs.filter(valid).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:null;};
 function metric(native,kind){
  const brands=(native.brands||[]).map(g=>Array.isArray(g)?{label:g[0],value:g[1]}:g),named=brands.filter(g=>!unknown(g.label)&&g.value>0).sort((a,b)=>b.value-a.value),u=brands.filter(g=>own(g.label));
  const total=valid(native.total)?native.total:null;
  return {kind,total,brands,count:(native.all||native.selected||[]).length,own:u.length?u.reduce((s,g)=>s+g.value,0):null,share:total>0&&u.length?u.reduce((s,g)=>s+g.value,0)/total:null,cr3:total>0?named.slice(0,3).reduce((s,g)=>s+g.value,0)/total:null,cr5:total>0?named.slice(0,5).reduce((s,g)=>s+g.value,0)/total:null,named:named.length,unknown:brands.filter(g=>unknown(g.label)).reduce((s,g)=>s+g.value,0)};
 }
 function cohort(facts,months,kind,now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date())){
  const empty=reason=>({eligible:false,reason,points:[],change:null,count:0,firstCount:0,lastCount:0});
  if(months.length<2)return empty('选择至少两个连续的自然月后比较固定样本。');
  const serial=m=>Number(m.slice(0,4))*12+Number(m.slice(5));
  if(months.some((m,i)=>i&&serial(m)!==serial(months[i-1])+1))return empty('月份不连续，不能比较固定样本。');
  const selected=facts.filter(f=>months.includes(f.month)&&valid(f[kind]));
  if(months.some(m=>m>=now)||selected.some(f=>f.open))return empty('含当前月、未来月或采集时未结月，暂不计算增长。');
  const key=f=>[f.country,f.platform,f.currency,f.parentAsin].join('|'),maps=months.map(m=>new Map(selected.filter(f=>f.month===m).map(f=>[key(f),f])));
  if(maps.some(m=>!m.size))return empty('部分月份没有合格值，缺月不补零。');
  const common=[...maps[0].keys()].filter(k=>maps.every(m=>m.has(k))&&new Set(maps.map(m=>m.get(k).brand)).size===1);
  if(!common.length)return empty('没有贯穿整个区间且品牌归属一致的合格父体。');
  const points=months.map((month,i)=>({month,value:common.reduce((v,k)=>v+maps[i].get(k)[kind],0),allCount:maps[i].size})),first=points[0].value;
  return {eligible:true,reason:'同国家、平台、币种、历史父体及品牌归属；月度第三方估算，非全市场增长。',count:common.length,firstCount:maps[0].size,lastCount:maps.at(-1).size,points,change:first>0?points.at(-1).value/first-1:null,zeroBase:first===0,ids:common};
 }
 function feature(r,category){
  if(r.product_code){const c=r.claims||{},yes=k=>c[k]?.value===true;
   if(category==='vacuum')return (yes('cordless')?'无线标称':'供电待核')+' / '+(yes('autoEmpty')?'自集尘标称':'集尘配置待核');
   if(category==='fabric')return yes('steam')?'蒸汽标称':yes('dualTank')?'双水箱标称 / 蒸汽待核':'配置待核';
   if(category==='wash')return yes('steam')?'蒸汽标称':yes('selfCleaning')?'自清洁标称':'配置待核';
   return [yes('uv')?'UV标称':'',yes('heating')?'加热标称':''].filter(Boolean).join(' / ')||'配置待核';
  }
  const fs=root.LocalProductContext?.features(r)||{},keys=({wash:['selfclean','runtime'],vacuum:['powerSource','autoempty'],fabric:['steam','cleanWater'],mattress:['uv','heating']})[category]||[];
  return keys.filter(k=>fs[k]?.length).map(k=>fs[k][0].value).join(' / ')||'配置待核';
 }
 function cells(facts,kind){const map=new Map();for(const f of facts){if(!valid(f[kind]))continue;const key=[f.band,f.feature].join('|');if(!map.has(key))map.set(key,{key,band:f.band,feature:f.feature,value:0,facts:[],models:new Set(),brands:new Map()});const g=map.get(key);g.value+=f[kind];g.facts.push(f);for(const model of f.models||[])g.models.add(model);g.brands.set(f.brand,(g.brands.get(f.brand)||0)+f[kind]);}return [...map.values()].map(g=>({...g,models:g.models.size,leader:[...g.brands].sort((a,b)=>b[1]-a[1])[0]?.[0]||'未识别品牌'})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));}
 function ml(s){
  const data=root.MERCADO_DATA;if(!data?.records)return null;const products=root.Mercado.rows(s),scope=products.filter(r=>r.counted&&root.ResearchSnapshot.matches(r,data)),u=root.Mercado.report({...s,shareMetric:'units'}),v=root.Mercado.report({...s,shareMetric:'revenue'}),native=s.shareMetric==='units'?u:v;
  const band=r=>{if(!root.ResearchSnapshot.priceEligible(r))return '价位待归类';const i=native.cuts.findIndex(x=>r.selling_price<x);return i<0?'>= '+native.cuts.at(-1):(i?native.cuts[i-1]:0)+' – < '+native.cuts[i];};
  const facts=scope.map(r=>({id:r.product_code,ids:[r.product_code],brand:r.brandGroup||r.brand_label||'未识别品牌',units:root.ResearchSnapshot.eligible(r,data,'orders_last_30_days')?r.orders_last_30_days:null,revenue:root.ResearchSnapshot.eligible(r,data,'revenue_last_30_days')?r.revenue_last_30_days:null,price:root.ResearchSnapshot.priceEligible(r)?r.selling_price:null,band:band(r),feature:feature(r,s.category),models:r.model?[r.modelGroup||r.model]:[],date:r.sourceDate,source:r.detail_link,model:r.model||null,unit:'listing_snapshot'}));
  const ownProducts=products.filter(r=>own(r.brandGroup||r.brand_label)),exact=ownProducts.filter(r=>new RegExp('\\b'+s.own.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test([r.model,r.product_name].join(' '))),allQuotes=exact.filter(root.ResearchSnapshot.priceEligible).map(r=>({value:r.selling_price,date:r.sourceDate,kind:'档案标价',id:r.product_code,source:r.detail_link})),quoteDate=allQuotes.map(p=>p.date).sort().at(-1),quotes=allQuotes.filter(p=>p.date===quoteDate),ownPrice=median(quotes.map(p=>p.value)),peerPrices=products.filter(r=>!own(r.brandGroup||r.brand_label)&&r.sourceDate===quoteDate&&root.ResearchSnapshot.priceEligible(r)).map(r=>r.selling_price),position=ownPrice===null?null:{count:peerPrices.length,lower:peerPrices.filter(v=>v<ownPrice).length,higher:peerPrices.filter(v=>v>ownPrice).length,same:peerPrices.filter(v=>v===ownPrice).length,date:quoteDate,label:'同日同形态档案标价参照；配置、套装待核'};
  return finish({scope:s,sourceKind:'snapshot',period:'近30天滚动估算 · 快照 '+(data.researchSnapshot||data.asOf),date:data.researchSnapshot||data.asOf,products:products.length,history:products.filter(r=>data.trends[r.product_code]?.monthly_order_series?.length).length,units:metric(u,'units'),revenue:metric(v,'revenue'),facts,position,ownQuotes:quotes,ownProducts:ownProducts.length,priceNote:'所选SKU标题匹配；地区版本与套装待核，不据此判断价格优势。',trend:{eligible:false,reason:'滚动窗口起止日未提供；单品历史缺少逐月日覆盖，不合成为自然月市场增长。',points:[],change:null,count:0}});
 }
 function amazon(s,c){
  const h=root.REVIEW_DATA.history,u=root.SampleSalesShares.report(h,{...s,shareMetric:'units'}),v=root.SampleSalesShares.report(h,{...s,shareMetric:'revenue'}),native=s.shareMetric==='units'?u:v,products=c?root.MarketWorkbench.rows(c,root.MarketIntelligence.cleanScope(s)):[],byId=new Map(products.map(r=>[r.productId,r]));
  const facts=native.facts.map(f=>{const rs=f.asins.map(id=>byId.get(id)).filter(Boolean),evidence=rs.map(r=>r.historicalResearch?.[f.month]),supported=rs.length===f.asins.length&&evidence.every(x=>x?.verified===true&&x.source&&x.month===f.month),labels=supported?[...new Set(evidence.map(x=>x.configuration).filter(Boolean))]:[];return {...f,ids:f.asins,band:f.priceBand,feature:labels.length===1?labels[0]:'历史配置待核',models:supported?evidence.map(x=>x.modelGroup).filter(Boolean):[],date:f.sourceDates.join(' / '),source:f.sources.join('；'),unit:'family_month'};});
  const o=c?root.MarketWorkbench.own(c,s):null,p=o?.quote,quotes=p&&o?.record&&!o.referenceOnly?[{value:p.value,date:p.date,kind:p.kind,id:o.record.productId,source:o.record.sourceUrl}]:[];
  const trend=cohort(native.facts,native.months,native.metric),diffs=o?.record&&!o.referenceOnly?products.filter(r=>!root.LocalProductContext.isOwn(r)&&r.competitionGroup==='direct').map(r=>root.LocalProductContext.difference(o.record,r,s)).filter(Boolean):[],position=quotes.length?{count:diffs.length,lower:diffs.filter(d=>d.value<0).length,higher:diffs.filter(d=>d.value>0).length,same:diffs.filter(d=>d.value===0).length,date:p.date,label:'同类型、渠道、日期、币种和价格性质；功能版本仍逐件核对'}:null;
  const ownEvidence=ownCoverage(products,h.rows,s,native.months,metric(u,'units'),metric(v,'revenue'));
  return finish({scope:s,sourceKind:'monthly',period:native.months.length?native.bounds.start+'—'+native.bounds.end+' · Amazon合格跟踪样本':'所选归档 · 商品资料，暂无自然月统计',date:native.selected.flatMap(f=>f.sourceDates).sort().at(-1)||null,products:c?c.observed.length:native.stats.sourceProducts,history:native.eligibleProducts,units:metric(u,'units'),revenue:metric(v,'revenue'),facts,position,ownQuotes:quotes,ownProducts:ownEvidence.listings,ownEvidence,ownPriceStatus:o?.listings.length?'所选期间和价格口径缺少可比报价':'当前库未匹配所选型号的当地Listing',priceNote:o?.status||'当地版本与报价待核；不使用内部目标价。',trend});
 }
 function ownCoverage(products,history,s,months,units,revenue){
  const listings=products.filter(r=>r.platform==='amazon'&&own(r.brand)),rows=history.filter(r=>r.country===s.country&&r.category===s.category&&(r.platform||'amazon')==='amazon'&&r.currency===currency(s.country)&&months.includes(r.month)&&own(r.brand));
  const observations=listings.flatMap(r=>(r.capturedHistory||[]).filter(h=>months.includes(h.month))),hasSignal=rows.concat(observations).some(r=>['parentSales','parentSalesAmount','sourceParentSales','sourceParentSalesAmount','parentUnitSales','parentSalesRevenue'].some(k=>valid(r[k])));
  const reason=m=>m.share!==null?null:!months.length?'请先选择自然月区间':m.own!==null?'样本分母为0，无法计算份额':!listings.length&&!rows.length?'商品库尚未覆盖UWANT':hasSignal?'月度销量归属待核':'尚缺UWANT月度销量';
  return {listings:new Set(listings.map(r=>r.productId)).size,historyRows:rows.length,sourceMonths:new Set(rows.concat(observations).map(r=>r.month)).size,hasSignal,unitsReason:reason(units),revenueReason:reason(revenue),summary:reason(units)||reason(revenue)||'已有合格月度样本',note:!listings.length&&!rows.length?'仅说明当前采集范围，不代表UWANT未在当地销售。':hasSignal?'来源销量尚未通过历史父体归属核验，继续隔离。':'已收录UWANT商品资料，商品数量不能替代月度销量。'};
 }
 function finish(r){const kind=r.scope.shareMetric==='units'?'units':'revenue',m=r[kind];return {...r,kind,metric:m,currency:currency(r.scope.country),cells:cells(r.facts,kind),ownPrice:median(r.ownQuotes.map(p=>p.value)),status:r.trend.eligible?'可比较固定样本':m.total>0?'可看样本结构':r.products?'可看商品资料':'资料不足'};}
 function report(s,c){if(s.platform==='ml')return ml(s);if(s.platform==='amazon'||s.platform==='all')return amazon(s,c);return finish({scope:s,sourceKind:'catalogue',period:'商品资料 · 日期逐条保留',date:null,products:c?.observed.length||0,history:0,units:metric({},'units'),revenue:metric({},'revenue'),facts:[],ownQuotes:[],ownProducts:0,priceNote:'该渠道没有可比月度销售事实。',trend:{eligible:false,reason:'该渠道没有可比月度销售事实。',points:[],change:null,count:0}});}
 function quickMatch(r,s){const q=s.marketQuick||'all';if(q==='identified')return r.product_code?!!r.model:!!(r.modelIdentity?.status==='confirmed'||r.titleModelCandidate);if(q==='direct')return !r.product_code&&['direct','own'].includes(r.competitionGroup);if(q!=='sameprice')return true;const p=r.product_code?{value:r.selling_price,date:r.sourceDate,kind:'档案标价',currency:r.currency}:root.ProductEvidence.price(r,s);return !!p&&p.currency===s.marketQuickCurrency&&p.date===s.marketQuickDate&&p.kind===s.marketQuickKind&&valid(p.value)&&p.value>=Number(s.evidenceMin)&&p.value<=Number(s.evidenceMax);}
 function exportRows(r,group){const facts=group?group.facts:r.facts.filter(f=>valid(f[r.kind]));return [['country','platform','category','period','metric','denominator','statisticalUnit','id','listingIds','brand','modelGroups','priceBand','configurationClaim','value','unitsEligibleEstimate','revenueEligibleEstimate','sourceDate','source','scope'],...facts.map(f=>[r.scope.country,r.scope.platform,r.scope.category,r.period,r.kind,r.metric.total,f.unit,f.id,JSON.stringify(f.ids),f.brand,JSON.stringify(f.models),f.band,f.feature,f[r.kind],f.units,f.revenue,f.date,f.source,'third_party_qualified_sample_not_full_market'])];}
 const api={metric,cohort,cells,feature,report,quickMatch,exportRows,own,ownCoverage,median};root.MarketDecisionModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
