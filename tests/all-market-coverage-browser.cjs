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
      const scope = {page:'market',view:'overview',country:'MX',platform:'amazon',category:'wash',...months,...route};
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
