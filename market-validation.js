/* Reconcile every supported market against source units; coverage is not accuracy certification. */
(function(root){
 const countries=['MX','CA','US','BR','AR','CL','CO'],categories=['wash','vacuum','fabric','mattress'];
 const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 function audit(scope,makeCatalog){
  const rows=[];
  for(const country of countries)for(const platform of ['amazon','ml'])for(const category of categories){
   const s={...root.ResearchModel.defaults,...scope,country,platform,category,page:'market',view:'overview',shareMetric:'revenue',productType:'all',competitionGroup:'all',evidenceQuery:'',evidenceBrand:'',marketQuick:'all'};
   if(platform==='amazon')Object.assign(s,root.ResearchModel.normalizeMarketScope(s));
   const base={country,platform,category,currency:root.MarketIntegrity.currencies[country],marketDenominator:null};
   if(!root.MarketIntegrity.applicable(country,platform)){rows.push({...base,applicable:false,products:null,units:null,revenue:null,period:null,issues:[],status:'not_applicable'});continue;}
   const catalog=platform==='amazon'?makeCatalog(s):null,r=root.MarketDecisionModel.report(s,catalog),issues=[];
   for(const kind of ['units','revenue']){const m=r[kind],sum=m.brands.reduce((n,b)=>n+b.value,0);if(m.total!==null&&(!finite(m.total)||Math.abs(sum-m.total)>.01))issues.push('brand_sum_'+kind);if(m.total===null&&m.count)issues.push('missing_total_'+kind);}
   if(r.currency!==base.currency)issues.push('currency');
   if(platform==='ml'){
    const source=root.Mercado.rows(s).filter(p=>p.counted&&root.ResearchSnapshot.matches(p,root.MERCADO_DATA)),seen=new Set();
    for(const p of source){const key=p.statisticalKey||p.product_code;if(seen.has(key))issues.push('duplicate_statistical_key');seen.add(key);const invalid=root.MarketIntegrity.snapshotIssue(p,p.sourceDate||root.MERCADO_DATA.asOf);if(invalid)issues.push(invalid);}
    for(const [metric,field]of [['units','orders_last_30_days'],['revenue','revenue_last_30_days']]){const valid=source.filter(p=>finite(p[field])&&!root.MarketIntegrity.snapshotIssue(p,p.sourceDate||root.MERCADO_DATA.asOf)),sum=valid.length?valid.reduce((n,p)=>n+p[field],0):null;if(sum!==r[metric].total)issues.push('source_sum_'+metric);}
   }else{
    const seen=new Set();for(const f of r.facts){if(seen.has(f.id))issues.push('duplicate_family_month');seen.add(f.id);if(f.country!==country||f.category!==category||f.currency!==base.currency||f.platform!=='amazon')issues.push('fact_scope');}
   }
   const original=root.MarketSummary.snapshot(s),provider=root.MarketSourceData?.report(s),categoryReport=provider?{units:provider.units,revenue:provider.revenue,periodStart:provider.range.start,periodEnd:provider.range.end,currency:provider.source.currency}:original?{units:original.stat.totalSales??null,revenue:original.stat.totalRevenue??null,periodStart:original.start,periodEnd:original.end,currency:original.stat.currency}:null;
   rows.push({...base,applicable:true,categoryReport,products:r.products,units:r.units.total,revenue:r.revenue.total,unitRecords:r.units.count,revenueRecords:r.revenue.count,period:r.period,sourceDate:r.date,issues:[...new Set(issues)],status:issues.length?'calculation_error':r.units.total===null||r.revenue.total===null?'missing_sales':'sample_available'});
  }
  const supported=rows.filter(r=>r.applicable),hasCategory=r=>r.categoryReport&&(finite(r.categoryReport.units)||finite(r.categoryReport.revenue));return {rows,supported:supported.length,available:supported.filter(r=>r.status==='sample_available').length,missing:supported.filter(r=>r.status==='missing_sales').length,categoryReports:supported.filter(hasCategory).length,missingWithCategoryReport:supported.filter(r=>r.status==='missing_sales'&&hasCategory(r)).length,salesEvidenceScopes:supported.filter(r=>r.status==='sample_available'||hasCategory(r)).length,errors:supported.filter(r=>r.issues.length).length,notApplicable:rows.length-supported.length};
 }
 function csv(r){return [['country','platform','category','applicable','products','sampleUnitsEstimate','sampleRevenueEstimate','currency','unitRecords','revenueRecords','samplePeriod','sourceDate','sampleStatus','calculationIssues','marketDenominator','originalCategoryUnits','originalCategoryRevenue','originalCategoryPeriodStart','originalCategoryPeriodEnd'],...r.rows.map(x=>[x.country,x.platform,x.category,x.applicable,x.products,x.units,x.revenue,x.currency,x.unitRecords,x.revenueRecords,x.period,x.sourceDate,x.status,x.issues.join(';'),'unknown',x.categoryReport?.units??null,x.categoryReport?.revenue??null,x.categoryReport?.periodStart??null,x.categoryReport?.periodEnd??null])];}
 function mount(s,download){
  const host=root.document?.querySelector('.research-data-admin');if(!host||host.querySelector('.market-validation'))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x);
  const panel=root.document.createElement('details');panel.className='panel market-validation';panel.innerHTML='<summary>全部市场的数据核对与缺口</summary><div data-validation-body></div>';host.append(panel);
  panel.addEventListener('toggle',()=>{
   if(!panel.open||panel.dataset.built)return;panel.dataset.built='true';const r=audit(s,scope=>root.decisionCatalog(scope)),labels={wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'},n=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x);
   panel.querySelector('[data-validation-body]').innerHTML='<p>'+r.supported+'个适用范围中，'+r.available+'个有同类商品样本销量和销售额，'+r.missing+'个缺少商品月度样本；另有'+r.categoryReports+'个原类目报告，其中'+r.missingWithCategoryReport+'个仍有原类目大盘、仅缺商品月度样本。'+r.notApplicable+'个平台范围不适用。计算异常 '+r.errors+'项。样本有值不代表覆盖完整市场，第三方估算不等同于真实订单。</p><button class="rq-button" data-validation-export>导出全部核对结果</button><div class="table-scroll"><table><thead><tr><th>国家 / 平台</th><th>品类</th><th>统计期间</th><th>样本销量</th><th>样本销售额 / 本币</th><th>结果</th></tr></thead><tbody>'+r.rows.map(x=>'<tr><th>'+esc(x.country+' / '+x.platform)+'</th><td>'+labels[x.category]+'</td><td>'+esc(x.period||'不适用')+'</td><td>'+n(x.units)+'</td><td>'+n(x.revenue)+' '+x.currency+'</td><td>'+esc(x.status==='not_applicable'?'不适用':x.status==='missing_sales'?(x.categoryReport?'原类目报告有值；商品月度样本待补':'商品月度样本待补'):x.status==='calculation_error'?x.issues.join('、'):'有来源样本；汇总已核对')+'</td></tr>').join('')+'</tbody></table></div>';
   panel.querySelector('[data-validation-export]').onclick=()=>download(csv(r),'UWANT_all_market_validation.csv');
  });
  const excluded=root.MarketIntegrity.exclusions(root.MERCADO_DATA?.records||[],s);if(!excluded.length)return;
  const review=root.document.createElement('details');review.className='panel market-reviewed-exclusions';review.innerHTML='<summary>本范围已排除的配件 · '+excluded.length+'条</summary><p>原商品档案及数值保留在来源库；以下记录不进入商品研究、市场统计、份额及筛选导出。</p><div class="table-scroll"><table><thead><tr><th>来源商品</th><th>排除依据</th><th>原销量 / 原销售额</th><th>复核日期</th></tr></thead><tbody>'+excluded.map(({record:p,review:r})=>'<tr><td><a href="'+esc(p.detail_link)+'" target="_blank" rel="noopener">'+esc(p.product_code)+'</a></td><td>'+esc(r.reason)+'</td><td>'+n(p.orders_last_30_days)+' / '+n(p.revenue_last_30_days)+' '+esc(p.currency)+'</td><td>'+r.reviewedAt+'</td></tr>').join('')+'</tbody></table></div>';host.append(review);
 }
 const api={audit,csv,mount};root.MarketValidation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
