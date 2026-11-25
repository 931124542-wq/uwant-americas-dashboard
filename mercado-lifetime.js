/* Listing-lifetime counts stay independent of rolling snapshots and calendar months. */
(function (root) {
  const number = new Intl.NumberFormat('zh-CN');
  const currency = country => root.MarketCurrency?.code(country,root.MarketIntegrity.currencies[country])||root.MarketIntegrity.currencies[country];

  function observation(product) {
    const raw = root.MERCADO_LIFETIME_OBSERVATIONS?.rows[product.product_code];
    if (!raw || !product.counted || product.statIsolationReason || product.catalogueOnly ||
        product.sourceScopeTier==='adjacent' || !product.statisticalKey ||
        root.MarketIntegrity.snapshotIssue(product)) return null;
    const [date,units] = raw;
    return Number.isSafeInteger(units)&&units>=0 ? {date,units} : null;
  }

  function report(products) {
    const rows = products.flatMap(product=>{
      const fact = observation(product);
      return fact ? [{product,...fact}] : [];
    });
    const dates = rows.map(row=>row.date).sort();
    return {
      rows, total:rows.length ? rows.reduce((sum,row)=>sum+row.units,0) : null,
      start:dates[0] || null, end:dates.at(-1) || null
    };
  }

  function archiveConflicts(totals, products, data) {
    if (!data?.trends || !totals.rows.length) return [];
    const lifetimeById = new Map(totals.rows.map(row=>[row.product.product_code,row]));
    const months = totals.rows.flatMap(({product})=>
      (data.trends[product.product_code]?.monthly_order_series || []).map(row=>row.month)
    ).sort();
    if (!months.length) return [];
    const history = root.MercadoHistory.selection({startMonth:months[0],endMonth:totals.end.slice(0,7)},products,data);
    const sample = root.MercadoHistory.monthlySample(history);
    const priorById = new Map();
    for (const month of sample.months) {
      for (const {product,orders} of month.groups) {
        const id = product.product_code;
        const lifetime = lifetimeById.get(id);
        if (lifetime && month.month<lifetime.date.slice(0,7)) {
          priorById.set(id,(priorById.get(id) || 0)+orders);
        }
      }
    }
    return [...priorById].flatMap(([id,monthly])=>{
      const lifetime = lifetimeById.get(id);
      return monthly>lifetime.units ? [{id,monthly,cumulative:lifetime.units,date:lifetime.date}] : [];
    });
  }

  function mount(section, state, products, download, before=null) {
    const totals = report(products);
    if (totals.total===null) return;
    const local = currency(state.country);
    const block = document.createElement('section');
    block.className = 'ml-month-revenue ml-lifetime-totals';
    block.dataset.mlLifetime = '';
    const date = totals.start===totals.end?totals.start:totals.start+' 至 '+totals.end;
    block.innerHTML = '<div class="ml-coverage-head"><h3>历史累计表现</h3><button class="rq-button" data-export-lifetime>导出累计数据</button></div>'+
      '<div class="ml-month-revenue-values"><article><span>累计销量</span><strong data-lifetime-units>'+number.format(totals.total)+' <small>台</small></strong></article>'+
      '<article><span>累计销售额（'+local+'）</span><strong data-lifetime-revenue>—</strong></article></div>'+
      '<p>数据更新时间：'+date+'</p>';
    block.querySelector('[data-export-lifetime]').onclick = () => download(
      [['国家','平台','品类','商品ID','品牌','数据日期','累计销量','累计销售额','币种'],
       ...totals.rows.map(({product,date,units})=>{
         const brand=root.Mercado.brandOf(product);
         return [state.country,'Mercado Libre',state.category,product.product_code,
           root.Mercado.knownBrand(brand)?brand:'未知品牌',date,units,null,local];
       })],
      'MercadoLibre_'+state.country+'_'+state.category+'_lifetime_units.csv'
    );
    if (before) before.before(block);
    else section.append(block);
  }

  root.MercadoLifetime = {observation, report, archiveConflicts, mount};
})(window);
