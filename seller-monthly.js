/* The public page reads a user-selected research file in memory. */
(function (root) {
  if (new URLSearchParams(location.search).get('research') !== 'seller') return;

  const format = new Intl.NumberFormat('zh-CN', {maximumFractionDigits:2});
  const display = value => value === null ? '—' : format.format(value);
  const asin = value => typeof value === 'string' && /^[A-Z0-9]{10}$/.test(value);
  const amount = value => Number.isFinite(value) && value >= 0 ? value : null;
  const forms = {wash:['wash'],vacuum:['dry'],fabric:['portable','steam'],mattress:['mattress']};
  let facts = [];
  let message = '';
  let loading = false;

  function validate(data) {
    if (data?.format !== 'uwant-sellersprite-monthly-v1' || !Array.isArray(data.facts) ||
        !data.facts.length || data.facts.length > 10000) {
      throw new Error('请选择有效的 Amazon 月度研究文件。');
    }
    const seen = new Set();
    return data.facts.map(row => {
      const currency = root.MarketIntegrity.currencies[row?.country];
      const units = Number.isSafeInteger(row?.units) ? amount(row.units) : null;
      const revenue = amount(row?.revenue);
      if (!currency || !root.MarketIntegrity.applicable(row.country,'amazon') || row.currency !== currency ||
          !Object.hasOwn(forms,row.category) || !forms[row.category].includes(row.form) || !root.MonthlyRange.valid(row.month) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(row.retrievedAt || '') || row.month >= row.retrievedAt.slice(0,7) ||
          !asin(row.parentAsin) || !Array.isArray(row.asins) || !row.asins.length ||
          row.asins.length > 50 || !row.asins.every(asin) || (units === null && revenue === null)) {
        throw new Error('文件包含日期、币种或商品身份不匹配的记录。');
      }
      const key = [row.country,row.month,row.parentAsin].join('|');
      if (seen.has(key)) throw new Error('文件包含重复的商品组月度记录。');
      seen.add(key);
      return {
        country:row.country, category:row.category, currency, month:row.month, form:row.form, units, revenue,
        parentAsin:row.parentAsin, asins:[...new Set(row.asins)],
        brand:typeof row.brand === 'string' ? row.brand.slice(0,160) : '',
        price:amount(row.price), bsr:amount(row.bsr), rating:amount(row.rating), ratingCount:amount(row.ratingCount),
        retrievedAt:row.retrievedAt, collectionDock:row.collectionDock === '标题标注自集尘' ? row.collectionDock : null
      };
    });
  }

  function scopedFacts(state) {
    if (!['amazon','all'].includes(state.platform)) return [];
    return facts.filter(row => row.country === state.country && row.category === state.category &&
      (!state.productType || state.productType === 'all' || state.productType === row.form ||
       state.productType === 'portable' && row.form === 'steam'));
  }

  function monthsFor(state) {
    if (!root.ResearchModel.usesMercadoMonths(state) || !root.MERCADO_DATA?.records) return root.MonthlyRange.months(state);
    const {start,end} = root.MercadoHistory.bounds(state,root.MERCADO_DATA);
    const startMonth = start < '2026-01' ? '2026-01' : start;
    const endMonth = end > '2026-12' ? '2026-12' : end;
    if (!root.MonthlyRange.valid(startMonth) || !root.MonthlyRange.valid(endMonth)) return [];
    return root.MonthlyRange.months({...state,startMonth,endMonth});
  }

  function controls(host, change) {
    const box = document.createElement('div');
    box.className = 'seller-monthly-controls';
    box.innerHTML = '<button type="button" class="rq-button">打开本机 Amazon 月度数据</button>'+
      '<input type="file" accept=".json,application/json" aria-label="选择 Amazon 月度研究文件" hidden>'+
      '<span role="status"></span>';
    const pick = box.querySelector('button');
    const picker = box.querySelector('input');
    const status = box.querySelector('[role="status"]');
    status.textContent = message || (facts.length ? '已读取本机研究文件' : '选择研究文件，查看月销量和销售额。');
    pick.disabled = loading;
    pick.onclick = () => picker.click();
    picker.onchange = async () => {
      const file = picker.files[0];
      if (!file || loading) return;
      loading = true;
      pick.disabled = true;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('请选择体积不超过 2 MB 的月度研究文件。');
        let parsed;
        try { parsed = JSON.parse(await file.text()); }
        catch { throw new Error('无法读取该研究文件，请选择原始 JSON 文件。'); }
        facts = validate(parsed);
        message = '已读取本机研究文件';
      } catch (error) {
        message = error.message;
      } finally {
        loading = false;
        change({}, {replace:true});
      }
    };
    host.prepend(box);
  }

  function mount(state, change, download) {
    if (!['amazon','all'].includes(state.platform) || !root.MarketIntegrity.applicable(state.country,'amazon')) return;
    const host = document.getElementById('research-evidence');
    controls(host, change);
    if (!facts.length) return;
    const scoped = scopedFacts(state);
    if (!scoped.length) return;
    const months = monthsFor(state);
    if (!months.length) return;
    const selected = scoped.filter(row => months.includes(row.month));
    const currency = root.MarketIntegrity.currencies[state.country];
    const rows = root.MarketSummary.monthlyBreakdown(months,selected);
    const total = metric => {
      const values = rows.map(row=>row[metric]).filter(value=>value!==null);
      return values.length ? values.reduce((sum,value)=>sum+value,0) : null;
    };
    const section = document.createElement('section');
    section.className = 'market-block market-hero';
    section.dataset.sellerMonthly = '';
    const card = (key,label) => '<article class="market-kpi" data-seller-kpi="'+key+'"><span>'+label+
      '</span><strong>'+display(total(key))+'</strong></article>';
    section.innerHTML = '<div class="market-block-heading"><h2>Amazon 月度销售样本</h2>'+
      '<span class="market-period-tag">本机研究 · '+currency+'</span></div>'+
      '<div class="market-kpi-grid market-kpi-grid--two">'+card('units','所选月份样本总销量 · 台')+
      card('revenue','所选月份样本总销售额 · '+currency)+'</div>'+
      '<p class="market-period-detail">卖家精灵归档估算 · 有数据 '+rows.filter(row=>row.groups).length+
      ' / '+months.length+' 月 · 每月按来源报告的父体去重</p>'+
      root.MarketOverviewLayout.monthlyResults(months,selected,currency)+
      '<div class="market-channel-footer"><button type="button" class="rq-button" data-seller-export>导出本机月度样本</button></div>';
    section.querySelector('details').open = true;
    const exportSample = () => download([
      ['记录类型','国家','渠道','品类','币种','月份','来源父体','ASIN','品牌','样本销量','样本销售额',
       '归档报价','归档排名','归档评分','评分人数','采集日期','集尘方式'],
      ...rows.map(row=>['月度样本',state.country,'Amazon',state.category,currency,row.month,null,null,null,
                       row.units,row.revenue,null,null,null,null,null,null]),
      ...selected.map(row=>['商品组明细',row.country,'Amazon',row.category,currency,row.month,row.parentAsin,
        row.asins.join(' | '),row.brand,row.units,row.revenue,row.price,row.bsr,row.rating,row.ratingCount,
        row.retrievedAt,row.collectionDock])
    ],'UWANT_'+state.country+'_'+state.category+'_SellerSprite_private.csv');
    section.querySelector('[data-seller-export]').onclick = exportSample;
    const amazon = host.querySelector('[data-market-channel="amazon"]');
    const mainExport = document.getElementById('export');
    if (amazon) {
      amazon.querySelector('.market-block-heading').after(section);
      mainExport.textContent = '↓ 导出原市场数据';
    } else {
      host.querySelector('.seller-monthly-controls').after(section);
      mainExport.textContent = '↓ 导出本机月度样本';
      mainExport.onclick = exportSample;
    }
  }

  root.SellerMonthly = {mount,latestMonth:state=>scopedFacts(state).map(row=>row.month).sort().at(-1)};
})(window);
