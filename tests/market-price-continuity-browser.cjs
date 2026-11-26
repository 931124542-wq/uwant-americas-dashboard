const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');

const base = process.env.UWANT_TEST_BASE || 'http://127.0.0.1:8842/';
const laptopChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.UWANT_CHROME_PATH || (process.platform === 'darwin' ? laptopChrome : undefined);
const categories = ['fabric','wash','vacuum','mattress'];
const mercadoCountries = ['MX','BR','AR','CL','CO'];
const amazonCountries = ['MX','BR','US','CA'];
const expectedFine = {MX:500,BR:150,AR:25,CL:25000,CO:100000,US:25,CA:40};
const format = value => value === null ? '—' : new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(value);

async function main() {
  const browser = await chromium.launch({executablePath});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    let visit = 0;
    const go = scope => page.goto(base+'?price-test='+(++visit)+'#'+new URLSearchParams({
      country:'MX',platform:'ml',category:'vacuum',page:'market',view:'overview',
      dataset:'2026-10',startMonth:'2026-01',endMonth:'2026-10',marketPeriod:'snapshot',
      shareMetric:'units',productType:'all',...scope
    }),{waitUntil:'domcontentloaded'});
    const headline = () => page.locator('.market-hero .market-kpi-grid strong').allInnerTexts();

    for (const [platform,countries] of [['ml',mercadoCountries],['amazon',amazonCountries]]) {
      for (const country of countries) for (const category of categories) {
        await go({country,platform,category,mlPriceBands:'MXN:500,1000,2000,4000,8000'});
        await page.locator('[data-market-overview-template]').waitFor();
        const stats = await page.evaluate(()=>{
          const {country,category,platform}=state;
          const rule=ResearchModel.priceBandRule(state);
          const bands=rule.starts
            ?rule.starts
            :[rule.step,ResearchModel.categoryPriceBand(state,rule.step-0.01).index,
              ResearchModel.categoryPriceBand(state,rule.step).index];
          if(platform==='ml'){
            const records=Mercado.rows(state);
            const revenue=Mercado.report({...state,shareMetric:'revenue'});
            const units=Mercado.report({...state,shareMetric:'units'});
            const safe=(field,transform)=>{
              const values=records.filter(r=>ResearchSnapshot.eligible(r,MERCADO_DATA,field))
                .map(transform).filter(value=>value!==null);
              return values.length?values.reduce((total,value)=>total+value,0):null;
            };
            return {bands,revenue:revenue.total,units:units.total,
              expectedRevenue:safe('revenue_last_30_days',r=>MarketCurrency.amount(r.revenue_last_30_days,country,r.currency,r.sourceDate)),
              expectedUnits:safe('orders_last_30_days',r=>r.orders_last_30_days),
              visibleBands:units.bands.filter(([,value])=>value>0).map(([key])=>key),
              priceSum:units.total===null?null:units.bands.reduce((sum,[,value])=>sum+(value??0),0)};
          }
          const stats=MarketSummary.overviewStats(decisionCatalog(),state);
          return {bands,revenue:stats.revenue.total,units:stats.units.total,
            visibleBands:stats.units.prices.filter(group=>group.value>0).map(group=>'price|'+group.key),
            priceSum:stats.units.total===null?null:stats.units.prices.reduce((sum,group)=>sum+group.value,0)};
        });
        const scope=country+'/'+platform+'/'+category;
        const expectedStep=country==='BR'&&category==='mattress'?50:
          expectedFine[country]*(category==='wash'||category==='vacuum'?2:1);
        const expectedBands=country==='BR'&&category==='wash'?[0,1000,1500,2000,3000,4000,5000]:[expectedStep,0,1];
        assert.deepEqual(stats.bands,expectedBands,scope);
        assert.equal(stats.priceSum,stats.units,scope);
        if(platform==='ml'){
          assert.equal(stats.units,stats.expectedUnits,scope);
          assert.equal(stats.revenue,stats.expectedRevenue,scope);
        }
        const shown=await headline();
        assert.deepEqual(shown.slice(0,2),[format(stats.revenue),format(stats.units)],scope);
        const selector=platform==='ml'?'[data-ml-band]':'[data-share-chart="price"] [data-share-drill]';
        const field=platform==='ml'?'data-ml-band':'data-share-drill';
        const shownBands=await page.locator(selector).evaluateAll((nodes,attr)=>nodes.map(node=>node.getAttribute(attr)),field);
        assert.deepEqual(shownBands,stats.visibleBands,scope+' price distribution');
      }
    }

    await go({platform:'all',marketPeriod:'monthly'});
    const recent=page.locator('[data-market-channel="ml"] [data-ml-month-revenue]');
    await recent.waitFor();
    const {snapshots,cumulative}=await page.evaluate(()=>{
      const scope={...state,platform:'ml'},products=Mercado.rows(scope);
      return {snapshots:MercadoCoverageSummary.revenueSnapshots(scope,products,MERCADO_DATA),
        cumulative:MercadoLifetime.report(products).total};
    });
    assert(cumulative>0);
    const total=page.locator('[data-market-channel="ml"] [data-ml-lifetime]');
    assert.match(await total.innerText(),/上架以来累计[\s\S]*总销量（台）/);
    assert.equal(await total.locator('[data-lifetime-units]').innerText(),format(cumulative)+' 台');
    assert.equal(await recent.locator('[data-snapshot-units]').count(),0);
    const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
    const csv=await fs.readFile(await file.path(),'utf8');
    assert(csv.split('\n').some(line=>line.includes('"上架以来累计"')&&line.includes('","'+cumulative+'","","累计销量估算"')));
    for(const batch of snapshots){
      assert(csv.split('\n').some(line=>line.includes('"近30天快照"')&&
        line.includes('"'+batch.date+'","","'+batch.amount+'"')));
    }
    await page.locator('[data-channel-snapshot]').click();
    assert.deepEqual(await page.evaluate(()=>[state.platform,state.marketPeriod,state.startMonth,state.endMonth]),
      ['ml','snapshot','2026-01','2026-10']);
    assert.equal(await page.locator('[data-overview-slot="kpis"] [data-lifetime-units]').innerText(),format(cumulative)+' 台');
    await go({marketPeriod:'monthly'});
    assert.equal(await page.locator('[data-ml-period-overview] [data-lifetime-units]').innerText(),format(cumulative)+' 台');
    await go({marketPeriod:'snapshot'});
    const peak=page.locator('[data-ml-band][data-market-value]:not([disabled])').filter({hasText:/\d–\d/}).first();
    const band=await peak.getAttribute('data-ml-band');
    await peak.click();
    const products=await page.locator('[data-market-detail-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.marketDetailProduct));
    const expected=await page.evaluate(key=>{
      const result=Mercado.report(state);
      return result.all.filter(row=>result.bandFor(row)===key).map(row=>row.product_code);
    },band);
    assert.deepEqual(products,expected);

    await go({view:'products',mlMin:'1000000',mlMax:'2000000',evidenceStatus:'positive'});
    assert.equal(await page.locator('.ml-product').count(),0);
    await page.locator('#country').selectOption('AR');
    assert.deepEqual(await page.evaluate(()=>[state.mlMin,state.mlMax,state.evidenceStatus,Mercado.currencyFor(state.country)]),['','','all','USD']);
    await page.locator('.ml-product').first().waitFor();

    await go({country:'US',platform:'amazon',category:'fabric'});
    await page.locator('[data-quote-price-bands] [data-wb-band]').first().waitFor();
    assert.match(await page.locator('[data-quote-price-bands]').innerText(),/商品数分布/);
    const counts=await page.locator('[data-quote-price-bands] [data-wb-band]').evaluateAll(nodes=>
      nodes.map(node=>Number(node.getAttribute('aria-label')?.match(/(\d+)件商品/)?.[1])));
    assert(counts.every(count=>count>0));
    assert.equal(await page.locator('[data-share-chart="price"][data-share-state]').count(),0);
    const noNovember={dataset:'2026-11',startMonth:'2026-11',endMonth:'2026-11',marketPeriod:'monthly'};
    const amazonScopes=[['CA','vacuum'],['CA','wash'],['CA','fabric'],['US','vacuum'],['US','wash'],['MX','wash']];
    for(const [country,category] of amazonScopes){
      await go({country,category,platform:'amazon',...noNovember});
      assert.deepEqual((await headline()).slice(0,2),['—','—']);
      const shortcut=page.locator('[data-amazon-latest-month]');
      const month=await shortcut.getAttribute('data-amazon-latest-month');
      assert(month<'2026-11',country+'/'+category);
      await shortcut.click();
      assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),month+'|'+month);
      assert((await headline()).slice(0,2).every(value=>value!=='—'),country+'/'+category);
      assert.equal(await page.locator('[data-amazon-month-notice]').count(),0);
    }
    await go({country:'CA',category:'fabric',platform:'amazon',...noNovember});
    await page.locator('[data-amazon-latest-month]').click();
    await page.reload({waitUntil:'domcontentloaded'});
    assert.notEqual((await headline())[0],'—');
    await page.goBack();
    assert.equal(await page.evaluate(()=>state.dataset),'2026-11');
    assert.deepEqual((await headline()).slice(0,2),['—','—']);
    assert.equal(await page.locator('[data-amazon-latest-month]').count(),1);

    await go({country:'MX',category:'wash',platform:'all',...noNovember});
    const amazonPanel=page.locator('[data-market-channel="amazon"]');
    await amazonPanel.locator('[data-amazon-latest-month]').click();
    assert.equal(await page.evaluate(()=>state.platform),'all');
    assert.notEqual(await amazonPanel.locator('[data-market-kpi="units"] strong').innerText(),'—');

    await go({country:'CA',category:'fabric',platform:'amazon',productType:'steam',
      dataset:'2026-09',startMonth:'2026-09',endMonth:'2026-09'});
    await page.locator('[data-amazon-clear-type]').click();
    assert.equal(await page.evaluate(()=>state.productType+'|'+state.dataset),'all|2026-09');
    assert.notEqual((await headline())[0],'—');

    await go({country:'CA',category:'mattress',platform:'amazon',...noNovember});
    assert.equal(await page.locator('[data-amazon-latest-month]').count(),0);
    assert.match(await page.locator('[data-amazon-month-notice]').innerText(),/暂无公开/);

    await page.setViewportSize({width:390,height:844});
    const monthlyPage=new URL('market-history/?platform=amazon&country=CA&category=fabric&startMonth=2026-11&endMonth=2026-11',base);
    await page.goto(monthlyPage.href);
    await page.locator('[data-history-latest]').click();
    assert.notEqual(await page.locator('[data-total-revenue]').innerText(),'—');
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)));

    // A price band with no rankable values in the new metric must not stay selectable.
    const archivePage=new URL('market-history/?platform=amazon&country=MX&category=vacuum&startMonth=2026-09&endMonth=2026-09',base);
    await page.goto(archivePage.href);
    const localArchive={format:'uwant-market-archive-v1',
      amazon:{date:'2026-10-15',rows:[['MX','vacuum','2026-09',10,2000000000,3]],
        rankMonths:[['MX','vacuum','2026-09',[
          ['B000000001','B000000001',10,null,1500000000,'Unit sales'],
          ['B000000002','B000000002',null,2000000000,2500000000,'Revenue'],
          ['B000000003','B000000003',0,0,3500000000,'No sales']
        ]]]},
      mercado:{observedDate:'2026-11-05',markets:{}}};
    await page.locator('#archive-file').setInputFiles({
      name:'fake-monthly-archive.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(localArchive))
    });
    await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('已读取'));
    const bandOptions=page.locator('[data-rank-band] option');
    assert.deepEqual(await bandOptions.evaluateAll(options=>options.map(option=>option.value)),['','1']);
    await page.selectOption('[data-rank-band]','1');
    await page.selectOption('[data-rank-metric]','revenue');
    assert.deepEqual(await bandOptions.evaluateAll(options=>options.map(option=>option.value)),['','2']);
    assert.equal(await page.locator('[data-rank-band]').inputValue(),'');
    assert.equal(await page.locator('[data-rank-table] tbody tr').count(),1);

    await go({country:'AR',category:'wash'});
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)));
    assert.match(await page.locator('[data-overview-platform="amazon"]').innerText(),/墨西哥/);

    const mercadoHistory=new URL('market-history/?platform=ml&country=MX&category=vacuum&scope=sample&startMonth=2026-01&endMonth=2026-10',base);
    await page.goto(mercadoHistory.href);
    const alternate=page.getByRole('link',{name:'Amazon 市场大盘',exact:true});
    assert(await alternate.isVisible());
    await alternate.click();
    await page.waitForFunction(()=>typeof state!=='undefined'&&state.platform==='amazon'&&state.page==='market');
    assert.deepEqual(await page.evaluate(()=>[state.country,state.category,state.startMonth,state.endMonth]),
      ['MX','vacuum','2026-01','2026-10']);
    const original=page.locator('[data-original-category-report]');
    assert(await original.isVisible());
    assert.equal((await headline())[0],'—');
    assert(await original.locator('[data-original-revenue]').isVisible());

    await page.locator('[data-overview-platform="all"]').click();
    const amazonOriginal=page.locator('[data-market-channel="amazon"] [data-original-category-report]');
    await amazonOriginal.waitFor();
    assert(await amazonOriginal.isVisible());
    await page.locator('[data-overview-platform="ml"]').click();
    await page.waitForFunction(()=>state.platform==='ml');
    assert(await page.locator('[data-overview-platform="amazon"]').isVisible());
    await page.locator('[data-overview-platform="amazon"]').click();
    await page.waitForFunction(()=>state.platform==='amazon');
    assert.equal(await page.locator('[data-overview-platform="amazon"]').getAttribute('aria-current'),'page');
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)));

    const guide=new URL('business-guide/#country=CA&platform=amazon&category=fabric&startMonth=2026-01&endMonth=2026-09',base);
    await page.goto(guide.href);
    await page.getByRole('link',{name:/商品月度销量/}).click();
    await page.locator('.wb-monthly').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-workspace'),'research');
    assert.deepEqual(await page.evaluate(()=>[state.country,state.platform,state.category,state.view]),
      ['CA','amazon','fabric','monthly']);
    assert(await page.locator('[data-overview-platform="amazon"]').isVisible());
    await page.locator('[data-overview-platform="amazon"]').click();
    await page.waitForFunction(()=>state.view==='overview');
    assert((await headline()).slice(0,2).every(value=>value!=='—'));
    assert.deepEqual(errors,[]);
    console.log('PASS: 36 market routes, price boundaries, occupied bands, headline totals, cumulative units, CSV, scope reset, quote fallback, Amazon month recovery and platform navigation.');
  } finally {
    await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
