/* Keep each published rolling sample on its original collection date. */
(function (root) {
  const date = '2026-11-12';
  const archiveDate = '2026-11-05';
  const units = 'orders_last_30_days';
  const revenue = 'revenue_last_30_days';
  const qualified = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const num = new Intl.NumberFormat('zh-CN', {maximumFractionDigits:2});
  const fmt = value => value === null ? '—' : num.format(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])
  );

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
        groups.set(row.statisticalKey, {
          id:product.product_code,brand:product.brandGroup || product.brand_label,units:values[0],revenue:values[1],
          listing:{
            ...row, brand_label:product.brandGroup || product.brand_label, model:product.model || row.model,
            modelGroup:product.modelGroup || row.modelGroup, detail_link:row.detail_link || product.detail_link
          }
        });
      }
    }
    const rows = [...groups.values()].filter(row => !row.conflict).map(row => ({
      ...row,
      revenue:row.revenue===null?null:root.Mercado.valueFor(row.listing,revenue)
    })).filter(row => row.units!==null || row.revenue!==null);
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
    const currency = (root.MarketCurrency?.code(state.country,root.MarketIntegrity.currencies[state.country])||root.MarketIntegrity.currencies[state.country]);
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

  function mountBatch(card, batch, state, data, download) {
    const currency = (root.MarketCurrency?.code(state.country,root.MarketIntegrity.currencies[state.country])||root.MarketIntegrity.currencies[state.country]);
    const scope = root.Mercado.report(state);
    const priceOf = row => root.Mercado.quotedPrice(row.listing);
    const groups = new Map();
    for(const row of batch.rows){
      const key=scope.bandFor(row.listing);
      if(key==='价位待归类')continue;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(row);
    }
    const start=key=>Number.parseFloat(key.replace('>= ',''));
    const bands=[...groups].sort(([a],[b])=>start(a)-start(b)).map(([key,rows])=>({
      label:scope.labelFor(key),rows
    })).filter(band=>band.rows.some(row=>row.units>0||row.revenue>0));
    const detail = card.querySelector('[data-ml-batch-detail]');
    const reveal = card.querySelector('[data-ml-batch-open]');
    reveal.onclick = () => {
      detail.hidden = !detail.hidden;
      reveal.setAttribute('aria-expanded',String(!detail.hidden));
      if (detail.hidden || detail.childElementCount) return;
      detail.innerHTML = '<div class="ml-batch-controls"><label>排序<select data-ml-batch-metric><option value="revenue">销售额</option>'+
        '<option value="units">销量</option></select></label><label>价格带（'+esc(currency)+'）<select data-ml-batch-band>'+
        '<option value="">全部价格带</option>'+bands.map((band,i) => '<option value="'+i+'">'+esc(band.label)+'</option>').join('')+
        '</select></label></div><div data-ml-batch-ranking></div>';
      const metric = detail.querySelector('[data-ml-batch-metric]');
      const band = detail.querySelector('[data-ml-batch-band]');
      metric.value = state.shareMetric==='units'?'units':'revenue';
      const render = () => {
        const selected = band.value===''?batch.rows:bands[Number(band.value)].rows;
        const rank = root.MarketOverviewLayout;
        const ranked = rank.rankMercado(selected.map(row=>row.listing),metric.value,10,{...data,researchSnapshot:batch.date});
        detail.querySelector('[data-ml-batch-ranking]').innerHTML = rank.rankTable(ranked,{
          kind:metric.value,currency,note:batch.date+' · 近30天估算 · 仅查看该次有记录的商品'
        });
      };
      metric.onchange=render;
      band.onchange=render;
      render();
    };
    card.querySelector('[data-ml-batch-export]').onclick = () => download(
      [['国家','品类','数据日期','商品ID','品牌','近30天销量估算','近30天销售额估算','币种','当时报价','商品页'],
       ...batch.rows.map(row => [state.country,state.category,batch.date,row.id,row.brand,row.units,row.revenue,currency,priceOf(row),row.listing.detail_link])],
      'MercadoLibre_'+state.country+'_'+state.category+'_'+batch.date+'_snapshot.csv'
    );
  }

  function mount(section, state, products, data, change, download) {
    const batches = [report(products,data),archiveReport(products,data)].filter(batch=>batch.rows.length);
    if (!batches.length) return;
    const currency = (root.MarketCurrency?.code(state.country,root.MarketIntegrity.currencies[state.country])||root.MarketIntegrity.currencies[state.country]);
    const scope = document.createElement('details');
    scope.className = 'ml-coverage-summary';
    scope.open = state.country==='MX' && state.category==='vacuum';
    scope.innerHTML = '<summary>其他近30天数据</summary>'+batches.map(batch =>
      '<section '+(batch.date===date?'data-ml-extra-snapshot ':'')+'data-ml-batch="'+batch.date+'" class="ml-extra-snapshot '+(batch.date===date?'':'ml-archived-snapshot')+'">'+
      '<div><h4>'+batch.date+'</h4><div><strong>'+fmt(batch.units)+'</strong> 台 · <strong>'+fmt(batch.revenue)+'</strong> '+esc(currency)+'</div>'+
      '<p>'+fmt(batch.positive)+' 款有销量 · '+fmt(batch.rows.filter(row=>row.revenue>0).length)+' 款有销售额</p></div>'+
      '<div class="ml-batch-actions"><button class="rq-button" data-ml-batch-open aria-expanded="false">查看该日榜单</button>'+
      '<button class="rq-button" data-ml-batch-export '+(batch.date===date?'data-extra-export':'data-archived-export')+'>导出该批</button></div>'+
      '<div class="ml-batch-detail" data-ml-batch-detail hidden></div></section>'
    ).join('')+'<div class="ml-coverage-head ml-snapshot-footer"><p>各日期分别统计，覆盖的商品可能不同。</p><button class="rq-button" data-coverage-catalogue>查看商品库</button></div>';
    for (const batch of batches) mountBatch(scope.querySelector('[data-ml-batch="'+batch.date+'"]'),batch,state,data,download);
    scope.querySelector('[data-coverage-catalogue]').onclick = () => change({
      page:'market',view:'products',evidenceQuery:'',evidenceBrand:'',evidenceStatus:'all',competitionGroup:'all',
      evidencePage:'0',mlMin:'',mlMax:'',marketQuick:'all'
    });
    section.append(scope);
  }
  root.MercadoCoverageSummary = {report, archiveReport, revenueSnapshots, mount, mountRevenue};
})(window);
