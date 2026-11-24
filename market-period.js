(function (root) {
  const format = value => value.replace('-', '年').replace(/^([^年]+年)0/, '$1') + '月';
  const monthLabel = value => Number(value.slice(5)) + '月';
  function twoMonthsBefore(month) {
    const date = new Date(month+'-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth()-2);
    return date.toISOString().slice(0,7);
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
    const facts = root.SampleSalesShares.report(history, {
      ...scope, startMonth:'2026-01', endMonth:'2026-12', dataset:'2026-12'
    }).facts;
    const months = facts.filter(fact => fact.units !== null || fact.revenue !== null).map(fact => fact.month);
    const sellerMonth = root.SellerMonthly?.latestMonth(scope);
    if (sellerMonth) months.push(sellerMonth);
    return {month:months.sort().at(-1),complete:false};
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
        change({startMonth:a,endMonth:b,marketPeriod:'monthly',evidenceGroup:'',historyProduct:'',shareDrill:''});
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

  root.MarketPeriod = {mount};
})(window);
