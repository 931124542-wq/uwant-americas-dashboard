/* Single-listing history kept separate from rolling market estimates. */
(function (root) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = new Intl.NumberFormat('zh-CN');

  function selection(state, products, data) {
    const validMonth = root.ResearchModel.isCalendarMonth;
    const savedMonth = validMonth(state.dataset) ? state.dataset : null;
    const start = state.startMonth || savedMonth || data.asOf.slice(0, 4) + '-01';
    const end = state.endMonth || savedMonth || data.asOf.slice(0, 7);
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

  function summary(state, products, data) {
    const {start, end, profiles, coverage} = selection(state, products, data);
    return '<section class="ml-history-summary" data-ml-history-summary><div><h3>商品月度历史</h3><p><strong>'+esc(start)+' 至 '+esc(end)+'</strong> · '+(profiles.length?number.format(profiles.length)+' 个商品链接有月销量记录，覆盖 '+coverage.length+' 个月':'该期间暂无单品月销量')+'</p><p>商品库收录 '+number.format(products.length)+' 条。全类目月度走势、单品月销售额和历史价格待补。</p></div><button class="rq-button" data-ml-route="monthly">查看商品月销量</button></section>';
  }

  function chart(rows, start, end) {
    const byMonth = new Map(rows.map(row => [row.month, row.orders]));
    const max = Math.max(1, ...byMonth.values());
    const first = Number(start.slice(0,4)) * 12 + Number(start.slice(5,7)) - 1;
    const last = Number(end.slice(0,4)) * 12 + Number(end.slice(5,7)) - 1;
    if (rows.length < 2 || last - first > 23) return '';
    const bars = [];
    for (let i = first; i <= last; i++) {
      const month = Math.floor(i/12)+'-'+String(i%12+1).padStart(2,'0');
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
    const intro = '<p>所选期间 '+esc(start)+' 至 '+esc(end)+'，共 '+number.format(profiles.length)+' 个商品链接有月销量记录。部分月份可能只覆盖部分日期。</p>';
    const title = p => [p.brandGroup || p.brand_label, p.model || p.product_name, p.product_code].filter(Boolean).join(' · ');
    const picker = selected ? '<label class="ml-history-picker">查看商品<select data-ml-history-product>'+profiles.map(({product})=>'<option value="'+esc(product.product_code)+'" '+(product===selected.product?'selected':'')+'>'+esc(title(product))+'</option>').join('')+'</select></label>' : '';
    const rows = selected?.months || [];
    const detail = selected ? '<p>原始记录覆盖 '+esc(selected.source.data_coverage?.coverage_start_date || '—')+' 至 '+esc(selected.source.data_coverage?.coverage_end_date || '—')+'</p><button class="rq-button" data-ml-single-export="'+esc(selected.product.product_code)+'">导出所选商品月度明细</button><div class="table-scroll"><table><thead><tr><th>月份</th><th>来源销量 / 台</th><th>覆盖说明</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.month)+'</td><td>'+number.format(row.orders)+'</td><td>'+((row.monthStatus==='open'||row.month===data.asOf.slice(0,7))?'采集时未结月':'整月覆盖未确认')+'</td></tr>').join('')+'</tbody></table></div>' : '<p>所选月份暂无该品类的单品销量。可调整月份或回到近30天快照。</p>';
    return '<section class="panel ml-history-panel"><h2>商品月度销量</h2>'+controls+intro+picker+chart(rows,start,end)+detail+'<p>缺月留空。历史销售额和历史价格暂无来源。</p></section>';
  }

  function exportRows({selected}, data) {
    const header = ['商品ID','月份','来源销量','覆盖开始日','覆盖结束日','请求天数','实际天数','全窗口覆盖完整','该月状态','统计方式'];
    if (!selected) return [header];
    const {product, source, months} = selected;
    return [header, ...months.map(row => [
      product.product_code, row.month, row.orders, source.data_coverage?.coverage_start_date,
      source.data_coverage?.coverage_end_date, source.requested_day_count, source.covered_day_count,
      source.data_coverage?.full_coverage, row.monthStatus || (row.month===data.asOf.slice(0,7)?'open_at_collection':'daily_completeness_unknown'),
      '来源日记录汇总，整月覆盖未确认'
    ])];
  }

  root.MercadoHistory = { selection, summary, panel, exportRows };
})(window);
