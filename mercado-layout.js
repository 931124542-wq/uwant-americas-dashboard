/* Keep Mercado research in the established market workspace and navigation. */
(function(root){
 const original=root.Mercado.render,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=x=>x==null?'暂无数据':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x),cats={wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
 function block(number,title,button=''){const section=document.createElement('section');section.className='market-block';section.innerHTML='<div class="market-block-heading"><span>'+number+'</span><h2>'+title+'</h2>'+button+'</div>';return section;}
 const bandName=label=>{if(label==='价位待归类')return '报价未归档';if(label.startsWith('>='))return fmt(Number(label.slice(2)))+'及以上';const m=label.match(/^(\d+) \u2013 < (\d+)$/);return m?(Number(m[1])===0?'低于 '+fmt(Number(m[2])):fmt(Number(m[1]))+'\u2013'+fmt(Number(m[2]))):label;};
 const route=(view,label)=>'<button class="rq-button" data-ml-route="'+view+'">'+label+'</button>';
 function brandPage(section,s,all,report,data,metricControl,currency,change,download){
  const extra=root.MercadoCoverageSummary.report(all,data);
  const archive=root.MercadoCoverageSummary.archiveReport(all,data);
  const kind=s.shareMetric==='units'?'units':'revenue',metric=kind==='units'?'销量估算 / 台':'销售额估算 / '+currency;
  const baseDate=data.researchSnapshot||data.asOf,showExtra=extra[kind]!==null,showArchive=archive[kind]!==null;
  const directory=root.Mercado.brandDirectory(all,report,extra,kind,archive);
  const query=String(s.brandQuery||'').trim().toLowerCase();
  const filtered=directory.rows.filter(row=>!query||row.name.toLowerCase().includes(query));
  const pages=Math.max(1,Math.ceil(filtered.length/20));
  const page=Math.max(0,Math.min(Math.floor(Number(s.brandOffset)||0),pages-1));
  const share=(value,total)=>value!==null&&total>0?value/total:null;
  const display=value=>value===null?'—':fmt(value);
  const pct=(value,total)=>{const ratio=share(value,total);return ratio===null?'—':ratio>0&&ratio<.001?'＜0.1%':(ratio*100).toFixed(1)+'%';};
  const tools=document.createElement('div');tools.className='market-brand-tools';
  tools.innerHTML='<input type="search" data-market-brand-query aria-label="搜索品牌" placeholder="搜索品牌" value="'+esc(s.brandQuery||'')+'"><span>统计指标</span>';
  if(metricControl)tools.append(metricControl);
  tools.insertAdjacentHTML('beforeend','<small data-ml-brand-catalogue>商品库 '+fmt(directory.named)+' 个来源品牌'+(query?' · 搜索到 '+fmt(filtered.length)+' 组':'')+'</small>');
  section.append(tools);
  const valueLabel=kind==='units'?'有销量':'有销售额';
  const statNote=baseDate+' 有 '+fmt(directory.basePositive)+' 个具名品牌'+valueLabel+
   (showExtra?' · '+extra.date+' 有 '+fmt(directory.extraPositive)+' 个具名品牌'+valueLabel:'')+
   (showArchive?' · '+archive.date+' 有 '+fmt(directory.archivePositive)+' 个具名品牌'+valueLabel:'');
  const extraHead=showExtra?'<th>'+extra.date+'<small>'+esc(metric)+' · 该批占比</small></th>':'';
  const archiveHead=showArchive?'<th data-ml-brand-archive>'+archive.date+'<small>'+esc(metric)+' · 该批占比</small></th>':'';
  const rows=filtered.slice(page*20,page*20+20).map(row=>'<tr><th>'+esc(row.name)+'</th><td>'+fmt(row.products)+'</td><td>'+display(row.baseValue)+'<small>'+pct(row.baseValue,report.total)+' · '+fmt(row.baseRecords)+' 个统计样本</small></td>'+(
   showExtra?'<td>'+display(row.extraValue)+'<small>'+pct(row.extraValue,extra[kind])+' · '+fmt(row.extraRecords)+' 个统计样本</small></td>':''
  )+(showArchive?'<td>'+display(row.archiveValue)+'<small>'+pct(row.archiveValue,archive[kind])+' · '+fmt(row.archiveRecords)+' 个统计样本</small></td>':'')+
  '<td data-ml-brand-lifetime>'+display(row.lifetimeValue)+'<small>'+fmt(row.lifetimeRecords)+' 个去重商品组</small></td>'+
  '<td><button class="rq-button" data-ml-brand="'+esc(row.name)+'">查看商品 →</button></td></tr>').join('');
  section.insertAdjacentHTML('beforeend','<p class="market-brand-sample">'+esc(statNote)+'。各批为近30天估算，独立计算。累计销量按每组最近一次有效档案计入。</p><div class="table-scroll"><table class="market-brand-performance"><thead><tr><th>品牌</th><th>收录商品</th><th>'+baseDate+'<small>'+esc(metric)+' · 该批占比</small></th>'+extraHead+archiveHead+'<th>累计总销量 / 台</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="'+(5+Number(showExtra)+Number(showArchive))+'">当前搜索没有匹配的品牌。</td></tr>')+'</tbody></table></div><div class="market-brand-footer"><span>第'+(page+1)+' / '+pages+'页</span><div><button class="rq-button" data-market-brand-prev '+(page===0?'disabled':'')+'>上一页</button><button class="rq-button" data-market-brand-next '+(page===pages-1?'disabled':'')+'>下一页</button></div></div>');
  tools.querySelector('[data-market-brand-query]').oninput=e=>{const value=e.target.value,pos=e.target.selectionStart;change({brandQuery:value,brandOffset:'0'},{replace:true});const field=document.querySelector('[data-market-brand-query]');field?.focus();field?.setSelectionRange(pos,pos);};
  section.querySelector('[data-market-brand-prev]').onclick=()=>change({brandOffset:String(page-1)});
  section.querySelector('[data-market-brand-next]').onclick=()=>change({brandOffset:String(page+1)});
  document.getElementById('export').onclick=()=>download(
   [['country','platform','category','brand','catalogueListings','metric','currency','snapshotDate','snapshotRecords','snapshotValue','snapshotShare','supplementDate','supplementRecords','supplementValue','supplementShare','archiveDate','archiveRecords','archiveValue','archiveShare','lifetimeUnits','lifetimeRecords'],
    ...filtered.map(row=>[s.country,'Mercado Libre',s.category,row.name,row.products,kind,currency,baseDate,row.baseRecords,row.baseValue,share(row.baseValue,report.total),showExtra?extra.date:null,showExtra?row.extraRecords:null,row.extraValue,share(row.extraValue,extra[kind]),showArchive?archive.date:null,showArchive?row.archiveRecords:null,row.archiveValue,share(row.archiveValue,archive[kind]),row.lifetimeValue,row.lifetimeRecords])],
   'Mercado_'+s.country+'_'+s.category+'_brands.csv'
  );
 }
 function monthComparison(state,data,download){
  const details=document.createElement('details');
  details.className='market-block ml-month-comparison';
  details.innerHTML='<summary>查看五国月度销量</summary><div data-ml-month-comparison></div>';
  const body=details.querySelector('[data-ml-month-comparison]');
  details.addEventListener('toggle',()=>{
   if(!details.open||body.childElementCount)return;
   const {start,end}=root.MercadoHistory.bounds(state,data);
   const countries=Object.entries(root.ResearchModel.countries).filter(([code])=>root.MarketIntegrity.applicable(code,'ml'));
   const entries=countries.flatMap(([country,info])=>Object.entries(cats).map(([category,label])=>{
    const scope={country,category,platform:'ml',page:'market',view:'overview',marketPeriod:'monthly',dataset:end,startMonth:start,endMonth:end};
    const history=root.MercadoHistory.selection(scope,root.Mercado.rows(scope),data);
    return {country,category,name:info.name,label,scope,sample:root.MercadoHistory.monthlySample(history)};
   }));
   const months=entries[0]?.sample.months||[];
   const showMonths=months.length<=3;
   const value=units=>units===null?'—':fmt(units);
   const monthHeaders=showMonths?months.map(m=>'<th>'+esc(m.month)+'</th>').join(''):'';
   const rows=entries.map(row=>{
    const {scope,sample}=row,href=root.ResearchModel.encode(scope);
    const monthCells=showMonths?sample.months.map(m=>'<td>'+value(m.units)+'</td>').join(''):'';
   return '<tr data-country="'+row.country+'" data-category="'+row.category+'"><th scope="row"><a href="'+esc(href)+'">'+esc(row.name+' / '+row.label)+'</a></th>'+
     monthCells+'<td data-comparison-units>'+value(sample.total)+'</td><td>'+sample.covered+' / '+months.length+'</td></tr>';
   }).join('');
   body.innerHTML='<p>'+esc(start)+' 至 '+esc(end)+' · 各市场按整月数据统计，— 表示暂无整月数据。</p>'+
    '<div class="ml-history-actions"><button class="rq-button" data-export-month-comparison>导出五国逐月样本</button>'+
    '<button class="rq-button" data-export-lifetime-comparison>导出五国累计销量</button></div><div class="table-scroll"><table><thead><tr><th>市场 / 品类</th>'+
    monthHeaders+'<th>样本总销量 / 台</th><th>有数据月份</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
   body.querySelector('[data-export-month-comparison]').onclick=()=>download(
    [['国家','品类','起始月','结束月','月份','完整月样本销量','统计商品组','有历史的商品链接数','记录情况'],
     ...entries.flatMap(row=>row.sample.months.map(m=>[row.name,row.label,start,end,m.month,m.units,m.groups.length,m.links,m.status]))],
    'MercadoLibre_五国月度样本_'+start+'_'+end+'.csv'
   );
   body.querySelector('[data-export-lifetime-comparison]').onclick=()=>download(
    [['国家','平台','品类','最早采集日','最近采集日','样本累计总销量','去重商品组','样本累计总销售额','币种'],
     ...entries.map(({country,name,label,scope})=>{
      const totals=root.MercadoLifetime.report(root.Mercado.rows(scope));
      return [name,'Mercado Libre',label,totals.start,totals.end,totals.total,totals.rows.length,null,root.MarketIntegrity.currencies[country]];
     })],
    'MercadoLibre_五国累计销量.csv'
   );
  });
  return details;
 }
 function arrange(s,change,download){
  const host=document.getElementById('research-evidence'),workspace=host.querySelector('.ml-workbench');if(!workspace)return;
  const data=root.MERCADO_DATA,all=root.Mercado.rows(s),report=root.Mercado.report(s),currency=all[0]?.currency||'',panels=[...workspace.querySelectorAll(':scope > .panel')],catalog=panels.find(x=>x.querySelector('h2')?.textContent.startsWith('商品列表')),history=panels.find(x=>x.querySelector('h2')?.textContent==='商品月度销量'),shares=workspace.querySelector('.ml-two'),kpis=workspace.querySelector('.ml-kpis'),summary=workspace.querySelector('.ml-summary'),notes=workspace.querySelector('.ml-data-details'),comparison=workspace.querySelector('.ml-comparison'),coverage=workspace.querySelector('.coverage-monitor'),sourceEvidence=workspace.querySelector('.private-research-evidence'),detail=workspace.querySelector('[data-ml-detail]');
  const choices=root.MarketWorkbench.choices[s.category]||[];if(!choices.includes(s.own))s.own=choices[0];
  const own=document.querySelector('.filters [data-wb-own]');own.closest('label').hidden=false;own.innerHTML=choices.map(x=>'<option '+(x===s.own?'selected':'')+'>'+esc(x)+'</option>').join('');own.onchange=e=>change({own:e.target.value});
  const dates=history?.querySelector('.ml-controls');const dateBox=document.getElementById('month-range-controls');dateBox.replaceChildren();if(dates){dates.classList.add('ml-global-months');dateBox.append(dates);dates.insertAdjacentHTML('beforeend','<small>月份用于历史；近30天数据单列</small>');}
  const title=s.page==='brands'?'品牌分析':s.page==='competitors'?'UWANT竞品对比':({products:'热销商品',monthly:'商品月度历史',macro:'市场大盘',pricing:'价格带',keywords:'竞品关键词',research:'数据核对',coverage:'数据覆盖'})[s.view]||'市场总览';
  document.getElementById('title').textContent=title;document.getElementById('crumb').textContent=title;document.title=title+' · UWANT';
  document.getElementById('scope-toggle').innerHTML='<span>'+esc(root.ResearchModel.countries[s.country].name)+' / Mercado Libre / '+cats[s.category]+'<small>'+esc(s.startMonth?s.startMonth+'—'+s.endMonth:s.dataset)+' · UWANT '+esc(s.own)+'</small></span><b>筛选⌄</b>';
  document.getElementById('scope').innerHTML='<div class="scope-period"><span>'+esc(root.ResearchModel.countries[s.country].name)+' / Mercado Libre / '+cats[s.category]+' · '+esc(currency)+'</span><small>近30天数据更新 '+esc(data.researchSnapshot||data.asOf)+'；商品历史按所选月份展示</small></div>';
  const overview=s.page==='market'&&s.view==='overview',product=s.page==='market'&&s.view==='products',brand=s.page==='brands',compare=s.page==='competitors',monthly=s.page==='market'&&s.view==='monthly';
  // Retain the original controls and listeners; move each module into its proper route.
  workspace.replaceChildren();
  if(root.MercadoHistory.isPeriodOverview(s)){
   const period=document.createElement('div');
   period.dataset.marketOverviewTemplate='mercado-monthly';
   period.innerHTML=root.MercadoHistory.overview(s,all,data);
   root.MercadoCoverageSummary.mountRevenue(period,s,all,data,download);
   root.MercadoLifetime.mount(period.querySelector('[data-ml-period-overview]'),s,all,download,period.querySelector('[data-ml-month-revenue]'));
   const sample=root.MercadoHistory.monthlySample(root.MercadoHistory.selection(s,all,data));
   period.insertAdjacentHTML('beforeend',root.MarketOverviewLayout.rankTable(
    root.MarketOverviewLayout.rankMercadoMonths(sample),{kind:'units',price:false,
     note:'按所选月份的整月销量排序。同期商品报价和销售额暂无数据。'}
   ));
   period.append(monthComparison(s,data,download));
   if(history){
    const products=document.createElement('details');
    products.className='market-block ml-product-history-fold';
    products.open=!!s.historyProduct&&history.querySelector('[data-ml-history-product]')?.value===s.historyProduct;
    products.innerHTML='<summary>查看单品月销量</summary>';
    products.append(history);
    period.append(products);
   }
   workspace.append(period);
  }else if(overview){
   const unitsReport=root.Mercado.report({...s,shareMetric:'units'}),revenueReport=root.Mercado.report({...s,shareMetric:'revenue'}),current=all.filter(r=>r.counted&&root.ResearchSnapshot.matches(r,data)),quotes=current.filter(root.ResearchSnapshot.priceEligible).map(r=>r.selling_price).sort((a,b)=>a-b),median=quotes.length?(quotes[Math.floor((quotes.length-1)/2)]+quotes[Math.floor(quotes.length/2)])/2:null;
   document.getElementById('export').onclick=()=>{const ids=new Set(current.map(r=>r.product_code)),csv=root.Mercado.csvRows({...s,marketQuick:'all',evidenceBrand:'',evidenceQuery:'',evidenceStatus:'all',mlMin:'',mlMax:''});download(csv.filter((row,i)=>i===0||ids.has(row[3])),'MercadoLibre_'+s.country+'_'+s.category+'_snapshot.csv');};
   const card=(label,value,note)=>'<article class="market-kpi"><span>'+label+'</span><strong>'+fmt(value)+'</strong><small>'+esc(note)+'</small></article>';
   const first=block('01','市场大盘','<span class="market-period-tag">近30天估算 · '+esc(currency)+'</span>');first.classList.add('market-hero');
   first.insertAdjacentHTML('beforeend','<div class="market-kpi-grid market-kpi-grid--three">'+card('销售额估算 · '+esc(currency),revenueReport.total,revenueReport.all.length+'件商品参与金额统计')+card('销量估算 · 台',unitsReport.total,unitsReport.all.length+'件商品参与销量统计')+card('标价中位数 · '+esc(currency),median,quotes.length+'条可用当时的报价，非成交均价')+'</div>');
   const named=report.brands.filter(([brand,value])=>value>0&&root.Mercado.knownBrand(brand)),leader=named[0],peak=report.bands.filter(x=>x[0]!=='价位待归类'&&x[1]>0).slice().sort((a,b)=>b[1]-a[1])[0],metric=s.shareMetric==='units'?'销量':'销售额',percent=v=>report.total>0?(v>0&&v/report.total*100<.1?'＜0.1%':(v/report.total*100).toFixed(1)+'%'):'\u2014';
   first.insertAdjacentHTML('beforeend','<div class="market-reading"><span class="market-reading-label">市场速览</span><p>'+(leader?'<strong>'+esc(leader[0])+'</strong>占样本'+metric+'的 <strong>'+percent(leader[1])+'</strong>。':'当前数据不足以比较品牌表现。')+(peak?' 按商品标价分档，<strong>'+esc(bandName(peak[0]))+' '+esc(currency)+'</strong>价带占比最高。':'')+'</p></div>');
   root.MercadoCoverageSummary.mount(first,s,all,data,change,download);
   root.MercadoLifetime.mount(first,s,all,download);
   first.insertAdjacentHTML('beforeend',root.MercadoHistory.summary(s,all,data));
   const second=block('02','品牌与价格带','<button class="rq-button" data-ml-page="brands">全部品牌 →</button>');second.classList.add('market-competition');
   const control=document.createElement('div');control.className='market-chart-controls';const metricControl=shares?.querySelector('[data-ml-metric]');control.innerHTML='<span>观察维度</span>';if(metricControl)control.append(metricControl);second.append(control);
   const chart=(title,subtitle)=>{const el=document.createElement('section');el.className='market-analysis-chart';el.innerHTML='<div class="market-chart-heading"><h3>'+title+'</h3><p>'+subtitle+'</p></div>';return el;};
   const brandChart=chart('品牌'+metric+'占比','已收录商品'),priceChart=chart('价格带分布','按标价分组');
   const bar=(label,value,attrs)=>'<button class="market-share-row" data-market-value="'+value+'" '+attrs+' title="'+esc(label)+' · '+fmt(value)+' · '+percent(value)+'"><span>'+esc(label)+'</span><i><b style="width:'+Math.max(0,Math.min(100,report.total>0?value/report.total*100:0))+'%"></b></i><strong>'+percent(value)+'</strong><small>'+fmt(value)+'</small></button>';
   if(report.total>0){const main=named.slice(0,5),ownBrand=report.brands.find(x=>root.MarketShareChart.isOwn(x[0]));if(ownBrand&&!main.some(x=>x[0]===ownBrand[0]))main.push(ownBrand);const rest=report.total-main.reduce((sum,x)=>sum+x[1],0);brandChart.insertAdjacentHTML('beforeend',root.MarketShareChart.render([...main.map(([name,value])=>({label:name,value,attrs:'data-ml-brand="'+esc(name)+'"'})),...(rest>0.00001?[{label:'其他品牌',value:rest,attrs:'data-ml-page="brands"'}]:[])],report.total,{metric,unit:s.shareMetric==='units'?'台':currency})+'<p class="market-chart-foot">主要品牌和UWANT单独展示，其他品牌合并后仍计入总数。</p>');priceChart.insertAdjacentHTML('beforeend',report.bands.filter(x=>x[1]>0).map(([name,v])=>bar(bandName(name),v,'data-ml-band="'+esc(name)+'"')).join(''));}else{brandChart.insertAdjacentHTML('beforeend','<p class="market-chart-empty">暂无可计算的品牌占比</p>');priceChart.insertAdjacentHTML('beforeend','<p class="market-chart-empty">暂无可计算的价格带占比</p>');}
   const settings=shares?.querySelector('.ml-price-settings');if(settings){settings.querySelector('summary').textContent='设置价格区间';priceChart.append(settings);}
   const grid=document.createElement('div');grid.className='market-analysis-grid';grid.append(brandChart,priceChart);second.append(grid);if(detail)second.append(detail);
   const third=block('03','UWANT对标','<button class="rq-button" data-ml-page="competitors">竞品对比 →</button>');third.classList.add('market-next-card');const ownRows=all.filter(r=>/uwant/i.test(r.brand_label||'')&&String(r.product_name).toLowerCase().includes(String(s.own).toLowerCase()));third.insertAdjacentHTML('beforeend','<div class="market-next-content"><strong>'+esc(s.own)+'</strong><p>'+(ownRows.length?'已收录 '+ownRows.length+'条当地商品资料。具体版本与套装待确认。':'暂无可比的本地同型号报价。可先查看同类型产品。')+'</p></div>');
   const fourth=block('04','市场分析');fourth.classList.add('market-next-card');fourth.insertAdjacentHTML('beforeend','<div class="market-next-content"><strong>销售表现与历史分开看</strong><p>'+unitsReport.all.filter(r=>r.orders_last_30_days>0).length+'件统计商品有近30天销量。月度完整性不足时，不生成增长结论。</p>'+route('monthly','查看历史表现 →')+'</div>');
   const next=document.createElement('div');next.className='market-followup-grid';next.append(third,fourth);workspace.append(first,second,next);
  }else if(product||compare){
   if(compare&&comparison)workspace.append(comparison);if(catalog){workspace.append(catalog);const hints=catalog.querySelectorAll(':scope > p');if(hints[0])hints[0].textContent='搜索、价格、品牌及排序作用于当前列表，导出包含全部筛选结果。';if(hints[1])hints[1].textContent='价格与销量按每条商品的采集日期展示，未知项保留为空。';catalog.querySelector('[data-ml-export]')?.remove();}if(product&&comparison&&comparison.querySelector('table')){const selected=document.createElement('div');selected.className='market-selected-strip';selected.innerHTML='<span>已选择对比商品</span><button class="rq-button" data-ml-page="competitors">打开竞品对比 →</button>';workspace.prepend(selected);}
  }else if(brand){
   const section=block('','品牌分析');
   brandPage(section,s,all,report,data,shares?.querySelector('[data-ml-metric]'),currency,change,download);
   workspace.append(section);
  }else if(monthly){if(history)workspace.append(history);if(detail)workspace.append(detail);workspace.insertAdjacentHTML('afterbegin','<div class="market-inline-links">'+route('overview','返回市场总览 →')+route('products','热销商品')+'</div>');
  }else if(s.view==='keywords'){const section=block('','竞品关键词');section.insertAdjacentHTML('beforeend','<p>美客多暂未提供当前品类的竞品关键词。可继续查看商品、品牌和价格。</p>'+route('products','查看商品 →'));workspace.append(section);
  }else if(s.view==='pricing'){const section=block('','品牌与价格带',route('overview','返回市场总览'));if(shares)section.append(shares);if(detail)section.append(detail);workspace.append(section);
  }else{const section=block('','类目与来源',route('overview','返回市场总览'));if(summary)section.append(summary);section.insertAdjacentHTML('beforeend','<p>销量及销售额为第三方估算；近30天数据与月度数据分开统计。已收录商品仅供市场参考。</p>');workspace.append(section);}
  // Collection reports and audits are rendered only at the data-management route.
  if(!host.querySelector('[data-ml-detail]')){const d=document.createElement('div');d.setAttribute('data-ml-detail','');workspace.append(d);}
  host.querySelectorAll('[data-ml-product]').forEach(b=>b.onclick=()=>change({page:'market',view:'products',evidenceQuery:b.dataset.mlProduct,evidenceBrand:'',mlMin:'',mlMax:'',evidenceStatus:'all',evidencePage:'0'}));
  host.querySelectorAll('[data-market-product-image]').forEach(img=>{const loaded=()=>{if(img.naturalWidth>=32&&img.naturalHeight>=32)img.style.opacity='1';else img.hidden=true;};img.onerror=()=>img.hidden=true;img.onload=loaded;if(img.complete)loaded();});
  host.querySelectorAll('[data-ml-band]').forEach(b=>b.onclick=()=>{const selected=b.dataset.mlBand,rs=report.all.filter(r=>{const v=root.ResearchSnapshot.priceEligible(r)?r.selling_price:null;if(selected==='价位待归类')return v===null;if(selected.startsWith('>='))return v>=report.cuts.at(-1);const [a,z]=selected.split(' \u2013 < ').map(Number);return v!==null&&v>=a&&v<z;}),target=host.querySelector('[data-ml-detail]');const kind=s.shareMetric==='units'?'units':'revenue',rank=root.MarketOverviewLayout;target.className='market-band-detail';target.innerHTML='<div class="market-section-heading"><h3>'+esc(bandName(selected))+' \u00b7 '+rs.length+'件统计商品</h3><div><button class="rq-button" data-market-band-export>导出本组</button><button class="rq-button" data-market-detail-close>收起</button></div></div>'+(selected==='价位待归类'?'':rank.rankTable(rank.rankMercado(rs,kind),{kind,currency,note:'此价位段近30天估算，同款商品取排名最高的链接。'}))+'<details class="market-price-detail-all"><summary>查看此价位段全部商品</summary><div class="table-scroll"><table><thead><tr><th>商品 / 型号</th><th>档案价</th><th>近30天销量</th><th>近30天销售额</th></tr></thead><tbody>'+rs.map(r=>'<tr><td><button data-market-detail-product="'+esc(r.product_code)+'">'+esc(r.brand_label)+' \u00b7 '+esc(r.model||r.product_code)+'</button></td><td>'+fmt(r.selling_price>0?r.selling_price:null)+' '+esc(r.currency)+'</td><td>'+fmt(root.ResearchSnapshot.eligible(r,data,'orders_last_30_days')?r.orders_last_30_days:null)+'</td><td>'+fmt(root.ResearchSnapshot.eligible(r,data,'revenue_last_30_days')?r.revenue_last_30_days:null)+'</td></tr>').join('')+'</tbody></table></div></details>';target.querySelector('[data-market-detail-close]').onclick=()=>target.replaceChildren();target.querySelectorAll('[data-market-detail-product]').forEach(x=>x.onclick=()=>change({page:'market',view:'products',evidenceQuery:x.dataset.marketDetailProduct,evidenceBrand:'',mlMin:'',mlMax:'',evidenceStatus:'all',evidencePage:'0'}));target.querySelector('[data-market-band-export]').onclick=()=>download([['country','platform','category','productId','brand','model','archivePrice','currency','units30dEstimate','revenue30dEstimate','sourceDate','selectedMetric'],...rs.map(r=>[r.country,'Mercado Libre',r.category,r.product_code,r.brand_label,r.model,r.selling_price,r.currency,root.ResearchSnapshot.eligible(r,data,'orders_last_30_days')?r.orders_last_30_days:null,root.ResearchSnapshot.eligible(r,data,'revenue_last_30_days')?r.revenue_last_30_days:null,r.sourceDate,report.metric])],'Mercado_'+s.country+'_'+s.category+'_price_band.csv');target.scrollIntoView({block:'nearest'});});
  host.querySelectorAll('[data-ml-route]').forEach(b=>b.onclick=()=>change({page:'market',view:b.dataset.mlRoute}));host.querySelectorAll('[data-ml-page]').forEach(b=>b.onclick=()=>change({page:b.dataset.mlPage,view:'overview',brandQuery:'',brandOffset:'0'}));
  const rangeOverview=host.querySelector('[data-ml-range-overview]');
  if(rangeOverview)rangeOverview.onclick=()=>change({page:'market',view:'overview',marketPeriod:'monthly'});
  host.querySelectorAll('[data-ml-brand]').forEach(b=>b.onclick=()=>change({page:'market',view:'products',evidenceBrand:b.dataset.mlBrand,evidenceQuery:'',mlMin:'',mlMax:'',evidenceStatus:'all',evidencePage:'0',marketQuick:'all',evidenceMin:'',evidenceMax:''}));
 }
 root.Mercado.render=function(s,change,download){original(s,change,download);arrange(s,change,download);};
})(window);
