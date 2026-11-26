/* Shared visual hierarchy for the market research workspace. Data engines stay unchanged. */
(function(root){
 const categoryLabels={wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
 const managementDetails=[
  '[data-backstage-only]','.market-kpi>small','.market-overview-references','.market-catalogue-reference',
  '.market-source-reference','.sample-share-evidence','.sample-share-scope','.wb-sample-note','.wb-missing-fields',
  '.private-research-evidence','.coverage-monitor','.market-validation','.market-reviewed-exclusions','.ml-data-details',
  '.rq-reviewed-history','.rq-captured-history','.rq-monthly-unavailable','.rq-quarantine','.rq-new-history',
  '.rq-brand-boundaries','.rq-metric-limit','.wb-monthly>.data-gap-note','.market-chart-foot',
  '.decision-own-position .decision-note','.scope-details','.wb-match-evidence',
  '.market-hero .market-kpi[data-market-kpi="parents"]','.market-hero .decision-indicator>small',
  '.market-overview .sample-share-chart>p'
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
 function platformNavigation(s,available){
  const nav=document.getElementById('market-platform-nav');
  nav.hidden=!available;
  if(!available)return;
  const model=root.ResearchModel;
  const links=[['amazon','Amazon 市场大盘'],['ml','美客多市场大盘'],['all','全部平台']].map(([platform,label])=>{
   const target=model.platformOverview(s,platform);
   const link=document.createElement('a');
   link.className='rq-button';
   link.dataset.overviewPlatform=platform;
   link.href='#'+new URLSearchParams(target);
   link.textContent=label+(target.country===s.country?'':' · '+model.countries[target.country].name);
   if(s.page==='market'&&s.view==='overview'&&s.platform===platform)link.setAttribute('aria-current','page');
   return link;
  });
  nav.replaceChildren(...links);
 }
 function sync(s,change,download){
  const operations=document.body.classList.contains('operations-open'),admin=root.ResearchDataAdmin?.isRoute(s),overview=!admin&&s.page==='market'&&s.view==='overview',monthly=s.view==='monthly';
  const byChannel=overview&&root.AllChannelMarket?.applies(s);
  document.body.dataset.workspace=operations?'operations':admin?'data':'research';document.body.dataset.researchView=overview?'overview':monthly?'monthly':s.page==='market'?s.view:s.page;
  const operationMenu=document.getElementById('operations-navigation');if(operationMenu)operationMenu.hidden=false;
  const managementMenu=document.getElementById('management-navigation');if(managementMenu)managementMenu.open=admin;
  platformNavigation(s,!operations&&!admin);
  if(operations){root.OperatingWorkbook?.mount(s,change);return;}
  const own=document.querySelector('.filters [data-wb-own]');if(own)own.closest('label').hidden=admin||s.page!=='competitors';
  const monthBox=document.getElementById('month-range-controls');if(monthBox)monthBox.hidden=admin||byChannel||(s.platform==='ml'&&!monthly);
  const heading=document.querySelector('.heading');let context=document.getElementById('market-page-context');if(!context){context=document.createElement('p');context.id='market-page-context';heading.querySelector('div').append(context);}
  const country=root.ResearchModel.countries[s.country]?.name||s.country,category=categoryLabels[s.category],platform=root.ResearchQuality.platforms[s.platform]||'全部平台';
  context.textContent=country+' / '+platform+' / '+category;
  document.getElementById('market-currency-note')?.remove();
  if(!admin&&s.country==='AR'&&root.MarketCurrency){
   const note=document.createElement('p');
   note.id='market-currency-note';
   note.className='market-small-note';
   const link=document.createElement('a');
   link.href=root.MarketCurrency.source;
   link.target='_blank';
   link.rel='noopener noreferrer';
   link.textContent='阿根廷央行参考汇率';
   note.append('金额以美元（USD）展示，按对应日期的',link,'折算。');
   context.after(note);
  }
  const scope=document.getElementById('scope');
  scope.hidden=overview&&s.platform!=='all';
  if(s.platform==='all'&&!admin){
   if(overview)scope.textContent=byChannel?'各平台分别显示销量和销售额。':'销售数据来自 Amazon。';
   else{const note=document.createElement('span');note.className='market-metric-channel';note.textContent='销售数据来自 Amazon。';scope.append(note);}
  }
  const ml=s.platform==='ml',period=ml&&root.MercadoHistory.isPeriodOverview(s);
  let tabs=document.getElementById('market-time-views');
  if((overview||monthly)&&!byChannel){
   if(!tabs){tabs=document.createElement('div');tabs.id='market-time-views';tabs.className='market-time-views';document.getElementById('scope').after(tabs);}
   const tab=(key,label,active)=>'<button type="button" class="'+(active?'active':'')+'" data-market-time="'+key+'" aria-pressed="'+active+'">'+label+'</button>';
   tabs.innerHTML=tab('overview',ml?'近30天数据':'市场概览',!monthly&&!period)+tab('monthly',ml?'按月统计':'月度历史',monthly||period);
   tabs.querySelector('[data-market-time="overview"]').onclick=()=>change({page:'market',view:'overview',...(ml?{marketPeriod:'snapshot'}:{})});
   tabs.querySelector('[data-market-time="monthly"]').onclick=()=>change(ml?{page:'market',view:'overview',marketPeriod:'monthly'}:{page:'brands',view:'monthly'});
  }else tabs?.remove();
  if(ml&&!admin){
   const data=root.MERCADO_DATA,date=data?.researchSnapshot||data?.asOf;
   const summary=document.querySelector('#scope-toggle small');
   if(period&&data){
    const {start,end}=root.MercadoHistory.selection(s,root.Mercado.rows(s),data);
    scope.textContent='按月统计 · '+start+' 至 '+end;
    if(summary)summary.textContent='按月统计 · '+start+' 至 '+end;
   }else if(overview){
    scope.textContent='近30天估算 · '+(date||'日期未提供');
    if(summary)summary.textContent='近30天数据 · '+(date||'日期未知');
   }else if(!monthly){
    scope.textContent='';
   }else if(summary)summary.textContent=s.startMonth?s.startMonth+'—'+s.endMonth:s.dataset;
  }
  const exportButton=document.getElementById('export');exportButton.textContent=byChannel?'↓ 导出各平台':period?'↓ 导出月度数据':ml&&monthly?'↓ 导出该商品月度数据':s.page==='market'&&s.view==='products'?'↓ 导出商品':!admin&&s.page==='brands'?'↓ 导出品牌':overview&&ml?'↓ 导出统计数据':overview&&['amazon','all'].includes(s.platform)&&s.startMonth?'↓ 导出所选月份':'↓ 导出数据';
  if(overview){
   root.MarketOverviewLayout?.mount(s,change,download);
   document.querySelector('.heading-actions a[download]').hidden=true;
   if(s.platform!=='ml'){const dataset=document.getElementById('dataset');if(dataset)dataset.closest('label').hidden=true;}
  }
  const footer=document.querySelector('#research-content footer'),version=document.querySelector('meta[name="uwant-release"]')?.content;if(footer&&version){let note=footer.querySelector('span');if(!note){note=document.createElement('span');footer.append(note);}note.textContent='注：市场销量及销售额为第三方估算数据 · v'+version;}
  if(!admin&&s.page==='brands'&&!monthly){
   const host=document.getElementById('research-evidence');
   const notice=root.MarketPeriod?.amazonMonthNotice(host,s,root.REVIEW_DATA.history,change);
   if(notice)host.prepend(notice);
  }
  root.MarketDecisionUI?.mount(s,change,download);
  root.UwantShipments?.mount(s,change,download);
  root.LocalOperating?.mount(s,change,download);
  if(admin)root.MarketDecisionUI?.mountCoverage(s,change,download);
  if(admin)root.MarketValidation?.mount(s,download);
  hideManagementDetails(s);
  if(overview)root.SellerMonthly?.mount(s,change,download);
  document.querySelectorAll('.market-block-heading>span:first-child').forEach(x=>x.classList.add('market-section-number'));
 }
 root.MarketPresentation={sync,hideManagementDetails,managementDetails,categoryLabels};
})(window);
