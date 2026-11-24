/* Shared visual hierarchy for the market research workspace. Data engines stay unchanged. */
(function(root){
 const managementDetails=[
  '[data-backstage-only]','.market-kpi>small','.market-overview-references','.market-catalogue-reference',
  '.market-source-reference','.sample-share-evidence','.sample-share-scope','.wb-sample-note','.wb-missing-fields',
  '.private-research-evidence','.coverage-monitor','.market-validation','.market-reviewed-exclusions','.ml-data-details',
  '.rq-reviewed-history','.rq-captured-history','.rq-monthly-unavailable','.rq-quarantine','.rq-new-history',
  '.rq-brand-boundaries','.rq-metric-limit','.wb-monthly>.data-gap-note','.market-chart-foot',
  '.decision-own-position .decision-note','.scope-details','.wb-match-evidence'
 ];
 function hideManagementDetails(s){
  if(root.ResearchDataAdmin?.isRoute(s)||document.body.dataset.workspace!=='research')return;
  const host=document.getElementById('research-content');if(!host)return;
  // Keep historical analysis accessible while removing collection/qualification panels.
  const references=host.querySelector('.market-overview-references'),hero=host.querySelector('.market-hero');
  const historical=[...(references?.querySelectorAll('.market-trend,.market-trend-compact')||[])];
  if(hero&&historical.length){const d=document.createElement('details');d.className='decision-native-trend';d.innerHTML='<summary>月度走势与历史价格</summary>';for(const chart of historical)d.append(chart);hero.append(d);}
  for(const node of host.querySelectorAll(managementDetails.join(','))){node.hidden=true;node.dataset.backstageOnly='';}
 }
 function sync(s,change,download){
  const operations=document.body.classList.contains('operations-open'),admin=root.ResearchDataAdmin?.isRoute(s),overview=!admin&&s.page==='market'&&s.view==='overview',monthly=s.view==='monthly';
  document.body.dataset.workspace=operations?'operations':admin?'data':'research';document.body.dataset.researchView=overview?'overview':monthly?'monthly':s.page==='market'?s.view:s.page;
  const operationMenu=document.getElementById('operations-navigation');if(operationMenu)operationMenu.hidden=false;
  const managementMenu=document.getElementById('management-navigation');if(managementMenu)managementMenu.open=admin;
  if(operations){root.OperatingWorkbook?.mount(s,change);return;}
  const own=document.querySelector('.filters [data-wb-own]');if(own)own.closest('label').hidden=admin||s.page!=='competitors';
  const monthBox=document.getElementById('month-range-controls');if(monthBox)monthBox.hidden=admin||(s.platform==='ml'&&!monthly);
  const heading=document.querySelector('.heading');let context=document.getElementById('market-page-context');if(!context){context=document.createElement('p');context.id='market-page-context';heading.querySelector('div').append(context);}
  const country=root.ResearchModel.countries[s.country]?.name||s.country,category=({wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'})[s.category],platform=root.ResearchQuality.platforms[s.platform]||'全部已采集渠道';
  context.textContent=country+' / '+platform+' / '+category;
  if(s.platform==='all'&&!admin){const note=document.createElement('span');note.className='market-metric-channel';note.textContent='销量统计仅含Amazon，其他渠道仅提供商品资料';document.getElementById('scope').append(note);}
  const ml=s.platform==='ml',period=ml&&root.MercadoHistory.isPeriodOverview(s);
  let tabs=document.getElementById('market-time-views');
  if(overview||monthly){
   if(!tabs){tabs=document.createElement('div');tabs.id='market-time-views';tabs.className='market-time-views';document.getElementById('scope').after(tabs);}
   const tab=(key,label,active)=>'<button type="button" class="'+(active?'active':'')+'" data-market-time="'+key+'" aria-pressed="'+active+'">'+label+'</button>';
   tabs.innerHTML=tab('overview',ml?'近30天快照':'市场概览',!monthly&&!period)+tab('monthly',ml?'所选月份':'月度历史',monthly||period);
   tabs.querySelector('[data-market-time="overview"]').onclick=()=>change({page:'market',view:'overview',...(ml?{marketPeriod:'snapshot'}:{})});
   tabs.querySelector('[data-market-time="monthly"]').onclick=()=>change(ml?{page:'market',view:'overview',marketPeriod:'monthly'}:{page:'brands',view:'monthly'});
  }else tabs?.remove();
  if(ml&&!admin){
   const data=root.MERCADO_DATA,date=data?.researchSnapshot||data?.asOf;
   const summary=document.querySelector('#scope-toggle small'),scope=document.getElementById('scope');
   if(period&&data){
    const {start,end}=root.MercadoHistory.selection(s,root.Mercado.rows(s),data);
    scope.textContent='所选月份 '+start+' 至 '+end;
    if(summary)summary.textContent='所选月份 · '+start+' 至 '+end;
   }else if(overview){
    scope.textContent='近30天样本估算 · '+(date||'日期未提供');
    if(summary)summary.textContent='近30天数据 · '+(date||'日期未知');
   }else if(!monthly){
    scope.textContent='';
   }else if(summary)summary.textContent=s.startMonth?s.startMonth+'—'+s.endMonth:s.dataset;
  }
  const exportButton=document.getElementById('export');exportButton.textContent=period?'↓ 导出月度样本':ml&&monthly?'↓ 导出所选商品月销量':s.page==='market'&&s.view==='products'?'↓ 导出商品':!admin&&s.page==='brands'?'↓ 导出品牌':overview&&ml?'↓ 导出统计样本':overview&&['amazon','all'].includes(s.platform)&&s.startMonth?'↓ 导出所选月份':'↓ 导出数据';
  if(overview){root.MarketOverviewLayout?.mount(s,change,download);if(s.platform!=='ml'){const dataset=document.getElementById('dataset');if(dataset)dataset.closest('label').hidden=true;}}
  const footer=document.querySelector('#research-content footer'),version=document.querySelector('meta[name="uwant-release"]')?.content;if(footer&&version){let note=footer.querySelector('span');if(!note){note=document.createElement('span');footer.append(note);}note.textContent='市场销量与销售额为第三方估算 · 市场版 '+version;}
  root.MarketDecisionUI?.mount(s,change,download);
  root.UwantShipments?.mount(s,change,download);
  root.LocalOperating?.mount(s,change,download);
  if(admin)root.MarketDecisionUI?.mountCoverage(s,change,download);
  if(admin)root.MarketValidation?.mount(s,download);
  hideManagementDetails(s);
  document.querySelectorAll('.market-block-heading>span:first-child').forEach(x=>x.classList.add('market-section-number'));
 }
 root.MarketPresentation={sync,hideManagementDetails,managementDetails};
})(window);
