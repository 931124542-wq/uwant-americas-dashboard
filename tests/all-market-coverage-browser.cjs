const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const base = process.env.UWANT_TEST_BASE || 'http://127.0.0.1:8842/';
const months = {dataset:'2026-10', startMonth:'2026-01', endMonth:'2026-10'};
const format = new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2});
const value = n => n === null ? '—' : format.format(n);

async function run() {
  const out = path.resolve(process.argv[2]);
  await fs.mkdir(out,{recursive:true});
  const browser = await chromium.launch({
    executablePath:process.env.UWANT_CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)
  });
  try {
    const page = await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    const go = async route => {
      const scope = {page:'market',view:'overview',country:'MX',platform:'amazon',category:'wash',...months,...(route.platform==='ml'?{marketPeriod:'snapshot'}:{}),...route};
      await page.goto(base+'#'+new URLSearchParams(scope),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(expected => typeof state!=='undefined' &&
        ['country','platform','category','view'].every(key=>state[key]===expected[key]),scope);
    };
    await go({});
    const audit = await page.evaluate(months=>MarketValidation.audit(months,decisionCatalog),months);
    assert.equal(audit.errors,0);
    assert.equal(audit.supported,36);
    assert.equal(audit.notApplicable,20);
    assert.equal(audit.available,26);
    assert.equal(audit.salesEvidenceScopes,27);
    for (const row of audit.rows.filter(r=>r.applicable)) {
      const {country,platform,category} = row;
      const name = [country,platform,category].join('/');
      await go({country,platform,category});
      const overview = page.locator('[data-market-overview-template]');
      await overview.waitFor();
      const [revenue,units] = await overview.locator('.market-kpi>strong').allTextContents();
      assert.deepEqual([revenue,units],[value(row.revenue),value(row.units)],name);
      assert.match(await overview.locator('.market-period-tag').innerText(),new RegExp(row.currency+'$'),name);
      assert.equal(await page.locator('.market-validation,.market-reviewed-exclusions').count(),0,name);
    }
    const chile = {country:'CL',platform:'ml',category:'wash'};
    await go(chile);
    await page.locator('.ml-coverage-summary').waitFor();
    assert.match(await page.locator('.ml-coverage-summary').innerText(),/商品库 228 条.*164 个可统计销量.*8 个有销量/);
    await go({...chile,view:'products',evidenceQuery:'MLC2022458480'});
    await page.locator('.ml-workbench').waitFor();
    assert.equal(await page.locator('.ml-product').count(),0);
    await go({...chile,platform:'all',view:'products',evidenceQuery:'MLC2022458480'});
    assert.equal(await page.evaluate(()=>decisionCatalog().observed.some(r=>r.productId==='MLC2022458480')),false);
    await go({...chile,view:'data',evidenceRelation:'not_a_form'});
    await page.locator('.market-validation summary').click();
    const table = page.locator('[data-validation-body] > .table-scroll tbody tr');
    await table.first().waitFor();
    assert.equal(await table.count(),56);
    assert.match(await table.filter({hasText:'CL / Mercado Libre'}).filter({hasText:'洗地机'}).innerText(),/228\s+8 \/ 164\s+71/);
    assert.match(await page.locator('.market-local-coverage summary').innerText(),/当地零售和品牌官网/);
    await page.locator('.market-local-coverage summary').click();
    assert.match(await page.locator('.market-local-coverage').innerText(),/Liverpool México/);
    assert.match(await page.locator('.market-local-coverage').innerText(),/Best Buy Canada/);
    const download = page.waitForEvent('download');
    await page.locator('[data-validation-export]').click();
    await (await download).saveAs(out+'/all-market-validation.csv');
    const csv = await fs.readFile(out+'/all-market-validation.csv','utf8');
    assert.equal(csv.trim().split(/\r?\n/).length,57);
    assert.match(csv,/unfetchedReportedPages/);
    assert.match(csv,/"36661023"/);

    await page.setViewportSize({width:390,height:844});
    await go(chile);
    await page.locator('.ml-coverage-summary').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.ml-coverage-summary').waitFor();
    assert.equal(await page.evaluate(()=>state.country+'|'+state.platform+'|'+state.category),'CL|ml|wash');
    const selectedMonths={startMonth:'2026-09',endMonth:'2026-11',marketPeriod:'monthly'};
    const completeSamples={
      MX:[[578,373],[314,253],[7395,3430],[253,173]],
      BR:[[569,436],[3411,1981],[6108,4498],[47,205]],
      AR:[[215,11],[1917,1474],[2403,729],[213,76]],
      CL:[[72,36],[217,171],[138,541],[79,60]],
      CO:[[22,47],[53,38],[147,46],[36,8]]
    };
    const categories=['wash','vacuum','fabric','mattress'];
    await go({country:'MX',platform:'ml',category:'vacuum',...selectedMonths});
    const comparison=page.locator('.ml-month-comparison');
    await comparison.locator('summary').click();
    await comparison.locator('tbody tr').first().waitFor();
    assert.equal(await comparison.locator('tbody tr').count(),20);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    for(const [country,scopes] of Object.entries(completeSamples)){
      for(const [index,[sep,oct]] of scopes.entries()){
        const row=comparison.locator(`tr[data-country="${country}"][data-category="${categories[index]}"]`);
        const values=await row.locator('td').allTextContents();
        assert.deepEqual(values.slice(0,4),[value(sep),value(oct),'—',value(sep+oct)]);
        assert.equal(values.at(-1),'2 / 3');
      }
    }
    const comparisonDownload=page.waitForEvent('download');
    await comparison.getByRole('button',{name:'导出五国逐月样本'}).click();
    await (await comparisonDownload).saveAs(out+'/mercado-five-countries.csv');
    const comparisonCsv=await fs.readFile(out+'/mercado-five-countries.csv','utf8');
    const comparisonLines=comparisonCsv.trim().split(/\r?\n/);
    assert.equal(comparisonLines.length,61);
    assert.equal(comparisonLines.filter(line=>line.includes('"2026-11","","0"')).length,20);
    await comparison.locator('tr[data-country="AR"][data-category="fabric"] a').click();
    await page.waitForFunction(()=>state.country==='AR'&&state.category==='fabric'&&state.endMonth==='2026-11');
    assert.equal(await page.locator('[data-ml-period-overview] [data-market-kpi="units"] strong').innerText(),'3,132');

    const currencies={MX:'MXN',BR:'BRL',AR:'ARS',CL:'CLP',CO:'COP'};
    const archived={
      MX:[[1585839,28],[755059,3],[9410010,84],[25223,38]],
      BR:[[87606,67],[827543,4],[3738252,27],[13057,245]],
      AR:[[294715949,114],[106929477,7],[320606274,18],[7553971,32]],
      CL:[[36378744,17],[5234807,2],[34399615,6],[2450887,109]],
      CO:[[89239031,71],[32831320,9],[70296387,9],[1312120,59]]
    };
    for(const [country,scopes] of Object.entries(completeSamples)){
      for(const [index,[sep,oct]] of scopes.entries()){
        await go({country,platform:'ml',category:categories[index],...selectedMonths});
        const overview=page.locator('[data-ml-period-overview]');
        const snapshots=overview.locator('[data-ml-month-revenue]');
        assert.equal(await overview.locator('[data-market-kpi="units"] strong').innerText(),value(sep+oct));
        assert.equal(await overview.locator('[data-market-kpi="revenue"] strong').innerText(),'—');
        assert.equal(await overview.locator('[data-period-month="2026-11"] [data-month-sample-units]').innerText(),'—');
        const amounts=await snapshots.locator('article > strong').allTextContents();
        assert.equal(amounts.length,3,country+'/'+categories[index]);
        assert.ok(amounts.every(amount=>amount.endsWith(' '+currencies[country])));
        const previous=snapshots.locator('[data-revenue-snapshot="2026-11-05"]');
        const [amount,count]=archived[country][index];
        assert.equal(await previous.locator('strong').innerText(),value(amount)+' '+currencies[country]);
        assert.equal(await previous.locator('span').innerText(),value(count)+' 个金额样本');
        await page.getByRole('button',{name:'最近可统计月',exact:true}).click();
        assert.equal(await overview.locator('[data-market-kpi="units"] strong').innerText(),value(oct));
        assert.deepEqual(await snapshots.locator('article > strong').allTextContents(),amounts);
        assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2026-10|2026-10');
      }
    }
    await go({country:'BR',platform:'ml',category:'fabric',...selectedMonths});
    const snapshots=page.locator('[data-ml-month-revenue]');
    assert.equal(await snapshots.locator('[data-revenue-snapshot="2026-11-05"] > strong').textContent(),'3,738,252 BRL');
    assert.equal(await snapshots.locator('[data-revenue-snapshot="2026-11-06"] > strong').textContent(),'3,562,822 BRL');
    assert.equal(await snapshots.locator('[data-revenue-snapshot="2026-11-12"] > strong').textContent(),'4,139,728 BRL');
    assert.match(await snapshots.locator('[data-revenue-snapshot="2026-11-06"]').innerText(),/772 个金额样本/);
    assert.match(await snapshots.locator('[data-revenue-snapshot="2026-11-12"]').innerText(),/191 个金额样本/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    const revenueDownload=page.waitForEvent('download');
    await snapshots.getByRole('button',{name:'导出销售额快照'}).click();
    await (await revenueDownload).saveAs(out+'/mercado-br-fabric-revenue.csv');
    const revenueCsv=await fs.readFile(out+'/mercado-br-fabric-revenue.csv','utf8');
    assert.equal(revenueCsv.trim().split(/\r?\n/).length,4);
    assert.match(revenueCsv,/"2026-11-05","近30天；起止日期未提供","3738252","BRL","27"/);
    assert.match(revenueCsv,/"2026-11-06","近30天；起止日期未提供","3562822","BRL","772"/);
    assert.match(revenueCsv,/"2026-11-12","近30天；起止日期未提供","4139728","BRL","191"/);
    await page.reload({waitUntil:'domcontentloaded'});
    await snapshots.waitFor();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2026-09|2026-11');
    await page.getByRole('button',{name:'全部历史',exact:true}).click();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2024-12|2026-10');
    assert.equal(await page.locator('[data-period-month]').count(),23);
    assert.equal(await page.locator('[data-ml-period-overview] [data-market-kpi="units"] strong').innerText(),'120,791');
    await go({country:'MX',platform:'ml',category:'mattress',...selectedMonths});
    await page.getByRole('button',{name:'全部历史',exact:true}).click();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2025-09|2026-10');
    await go({country:'BR',platform:'ml',category:'mattress'});
    const archive=page.locator('.ml-archived-snapshot');
    await archive.locator('summary').click();
    assert.match(await archive.innerText(),/73 台 · 13,057 BRL/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    const archiveDownload=page.waitForEvent('download');
    await archive.getByRole('button',{name:'导出该批'}).click();
    const archiveFile=await archiveDownload;
    await archiveFile.saveAs(out+'/mercado-br-mattress-archived.csv');
    const archiveCsv=await fs.readFile(out+'/mercado-br-mattress-archived.csv','utf8');
    assert.equal(archiveCsv.trim().split(/\r?\n/).length,246);
    assert.ok(archiveCsv.trim().split(/\r?\n/).slice(1).every(line=>line.startsWith('"BR","mattress","2026-11-05"')));
    await go({country:'BR',platform:'ml',category:'mattress',...selectedMonths});
    await page.screenshot({path:out+'/market-mobile.png'});
    assert.deepEqual(errors,[]);
    const retail = await page.evaluate(months=>MarketValidation.localCatalogue(months,decisionCatalog),months);
    await fs.writeFile(out+'/audit.json',JSON.stringify({...audit,retail,browserScopes:36,mobile:true,exported:true},null,2));
    console.log('PASS all 36 market overviews agree with the audit, including missing values, original country/currency, Chile exclusions, CSV, local retail and mobile.');
  } finally {
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
