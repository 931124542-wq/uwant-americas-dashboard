/* Reconcile every supported market against source units; coverage is not accuracy certification. */
(function(root){
 const countries=['MX','CA','US','BR','AR','CL','CO'],categories=['wash','vacuum','fabric','mattress'];
 const mlCountry={MX:'MLM',BR:'MLB',AR:'MLA',CL:'MLC',CO:'MCO'};
 const ownSku={wash:'D600',vacuum:'V500',fabric:'Y100S',mattress:'M600'};
 const localNames={'liverpool.com.mx':'Liverpool México','bestbuy.ca':'Best Buy Canada','canadiantire.ca':'Canadian Tire'};
 const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 const positive=n=>finite(n)&&n>0;
 const distinct=values=>new Set(values.filter(Boolean)).size;
 const dated=value=>String(value??'').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
 const latest=values=>values.map(dated).filter(Boolean).sort().at(-1)||null;
 const brand=value=>value&&!/未知|待核|未识别|unbranded|unknown|generic|gen[eé]ric[oa]|sem marca/i.test(value)?value:null;
 const rangeScope=(scope,country,platform,category)=>({
  ...root.ResearchModel.defaults, country, platform, category, own:ownSku[category], shareMetric:'revenue',
  dataset:scope.dataset, startMonth:scope.startMonth||'', endMonth:scope.endMonth||'',
  competitionGroup:'all'
 });
 function meta(products,amz){
  return {
   listings:distinct(products.map(p=>p.product_code||p.productId)),
   brands:amz?distinct(products.map(p=>brand(p.brand))):distinct(products.map(root.Mercado.brandOf).filter(root.Mercado.knownBrand)),
   modelGroups:distinct(products.map(p=>amz?p.modelIdentity?.status==='confirmed'&&p.modelIdentity.groupKey:p.modelGroup)),
   modelsWithEvidence:distinct(products.filter(p=>amz?p.modelIdentity?.status==='confirmed'&&p.modelIdentity.basis!=='confirmed_in_current_title':p.modelEvidence?.verified===true).map(p=>p.product_code||p.productId)),
   images:products.filter(p=>/^https:\/\//i.test(p.picture_link||p.imageUrl||'')&&p.imageLinkValid!==false).length,
   verifiedSpecs:products.filter(p=>Object.values(p.claims||{}).some(v=>v?.sourceUrl&&(v.verified===true||v.verification==='verified'))).length,
   latestListingDate:latest(products.map(p=>p.latestSourceObservation?.sourceDate||p.sourceDate))
  };
 }
 function mlDetails(s,products,data){
  const h=root.MercadoHistory.selection(s,products,data);
  const extra=root.MercadoCoverageSummary.report(products,data);
  const logged=(data.coverage||[]).filter(q=>q.market===mlCountry[s.country]&&q.category===s.category);
  const incomplete=logged.filter(q=>!q.complete);
  return {...meta(products,false),
   catalogued:products.length,
   pricedListings:products.filter(root.ResearchSnapshot.priceEligible).length,
   historyListings:h.profiles.length, historyMonths:h.coverage.map(([month])=>month), historicalPriceListings:0,
   excluded:root.MarketIntegrity.exclusions(data.records,s).length,
   queryCount:logged.length, incompleteQueries:incomplete.length,
   unfetchedReportedPages:incomplete.reduce((sum,q)=>sum+Math.max(0,(q.expectedPages||0)-distinct(q.pageNumbers||[])),0),
   extraDate:extra.rows.length?extra.date:null, extraRecords:extra.rows.length, extraPositive:extra.positive,
   extraUnits:extra.units, extraRevenue:extra.revenue
  };
 }
 function amazonDetails(catalog,r){
  const products=catalog.observed.filter(p=>p.platform==='amazon');
  const facts=r.facts.filter(f=>finite(f.units)||finite(f.revenue));
  return {...meta(products,true), catalogued:products.length,
   pricedListings:products.filter(p=>positive(p.price)&&p.currency===r.currency&&dated(p.sourceDate)).length,
   historyListings:distinct(facts.flatMap(f=>f.ids)), historyMonths:[...new Set(facts.map(f=>f.month))].sort(),
   historicalPriceListings:distinct(facts.flatMap(f=>f.evidence.filter(e=>positive(e.price)).map(e=>e.asin))),
   excluded:0, queryCount:null, incompleteQueries:null, unfetchedReportedPages:null
  };
 }
 function localCatalogue(scope,makeCatalog){
  const rows=[];
  for(const country of countries)for(const category of categories){
   const s=rangeScope(scope,country,'all',category);
   const catalog=makeCatalog(s);
   const offers=[...catalog.observed,...(root.LOCAL_CHANNEL_PRODUCTS?.records||[])].filter(p=>
    ['bestbuy','official','retail'].includes(p.platform)&&p.country?.toUpperCase()===country&&p.category===category
   );
   const channels=new Map();
   for(const p of offers){
    const source=root.ResearchQuality.channelOf(p.sourceUrl);
    if(source.id==='unknown')continue;
    if(!channels.has(source.id))channels.set(source.id,{label:localNames[source.id]||p.channelLabel||source.label,products:new Map()});
    const url=new URL(p.sourceUrl);
    const key=url.pathname.replace(/\/$/,'')+url.search;
    const byUrl=channels.get(source.id).products;
    const prior=byUrl.get(key);
    if(!prior||(dated(p.sourceDate)||'')>(dated(prior.sourceDate)||''))byUrl.set(key,p);
   }
   rows.push({country,category,channels:[...channels.values()].map(({label,products})=>({
    label, listings:products.size, pricedListings:[...products.values()].filter(p=>positive(p.price)&&p.currency===root.MarketIntegrity.currencies[country]&&dated(p.sourceDate)).length,
    date:latest([...products.values()].map(p=>p.sourceDate))
   }))});
  }
  return rows;
 }
 function audit(scope,makeCatalog){
  const rows=[];
  for(const country of countries)for(const platform of ['amazon','ml'])for(const category of categories){
   const s=rangeScope(scope,country,platform,category);
   if(platform==='amazon')Object.assign(s,root.ResearchModel.normalizeMarketScope(s));
   const nativeCurrency=root.MarketIntegrity.currencies[country];
   const currency=root.MarketCurrency?.code(country,nativeCurrency)||nativeCurrency;
   const base={country,platform,category,currency,marketDenominator:null};
   if(!root.MarketIntegrity.applicable(country,platform)){rows.push({...base,applicable:false,products:null,units:null,revenue:null,period:null,issues:[],status:'not_applicable'});continue;}
   const catalog=platform==='amazon'?makeCatalog(s):null,r=root.MarketDecisionModel.report(s,catalog),issues=[];
   for(const kind of ['units','revenue']){const m=r[kind],sum=m.brands.reduce((n,b)=>n+b.value,0);if(m.total!==null&&(!finite(m.total)||Math.abs(sum-m.total)>.01))issues.push('brand_sum_'+kind);if(m.total===null&&m.count)issues.push('missing_total_'+kind);}
   if(r.currency!==base.currency)issues.push('currency');
   let details;
   if(platform==='ml'){
    const data=root.MERCADO_DATA,products=root.Mercado.rows(s),source=products.filter(p=>p.counted&&root.ResearchSnapshot.matches(p,data)),seen=new Set();
    for(const p of source){const key=p.statisticalKey||p.product_code;if(seen.has(key))issues.push('duplicate_statistical_key');seen.add(key);const invalid=root.MarketIntegrity.snapshotIssue(p,p.sourceDate||root.MERCADO_DATA.asOf);if(invalid)issues.push(invalid);}
    for(const [metric,field]of [['units','orders_last_30_days'],['revenue','revenue_last_30_days']]){
     const amounts=source.filter(p=>finite(p[field])&&!root.MarketIntegrity.snapshotIssue(p,p.sourceDate||data.asOf))
      .map(p=>metric==='revenue'&&root.MarketCurrency?root.MarketCurrency.amount(p[field],p.country,p.currency,p.sourceDate):p[field])
      .filter(finite);
     const sum=amounts.length?amounts.reduce((n,value)=>n+value,0):null;
     if((sum===null)!==(r[metric].total===null)||sum!==null&&Math.abs(sum-r[metric].total)>.01)issues.push('source_sum_'+metric);
    }
    details=mlDetails(s,products,data);
   }else{
    const seen=new Set();for(const f of r.facts){if(seen.has(f.id))issues.push('duplicate_family_month');seen.add(f.id);if(f.country!==country||f.category!==category||f.currency!==nativeCurrency||f.platform!=='amazon')issues.push('fact_scope');}
    details=amazonDetails(catalog,r);
   }
   const original=root.MarketSummary.snapshot(s),provider=root.MarketSourceData?.report(s),categoryReport=provider?{units:provider.units,revenue:provider.revenue,periodStart:provider.range.start,periodEnd:provider.range.end,currency:provider.source.currency}:original?{units:original.stat.totalSales??null,revenue:original.stat.totalRevenue??null,periodStart:original.start,periodEnd:original.end,currency:original.stat.currency}:null;
   rows.push({...base,applicable:true,categoryReport,products:details.catalogued,units:r.units.total,revenue:r.revenue.total,unitRecords:r.units.count,revenueRecords:r.revenue.count,
    positiveUnitRecords:r.facts.filter(f=>f.units>0).length,positiveRevenueRecords:r.facts.filter(f=>f.revenue>0).length,
    details,period:r.period,sourceDate:r.date,issues:[...new Set(issues)],status:issues.length?'calculation_error':r.units.total===null||r.revenue.total===null?'missing_sales':'sample_available'});
  }
  const supported=rows.filter(r=>r.applicable),hasCategory=r=>r.categoryReport&&(finite(r.categoryReport.units)||finite(r.categoryReport.revenue));return {rows,supported:supported.length,available:supported.filter(r=>r.status==='sample_available').length,missing:supported.filter(r=>r.status==='missing_sales').length,categoryReports:supported.filter(hasCategory).length,missingWithCategoryReport:supported.filter(r=>r.status==='missing_sales'&&hasCategory(r)).length,salesEvidenceScopes:supported.filter(r=>r.status==='sample_available'||hasCategory(r)).length,errors:supported.filter(r=>r.issues.length).length,notApplicable:rows.length-supported.length};
 }
 function csv(r){
  const detailColumns=['listings','brands','modelGroups','modelsWithEvidence','pricedListings','images','verifiedSpecs','historyListings','historyMonths','historicalPriceListings','latestListingDate','excluded','queryCount','incompleteQueries','unfetchedReportedPages','extraDate','extraRecords','extraPositive','extraUnits','extraRevenue'];
  const header=['country','platform','category','applicable','products','sampleUnitsEstimate','sampleRevenueEstimate','currency','unitRecords','revenueRecords','samplePeriod','sourceDate','sampleStatus','calculationIssues','marketDenominator','originalCategoryUnits','originalCategoryRevenue','originalCategoryPeriodStart','originalCategoryPeriodEnd','positiveUnitRecords','positiveRevenueRecords',...detailColumns];
  return [header,...r.rows.map(x=>[
   x.country,x.platform,x.category,x.applicable,x.products,x.units,x.revenue,x.currency,x.unitRecords,x.revenueRecords,x.period,x.sourceDate,x.status,x.issues.join(';'),'unknown',
   x.categoryReport?.units,x.categoryReport?.revenue,x.categoryReport?.periodStart,x.categoryReport?.periodEnd,x.positiveUnitRecords,x.positiveRevenueRecords,
   ...detailColumns.map(key=>key==='historyMonths'?x.details?.historyMonths.join(' / '):x.details?.[key])
  ])];
 }
 function mount(s,download){
  const host=root.document?.querySelector('.research-data-admin');if(!host||host.querySelector('.market-validation'))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x);
  const panel=root.document.createElement('details');panel.className='panel market-validation';panel.innerHTML='<summary>全部市场的数据核对与缺口</summary><div data-validation-body></div>';host.append(panel);
  panel.addEventListener('toggle',()=>{
   if(!panel.open||panel.dataset.built)return;
   panel.dataset.built='true';
   const makeCatalog=scope=>root.decisionCatalog(scope);
   const r=audit(s,makeCatalog),labels={wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
   const local=localCatalogue(s,makeCatalog).filter(row=>row.channels.length);
   const status=x=>x.status==='not_applicable'?'不适用':x.status==='missing_sales'?((x.categoryReport?'有原类目报告 · ':'')+(x.platform==='ml'?'近30天样本待补':'商品月度样本待补')):x.status==='calculation_error'?x.issues.join('、'):'样本汇总已核对';
   const rows=r.rows.map(x=>{
    const d=x.details;
    const pages=d?.queryCount?d.incompleteQueries+' / '+d.queryCount+' 个查询未完成':(x.applicable?'无分页记录':'—');
    return '<tr><th>'+esc(x.country+' / '+(x.platform==='ml'?'Mercado Libre':'Amazon'))+'</th><td>'+labels[x.category]+'</td><td>'+esc(x.period||'不适用')+'</td><td>'+n(d?.listings)+'</td><td>'+n(x.positiveUnitRecords)+' / '+n(x.unitRecords)+'</td><td>'+n(x.units)+'</td><td>'+n(x.revenue)+' '+x.currency+'</td><td>'+n(d?.historyListings)+' / '+n(d?.historyMonths.length)+'</td><td>'+esc(pages)+'</td><td>'+esc(status(x))+'</td></tr>';
   });
   panel.querySelector('[data-validation-body]').innerHTML='<p>'+r.supported+'个适用范围中，'+r.available+'个有同类商品样本销量和销售额，'+r.missing+'个缺少商品月度样本。另有'+r.categoryReports+'个原类目报告，其中'+r.missingWithCategoryReport+'个仍有原类目大盘、仅缺商品月度样本。'+r.notApplicable+'个平台范围不适用。计算异常 '+r.errors+'项。</p><p>Amazon 销量记录按商品组与月份统计。Mercado Libre 按近30天数据的合格商品统计，单品月销量另列。样本缺少全市场分母。</p><button class="rq-button" data-validation-export>导出全部核对结果</button><div class="table-scroll"><table><thead><tr><th>国家 / 平台</th><th>品类</th><th>统计期间</th><th>商品链接</th><th>有销量 / 可统计</th><th>样本销量</th><th>样本销售额 / 本币</th><th>有历史链接 / 月份</th><th>检索分页</th><th>结果</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div><details class="market-local-coverage"><summary>线下零售和品牌官网 · '+local.length+'个国家品类有公开资料</summary><p>以下渠道提供商品或报价资料。销量和销售额数据待补。</p><ul>'+local.map(x=>'<li>'+x.country+' · '+labels[x.category]+' · '+x.channels.map(c=>esc(c.label)+'（'+c.listings+'条商品资料）').join('、')+'</li>').join('')+'</ul></details>';
   panel.querySelector('[data-validation-export]').onclick=()=>download(csv(r),'UWANT_all_market_validation.csv');
  });
  if(!['ml','all'].includes(s.platform))return;
  const excluded=root.MarketIntegrity.exclusions(root.MERCADO_DATA?.records||[],s);if(!excluded.length)return;
  const review=root.document.createElement('details');review.className='panel market-reviewed-exclusions';review.innerHTML='<summary>本范围已排除的配件 · '+excluded.length+'条</summary><p>原商品档案及数值保留在来源库；以下记录不进入热销商品、市场统计、份额及筛选导出。</p><div class="table-scroll"><table><thead><tr><th>来源商品</th><th>排除依据</th><th>原销量 / 原销售额</th><th>复核日期</th></tr></thead><tbody>'+excluded.map(({record:p,review:r})=>'<tr><td><a href="'+esc(p.detail_link)+'" target="_blank" rel="noopener">'+esc(p.product_code)+'</a></td><td>'+esc(r.reason)+'</td><td>'+n(p.orders_last_30_days)+' / '+n(p.revenue_last_30_days)+' '+esc(p.currency)+'</td><td>'+r.reviewedAt+'</td></tr>').join('')+'</tbody></table></div>';host.append(review);
 }
 const api={audit,csv,localCatalogue,mount};root.MarketValidation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
