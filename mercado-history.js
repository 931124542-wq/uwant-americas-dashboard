/* Single-listing history kept separate from rolling market estimates. */
(function (root) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = new Intl.NumberFormat('zh-CN');
  const isPeriodOverview = state => state.platform==='ml' && state.page==='market' &&
    state.view==='overview' && (state.marketPeriod==='monthly' || (state.marketPeriod!=='snapshot' && !!state.startMonth && !!state.endMonth));
  const monthIndex = month => Number(month.slice(0,4))*12 + Number(month.slice(5))-1;
  const monthName = index => Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0');

  function bounds(state, data) {
    const validMonth = root.ResearchModel.isCalendarMonth;
    const savedMonth = validMonth(state.dataset) ? state.dataset : null;
    return {
      start:state.startMonth || savedMonth || data.asOf.slice(0, 4) + '-01',
      end:state.endMonth || savedMonth || data.asOf.slice(0, 7)
    };
  }

  function selection(state, products, data) {
    const {start,end}=bounds(state,data);
    const profiles = products.flatMap(product => {
      const source = data.trends[product.product_code];
      const months = source?.monthly_order_series?.filter(row => row.month >= start && row.month <= end && Number.isFinite(row.orders) && row.orders >= 0) || [];
      return months.length ? [{ product, source, months }] : [];
    }).sort((a, b) => b.months.length - a.months.length || a.product.product_code.localeCompare(b.product.product_code));
    const coverage = new Map();
    for (const profile of profiles) {
      for (const month of new Set(profile.months.map(row => row.month))) {
        coverage.set(month, (coverage.get(month) || 0) + 1);
      }
    }
    return { start, end, profiles, coverage: [...coverage].sort(), selected: profiles.find(p => p.product.product_code === state.historyProduct) || profiles[0] };
  }

  function archiveLinks(state) {
    if(state.platform!=='ml'||!root.MarketIntegrity?.applicable(state.country,'ml'))return '';
    const query=new URLSearchParams({platform:'ml',country:state.country,category:state.category});
    if(root.ResearchModel.isCalendarMonth(state.startMonth)&&root.ResearchModel.isCalendarMonth(state.endMonth)){
      query.set('startMonth',state.startMonth);
      query.set('endMonth',state.endMonth);
    }
    const link=(mode,attribute,label)=>{
      query.set('scope',mode);
      return '<a class="rq-button" '+attribute+' href="market-history/?'+esc(query.toString())+
        '" target="_blank" rel="noopener noreferrer">'+label+'</a>';
    };
    return link('sample','data-ml-sample-history','月度数据页')+
      (state.category==='vacuum'?link('category','data-ml-category-archive','大麦类目历史'):'');
  }

  function summary(state, products, data) {
    const history=selection(state,products,data),{start,end}=history;
    const sample=monthlySample(history);
    const detail=sample.total===null?'暂无完整月销量':'完整月样本 '+number.format(sample.total)+' 台';
    return '<section class="ml-history-summary" data-ml-history-summary><div><h3>月度销量</h3><p data-ml-history-sample><strong>'+
      esc(start)+' 至 '+esc(end)+'</strong> · '+detail+'</p></div><div class="ml-history-actions"><button class="rq-button" data-ml-range-overview>查看月度销量</button>'+
      '<button class="rq-button" data-ml-route="monthly">查看商品月销量</button>'+archiveLinks(state)+'</div></section>';
  }

  function continuousCoverage(source) {
    const {coverage_start_date:start,coverage_end_date:end,covered_day_count:count}=source.data_coverage||{};
    const day=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')?Date.parse(date+'T00:00:00Z')/86400000:NaN;
    const span=day(end)-day(start)+1;
    // The requested window can start before the first saved record. Only the days between
    // the observed endpoints must be present to verify months wholly inside that span.
    if(!(count>0&&count===span&&count===source.covered_day_count&&count<=source.requested_day_count&&
         source.range_start_date<=start&&end<=source.range_end_date))return null;
    return {start,end};
  }

  function completeMonth(row, coverage) {
    if(!coverage||row.monthStatus==='open')return false;
    const [year,month]=row.month.split('-').map(Number);
    const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
    return coverage.start<=row.month+'-01'&&coverage.end>=row.month+'-'+lastDay;
  }

  function monthCoverageLabel(row, coverage, asOf) {
    if(completeMonth(row,coverage))return '整月完整';
    return row.monthStatus==='open'||row.month===asOf.slice(0,7)?'更新时该月尚未结束':'整月数据待确认';
  }

  function monthlySample({start,end,profiles,coverage}) {
    const counts = new Map(coverage);
    const open = new Set(profiles.flatMap(p => p.months.filter(m=>m.monthStatus==='open').map(m=>m.month)));
    const byMonth=new Map();
    for(const {product,source,months} of profiles){
      if(product.statIsolationReason||product.catalogueOnly||product.sourceScopeTier==='adjacent'||
         !product.statisticalKey||source.product_code!==product.product_code||source.market_code!==product.product_code.slice(0,3)||
         source.data_available!==true||root.MarketIntegrity.snapshotIssue(product)) continue;
      const recorded=continuousCoverage(source);
      if(!recorded)continue;
      for(const row of months){
        if(!completeMonth(row,recorded))continue;
        if(!byMonth.has(row.month))byMonth.set(row.month,new Map());
        const groups=byMonth.get(row.month),key=product.statisticalKey;
        if(!groups.has(key))groups.set(key,{values:new Set(),representative:null});
        const group=groups.get(key);
        group.values.add(row.orders);
        if(product.counted===true&&!group.representative)group.representative={key,product,source,orders:row.orders};
      }
    }
    const months=[];
    for(let i=monthIndex(start);i<=monthIndex(end);i++){
      const month=monthName(i),links=counts.get(month)||0;
      const groups=[...(byMonth.get(month)?.values()||[])]
        .filter(group=>group.values.size===1&&group.representative)
        .map(group=>group.representative);
      const units=groups.length?groups.reduce((sum,row)=>sum+row.orders,0):null;
      const status=!links?'暂无记录':open.has(month)?'含采集时未结月记录':groups.length?'有完整月样本':'整月覆盖待核';
      months.push({month,links,groups,units,status});
    }
    const covered=months.filter(m=>m.units!==null);
    const total=covered.length?covered.reduce((sum,m)=>sum+m.units,0):null;
    return {months,covered:covered.length,total,groups:new Set(covered.flatMap(m=>m.groups.map(g=>g.key))).size};
  }

  function overview(state, products, data, title='市场大盘') {
    const history=selection(state,products,data),{start,end}=history;
    const sample=monthlySample(history);
    const rows=sample.months.map(m=>{
      const units=m.units===null?'—':'<strong>'+number.format(m.units)+' 台</strong>';
      const status=m.status.includes('未结月')?'更新时该月尚未结束':m.units===null?'暂无完整月销量':'';
      return '<tr data-period-month="'+m.month+'"><th scope="row">'+m.month+'</th><td data-month-sample-units>'+units+
        '</td><td>'+status+'</td></tr>';
    });
    const card = (key,label,value) => '<article class="market-kpi" data-market-kpi="'+key+'"><span>'+label+'</span><strong>'+value+'</strong></article>';
    const basis=sample.covered===sample.months.length?'':'整月销量已覆盖 '+sample.covered+' / '+sample.months.length+' 个月 · ';
    const local=root.MarketIntegrity.currencies[state.country];
    const archive=archiveLinks(state);
    return '<section class="market-block market-hero" data-ml-period-overview><div class="market-block-heading"><h2>'+esc(title)+'</h2><span class="market-period-tag">'+esc(start)+' 至 '+esc(end)+'</span></div>'+
      '<div class="market-kpi-grid market-kpi-grid--two">'+card('units','期间总销量（台）',sample.total===null?'—':number.format(sample.total))+
      card('revenue','期间销售额（'+esc(local)+'）','—')+'</div>'+
      '<p class="market-period-detail">'+basis+'暂无同类商品月度销售额数据</p>'+
      (archive?'<div class="ml-archive-reference">'+archive+'</div>':'')+
      '<div class="market-period-coverage table-scroll"><table><thead><tr><th>月份</th><th>销量</th><th>备注</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div></section>';
  }

  function sampleExportRows(history,state) {
    const sample=monthlySample(history);
    const base=[state.country,'Mercado Libre',state.category,history.start,history.end];
    return [
      ['记录类型','国家','平台','品类','起始月份','结束月份','月份','完整月样本销量','统计商品组数','有历史的商品链接数','记录情况','来源商品ID','来源商品链接','记录覆盖开始日','记录覆盖结束日'],
      ...sample.months.flatMap(m=>[
        ['月份',...base,m.month,m.units,m.groups.length,m.links,m.status,null,null,null,null],
        ...m.groups.map(g=>['商品组',...base,m.month,g.orders,1,null,'完整日记录',g.product.product_code,g.product.detail_link,g.source.data_coverage.coverage_start_date,g.source.data_coverage.coverage_end_date])
      ])
    ];
  }

  function chart(rows, start, end) {
    const byMonth = new Map(rows.map(row => [row.month, row.orders]));
    const max = Math.max(1, ...byMonth.values());
    const first = monthIndex(start);
    const last = monthIndex(end);
    if (rows.length < 2 || last - first > 23) return '';
    const bars = [];
    for (let i = first; i <= last; i++) {
      const month = monthName(i);
      const orders = byMonth.get(month);
      bars.push('<div><small>'+(orders===undefined?'—':number.format(orders))+'</small>'+
        (orders>0?'<i style="height:'+Math.max(2,Math.round(orders/max*88))+'px"></i>':'')+
        '<span>'+month+'</span></div>');
    }
    return '<div class="ml-trend" role="img" aria-label="单个商品的月销量，逐月数据见下表，横线表示缺月">'+bars.join('')+'</div>';
  }

  function panel(state, products, data) {
    const {start, end, profiles, selected} = selection(state, products, data);
    const controls = '<div class="ml-controls"><label>起始月 <input data-ml-start type="month" value="'+esc(start)+'"></label><label>截止月 <input data-ml-end type="month" value="'+esc(end)+'"></label></div>';
    const intro = '<p>'+esc(start)+' 至 '+esc(end)+' 期间，共收录 '+number.format(profiles.length)+' 款商品的月度销量（部分月份数据可能未覆盖整月）。</p>';
    const title = p => [p.brandGroup || p.brand_label, p.model || p.product_name, p.product_code].filter(Boolean).join(' · ');
    const picker = selected ? '<label class="ml-history-picker">选择商品<select data-ml-history-product>'+profiles.map(({product})=>'<option value="'+esc(product.product_code)+'" '+(product===selected.product?'selected':'')+'>'+esc(title(product).replace(/^未识别品牌/,'其他品牌').replace(/^品牌待核/,'待确认品牌'))+'</option>').join('')+'</select></label>' : '';
    const rows = selected?.months || [];
    const recorded = selected ? continuousCoverage(selected.source) : null;
    const detail = selected ? '<p>数据时间跨度：'+esc(selected.source.data_coverage?.coverage_start_date || '—')+' 至 '+esc(selected.source.data_coverage?.coverage_end_date || '—')+'</p><button class="rq-button" data-ml-single-export="'+esc(selected.product.product_code)+'">导出该商品月度数据</button><div class="table-scroll"><table><thead><tr><th>月份</th><th>月销量（台）</th><th>数据完整度</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.month)+'</td><td>'+number.format(row.orders)+'</td><td>'+monthCoverageLabel(row,recorded,data.asOf)+'</td></tr>').join('')+'</tbody></table></div>' : '<p>所选月份暂无该品类的单品销量。可调整月份或回到近30天数据。</p>';
    return '<section class="panel ml-history-panel"><h2>商品月度销量</h2>'+controls+intro+picker+chart(rows,start,end)+detail+'<p>注：空白表示该月暂无销量记录；暂不支持查看历史销售额与历史价格。</p></section>';
  }

  function exportRows({selected}, data) {
    const header = ['商品ID','月份','来源销量','覆盖开始日','覆盖结束日','请求天数','实际天数','全窗口覆盖完整','该月状态','统计方式'];
    if (!selected) return [header];
    const {product, source, months} = selected;
    const recorded=continuousCoverage(source);
    return [header, ...months.map(row => [
      product.product_code, row.month, row.orders, source.data_coverage?.coverage_start_date,
      source.data_coverage?.coverage_end_date, source.requested_day_count, source.covered_day_count,
      source.data_coverage?.full_coverage, row.monthStatus || (row.month===data.asOf.slice(0,7)?'open_at_collection':'daily_completeness_unknown'),
      '来源日记录汇总 · '+monthCoverageLabel(row,recorded,data.asOf)
    ])];
  }

  root.MercadoHistory = { isPeriodOverview, bounds, selection, monthlySample, summary, overview, panel, exportRows, sampleExportRows };
})(window);
