/* Keep each published rolling sample on its original collection date. */
(function (root) {
  const date = '2026-11-12';
  const archiveDate = '2026-11-05';
  const units = 'orders_last_30_days';
  const revenue = 'revenue_last_30_days';
  const qualified = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const num = new Intl.NumberFormat('zh-CN', {maximumFractionDigits:2});
  const fmt = value => value === null ? '—' : num.format(value);

  function summarize(date, candidates, data) {
    const snapshot = {...data, researchSnapshot:date};
    const groups = new Map();
    for (const {product,row} of candidates) {
      if (product.sourceScopeTier === 'adjacent' || !root.MarketIntegrity.allows(product)) continue;
      if (row.sourceDate !== date || row.statIsolationReason || !row.statisticalKey || row.category !== product.category || row.country !== product.country) continue;
      const values = [units,revenue].map(field => root.ResearchSnapshot.eligible(row,snapshot,field) ? row[field] : null);
      if (values.every(value => value === null)) continue;
      const prior = groups.get(row.statisticalKey);
      if (prior) {
        if (prior.units !== values[0] || prior.revenue !== values[1]) prior.conflict = true;
      } else {
        groups.set(row.statisticalKey, {id:product.product_code,brand:product.brandGroup || product.brand_label,units:values[0],revenue:values[1]});
      }
    }
    const rows = [...groups.values()].filter(row => !row.conflict);
    function total(field) {
      const values = rows.map(row => row[field]).filter(qualified);
      return values.length ? values.reduce((sum,value) => sum+value,0) : null;
    }
    return {date, rows, units:total('units'), revenue:total('revenue'), positive:rows.filter(row => row.units > 0).length};
  }

  function report(products, data) {
    const candidates = products.map(product => ({
      product, row:product.latestSourceObservation?.sourceDate === date ? product.latestSourceObservation : product
    }));
    return summarize(date,candidates,data);
  }

  function archiveReport(products, data) {
    const candidates = products.filter(product => !product.catalogueOnly && !product.statIsolationReason).flatMap(product =>
      [product,...(product.priorObservations || [])].filter(row =>
        row.sourceDate === archiveDate && row.product_code === product.product_code &&
        row.form === product.form && row.metricPeriod === 'near_30_days_unknown_bounds'
      ).map(row => ({product,row}))
    );
    return summarize(archiveDate,candidates,data);
  }

  function revenueSnapshots(state, products, data) {
    const base = root.Mercado.report({...state,shareMetric:'revenue'});
    const extra = report(products,data);
    const archive = archiveReport(products,data);
    return [
      {date:archive.date, amount:archive.revenue, count:archive.rows.filter(row => row.revenue !== null).length},
      {date:data.researchSnapshot || data.asOf, amount:base.total, count:base.all.length},
      {date:extra.date, amount:extra.revenue, count:extra.rows.filter(row => row.revenue !== null).length}
    ].filter(batch => batch.amount !== null);
  }

  function mountRevenue(section, state, products, data, download) {
    const currency = root.MarketIntegrity.currencies[state.country];
    const snapshots = revenueSnapshots(state,products,data);
    if (!snapshots.length) return;

    const block = document.createElement('section');
    block.className = 'ml-month-revenue';
    block.dataset.mlMonthRevenue = '';
    block.innerHTML = '<div class="ml-coverage-head"><h3>近30天销售额估算</h3><button class="rq-button" data-export-snapshot-revenue>导出销售额数据</button></div>'+
      '<div class="ml-month-revenue-values">'+snapshots.map(batch =>
        '<article data-revenue-snapshot="'+batch.date+'"><time datetime="'+batch.date+'">'+batch.date+' 更新</time>'+
        '<strong>'+fmt(batch.amount)+' <small>'+currency+'</small></strong><span data-backstage-only>'+num.format(batch.count)+' 款商品有销售额数据</span></article>'
      ).join('')+'</div><p>注：各日期显示当时的近30天销售额估算。各次覆盖的商品不同，不能直接相加或据此判断涨跌。</p>';
    block.querySelector('[data-export-snapshot-revenue]').onclick = () => download(
      [['国家','平台','品类','采集日期','统计口径','销售额估算','币种','金额样本数'],
       ...snapshots.map(batch => [state.country,'Mercado Libre',state.category,batch.date,'近30天；起止日期未提供',batch.amount,currency,batch.count])],
      'MercadoLibre_'+state.country+'_'+state.category+'_revenue_snapshots.csv'
    );
    section.querySelector('.market-period-coverage').after(block);
  }

  function mount(section, state, products, data, change, download) {
    const extra = report(products,data);
    const archive = archiveReport(products,data);
    if (!extra.rows.length && !archive.rows.length) return;
    const scope = document.createElement('details');
    scope.className = 'ml-coverage-summary';
    scope.innerHTML = '<summary>其他近30天数据</summary>';
    if (extra.rows.length) {
      const currency = products[0].currency;
      scope.insertAdjacentHTML('beforeend','<div class="ml-extra-snapshot" data-ml-extra-snapshot><h4>'+date+'</h4><div><strong>'+fmt(extra.units)+'</strong> 台 · <strong>'+fmt(extra.revenue)+'</strong> '+currency+'</div><button class="rq-button" data-extra-export>导出该批</button></div>');
      scope.querySelector('[data-extra-export]').onclick = () => download(
        [['国家','品类','快照日期','商品ID','品牌','近30天销量估算','近30天销售额估算','币种'],
         ...extra.rows.map(row => [state.country,state.category,date,row.id,row.brand,row.units,row.revenue,currency])],
        'MercadoLibre_'+state.country+'_'+state.category+'_'+date+'_snapshot.csv'
      );
    }
    if (archive.rows.length) {
      const currency = root.MarketIntegrity.currencies[state.country];
      scope.insertAdjacentHTML('beforeend','<div class="ml-extra-snapshot ml-archived-snapshot"><h4>'+archive.date+'</h4>'+
        '<div><strong>'+fmt(archive.units)+'</strong> 台 · <strong>'+fmt(archive.revenue)+'</strong> '+currency+'</div>'+
        '<button class="rq-button" data-archived-export>导出该批</button></div>');
      scope.querySelector('[data-archived-export]').onclick = () => download(
        [['国家','品类','快照日期','商品ID','品牌','近30天销量估算','近30天销售额估算','币种'],
         ...archive.rows.map(row => [state.country,state.category,archive.date,row.id,row.brand,row.units,row.revenue,currency])],
        'MercadoLibre_'+state.country+'_'+state.category+'_'+archive.date+'_snapshot.csv'
      );
    }
    scope.insertAdjacentHTML('beforeend','<div class="ml-coverage-head ml-snapshot-footer"><p>各日期分别统计，覆盖的商品可能不同。</p><button class="rq-button" data-coverage-catalogue>查看商品库</button></div>');
    scope.querySelector('[data-coverage-catalogue]').onclick = () => change({
      page:'market',view:'products',evidenceQuery:'',evidenceBrand:'',evidenceStatus:'all',competitionGroup:'all',
      evidencePage:'0',mlMin:'',mlMax:'',marketQuick:'all'
    });
    section.append(scope);
  }
  root.MercadoCoverageSummary = {report, archiveReport, revenueSnapshots, mount, mountRevenue};
})(window);
