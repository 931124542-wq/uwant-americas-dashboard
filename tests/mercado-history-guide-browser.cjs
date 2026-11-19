const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const exactHash = '#country=CL&platform=ml&dataset=2026-10&startMonth=2026-01&endMonth=2026-10&historyProduct=B0F84H88C1&opsPeriod=all&researchLayer=observed&evidenceStatus=all&competitionGroup=all&shareMetric=units&shareDrill=brand%7CShark&page=market';
const base = process.env.UWANT_TEST_BASE || 'http://127.0.0.1:8842/';
const output = path.resolve(process.argv[2]);

async function run() {
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({
    executablePath: process.env.UWANT_CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)
  });
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}, acceptDownloads:true, reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + exactHash, {waitUntil:'domcontentloaded'});
    const summary = page.locator('[data-ml-history-summary]');
    await summary.waitFor();
    assert.match(await summary.innerText(), /2026-01 至 2026-10.*44 个商品链接/);
    assert.match(await summary.innerText(), /商品库收录 249 条/);
    assert.deepEqual((await page.locator('.market-kpi>strong').allTextContents()).slice(0,2), ['4,936,447','39']);
    assert(!page.url().includes('B0F84H88C1') && !page.url().includes('Shark'));
    await page.screenshot({path:output+'/overview.png'});

    await summary.getByRole('button', {name:'查看商品月销量'}).click();
    const picker = page.locator('[data-ml-history-product]');
    await picker.waitFor();
    assert.equal(await picker.locator('option').count(),44);
    const listing = await picker.locator('option').last().getAttribute('value');
    await picker.selectOption(listing);
    const expected = await page.evaluate(id => MERCADO_DATA.trends[id].monthly_order_series.filter(m => m.month >= '2026-01' && m.month <= '2026-10').map(m => m.month), listing);
    assert.deepEqual(await page.locator('.ml-history-panel tbody tr td:first-child').allTextContents(),expected);
    const download = page.waitForEvent('download');
    await page.locator('#export').click();
    const csv = await download;
    assert.equal(csv.suggestedFilename(), 'MercadoLibre_'+listing+'_monthly.csv');
    await csv.saveAs(output+'/history.csv');
    assert.match(await fs.readFile(output+'/history.csv','utf8'), new RegExp(listing));
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await picker.inputValue(),listing);
    await page.screenshot({path:output+'/history.png'});

    await page.locator('.business-guide-link').click();
    await page.getByRole('heading',{name:'业务资料查找图',exact:true}).waitFor();
    assert.equal(await page.locator('details').count(),6);
    await page.waitForFunction(() => {
      const img = document.querySelector('figure img');
      return img?.complete && img.naturalWidth > 0;
    });
    await page.setViewportSize({width:390,height:844});
    await page.getByText('经营表现怎样？',{exact:true}).click();
    assert(await page.getByRole('link',{name:'经营总览',exact:true}).isVisible());
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
    await page.screenshot({path:output+'/guide-mobile.png'});
    await page.getByRole('link',{name:'经营总览',exact:true}).click();
    await page.locator('.oe-overview').waitFor();
    await page.goto(base + exactHash, {waitUntil:'domcontentloaded'});
    await summary.waitFor();
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
    assert.deepEqual(errors,[]);
    console.log('PASS Chile exact route, snapshot and monthly history, scoped CSV and refresh, guide and mobile layout.');
  } finally {
    await browser.close();
  }
}

run().catch(error=>{console.error(error);process.exitCode=1;});
