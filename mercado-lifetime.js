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

  function mount(section, state, products, download, before=null) {
    const totals = report(products);
    if (totals.total===null) return;
    const local = currency(state.country);
    const block = document.createElement('section');
    block.className = 'ml-month-revenue ml-lifetime-totals';
    block.dataset.mlLifetime = '';
    const date = totals.start===totals.end?totals.start:totals.start+' 至 '+totals.end;
    block.innerHTML = '<div class="ml-coverage-head"><h3>样本累计销售</h3><button class="rq-button" data-export-lifetime>导出累计销量</button></div>'+
      '<div class="ml-month-revenue-values"><article><span>样本累计总销量</span><strong data-lifetime-units>'+number.format(totals.total)+' <small>台</small></strong>'+
      '<span>'+number.format(totals.rows.length)+' 个去重商品组</span></article>'+
      '<article><span>样本累计总销售额 / '+local+'</span><strong data-lifetime-revenue>—</strong><span>来源未提供累计金额</span></article></div>'+
      '<p>累计订单数 · '+date+' 采集。</p>';
    block.querySelector('[data-export-lifetime]').onclick = () => download(
      [['国家','平台','品类','商品ID','品牌','采集日期','上架以来累计销量','累计销售额','币种','来源'],
       ...totals.rows.map(({product,date,units})=>[state.country,'Mercado Libre',state.category,product.product_code,
         root.Mercado.brandOf(product),date,units,null,local,'大麦数据'])],
      'MercadoLibre_'+state.country+'_'+state.category+'_lifetime_units.csv'
    );
    if (before) before.before(block);
    else section.append(block);
  }

  root.MercadoLifetime = {observation, report, mount};
})(window);
