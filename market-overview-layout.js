/* One overview shell for Amazon and Mercado Libre; source metrics stay independent. */
(function(root){
 const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),n=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x);
 const version='shared-market-2026-11-12';
 const topLimit=s=>[5,10,20].includes(Number(s.marketTop))?Number(s.marketTop):10;
 const metricName=kind=>kind==='units'?'销量':'销售额';
 const amazonDomains={MX:'amazon.com.mx',CA:'amazon.ca',US:'amazon.com',BR:'amazon.com.br'};
 const mercadoDomains={MX:'mercadolibre.com.mx',BR:'mercadolivre.com.br',AR:'mercadolibre.com.ar',
  CL:'mercadolibre.cl',CO:'mercadolibre.com.co'};
 function amazonProductUrl(country,asin){
  const domain=amazonDomains[String(country).toUpperCase()];
  return domain&&/^[A-Z0-9]{10}$/.test(asin||'')?'https://www.'+domain+'/dp/'+asin:null;
 }
 function mercadoProductUrl(product){
  const domain=mercadoDomains[product.country];
  if(!domain||!product.detail_link)return null;
  try{
   const url=new URL(product.detail_link);
   if(url.protocol!=='https:'||url.username||url.password||url.port||
      !(url.hostname===domain||url.hostname.endsWith('.'+domain)))return null;
   url.searchParams.delete('matt_tool');
   url.searchParams.delete('ua');
   return url.href;
  }catch{return null;}
 }
 function productName(row){
  const name=e(row.name||row.id);
  return row.productUrl?'<a class="market-product-link" href="'+e(row.productUrl)+
   '" target="_blank" rel="noopener noreferrer" title="在新标签页打开商品页">'+name+
   ' <span aria-hidden="true">↗</span></a>':name;
 }
 function shell(period,currency){return ['市场大盘','品牌与价格带','UWANT对标'].map((title,i)=>'<section class="market-block '+['market-hero','market-competition','market-next-card'][i]+'" data-overview-section="'+i+'"><div class="market-block-heading"><span>'+String(i+1).padStart(2,'0')+'</span><h2>'+title+'</h2>'+(i===0?'<span class="market-period-tag">'+e(period)+' · '+e(currency)+'</span>':i===1?'<button class="rq-button" data-overview-page="brands">全部品牌 →</button>':'<button class="rq-button" data-overview-page="competitors">竞品对比 →</button>')+'</div>'+(['<div data-overview-slot="category"></div><div data-overview-slot="kpis"></div><div data-overview-slot="reading"></div>','<div data-overview-slot="controls"></div><div data-overview-slot="charts"></div><div data-overview-slot="leaders"></div><details class="market-overview-references"><summary>统计说明与数据来源</summary><div data-overview-slot="references"></div></details>','<div data-overview-slot="own"></div>'][i])+'</section>').join('');}
 function rankedRows(rows,kind,limit,key=row=>row.id){
  const seen=new Set();
  return rows.filter(row=>row[kind]>0).sort((a,b)=>b[kind]-a[kind]||a.id.localeCompare(b.id)).filter(row=>{
   const id=key(row);
   if(seen.has(id))return false;
   seen.add(id);
   return true;
  }).slice(0,limit);
 }

 function mercadoProduct(product){
  return {id:product.product_code,modelKey:product.modelGroup||product.product_code,
   name:[product.brand_label,product.model||product.product_code].filter(Boolean).join(' · '),
   title:product.product_name,image:product.picture_link,productUrl:mercadoProductUrl(product)};
 }

 function rankMercado(items,kind,limit=10,data=root.MERCADO_DATA){
  const value=(product,field)=>root.ResearchSnapshot.eligible(product,data,field)?product[field]:null;
  const rows=items.map(product=>({...mercadoProduct(product),
   price:root.ResearchSnapshot.priceEligible(product)?product.selling_price:null,priceDate:product.sourceDate,
   units:value(product,'orders_last_30_days'),revenue:value(product,'revenue_last_30_days')}));
  return rankedRows(rows,kind,limit,row=>row.modelKey);
 }

 function rankMercadoMonths(sample,limit=10){
  const groups=new Map();
  for(const {groups:month} of sample.months)for(const {key,product,orders} of month){
   if(!groups.has(key))groups.set(key,{...mercadoProduct(product),units:0,revenue:null});
   groups.get(key).units+=orders;
  }
  return rankedRows([...groups.values()],'units',limit,row=>row.modelKey);
 }

 function rankAmazon(facts,profiles,kind,limit=10){
  const byId=new Map(profiles.map(profile=>[profile.productId,profile])),groups=new Map();
  for(const fact of facts){
   const id=fact.parentAsin;
   if(!groups.has(id))groups.set(id,{id,country:fact.country,brand:fact.brand,ids:new Set(),units:null,revenue:null,month:'',price:null});
   const group=groups.get(id);
   for(const asin of fact.ids||fact.asins||[])group.ids.add(asin);
   for(const key of ['units','revenue'])if(Number.isFinite(fact[key]))group[key]=(group[key]??0)+fact[key];
   if(fact.month>=group.month){
    group.month=fact.month;
    group.brand=fact.brand;
    group.price=fact.prices?.length&&new Set(fact.prices).size===1?fact.prices[0]:null;
   }
  }
  return rankedRows([...groups.values()],kind,limit).map(group=>{
   const ids=[...group.ids],product=ids.map(id=>byId.get(id)).find(Boolean);
   const listing=product?.productId||ids[0];
   return {...group,ids,parentAsin:group.id,historicalBrand:group.brand,id:listing||group.id,
    productUrl:amazonProductUrl(group.country,listing),name:product?root.ResearchContext.name(product):group.brand,title:product?.title,image:product?.imageUrl,priceDate:group.month};
  });
 }

 function leaderRows(s,c,r){
  if(s.platform==='ml'){
   const source=root.Mercado.report(s);
   return {basis:'近30天'+metricName(r.kind)+'估算 · 同款商品取排名最高的链接',
    period:'近30天',ranked:true,rows:rankMercado(source.all,r.kind,topLimit(s))};
  }
  const profiles=(c?.observed||[]).filter(x=>root.ResearchQuality.matchesType(x,s.productType));
  const ranked=rankAmazon(r.facts,profiles,r.kind,topLimit(s));
  if(ranked.length)return {basis:'按所选月份的'+metricName(r.kind)+'估算排序，同款规格合并统计',
   period:'所选区间',ranked:true,rows:ranked};
  const suitable=profiles.filter(p=>{const type=root.ResearchQuality.productType(p),t=p.title||'';if(s.category==='fabric')return ['portable','steam'].includes(type)&&/spot|upholstery|little\s*green|stainstriker|cleanslate/i.test(t)&&!/handheld steam|pressure steam|industrial|commercial/i.test(t);if(s.category==='vacuum')return type==='dry'&&!/canister|shop[ -]?vac|industrial|commercial/i.test(t);return type===s.category;});
  const seen=new Set(),rows=suitable.slice().sort((a,b)=>String(a.brand).localeCompare(String(b.brand))||a.productId.localeCompare(b.productId)).filter(p=>{const k=p.modelKey||p.productId;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,topLimit(s)).map(p=>{const quote=root.ProductEvidence.price(p,{...s,priceBasis:'public'})||root.ProductEvidence.price(p,{...s,priceBasis:'source'});return {id:p.productId,name:root.ResearchContext.name(p),title:p.title,image:p.imageUrl,productUrl:p.platform==='amazon'?amazonProductUrl(s.country,p.productId):null,price:quote?.value??null,priceDate:quote?.date,units:null,revenue:null};});
  return {basis:'当前缺少可用于排名的销售数据，以下为同类商品资料。',period:'所选区间',ranked:false,rows};
 }
 function rankTable(rows,{kind,currency,note,title=metricName(kind)+' Top 10',price=true}){
  return '<section class="market-ranked-list" data-market-ranking><h3>'+e(title)+'</h3><p>'+
   e(note)+(rows.length&&rows.length<10?' · '+rows.length+' 款有'+metricName(kind)+'数据的商品':'')+'</p>'+
   (rows.length?'<div class="table-scroll"><table><thead><tr><th>名次</th><th>商品 / 型号</th>'+
    (price?'<th>参考报价（'+e(currency)+'）</th>':'')+'<th>销量（台）</th>'+
    (currency?'<th>销售额（'+e(currency)+'）</th>':'')+'</tr></thead><tbody>'+
    rows.map((row,index)=>'<tr data-ranked-product="'+e(row.parentAsin||row.id)+'"><td>'+(index+1)+'</td><th scope="row">'+productName(row)+
      '<small>'+e(row.parentAsin||row.id)+'</small></th>'+(price?'<td>'+n(row.price)+(row.priceDate?'<small>'+e(row.priceDate)+'</small>':'')+'</td>':'')+
      '<td>'+n(row.units)+'</td>'+(currency?'<td>'+n(row.revenue)+'</td>':'')+'</tr>').join('')+
    '</tbody></table></div>':'<p class="market-chart-empty">当前范围暂无可用于排名的'+metricName(kind)+'数据。</p>')+'</section>';
 }
 function leaders(s,c,r){const x=leaderRows(s,c,r);return '<section class="market-leaders"><div class="market-section-heading"><div><h3>'+(x.ranked?metricName(r.kind)+' Top '+topLimit(s):'同类商品资料')+'</h3><p>'+e(x.basis)+(x.ranked&&x.rows.length<topLimit(s)?' · '+x.rows.length+' 款有数据的商品':'')+'</p></div><label class="market-top-limit">显示 <select data-overview-top aria-label="重点商品显示数量">'+[5,10,20].map(k=>'<option value="'+k+'" '+(k===topLimit(s)?'selected':'')+'>'+k+'条</option>').join('')+'</select></label><button class="rq-button" data-overview-products>查看全部商品 →</button></div>'+(x.rows.length?'<div class="table-scroll"><table><thead><tr>'+(x.ranked?'<th>名次</th>':'')+'<th>商品 / 型号</th><th>报价 · '+e(r.currency)+'</th><th>'+e(x.period)+'销量</th><th>'+e(x.period)+'销售额 · '+e(r.currency)+'</th><th></th></tr></thead><tbody>'+x.rows.map((p,i)=>'<tr>'+(x.ranked?'<td>'+(i+1)+'</td>':'')+'<td><div class="market-leader-product"><span class="market-leader-image">—'+(p.image?'<img data-overview-image loading="lazy" src="'+e(p.image)+'" alt="" referrerpolicy="no-referrer">':'')+'</span><div><strong>'+productName(p)+'</strong><span title="'+e(p.title)+'">'+e(p.id)+(p.parentAsin?' · 同款编号 '+e(p.parentAsin):'')+'</span></div></div></td><td>'+n(p.price)+'<small>'+e(p.priceDate||'报价日期未知')+'</small></td><td>'+n(p.units)+'</td><td>'+n(p.revenue)+'</td><td><button class="rq-button" data-overview-product="'+e(p.id)+'" '+(s.platform==='ml'?'data-ml-product="'+e(p.id)+'"':'')+'>看板内详情</button></td></tr>').join('')+'</tbody></table></div>':'<p class="market-chart-empty">当前筛选条件下暂无商品资料。可在热销商品中选择其他渠道。</p>')+'</section>';}
 function monthlyResults(months,facts,currency){
  const rows=root.MarketSummary.monthlyBreakdown(months,facts).map(({month,units,revenue,groups,open})=>{
   const status=!groups?'暂无数据':open?'更新时该月尚未结束':'';
   return '<tr data-period-month="'+e(month)+'"><th scope="row">'+e(month)+(status?'<small>'+status+'</small>':'')+
    '</th><td>'+n(units)+'</td><td>'+n(revenue)+'</td></tr>';
  });
  return '<details class="market-monthly-results"><summary>逐月销量与销售额</summary><div class="table-scroll">'+
   '<table><thead><tr><th>月份</th><th>销量 / 台</th><th>销售额 / '+e(currency)+'</th></tr></thead><tbody>'+
   rows.join('')+'</tbody></table></div></details>';
 }
 function mount(s,change,download){
  if(s.page!=='market'||s.view!=='overview'||!['amazon','all','ml'].includes(s.platform))return;
  const host=document.getElementById('research-evidence');if(!host||host.querySelector('[data-market-overview-template]'))return;
  const old=[...host.querySelectorAll('.market-block')],first=old.find(x=>x.querySelector('h2')?.textContent==='市场大盘'),second=old.find(x=>x.querySelector('h2')?.textContent==='品牌与价格带');if(!first||!second)return;
  const c=s.platform==='ml'?null:root.decisionCatalog(),r=root.MarketDecisionModel.report(s.platform==='ml'?s:root.decisionState(c),c);if(!r)return;
  const original=first.querySelector('[data-original-category-report]'),months=root.MonthlyRange.months(s);
  const range=s.platform!=='ml'&&s.startMonth&&s.endMonth&&months.length;
  const period=range?months[0]+' 至 '+months.at(-1):original?'原类目 / 月度样本':
   r.sourceKind==='snapshot'?'近30天估算 · '+r.date:'月度估算';
  const box=document.createElement('div');box.className='market-overview';box.dataset.marketOverviewTemplate=version;box.innerHTML=shell(period,r.currency);first.before(box);
  const slot=k=>box.querySelector('[data-overview-slot="'+k+'"]'),move=(x,k)=>{if(x)slot(k).append(x);};

  move(first.querySelector('.market-kpi-grid'),'kpis');move(first.querySelector('.market-reading'),'reading');move(first.querySelector('.ml-coverage-summary'),'reading');move(first.querySelector('[data-ml-history-summary]'),'reading');
  move(first.querySelector('[data-ml-lifetime]'),'reading');
  if(s.platform==='amazon'&&root.MarketIntegrity.applicable(s.country,'amazon')){
   const query=new URLSearchParams({platform:'amazon',country:s.country,category:s.category});
   if(s.startMonth&&s.endMonth){query.set('startMonth',s.startMonth);query.set('endMonth',s.endMonth);}
   slot('reading').insertAdjacentHTML('beforeend','<div class="ml-archive-reference"><a class="rq-button" data-amazon-history href="market-history/?'+e(query.toString())+'" target="_blank" rel="noopener noreferrer">Amazon 月度研究文件</a></div>');
  }
  if(range){
   if(original)move(original.querySelector('.market-sample-heading'),'category');
   const openMonths=[...new Set(r.facts.filter(row=>row.open).map(row=>row.month))].sort();
   if(openMonths.length)slot('reading').insertAdjacentHTML('beforeend','<p class="market-period-detail" data-amazon-open-month>期间合计包含来源更新时尚未结束的月份 '+e(openMonths.join('、'))+'。</p>');
   slot('reading').insertAdjacentHTML('beforeend',monthlyResults(months,r.facts,r.currency));
   if(original){
    const oldReport=document.createElement('details');
    oldReport.className='market-original-reference';
    oldReport.innerHTML='<summary>查看原类目报告（原统计期间）</summary>';
    oldReport.append(original);
    slot('reading').append(oldReport);
   }
  }
  for(const x of first.querySelectorAll(':scope>.market-catalogue-reference,:scope>.market-source-reference,:scope>.market-trend,:scope>.market-trend-compact'))move(x,'references');
  const shares=second.querySelector('.sample-shares');
  if(shares){const controls=shares.querySelector('.sample-share-toolbar');if(controls){controls.classList.add('market-chart-controls');move(controls,'controls');}for(const x of shares.querySelectorAll(':scope>.sample-share-scope,:scope>.sample-share-evidence'))move(x,'references');shares.querySelector('.sample-share-empty')?.remove();move(shares,'charts');}
  else{move(second.querySelector('.market-chart-controls'),'controls');move(second.querySelector('.market-analysis-grid'),'charts');move(second.querySelector('[data-ml-detail]'),'charts');}
  if(!slot('references').children.length)slot('references').innerHTML='<p>Mercado Libre 近30天估算数据，更新日期 '+e(r.date)+'。商品月度销量在详情页查看。</p>';
  slot('leaders').innerHTML=leaders(s,c,r);
  // Business modules must survive the final DOM rebuild, not only the HTML renderer.
  for(const block of old)for(const x of block.querySelectorAll('[data-overview-preserve]')){const target=x.dataset.overviewPreserve;if(['category','leaders'].includes(target))move(x,target);}
  for(const x of old)x.remove();host.querySelectorAll('.market-followup-grid').forEach(x=>{if(!x.children.length)x.remove();});
  box.querySelector('[data-overview-top]')?.addEventListener('change',ev=>change({marketTop:ev.target.value}));
  box.querySelectorAll('[data-overview-page]').forEach(x=>x.onclick=()=>change({page:x.dataset.overviewPage,view:'overview',brandQuery:'',brandOffset:'0'}));box.querySelector('[data-overview-products]').onclick=()=>change({page:'market',view:'products',evidenceQuery:'',evidenceBrand:'',competitionGroup:'all',marketQuick:'all',priceBand:'',evidenceGroup:'',evidenceStatus:'',evidenceMin:'',evidenceMax:''});
  box.querySelectorAll('[data-overview-product]').forEach(x=>x.onclick=()=>change({page:'market',view:'products',evidenceQuery:x.dataset.overviewProduct,evidenceBrand:'',competitionGroup:'all',marketQuick:'all',priceBand:'',evidenceGroup:'',evidenceStatus:'',evidenceMin:'',evidenceMax:'',mlMin:'',mlMax:'',evidencePage:'0'}));
  box.querySelector('[data-market-source-open]')?.addEventListener('click',()=>{box.querySelector('.market-overview-references').open=true;const source=box.querySelector('.market-source-reference');if(source){source.open=true;source.scrollIntoView({block:'nearest'});}});
  box.querySelector('[data-original-report-export]')?.addEventListener('click',()=>{if(typeof download==='function')download(root.MarketSummary.originalExportRows(s),'UWANT_'+s.country+'_'+s.category+'_original_category_report.csv');});
  box.querySelectorAll('[data-overview-image]').forEach(img=>{const loaded=()=>{if(img.naturalWidth>=32&&img.naturalHeight>=32)img.style.opacity='1';else img.hidden=true;};img.onload=loaded;img.onerror=()=>img.hidden=true;if(img.complete)loaded();});
 }
 root.MarketOverviewLayout={version,shell,leaderRows,leaders,rankAmazon,rankMercado,rankMercadoMonths,rankTable,monthlyResults,mount};
})(window);
