/* Listing-lifetime counts stay independent of rolling snapshots and calendar months. */
(function (root) {
  const number = new Intl.NumberFormat('zh-CN');
  const currency = country => root.MarketIntegrity.currencies[country];

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

  function productConflict(product, data) {
    const products=[product];
    return archiveConflicts(report(products),products,data)[0];
  }

  function reviewedMonthly(sample, products, data) {
    const conflicts=archiveConflicts(report(products),products,data);
    const flagged=new Set(conflicts.map(row=>row.id));
    const matched=new Set();
    let units=0;
    for(const month of sample.months)for(const {product,orders} of month.groups){
      if(!flagged.has(product.product_code))continue;
      matched.add(product.product_code);
      units+=orders;
    }
    return {size:matched.size,units};
  }

  function mount(section, state, products, download, before=null) {
    const totals = report(products);
    if (totals.total===null) return;
    const local = currency(state.country);
    const block = document.createElement('section');
    block.className = 'ml-month-revenue ml-lifetime-totals';
    block.dataset.mlLifetime = '';
    const date = totals.start===totals.end?totals.start:totals.start+' 至 '+totals.end;
    const flagged = new Set(archiveConflicts(totals,products,root.MERCADO_DATA).map(row=>row.id));
    block.innerHTML = '<div class="ml-coverage-head"><h3>历史累计表现</h3><button class="rq-button" data-export-lifetime>导出累计数据</button></div>'+
      '<div class="ml-month-revenue-values"><article><span>累计销量</span><strong data-lifetime-units>'+number.format(totals.total)+' <small>台</small></strong>'+
      '<span data-backstage-only>'+number.format(totals.rows.length)+' 个去重商品组</span></article>'+
      '<article><span>累计销售额（'+local+'）</span><strong data-lifetime-revenue>—</strong><span>平台暂未提供累计销售额</span></article></div>'+
      '<p>数据更新时间：'+date+'</p>'+
      (flagged.size?'<p data-lifetime-review>注：有 '+number.format(flagged.size)+' 款商品的分月销量合计高于累计值，数据正在核对中。</p>':'');
    block.querySelector('[data-export-lifetime]').onclick = () => download(
      [['国家','平台','品类','商品ID','品牌','采集日期','上架以来累计销量','累计销售额','币种','来源','销量档案核对'],
       ...totals.rows.map(({product,date,units})=>[state.country,'Mercado Libre',state.category,product.product_code,
         root.Mercado.brandOf(product),date,units,null,local,'大麦数据',flagged.has(product.product_code)?'历史月销量之和超过累计销量，待核':null])],
      'MercadoLibre_'+state.country+'_'+state.category+'_lifetime_units.csv'
    );
    if (before) before.before(block);
    else section.append(block);
  }

  root.MercadoLifetime = {observation, report, archiveConflicts, productConflict, reviewedMonthly, mount};
})(window);
