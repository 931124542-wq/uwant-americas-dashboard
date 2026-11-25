(function (root) {
  const format = value => value.replace('-', '年').replace(/^([^年]+年)0/, '$1') + '月';
  const monthLabel = value => Number(value.slice(5)) + '月';
  function twoMonthsBefore(month) {
    const date = new Date(month+'-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth()-2);
    return date.toISOString().slice(0,7);
  }

  function amazonAvailability(scope, history) {
    if (!['amazon','all'].includes(scope.platform) || !root.MarketIntegrity.applicable(scope.country,'amazon')) return null;
    const range = root.SampleSalesShares.report(history, {
      ...scope, platform:'amazon', startMonth:'2026-01', endMonth:'2026-12', dataset:'2026-12'
    });
    const available = root.MarketSummary.monthlyBreakdown(range.months,range.facts).filter(row => row.groups>0);
    const latest = available.at(-1);
    return {available, latest, preferred:available.filter(row=>!row.open).at(-1)||latest};
  }

  function amazonMonthNotice(host, scope, history, change) {
    const availability = amazonAvailability(scope,history);
    if (!availability) return;
    const months = root.MonthlyRange.months(scope);
    if (availability.available.some(row=>months.includes(row.month))) return;
    const unfiltered = scope.productType&&scope.productType!=='all'
      ?amazonAvailability({...scope,productType:'all'},history):null;
    const canClearType = unfiltered?.available.some(row=>months.includes(row.month));
    const card = document.createElement('section');
    card.className = 'market-reading';
    card.dataset.amazonMonthNotice = '';
    const label = document.createElement('strong');
    label.className = 'market-reading-label';
    const body = document.createElement('div');
    const description = document.createElement('p');
    body.append(description);
    const action = (title,patch) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rq-button';
      button.textContent = title;
      button.onclick = () => change({...patch,shareDrill:'',historyProduct:''});
      body.append(button);
      return button;
    };
    const preferred = availability.preferred;
    if (canClearType) {
      label.textContent = '产品类型筛选';
      description.textContent = '所选月份有该品类的公开销售数据，当前产品类型暂无记录。';
      action('查看全部产品类型 →',{productType:'all'}).dataset.amazonClearType = '';
    } else if (preferred) {
      label.textContent = preferred.open?'最近有记录的月份':'最近完整月';
      const number = new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2});
      const currency = root.MarketIntegrity.currencies[scope.country];
      const estimates = [
        preferred.units===null?'':'销量 '+number.format(preferred.units)+' 台',
        preferred.revenue===null?'':'销售额 '+number.format(preferred.revenue)+' '+currency
      ].filter(Boolean);
      description.textContent = '所选月份暂无公开月度销售数据。'+format(preferred.month)+(preferred.open?'（未满整月）':'')+'估算 · '+estimates.join(' · ');
      action('查看'+format(preferred.month)+' →',{
        dataset:preferred.month,startMonth:preferred.month,endMonth:preferred.month
      }).dataset.amazonLatestMonth = preferred.month;
    } else {
      label.textContent = '月度数据';
      description.textContent = '当前品类和筛选范围暂无公开的月度销量与销售额。可在热销商品查看已有报价。';
    }
    card.append(label,body);
    host.append(card);
    return card;
  }

  function recentMonth(scope, history) {
    if (root.ResearchModel.usesMercadoMonths(scope) && root.MERCADO_DATA?.records) {
      const data = root.MERCADO_DATA;
      const archive = root.MercadoHistory.selection(
        {...scope, platform:'ml', startMonth:'2000-01', endMonth:data.asOf.slice(0,7)},
        root.Mercado.rows({...scope,evidenceRelation:'all'}), data
      );
      const complete = root.MercadoHistory.monthlySample(archive).months.filter(month=>month.units!==null);
      return {
        month:complete.at(-1)?.month||archive.coverage.at(-1)?.[0],
        first:complete[0]?.month||archive.coverage[0]?.[0],
        complete:complete.length>0
      };
    }
    const availability = amazonAvailability(scope,history);
    const sellerMonth = root.SellerMonthly?.latestMonth(scope);
    const preferred = availability?.preferred;
    if (sellerMonth && (!preferred || sellerMonth>preferred.month)) return {month:sellerMonth,complete:true};
    return {month:preferred?.month,first:availability?.available[0]?.month,complete:!preferred?.open};
  }

  function mount(scope, history, change) {
    const box = document.getElementById('market-period');
    const mercado = root.ResearchModel.usesMercadoMonths(scope)&&!!root.MERCADO_DATA?.records;
    const data = root.MERCADO_DATA;
    const visible = scope.page === 'market' && scope.view === 'overview' &&
      (mercado ? Array.isArray(data?.records) : ['amazon','all'].includes(scope.platform));
    box.hidden = !visible;
    if (!visible) return;

    const valid = mercado ? root.ResearchModel.isCalendarMonth : root.MonthlyRange.valid;
    const bounds = mercado
      ? root.MercadoHistory.bounds(scope, data)
      : root.MonthlyRange.bounds(scope);
    const start = valid(bounds.start) ? bounds.start : '';
    const end = valid(bounds.end) ? bounds.end : '';
    const name = '统计月份';
    const {month:latest,first,complete}=recentMonth(scope, history);
    const year = latest?.slice(0,4);
    const presets = latest ? [
      [complete?'最近1个月':'最近1个月', latest, latest],
      ...(mercado || Number(latest.slice(5))>=3 ? [['近3个月', twoMonthsBefore(latest), latest]] : []),
      ['今年以来', year+'-01', latest],
      ...(first && first!==year+'-01' && first<latest ? [['全部时间', first, latest]] : [])
    ] : [];
    const summary = !start||!end ? '请选择月份' : start===end ? format(start) : start.slice(0,4)===end.slice(0,4)
      ? format(start)+'–'+monthLabel(end) : format(start)+'–'+format(end);
    const limits = mercado ? 'min="2000-01" max="2099-12"' : 'min="2026-01" max="2026-12"';
    box.innerHTML = `
      <div class="market-period-heading">
        <div><h2 id="market-period-title">${name}</h2><strong data-period-selection>${summary}</strong></div>
        <div class="market-period-presets" role="group" aria-label="常用月份">
          ${presets.map(([label,a,b],i) => `<button type="button" data-period-preset="${i}" aria-pressed="${a===start&&b===end}">${label}</button>`).join('')}
        </div>
      </div>
      <form class="market-period-fields" novalidate>
        <label><span>起始月</span><input type="month" ${limits} data-month-start aria-label="起始月份" value="${start}"></label>
        <label><span>结束月</span><input type="month" ${limits} data-month-end aria-label="结束月份" value="${end}"></label>
        <button type="submit" class="market-period-apply" data-month-apply>应用</button>
      </form>
      <p class="market-period-error" data-month-error role="status"></p>`;

    const update = (a,b,focus) => {
      if (a!==start || b!==end || !scope.startMonth || scope.platform==='ml'&&!root.MercadoHistory.isPeriodOverview(scope)) {
        const historyProduct=scope.platform==='ml'?scope.historyProduct:'';
        change({startMonth:a,endMonth:b,marketPeriod:'monthly',evidenceGroup:'',historyProduct,shareDrill:''});
      }
      else {
        box.querySelector('[data-month-start]').value=a;
        box.querySelector('[data-month-end]').value=b;
        box.querySelector('[data-month-error]').textContent='';
        box.querySelectorAll('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));
      }
      box.querySelector(focus)?.focus({preventScroll:true});
    };
    box.querySelectorAll('[data-period-preset]').forEach((button,i) => {
      button.onclick=()=>update(presets[i][1], presets[i][2], '[data-period-preset="'+i+'"]');
    });
    box.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const a=box.querySelector('[data-month-start]'), b=box.querySelector('[data-month-end]');
      const error=box.querySelector('[data-month-error]');
      for (const input of [a,b]) input.removeAttribute('aria-invalid');
      if (!valid(a.value) || !valid(b.value) || a.value>b.value) {
        error.textContent = !valid(a.value)||!valid(b.value)
          ? (mercado?'请选择有效的月份。':'请选择2026年的月份。')
          : '起始月不能晚于结束月。';
        const invalid=!valid(b.value)?b:a;
        invalid.setAttribute('aria-invalid','true');
        invalid.focus();
        return;
      }
      error.textContent='';
      update(a.value,b.value,'[data-month-apply]');
    };
  }

  root.MarketPeriod = {mount,amazonMonthNotice};
})(window);
