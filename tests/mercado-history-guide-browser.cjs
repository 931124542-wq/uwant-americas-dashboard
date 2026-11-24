const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const exactHash = '#country=CL&platform=ml&dataset=2026-10&startMonth=2026-01&endMonth=2026-10&historyProduct=B0F84H88C1&opsPeriod=all&researchLayer=observed&evidenceStatus=all&competitionGroup=all&shareMetric=units&shareDrill=brand%7CShark&marketPeriod=snapshot&page=market';
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
    assert.match(await summary.innerText(), /2026-01 至 2026-10/);
    assert.match(await summary.locator('[data-ml-history-sample]').innerText(),/完整月样本 1,134 台/);
    assert.equal(await page.locator('.ml-coverage-summary').innerText(),'其他近30天快照');
    assert.deepEqual((await page.locator('.market-kpi>strong').allTextContents()).slice(0,2), ['4,936,447','39']);
    assert(!page.url().includes('B0F84H88C1') && !page.url().includes('Shark'));
    const period=page.locator('#market-period');
    assert.match(await period.innerText(),/统计月份\s+2026年1月–10月/);
    await period.getByRole('button',{name:'近3个月',exact:true}).click();
    const range=await page.evaluate(()=>[state.startMonth,state.endMonth]);
    assert.deepEqual(range,['2026-08','2026-10']);
    assert.match(await page.locator('[data-ml-period-overview]').innerText(),new RegExp(range.join(' 至 ')));
    assert.deepEqual((await page.locator('.market-kpi>strong').allTextContents()).slice(0,2), ['508','—']);
    await page.goBack();
    await page.waitForFunction(()=>state.startMonth==='2026-01'&&state.endMonth==='2026-10');
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

    const desktopGuide = page.locator('.dashboard-top [data-business-guide]');
    assert.equal(await page.locator('[data-business-guide]:visible').count(),1);
    assert(await desktopGuide.evaluate(link=>link.parentElement.firstElementChild===link));
    await desktopGuide.click();
    await page.getByRole('heading',{name:'业务思维导图',exact:true}).waitFor();
    assert.equal(await page.locator('details').count(),6);
    assert.equal(await page.locator('.guide-branch').count(),3);
    await page.locator('[data-guide-scope]').waitFor();
    assert.match(await page.locator('[data-guide-scope]').innerText(),/智利.*Mercado Libre.*2026-01 至 2026-10/);
    await page.screenshot({path:output+'/guide-desktop.png'});
    await page.getByText('市场有空间吗？',{exact:true}).click();
    await page.getByRole('link',{name:'商品月度历史',exact:true}).click();
    await picker.waitFor();
    assert.match(page.url(),/country=CL.*platform=ml/);
    assert.match(page.url(),/startMonth=2026-01.*endMonth=2026-10/);
    await page.locator('.business-guide-link').click();
    await page.setViewportSize({width:390,height:844});
    await page.getByText('经营表现怎样？',{exact:true}).click();
    assert(await page.getByRole('link',{name:'经营总览',exact:true}).isVisible());
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
    await page.screenshot({path:output+'/guide-mobile.png'});
    await page.getByRole('link',{name:'经营总览',exact:true}).click();
    await page.locator('.oe-overview').waitFor();
    await page.goto(base + exactHash, {waitUntil:'domcontentloaded'});
    await summary.waitFor();
    assert(await period.isVisible());
    assert.equal(await page.locator('#scope-toggle').getAttribute('aria-expanded'),'false');
    await period.getByLabel('起始月份').fill('2026-02');
    await period.getByLabel('结束月份').fill('2026-05');
    await period.getByRole('button',{name:'应用',exact:true}).click();
    assert.match(await page.locator('[data-ml-period-overview]').innerText(),/2026-02 至 2026-05/);
    assert.deepEqual((await page.locator('.market-kpi>strong').allTextContents()).slice(0,2), ['358','—']);
    await page.reload({waitUntil:'domcontentloaded'});
    assert.match(await period.innerText(),/2026年2月–5月/);
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
    const mobileGuide=page.locator('.sidebar-top [data-business-guide]');
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      await page.evaluate(()=>window.scrollTo(0,0));
      assert.equal(await page.locator('#sidebar-menu').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('[data-business-guide]:visible').count(),1);
      assert(await mobileGuide.isVisible());
      assert(await mobileGuide.evaluate(link=>{
        const bounds=link.getBoundingClientRect();
        return bounds.top>=0&&bounds.bottom<document.querySelector('nav[aria-label="市场研究"]').getBoundingClientRect().top&&bounds.right<=innerWidth;
      }));
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
    }
    await page.screenshot({path:output+'/guide-entry-mobile.png'});
    await mobileGuide.click();
    await page.locator('[data-guide-scope]').waitFor();
    assert.match(await page.locator('[data-guide-scope]').innerText(),/智利.*2026-02 至 2026-05/);
    assert.equal(await page.locator('header [aria-current="page"]').innerText(),'思维导图');
    await page.locator('[data-guide-return]').click();
    await period.waitFor();
    assert.match(await period.innerText(),/2026年2月–5月/);
    assert.deepEqual(errors,[]);
    console.log('PASS Chile exact route, snapshot and monthly history, scoped CSV and refresh, guide and mobile layout.');
  } finally {
    await browser.close();
  }
}

run().catch(error=>{console.error(error);process.exitCode=1;});
