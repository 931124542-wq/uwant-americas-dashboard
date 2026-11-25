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
    const profile = product => {
      const candidate = data.trends[product.product_code];
      const source = candidate?.data_available===true && candidate.product_code===product.product_code &&
        candidate.market_code===product.product_code.slice(0,3) ? candidate : null;
      const months = source?.monthly_order_series?.filter(row => root.ResearchModel.isCalendarMonth(row.month) &&
        row.month >= start && row.month <= end && Number.isSafeInteger(row.orders) && row.orders >= 0) || [];
      return {product,source,months};
    };
    const profiles = products.filter(product=>data.trends[product.product_code]).map(profile).filter(row=>row.months.length)
      .sort((a, b) => b.months.length - a.months.length || a.product.product_code.localeCompare(b.product.product_code));
    const coverage = new Map();
    for (const profile of profiles) {
      for (const month of new Set(profile.months.map(row => row.month))) {
        coverage.set(month, (coverage.get(month) || 0) + 1);
      }
    }
    const requested = state.historyProduct && products.find(product=>product.product_code===state.historyProduct);
    const selected = profiles.find(row=>row.product===requested) || (requested ? profile(requested) : profiles[0]);
    return { start, end, profiles, coverage: [...coverage].sort(), selected };
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

  function monthEnd(period) {
    const [year,month]=period.split('-').map(Number);
    const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
    return period+'-'+lastDay;
  }

  function openMonth(row, source) {
    const end=source.range_end_date;
    return row.monthStatus==='open'||(end?.slice(0,7)===row.month&&end<monthEnd(row.month));
  }

  function completeMonth(row, coverage, source) {
    return !!coverage&&!openMonth(row,source)&&coverage.start<=row.month+'-01'&&coverage.end>=monthEnd(row.month);
  }

  function monthlySample({start,end,profiles,coverage}) {
    const counts = new Map(coverage);
    const open = new Set(profiles.flatMap(p => p.months.filter(m=>openMonth(m,p.source)).map(m=>m.month)));
    const byMonth=new Map();
    for(const {product,source,months} of profiles){
      if(product.statIsolationReason||product.catalogueOnly||product.sourceScopeTier==='adjacent'||
         !product.statisticalKey||source.product_code!==product.product_code||source.market_code!==product.product_code.slice(0,3)||
         source.data_available!==true||root.MarketIntegrity.snapshotIssue(product)) continue;
      const recorded=continuousCoverage(source);
      if(!recorded)continue;
      for(const row of months){
        if(!completeMonth(row,recorded,source))continue;
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
      const status=groups.length?'有完整月样本':!links?'暂无记录':open.has(month)?'含采集时未结月记录':'整月覆盖待核';
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
    const local=(root.MarketCurrency?.code(state.country,root.MarketIntegrity.currencies[state.country])||root.MarketIntegrity.currencies[state.country]);
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

  function productMonths({selected,start,end}) {
    const {source,months}=selected;
    const coverage=source?continuousCoverage(source):null;
    const entries=new Map();
    for(const row of months){
      const old=entries.get(row.month);
      if(!old)entries.set(row.month,{...row});
      else if(old.orders!==row.orders)old.conflict=true;
      if(row.monthStatus==='open')entries.get(row.month).monthStatus='open';
    }
    const result=[];
    for(let i=monthIndex(start);i<=monthIndex(end);i++){
      const month=monthName(i),row=entries.get(month);
      const status=!row?'missing':row.conflict?'conflict':completeMonth(row,coverage,source)?'complete':openMonth(row,source)?'open_at_collection':'partial';
      result.push({month,status,orders:!row||row.conflict?null:row.orders});
    }
    return result;
  }

  const monthLabels={missing:'暂无记录',conflict:'暂无可用数据',complete:'整月',open_at_collection:'未满整月',partial:'记录不完整'};

  function chart(rows) {
    const complete=rows.filter(row=>row.status==='complete');
    if(complete.length<2||rows.length>24)return '';
    const max=Math.max(1,...complete.map(row=>row.orders));
    const bars=rows.map(({month,orders,status})=>{
      const value=status==='complete'?orders:null;
      return '<div><small>'+(value===null?'—':number.format(value))+'</small>'+
        (value>0?'<i style="height:'+Math.max(2,Math.round(value/max*88))+'px"></i>':'')+
        '<span>'+month+'</span></div>';
    });
    return '<div class="ml-trend" role="img" aria-label="单个商品的整月销量，横线表示该月没有确认的整月销量">'+bars.join('')+'</div>';
  }

  function panel(state, products, data) {
    const history=selection(state,products,data);
    const {start,end,profiles,selected}=history;
    const controls='<div class="ml-controls"><label>起始月 <input data-ml-start type="month" value="'+esc(start)+'"></label><label>截止月 <input data-ml-end type="month" value="'+esc(end)+'"></label></div>';
    const intro='<p>'+esc(start)+' 至 '+esc(end)+' · 月销量估算</p>';
    const title=p=>[p.brandGroup||p.brand_label,p.model||p.product_name,p.product_code].filter(Boolean).join(' · ');
    const choices=selected&&!profiles.includes(selected)?[selected,...profiles]:profiles;
    const picker=selected?'<label class="ml-history-picker">选择商品<select data-ml-history-product>'+choices.map(({product})=>'<option value="'+esc(product.product_code)+'" '+(product===selected.product?'selected':'')+'>'+esc(title(product).replace(/^未识别品牌/,'其他品牌').replace(/^品牌待核/,'待确认品牌'))+'</option>').join('')+'</select></label>':'';
    let detail='<p>所选月份暂无该品类的单品销量。可调整月份或回到近30天数据。</p>';
    if(selected){
      const rows=productMonths(history);
      detail=(selected.months.length?'':'<p data-ml-no-product-months>该商品在所选月份暂无销量记录。</p>')+
        '<button class="rq-button" data-ml-single-export="'+esc(selected.product.product_code)+'">导出该商品月度数据</button>'+
        chart(rows)+'<div class="table-scroll"><table><thead><tr><th>月份</th><th>月销量（台）</th><th>数据完整度</th></tr></thead><tbody>'+
        rows.map(row=>'<tr data-history-month="'+row.month+'" data-month-state="'+row.status+'"><td>'+row.month+'</td><td>'+
          (row.orders===null?'—':number.format(row.orders))+'</td><td>'+monthLabels[row.status]+'</td></tr>').join('')+'</tbody></table></div>';
    }
    return '<section class="panel ml-history-panel"><h2>商品月度销量</h2>'+controls+intro+picker+detail+'</section>';
  }

  function exportRows(history) {
    const {selected}=history;
    const header=['商品ID','月份','月销量估算（台）','数据完整度'];
    if(!selected)return [header];
    return [header,...productMonths(history).map(row=>[selected.product.product_code,row.month,row.orders,monthLabels[row.status]])];
  }

  root.MercadoHistory = { isPeriodOverview, bounds, selection, monthlySample, summary, overview, panel, exportRows, sampleExportRows };
})(window);
