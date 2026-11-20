const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const base = process.env.UWANT_TEST_BASE || 'http://127.0.0.1:8842/';
const mexico = '#country=MX&platform=ml&category=vacuum&page=market';
const out = path.resolve(process.argv[2]);

async function run() {
  const browser = await chromium.launch({
    executablePath:process.env.UWANT_CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)
  });
  try {
    await fs.mkdir(out,{recursive:true});
    const page = await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+mexico,{waitUntil:'domcontentloaded'});
    const card = page.locator('.ml-coverage-summary');
    await card.waitFor();
    assert.match(await card.innerText(),/商品库 294 条.*138 个可统计销量.*5 个有销量.*32 条公开商品资料/);
    assert.deepEqual((await page.locator('.market-kpi>strong').allTextContents()).slice(0,2),['117,092','8']);
    const supplement = card.locator('[data-ml-extra-snapshot]');
    assert.match(await supplement.innerText(),/117 个统计样本.*20 个有销量/);
    assert.match(await supplement.innerText(),/499 台 · 1,091,300 MXN/);
    const pending = page.waitForEvent('download');
    await supplement.getByRole('button',{name:'导出该批'}).click();
    const file = await pending;
    await file.saveAs(out+'/nov12.csv');
    const csv = await fs.readFile(out+'/nov12.csv','utf8');
    assert.equal(csv.trim().split(/\r?\n/).length,118);
    assert(!csv.includes('2026-11-06'));
    await page.screenshot({path:out+'/mexico-overview.png'});

    await card.getByRole('button',{name:'查看商品库'}).click();
    const search = page.locator('[data-ml-query]');
    await search.fill('MLM49842392');
    const product = page.locator('.ml-product');
    assert.equal(await product.count(),1);
    assert.match(await product.innerText(),/Shark BU3120LAA.*公开商品页/s);
    assert.equal(await product.locator('a').getAttribute('href'),'https://www.mercadolibre.com.mx/shark-aspiradora-inalambrica-clean-empty-con-vaciado-automatico-hepa-9997-40-min-500x-menos-polvo-powerfins-autolimpiante-aspiradora-de-mano-desmontable-bu3120laa/p/MLM49842392');
    await search.fill('MLM2003963698');
    assert.equal(await product.count(),0,'Reviewed accessory cannot enter catalogue');
    const sources = await page.evaluate(()=>MERCADO_DATA.records.filter(r=>r.catalogueOnly).map(r=>[r.country,r.category,r.orders_last_30_days,r.revenue_last_30_days,r.counted]));
    assert.equal(sources.length,32);
    assert(sources.every(([country,category,units,revenue,counted])=>country==='MX'&&category==='vacuum'&&units===null&&revenue===null&&counted===false));

    await page.setViewportSize({width:390,height:844});
    await page.goto(base+mexico,{waitUntil:'domcontentloaded'});
    await card.waitFor();
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({path:out+'/mexico-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS Mexico market coverage, separate batches and export, source-backed catalogue, accessory isolation and mobile.');
  } finally {
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
