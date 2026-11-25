/* A shared calendar with separate sales totals for each platform. */
(function(root){
 const esc=root.UIData.escape;
 const format=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2});
 const number=value=>value===null?'—':format.format(value);
 const applies=state=>state.platform==='all'&&root.ResearchModel.usesMercadoMonths(state)&&
  Array.isArray(root.MERCADO_DATA?.records);

 function report(state,history){
  const data=root.MERCADO_DATA;
  const mercado={...state,platform:'ml',marketPeriod:'monthly',evidenceRelation:'all'};
  const products=root.Mercado.rows(mercado);
  const selection=root.MercadoHistory.selection(mercado,products,data);
  const {start,end}=selection;
  const sample=root.MercadoHistory.monthlySample(selection);
  const months=sample.months.map(row=>row.month);
  const currency=(root.MarketCurrency?.code(state.country,root.MarketIntegrity.currencies[state.country])||root.MarketIntegrity.currencies[state.country]);
  let amazon=null;
  if(root.MarketIntegrity.applicable(state.country,'amazon')){
   const first=start<'2026-01'?'2026-01':start;
   const last=end>'2026-12'?'2026-12':end;
   const hasOverlap=first<=last;
   const scope={...state,platform:'amazon',startMonth:hasOverlap?first:'',endMonth:hasOverlap?last:'',
    dataset:hasOverlap?last:'archive'};
   const facts=hasOverlap?root.SampleSalesShares.report(history,scope).facts:[];
   const sum=key=>{
    const values=facts.map(row=>row[key]).filter(value=>value!==null);
    return values.length?values.reduce((total,value)=>total+value,0):null;
   };
   amazon={scope,facts,units:sum('units'),revenue:sum('revenue'),includesOpenMonth:facts.some(row=>row.open)};
  }
  return {data,start,end,currency,months,mercado,products,sample,amazon};
 }

 function amazonPanel(result,change,download){
  const {amazon,months,start,end,currency}=result;
  const panel=document.createElement('section');
  panel.className='market-block market-hero';
  panel.dataset.marketChannel='amazon';
  const note=amazon.includesOpenMonth?'估算包含更新时尚未结束的月份。':'';
  const card=(key,label,value)=>'<article class="market-kpi" data-market-kpi="'+key+'"><span>'+label+
   '</span><strong>'+number(value)+'</strong></article>';
  panel.innerHTML='<div class="market-block-heading"><h2>Amazon</h2><span class="market-period-tag">'+esc(start)+' 至 '+esc(end)+'</span></div>'+
   '<div class="market-kpi-grid market-kpi-grid--two">'+card('units','期间总销量（台）',amazon.units)+
   card('revenue','期间销售额（'+esc(currency)+'）',amazon.revenue)+'</div>'+
   (note?'<p class="market-period-detail">'+note+'</p>':'')+
   root.MarketOverviewLayout.monthlyResults(months,amazon.facts,currency);
  panel.querySelector('.market-monthly-results').open=amazon.facts.length>0&&months.length<=12;
  if(!amazon.facts.length)root.MarketPeriod?.amazonMonthNotice(panel,amazon.scope,root.REVIEW_DATA.history,change);
  if(amazon.facts.length){
   const kind=amazon.scope.shareMetric==='units'?'units':'revenue';
   const products=root.decisionCatalog().observed.filter(row=>row.platform==='amazon');
   panel.insertAdjacentHTML('beforeend',root.MarketOverviewLayout.rankTable(
    root.MarketOverviewLayout.rankAmazon(amazon.facts,products,kind),{kind,currency,
     note:'按所选月份的估算数据排序，同款规格合并。'}
   ));
  }
  const original=root.MarketSummary.originalContext(null,amazon.scope);
  if(original){
   const details=document.createElement('details');
   details.className='market-original-reference';
   details.innerHTML='<summary>查看原类目报告（原统计期间）</summary>'+original;
   details.querySelector('.market-sample-heading')?.remove();
   details.querySelector('[data-original-report-export]').onclick=()=>download(
    root.MarketSummary.originalExportRows(amazon.scope),'UWANT_'+amazon.scope.country+'_'+amazon.scope.category+'_original_category_report.csv'
   );
   panel.append(details);
  }
  panel.insertAdjacentHTML('beforeend','<div class="market-channel-footer"><button class="rq-button">查看 Amazon 大盘 →</button></div>');
  panel.querySelector('.market-channel-footer button').onclick=()=>change({
   platform:'amazon',startMonth:amazon.scope.startMonth,endMonth:amazon.scope.endMonth,dataset:amazon.scope.dataset
  });
  return panel;
 }

 function render(state,history,change,download){
  const result=report(state,history);
  const {mercado,products,data,sample,amazon,start,end}=result;
  const host=document.createElement('div');
  host.className='all-channel-market';
  host.dataset.marketOverviewTemplate='all-channels';
  host.innerHTML=root.MercadoHistory.overview(mercado,products,data,'Mercado Libre');
  const mlPanel=host.firstElementChild;
  mlPanel.dataset.marketChannel='ml';
  root.MercadoCoverageSummary.mountRevenue(mlPanel,mercado,products,data,download);
  root.MercadoLifetime.mount(mlPanel,mercado,products,download,mlPanel.querySelector('.market-period-coverage'));
  mlPanel.insertAdjacentHTML('beforeend',root.MarketOverviewLayout.rankTable(
   root.MarketOverviewLayout.rankMercadoMonths(sample),{kind:'units',price:false,
    note:'按所选月份的整月销量排序。同期商品报价和销售额暂无数据。'}
  ));
  mlPanel.insertAdjacentHTML('beforeend','<div class="market-channel-footer"><button class="rq-button" data-channel-snapshot>查看近30天与价格带 →</button> <button class="rq-button" data-channel-monthly>查看美客多月度数据 →</button></div>');
  mlPanel.querySelector('[data-channel-snapshot]').onclick=()=>change({
   platform:'ml',marketPeriod:'snapshot',startMonth:start,endMonth:end
  });
  mlPanel.querySelector('[data-channel-monthly]').onclick=()=>change({
   platform:'ml',marketPeriod:'monthly',startMonth:start,endMonth:end
  });
  if(amazon){
   host.classList.add('all-channel-market--pair');
   const panel=amazonPanel(result,change,download);
   if(amazon.facts.length)host.prepend(panel);
   else host.append(panel);
  }
  return host;
 }

 function exportRows(state,history){
  const {start,end,currency,months,mercado,products,data,sample,amazon}=report(state,history);
  const rows=[['记录类型','国家','平台','品类','币种','开始月','结束月','月份','档案日期','样本销量','样本销售额','说明']];
  const row=(kind,platform,periodStart,periodEnd,month,date,units,revenue,note)=>
   [kind,state.country,platform,state.category,currency,periodStart,periodEnd,month,date,units,revenue,note];
  if(amazon){
   rows.push(row('所选月份合计','Amazon',start,end,null,null,amazon.units,amazon.revenue,
    amazon.includesOpenMonth?'自然月样本估算，含采集时未结月记录':'自然月样本估算'));
   for(const m of root.MarketSummary.monthlyBreakdown(months,amazon.facts)){
    rows.push(row('自然月','Amazon',start,end,m.month,null,m.units,m.revenue,
     !m.groups?'暂无可统计数据':m.open?'含采集时未结月记录':''));
   }
  }
  const ml='Mercado Libre';
  rows.push(row('所选月份合计',ml,start,end,null,null,sample.total,null,'完整月样本销量；自然月销售额暂无来源'));
  for(const m of sample.months)rows.push(row('自然月',ml,start,end,m.month,null,m.units,null,m.status));
  const lifetime=root.MercadoLifetime.report(products);
  if(lifetime.total!==null){
   rows.push(row('上架以来累计',ml,null,null,null,lifetime.start+' 至 '+lifetime.end,lifetime.total,null,'累计销量估算'));
  }
  for(const batch of root.MercadoCoverageSummary.revenueSnapshots(mercado,products,data)){
   rows.push(row('近30天快照',ml,null,null,null,batch.date,null,batch.amount,'近30天销售额估算，每批独立'));
  }
  return rows;
 }

 root.AllChannelMarket={applies,render,exportRows};
})(window);
