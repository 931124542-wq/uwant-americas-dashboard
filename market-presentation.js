/* Shared visual hierarchy for the market research workspace. Data engines stay unchanged. */
(function(root){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function sync(s,change,download){
  const operations=document.body.classList.contains('operations-open'),admin=root.ResearchDataAdmin?.isRoute(s),overview=!admin&&s.page==='market'&&s.view==='overview',monthly=s.view==='monthly';
  document.body.dataset.workspace=operations?'operations':admin?'data':'research';document.body.dataset.researchView=overview?'overview':monthly?'monthly':s.page==='market'?s.view:s.page;
  const operationMenu=document.getElementById('operations-navigation');if(operationMenu)operationMenu.open=operations;
  const managementMenu=document.getElementById('management-navigation');if(managementMenu)managementMenu.open=operations||admin;
  if(operations)return;
  const own=document.querySelector('.filters [data-wb-own]');if(own)own.closest('label').hidden=admin||s.page!=='competitors';
  const monthBox=document.getElementById('month-range-controls');if(monthBox)monthBox.hidden=admin||(s.platform==='ml'&&!monthly);
  const heading=document.querySelector('.heading');let context=document.getElementById('market-page-context');if(!context){context=document.createElement('p');context.id='market-page-context';heading.querySelector('div').append(context);}
  const country=root.ResearchModel.countries[s.country]?.name||s.country,category=({wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'})[s.category],platform=root.ResearchQuality.platforms[s.platform]||'全部已采集渠道';
  context.textContent=country+' / '+platform+' / '+category;
  let tabs=document.getElementById('market-time-views');if(overview||monthly){if(!tabs){tabs=document.createElement('div');tabs.id='market-time-views';tabs.className='market-time-views';document.getElementById('scope').after(tabs);}tabs.innerHTML='<button class="'+(!monthly?'active':'')+'" data-market-time="overview">'+'市场概览'+'</button><button class="'+(monthly?'active':'')+'" data-market-time="monthly">月度历史</button>';tabs.querySelectorAll('[data-market-time]').forEach(b=>b.onclick=()=>change(b.dataset.marketTime==='overview'?{page:'market',view:'overview'}:{page:s.platform==='ml'?'market':'brands',view:'monthly'}));}else tabs?.remove();
  if(s.platform==='ml'&&!admin){const date=root.MERCADO_DATA?.researchSnapshot||root.MERCADO_DATA?.asOf;if(!monthly){document.getElementById('scope').innerHTML='<span>数据采集于 '+esc(date||'暂无数据')+'</span><details class="market-scope-info"><summary aria-label="查看数据统计方式">统计方式说明</summary><p>只反映当前已采集样本。销量与销售额为第三方近30天估算；服务商未给出精确起止日。商品档案与自然月历史保留各自日期，不合并为全市场总量。</p></details>';}const summary=document.querySelector('#scope-toggle small');if(summary)summary.textContent=monthly?(s.startMonth?s.startMonth+'—'+s.endMonth:s.dataset):'近30天数据 · '+(date||'日期未知');}
  const exportButton=document.getElementById('export');exportButton.textContent=s.page==='market'&&s.view==='products'?'↓ 导出商品':!admin&&s.page==='brands'?'↓ 导出品牌':overview&&s.platform==='ml'?'↓ 导出统计样本':'↓ 导出数据';
  if(overview){root.MarketOverviewLayout?.mount(s,change);if(s.platform!=='ml'){const dataset=document.getElementById('dataset');if(dataset)dataset.closest('label').hidden=true;}}
  const footer=document.querySelector('#research-content footer'),version=document.querySelector('meta[name="uwant-release"]')?.content;if(footer&&version){let note=footer.querySelector('span');if(!note){note=document.createElement('span');footer.append(note);}note.textContent='市场销量与销售额为第三方估算 · 市场版 '+version;}
  root.MarketDecisionUI?.mount(s,change,download);
  root.UwantShipments?.mount(s,change,download);
  root.LocalOperating?.mount(s,change,download);
  if(admin)root.MarketDecisionUI?.mountCoverage(s,change,download);
  document.querySelectorAll('.market-block-heading>span:first-child').forEach(x=>x.classList.add('market-section-number'));
 }
 root.MarketPresentation={sync};
})(window);
