/* A dedicated data-management view, separate from the market analysis workspace. */
(function(root){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function isRoute(s){return s.page==='market'&&['data','research','coverage','changes'].includes(s.view);}
 function render(s,catalog){
  if(s.platform==='ml'&&!Array.isArray(root.MERCADO_DATA?.records))return '<section class="panel" role="alert"><h2>美客多数据暂时无法加载</h2><p>请刷新后重试；当前不显示统计结果。</p></section>';
  const market=({MX:'MLM',BR:'MLB',AR:'MLA',CL:'MLC',CO:'MCO'})[s.country],queries=s.platform==='ml'?(root.PRIVATE_RESEARCH?.mlCoverage||root.MERCADO_DATA?.coverage||[]).filter(q=>q.market===market&&q.category===s.category):[],country=root.ResearchModel.countries[s.country].name,platform=s.platform==='all'?'全部已采集渠道':root.ResearchQuality.platforms[s.platform]||s.platform;
  const pagination=queries.length?'<section class="panel"><h2>检索与分页</h2><div class="table-scroll"><table><thead><tr><th>检索词</th><th>已取页</th><th>报告总页</th><th>状态</th></tr></thead><tbody>'+queries.map(q=>'<tr><td>'+esc(q.keyword)+'</td><td>'+esc(q.pageNumbers.join(', '))+'</td><td>'+esc(q.expectedPages??'未知')+'</td><td>'+(q.complete?'已取完报告分页':'未完成')+'</td></tr>').join('')+'</tbody></table></div></section>':'';
  const sourceReport=(root.MarketSummary?.snapshot(s)||root.MarketSourceData?.report(s))?'<section class="panel data-admin-source-report"><h2>原类目报告与统计范围</h2>'+root.MarketSummary.sourceMarket(s)+'</section>':'';
  const candidates=s.platform!=='ml'&&catalog?'<section class="panel"><h2>待核与隔离档案</h2><p>待核档案不自动进入市场销量统计。</p>'+(s.view==='research'?root.ResearchCatalog.table(catalog,{...s,researchLayer:'candidates'}):'<p>'+catalog.candidates.length+'条当前范围档案待核。</p><button class="rq-button" data-admin-candidates>查看待核档案</button>')+'</section>':'';
  return '<div class="research-data-admin"><section class="panel data-admin-heading"><div><small>数据管理</small><h2>'+esc(country)+' · '+esc(platform)+' · '+esc(({wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'})[s.category])+'</h2><p>采集、覆盖检查、待核档案和来源导出集中在此；不改变市场统计资格。</p></div><button class="rq-button" data-admin-return>返回市场总览 →</button></section>'+root.CoverageMonitor.render(s,catalog)+pagination+candidates+sourceReport+'<section class="panel"><h2>口径与原始资料</h2><p>销量和销售额为第三方估算，近30天快照与自然月历史分开。缺失数据不补零；去重冲突及归属未核实的记录保持隔离。</p><p>已发布商品资料保留原采集日；页面更新不代表重新采集。此处只提供公开资料的核验视图，原始MCP响应、账户和内部业务资料未接入。</p><a class="button-link" href="year-2026/UWANT_2026_产品月度数据.xlsx" download>下载原始年度工作表</a></section></div>';
 }
 function wire(el,s,change){el.querySelector('[data-admin-return]')?.addEventListener('click',()=>change({page:'market',view:'overview'}));el.querySelector('[data-admin-candidates]')?.addEventListener('click',()=>change({page:'market',view:'research',researchLayer:'candidates'}));}
 root.ResearchDataAdmin={isRoute,render,wire};
})(window);
