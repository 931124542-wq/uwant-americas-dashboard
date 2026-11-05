/* Additive catalog adapter. Never writes to history or changes HistoryMetrics. */
(function(root){
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 function mergeHistory(original,capture=root.UWANT_PRIVATE_CAPTURE){
  if(capture?.access!=='personal_local_only'||!capture.formalMonthlyRows)return original;
  const key=r=>[r.country,r.asin,r.month].join('|'),seen=new Set(original.rows.map(key)),duplicates=[],rows=[...original.rows];
  for(const r of [...capture.formalMonthlyRows,...(capture.priceMonthlyRows||[])]){if((capture.priceMonthlyRows||[]).includes(r)&&(r.parentSales!==null||r.parentSalesAmount!==null||r.parentAsin!==null||r.fieldEvidence?.units!==false||r.fieldEvidence?.revenue!==false))throw new Error('独立价格历史不得携带可合计销量或父体归属');if(!['CA','MX'].includes(r.country)||r.platform!=='amazon'||r.currency!==({CA:'CAD',MX:'MXN'})[r.country]||r.asin==='B0DGRZFHQ6'||!/^2026-(0[1-9]|10)$/.test(r.month))throw new Error('本地月度数据的国家、渠道、币种或保护规则不匹配');if(seen.has(key(r))){duplicates.push(key(r));continue;}seen.add(key(r));rows.push({...r});}
  return {...original,rows,asOf:rows.reduce((date,r)=>String(r.retrievedAt||'').slice(0,10)>date?String(r.retrievedAt).slice(0,10):date,original.asOf),overlayReview:{added:rows.length-original.rows.length,duplicates}};
 }
 function integrate(base,{scope,data,Q}){
  // Explicit personal-preview injection only. No private response is bundled into public assets.
  const capture=root.UWANT_PRIVATE_CAPTURE;
  if(capture?.access==='personal_local_only'&&data){const byId=new Map(data.listings.map(r=>[r.country+':'+r.productId,r]));for(const r of capture.listings||[])if(r.productId!=='B0DGRZFHQ6')byId.set(r.country+':'+r.productId,r);data={...data,listings:[...byId.values()]};}
  if(!data||!data.scope.countries.includes(scope.country.toLowerCase())||!['amazon','all'].includes(scope.platform))return {...base,scope:{...scope}};
  const country=scope.country.toLowerCase(),source=data.listings.filter(r=>r.country===country&&r.category===scope.category&&(!scope.productType||scope.productType==='all'||(scope.productType==='portable'?['portable','steam'].includes(r.productType):r.productType===scope.productType)));
  const observed=[...base.observed],candidates=[...base.candidates];
  for(const item of source){
   const same=r=>r.country===country&&r.platform==='amazon'&&r.productId===item.productId;
   const history=observed.find(r=>same(r)&&r.origin==='history_profile'),pending=candidates.find(same),prior=observed.find(same);
   const pilot=pending?.quarantinedHistory||prior?.quarantinedHistory;
   if(prior&&item.identityStatus!=='current_listing_confirmed'&&!item.captureAccess&&!pilot){const index=observed.indexOf(prior);observed[index]={...prior,modelKey:item.modelKey,versionId:item.versionId,imageUrl:prior.imageUrl||item.imageUrl,evidenceReferences:[...prior.evidenceReferences,...item.evidenceReferences]};continue;}
   const candidate=item.dataNature==='candidate'||item.quarantineRequired||!!pilot;
   const merged={...item,id:pending?.id||prior?.id||item.id,sourceDate:item.sourceDate,period:null,origin:'amazon_research',dataNature:pilot?'quarantined_estimate':candidate?'candidate':'observation',currency:item.currency||item.expectedCurrency,price:finite(item.price)?item.price:null,modelStatus:item.modelStatus||'partial',quality:Q.quality({...item,price:finite(item.price)?item.price:null},{candidate,pilot}),quarantinedHistory:pilot||null,features:item.claims.map(c=>c.label+'：'+c.value),historicalObservation:history?{price:history.price,currency:history.currency,period:history.period,kind:history.priceKind,quality:history.quality,productId:history.productId}:null,evidenceReferences:[...item.evidenceReferences,...(prior?.evidenceReferences||[]),...(pending?.evidenceReferences||[])],unresolvedIssues:[...new Set([...item.unresolvedIssues,...(pending?.quarantinedHistory?.unresolvedIssues||[]).map(x=>'此前试采复核：'+x)])],relatedSkus:scope.category==='wash'?['D600','D800']:scope.category==='vacuum'?['V500','V600']:scope.category==='fabric'&&['portable','steam'].includes(item.productType)?['Y100S','Y200S']:scope.category==='mattress'?['M600','M700']:[]};
   // A newer profile without a model does not erase an existing, evidenced model.
   if(!item.model&&prior?.model&&prior.modelStatus?.startsWith('confirmed')&&!candidate){merged.model=prior.model;merged.modelStatus=prior.modelStatus;merged.modelKey=prior.modelKey;merged.versionId=prior.versionId;}
   if(prior?.identityStatus==='current_listing_confirmed'&&!candidate)merged.identityStatus=prior.identityStatus;
   merged.claims=[...(prior?.claims||[]),...(item.claims||[])];
   merged.sourceObservations=[...(prior?.sourceObservations||[]),...(item.sourceObservations||[])];
   // Current identity does not release a quarantine or assign parent totals.
   if(pilot){merged.quality={...merged.quality,identityStatus:item.identityStatus,parentStatus:'ambiguous_same_day'};}
   else if(item.stage4History?.length)merged.quality={...merged.quality,parentStatus:'per_month_reviewed'};
   for(const arr of [observed,candidates])for(let i=arr.length-1;i>=0;i--)if(same(arr[i]))arr.splice(i,1);
   (candidate?candidates:observed).push(merged);
  }
  const models=rows=>new Set(rows.filter(r=>r.modelKey).map(r=>r.modelKey)).size;
  return {...base,observed,candidates,metricSourceRows:base.metricSourceRows||base.observed.filter(r=>r.originalRow).map(r=>r.originalRow),ownMappings:(capture?.ownMappings||[]).filter(r=>r.country===country&&r.category===scope.category),scope:{...scope},researchScope:'amazon_dual_market',modelCounts:{observed:models(observed),candidates:models(candidates)},anchors:data.anchors?.filter(r=>r.country===country&&r.category===scope.category)||[],sourceAsOf:data.asOf};
 }
 function filter(rows,s){return rows.filter(r=>(!s.evidenceRelation||relation(r,s.evidenceSku||({wash:'D800',vacuum:'V500',fabric:'Y100S',mattress:'M600'})[r.category])===s.evidenceRelation)&&(!s.evidenceSeller||r.sellerType===s.evidenceSeller)&&(!s.evidenceStatus||s.evidenceStatus==='image'&&!!r.imageUrl||s.evidenceStatus==='identity'&&r.identityStatus==='current_listing_confirmed'||s.evidenceStatus==='params'&&r.claims?.length>0||s.evidenceStatus==='quarantine'&&!!r.quarantinedHistory)&&(!s.evidenceParameter||r.claims?.some(x=>x.key===s.evidenceParameter))&&(!s.evidenceSku||r.relatedSkus?.includes(s.evidenceSku)||r.category===({D:'wash',V:'vacuum',Y:'fabric',M:'mattress'})[s.evidenceSku[0]]&&!(r.category==='fabric'&&['upright','bucket','spray'].includes(r.productType))));}
 function quote(r,basis='current'){
  if(basis==='history'){const h=r.historicalObservation;return h&&finite(h.price)?{value:h.price,currency:h.currency,date:h.period,kind:h.kind}:r.origin==='history_profile'&&finite(r.price)?{value:r.price,currency:r.currency,date:r.period,kind:r.priceKind}:null;}
  return ['observation','public'].includes(r.dataNature)||r.origin==='public'?finite(r.price)&&r.sourceDate?{value:r.price,currency:r.currency,date:r.sourceDate,kind:r.priceKind}:null:null;
 }
 function priceFilter(rows,s){if(!s.evidenceMin&&!s.evidenceMax)return rows;return rows.filter(r=>{const p=analysisPrice(r,s);return p&&(!s.evidenceMin||p.value>=Number(s.evidenceMin))&&(!s.evidenceMax||p.value<=Number(s.evidenceMax));});}
 function exportRows(rows,Q,s={}){const basic=Q.exportRows(rows),extra=['modelKey','versionId','versionStatus','modelStatus','sellerType','soldBy','imageUrl','imageEvidence','claims','historicalObservation','relatedListings','captureAccess','sourceUpdatedAt','currencyBasis','capturedHistory','capturedTrends','capturedTrendsSource','stage4History','historicalParentEvents','skuMappingStatus'];const selected=['selectedPrice','selectedCurrency','selectedPriceKind','selectedPriceDate','selectedPriceSourceDate','selectedPriceRecordId'];return [[...basic[0],...extra,...selected],...rows.map((r,i)=>{const p=analysisPrice(r,s);return [...basic[i+1],...extra.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]??''),p?.value??'',p?.currency||'',p?.kind||'',p?.date||'',p?.sourceDate||'',p?.recordId||''];})];}
 function analysisPrice(r,s){return (typeof module!=='undefined'?require('./product-evidence.js'):root.ProductEvidence).price(r,s);}
 function canBenchmarkPrice(own,s){const q=own?.quoteEvidence;if(!finite(own?.price)||!q||!/^\d{4}-\d{2}-\d{2}$/.test(q.sourceDate||'')||q.sourceDate.slice(0,7)!==s.dataset||q.country!==s.country||q.platform!==s.platform||q.currency!==({CA:'CAD',MX:'MXN',US:'USD',BR:'BRL'})[s.country]||q.period!==s.dataset||q.kind!=='month_end'||!q.sourceDate)return false;try{return new URL(q.sourceUrl).hostname===({CA:'www.amazon.ca',MX:'www.amazon.com.mx',US:'www.amazon.com',BR:'www.amazon.com.br'})[s.country];}catch{return false;}}
 function relation(r,sku){const category=({D:'wash',V:'vacuum',Y:'fabric',M:'mattress'})[String(sku||'')[0]];if(!category)return 'unscoped';const C=typeof module!=='undefined'?require('./research-context.js'):root.ResearchContext,group=C.relation(r,sku,category,{});return group==='pending'?'configuration_pending':group;}

 function brandSummary(c,s,rows,Q){s={...c.scope,...s};
  const unique=[...new Map(rows.filter(r=>r.role!=='own_identity').map(r=>[[r.country,r.platform,r.productId||r.id].join('|'),r])).values()],groups=new Map(),universe=c.metricSourceRows||[],own=c.ownMappings?.find(x=>x.sku===s.evidenceSku)||c.ownMappings?.[0],sku=s.evidenceSku||own?.sku||s.own||({wash:'D800',vacuum:'V500',fabric:'Y100S',mattress:'M600'})[c.scope?.category];
  for(const r of unique){const name=r.brand||'品牌待核';if(!groups.has(name))groups.set(name,{brand:name,ownBrand:/^uwant$/i.test(name),brandNamePending:name==='品牌待核'||/Formato:|ㅤ/i.test(name),rows:[],priceGroups:[],direct:0,adjacent:0,pending:0});const b=groups.get(name);b.rows.push(r);const rel=b.ownBrand?'unscoped':relation(r,sku);if(rel==='direct')b.direct++;else if(rel==='adjacent')b.adjacent++;else b.pending++;}
  for(const b of groups.values()){
   const ids=new Set(b.rows.map(r=>r.productId)),monthly=universe.filter(r=>ids.has(r.asin||r.product_id)),units=Q.metricRows(monthly,'units',{universe}),revenue=Q.metricRows(monthly,'revenue',{universe});
   b.monthlyListings=monthly.length;b.units=units.length?units.reduce((n,r)=>n+r.units,0):null;b.revenue=revenue.length?revenue.reduce((n,r)=>n+r.revenue,0):null;b.unitsCount=units.length;b.revenueCount=revenue.length;
   b.badgeListings=monthly.filter(r=>r.childSales!=null).length;
   const prices=new Map();for(const r of b.rows){const p=analysisPrice(r,s);if(!p)continue;const key=[r.country,r.platform,r.channel||'',p.kind,p.date,p.currency,p.productType].join('|');if(!prices.has(key))prices.set(key,{key,...p,rows:[]});prices.get(key).rows.push({record:r,value:p.value});}
   b.priceGroups=[...prices.values()].map(g=>({...g,min:Math.min(...g.rows.map(x=>x.value)),max:Math.max(...g.rows.map(x=>x.value))})).sort((a,b)=>b.rows.length-a.rows.length||b.date.localeCompare(a.date));
   b.claims=[...new Set(b.rows.flatMap(r=>(r.claims||[]).filter(x=>['autoempty','selfclean','steam','suction','runtime','cleanWater'].includes(x.key)).map(x=>(r.model||r.productId)+'：'+x.label+' '+x.value)))].slice(0,3);
  }
  return {brands:[...groups.values()].sort((a,b)=>b.rows.length-a.rows.length||a.brand.localeCompare(b.brand)),rows:unique,own,sku,universe};
 }
 function brandExportRows(c,s,rows,Q){const b=brandSummary(c,s,rows,Q);return [['country','platform','dataset','brand','brandRole','researchProducts','monthlyListings','directTypeOrConfiguration','adjacent','configurationPending','familyUnitsEstimate','eligibleFamilyUnits','metricPlatform','familyRevenueEstimate','eligibleRevenueUnits','purchaseBadgeListingsNotSales','priceGroups','dataNature'],...b.brands.map(x=>[c.scope.country,c.scope.platform,s.dataset,x.brand,x.ownBrand?'own_brand_sku_mapping_pending':'competitor_source_group',x.rows.length,x.monthlyListings,x.direct,x.adjacent,x.pending,x.units??'',x.unitsCount,x.monthlyListings?'amazon':'',x.revenue??'',x.revenueCount,x.badgeListings,JSON.stringify(x.priceGroups.map(g=>({date:g.date,platform:g.platform,kind:g.kind,currency:g.currency,type:g.productType,min:g.min,max:g.max,count:g.rows.length}))), 'brand_research_separate_metric_scopes'])];}
 const api={integrate,mergeHistory,filter,priceFilter,quote,exportRows,analysisPrice,canBenchmarkPrice,relation,brandSummary,brandExportRows};if(typeof module!=='undefined')module.exports=api;else root.AmazonResearch=api;
})(typeof window==='undefined'?globalThis:window);
