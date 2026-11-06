/* Qualified monthly family facts. No category aggregates, current quotes or purchase badges. */
(function(root){
 const Q=root.ResearchQuality,R=root.MonthlyRange,H=root.HistoryMetrics;
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const currencies={CA:'CAD',MX:'MXN',US:'USD',BR:'BRL'};
 const UNKNOWN_BRAND='未识别品牌',UNKNOWN_PRICE='价位待归类';
 const asin=r=>r.asin||r.product_id||r.productId||'',parent=r=>r.parentAsin||r.parent_id||'';
 const platform=r=>{const raw=String(r.platform||r.marketplace||'').toLowerCase();return ['amazon','amazon.ca','amazon.com','amazon.com.mx','amazon.com.br','ca','mx','us','br'].includes(raw)?'amazon':raw||'unknown';};
 const key=r=>[r.country,platform(r),r.currency,r.month,parent(r)].join('|');
 const eligibleFlag=(r,metric)=>r.fieldEvidence?.[metric]!==false&&r.metricEligibility?.[metric]!==false&&r.metricEligibility?.[metric]?.eligible!==false;
 const admissible=r=>!['candidate','quarantined_estimate','model_reference'].includes(r.dataNature)&&r.origin!=='candidate'&&!r.quarantinedHistory&&asin(r)!=='B0DGRZFHQ6';
 function boundaries(s){
  const currency=currencies[s.country],step={MX:1000,CA:100,US:100,BR:500}[s.country]||100;
  const defaults=Array.from({length:11},(_,i)=>i*step),[code,raw]=String(s.shareBands||'').split(':');
  if(code!==currency||!raw)return {edges:defaults,custom:false,currency};
  const values=raw.split(',').map(Number),valid=values.length>=2&&values.length<=31&&values[0]===0&&values.every((x,i)=>finite(x)&&(!i||x>values[i-1]));
  return {edges:valid?values:defaults,custom:valid,currency,invalid:!valid};
 }
 function bandIndex(value,edges){if(!finite(value))return null;for(let i=edges.length-1;i>=0;i--)if(value>=edges[i])return i;return null;}
 function bandLabel(i,edges){const f=v=>v.toLocaleString('zh-CN',{maximumFractionDigits:2});return i===edges.length-1?f(edges[i])+'及以上':Number.isInteger(edges[i])&&Number.isInteger(edges[i+1])?f(edges[i])+'–'+f(edges[i+1]-1):f(edges[i])+'–<'+f(edges[i+1]);}
 function report(history,s){
  const currency=currencies[s.country],bounds=R.bounds(s),bands=boundaries(s),months=R.months(s);
  const all=(history?.rows||[]).filter(r=>r.country===s.country&&r.currency===currency&&r.month>=bounds.start&&r.month<=bounds.end&&months.includes(r.month)&&platform(r)==='amazon');
  const scoped=all.filter(r=>r.category===s.category&&Q.matchesType(r,s.productType)),empty=!['amazon','all'].includes(s.platform)||!months.length;
  const groups=new Map();for(const r of all){if(!parent(r)||r.parentBasis!=='历史父体变更记录')continue;const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  const stats={sourceRows:empty?0:scoped.length,sourceProducts:empty?0:new Set(scoped.map(asin)).size,conflicts:[],excludedCategory:0,excludedType:0};
  const allowed={};for(const metric of ['units','revenue']){
   const field=metric==='units'?'parentSales':'parentSalesAmount';
   const eligible=all.filter(r=>admissible(r)&&eligibleFlag(r,metric));
   allowed[metric]=new Set(Q.metricRows(eligible,metric,{universe:eligible}).map(key));
   // Reconcile overlapping source versions as well as ASIN variants. The existing engine
   // checks conflicts within its source scope; these charts also share a cross-source key.
   for(const [k,members] of groups){const values=members.filter(r=>eligible.includes(r)&&finite(r[field])).map(r=>r[field]);if(new Set(values).size>1){allowed[metric].delete(k);stats.conflicts.push({key:k,metric,reason:'同父体月份来源值冲突',values:[...new Set(values)]});}}
  }
  const facts=[];
  if(!empty)for(const [id,members] of groups){
   if(!members.some(r=>r.category===s.category))continue;
   if(new Set(members.map(r=>r.category)).size!==1){stats.excludedCategory++;continue;}
   if(s.productType&&s.productType!=='all'&&!members.every(r=>Q.matchesType(r,s.productType))){stats.excludedType++;continue;}
   const usable=members.filter(admissible),r=usable[0];if(!r)continue;
   const units=allowed.units.has(id)?usable.find(x=>finite(x.parentSales)&&eligibleFlag(x,'units'))?.parentSales??null:null;
   const revenue=allowed.revenue.has(id)?usable.find(x=>finite(x.parentSalesAmount)&&eligibleFlag(x,'revenue'))?.parentSalesAmount??null:null;
   if(units===null&&revenue===null)continue;
   const brandValues=members.map(x=>x.brandConflict?null:H.brandName(x.brand)),brandSet=new Set(brandValues);
   const brand=brandSet.size===1&&brandValues[0]&&!/待核|unknown|^generic$|^gen[eé]rico$/i.test(brandValues[0])?brandValues[0]:UNKNOWN_BRAND;
   const byAsin=new Map();for(const x of members){if(!byAsin.has(asin(x)))byAsin.set(asin(x),[]);byAsin.get(asin(x)).push(x);}
   const prices=[],priceIssues=[];
   for(const [a,rs] of byAsin){const vals=[...new Set(rs.filter(x=>finite(x.price)&&x.fieldEvidence?.price!==false).map(x=>x.price))];if(vals.length!==1)priceIssues.push(a+(vals.length?'：同月价格冲突':'：月度价格缺失'));else prices.push(vals[0]);}
   const indexes=new Set(prices.map(p=>bandIndex(p,bands.edges)));
   if(indexes.size>1)priceIssues.push('同父体商品分属不同价位段，不分摊父体金额');
   const index=!priceIssues.length&&indexes.size===1?[...indexes][0]:null;
   facts.push({id,country:s.country,platform:'amazon',category:s.category,currency,month:r.month,parentAsin:parent(r),asins:[...byAsin.keys()].sort(),brand,brandReason:brand===UNKNOWN_BRAND?'品牌缺失、待核或同父体跨品牌':'历史记录品牌一致',units,revenue,priceIndex:index,priceBand:index===null?UNKNOWN_PRICE:bandLabel(index,bands.edges),prices,priceReason:priceIssues.join('；')||'按月度期末价分档，非成交均价；区间左闭右开',priceKind:'month_end',sources:[...new Set(members.map(x=>x.source||'SellerSprite月度历史'))],sourceDates:[...new Set(members.map(x=>x.retrievedAt||'').filter(Boolean))].sort(),open:members.some(x=>/未结/.test(x.monthState||'')||x.retrievedAt?.slice(0,7)===x.month),evidence:members.map(x=>({asin:asin(x),month:x.month,parentAsin:parent(x),parentBasis:x.parentBasis,source:x.source,sourceDate:x.retrievedAt,price:finite(x.price)?x.price:null,dataset:x.dataset||x.origin||'monthly'}))});
  }
  const metric=s.shareMetric==='units'?'units':'revenue',selected=facts.filter(f=>f[metric]!==null),total=selected.length?selected.reduce((n,f)=>n+f[metric],0):null;
  function aggregate(dimension){const map=new Map();for(const f of selected){const label=dimension==='brand'?f.brand:f.priceBand,k=dimension==='brand'?label:f.priceIndex===null?'unknown':String(f.priceIndex);if(!map.has(k))map.set(k,{key:k,label,value:0,units:null,revenue:null,facts:[],asins:new Set(),parents:new Set()});const g=map.get(k);g.value+=f[metric];g.facts.push(f.id);f.asins.forEach(x=>g.asins.add(x));g.parents.add(f.parentAsin);if(f.units!==null)g.units=(g.units??0)+f.units;if(f.revenue!==null)g.revenue=(g.revenue??0)+f.revenue;}
   return [...map.values()].map(g=>({...g,share:total>0?g.value/total:null,asins:[...g.asins],parents:[...g.parents],unitsCount:selected.filter(f=>g.facts.includes(f.id)&&f.units!==null).length,revenueCount:selected.filter(f=>g.facts.includes(f.id)&&f.revenue!==null).length})).sort(dimension==='brand'?(a,b)=>b.value-a.value||a.label.localeCompare(b.label):(a,b)=>a.key==='unknown'?1:b.key==='unknown'?-1:Number(a.key)-Number(b.key));}
  const brands=aggregate('brand'),prices=aggregate('price'),named=brands.filter(g=>g.label!==UNKNOWN_BRAND),visible=named.slice(0,6),unknown=brands.find(g=>g.label===UNKNOWN_BRAND);if(unknown)visible.push(unknown);
  if(named.length>6){const rest=named.slice(6);visible.push({key:'__other__',label:'其他',value:rest.reduce((n,g)=>n+g.value,0),share:total>0?rest.reduce((n,g)=>n+g.value,0)/total:null,facts:rest.flatMap(g=>g.facts),asins:[...new Set(rest.flatMap(g=>g.asins))],parents:[...new Set(rest.flatMap(g=>g.parents))],units:rest.some(g=>g.units!==null)?rest.reduce((n,g)=>n+(g.units??0),0):null});}
  return {bounds,months,bands,currency,metric,facts,selected,total,brands,prices,visibleBrands:visible,stats,parents:new Set(selected.map(f=>f.parentAsin)).size,coveredMonths:new Set(selected.map(f=>f.month)).size,eligibleProducts:new Set(selected.flatMap(f=>f.asins)).size,unitsFacts:facts.filter(f=>f.units!==null).length,revenueFacts:facts.filter(f=>f.revenue!==null).length};
 }
 function drill(report,selection){if(!selection)return [];const split=selection.indexOf('|'),dimension=selection.slice(0,split),key=selection.slice(split+1),group=(dimension==='brand'?report.visibleBrands:report.prices).find(g=>g.key===key);return group?report.selected.filter(f=>group.facts.includes(f.id)):[];}
 function exportRows(report,s){const header=['recordType','country','platform','category','rangeStart','rangeEnd','metric','currency','denominator','group','share','value','month','parentAsin','asins','unitsEstimate','revenueEstimate','priceBand','monthEndPrices','priceKind','source','sourceDates','eligibility','limitations','evidence'];
  const common=[s.country,'amazon',s.category,report.bounds.start,report.bounds.end,report.metric,report.currency,report.total??''];const rows=[];
  for(const [dim,groups] of [['brand',report.visibleBrands],['price',report.prices]])for(const g of groups)rows.push([dim,...common,g.label,g.share??'',g.value,'','',JSON.stringify(g.asins),g.units??'',g.revenue??'',dim==='price'?g.label:'','','month_end','SellerSprite月度历史','','qualified_deduplicated_family_month','样本内占比；非市场份额；按月度期末价分档；金额来自原始月度字段','']);
  for(const f of report.selected)rows.push(['fact',...common,f.brand,report.total>0?f[report.metric]/report.total:'',f[report.metric],f.month,f.parentAsin,JSON.stringify(f.asins),f.units??'',f.revenue??'',f.priceBand,JSON.stringify(f.prices),f.priceKind,f.sources.join('；'),f.sourceDates.join('；'),'qualified_deduplicated_family_month',[f.brandReason,f.priceReason,f.open?'采集时未结月':''].filter(Boolean).join('；'),JSON.stringify(f.evidence)]);
  return [[...header,'unitsEligible','revenueEligible','statisticalUnit','selectedPlatform','productTypeFilter'],...rows.map(row=>[...row,row[0]==='fact'?row[15]!=='':'',row[0]==='fact'?row[16]!=='':'',row[0]==='fact'?'family_month':'sample_aggregation',s.platform,s.productType||'all'])];
 }
 root.SampleSalesShares={report,boundaries,bandIndex,bandLabel,drill,exportRows,UNKNOWN_BRAND,UNKNOWN_PRICE};
})(window);
