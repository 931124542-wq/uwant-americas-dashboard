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
      if(platform==='ml')assert.equal(await overview.locator('[data-lifetime-revenue]').innerText(),'—',name);
    }
    const chile = {country:'CL',platform:'ml',category:'wash'};
    await go(chile);
    await page.locator('.ml-coverage-summary').waitFor();
    assert.equal(await page.locator('.ml-coverage-summary').innerText(),'其他近30天数据');
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
    assert.match(await page.locator('.market-local-coverage summary').innerText(),/线下零售和品牌官网/);
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
    const allLifetimeDownload=page.waitForEvent('download');
    await comparison.getByRole('button',{name:'导出五国累计销量'}).click();
    await (await allLifetimeDownload).saveAs(out+'/mercado-five-countries-lifetime.csv');
    const allLifetimeCsv=await fs.readFile(out+'/mercado-five-countries-lifetime.csv','utf8');
    assert.equal(allLifetimeCsv.trim().split(/\r?\n/).length,21);
    assert.match(allLifetimeCsv,/"巴西","Mercado Libre","布艺清洗机","2026-11-05","2026-11-12","144664","790","","BRL"/);
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
    const lifetime={
      MX:[[6261,382],[17569,246],[63768,342],[4321,323]],
      BR:[[8230,194],[112813,1513],[144664,790],[2579,250]],
      AR:[[4679,256],[47779,408],[27285,66],[1841,119]],
      CL:[[1934,178],[19302,226],[1201,34],[3627,256]],
      CO:[[874,501],[4521,116],[493,100],[1403,237]]
    };
    const conflicts={MX:[7,3,3,0],BR:[0,3,4,2],AR:[1,6,6,2],CL:[0,4,0,0],CO:[2,2,0,1]};
    for(const [country,scopes] of Object.entries(completeSamples)){
      for(const [index,[sep,oct]] of scopes.entries()){
        await go({country,platform:'ml',category:categories[index],...selectedMonths});
        const overview=page.locator('[data-ml-period-overview]');
        const cumulative=overview.locator('[data-ml-lifetime]');
        const [total,groups]=lifetime[country][index];
        assert.equal(await cumulative.locator('[data-lifetime-units]').innerText(),value(total)+' 台');
        assert.equal(await cumulative.locator('[data-lifetime-revenue]').innerText(),'—');
        const flag=cumulative.locator('[data-lifetime-review]');
        const conflictCount=conflicts[country][index];
        if(conflictCount)assert.match(await flag.innerText(),new RegExp('有 '+conflictCount+' 款商品'));
        else assert.equal(await flag.count(),0);
        assert.equal(await cumulative.locator('[data-backstage-only]:visible').count(),0);
        assert.match(await cumulative.locator('[data-backstage-only]').textContent(),new RegExp(value(groups)+' 个去重商品组'));
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
        assert.equal(await previous.locator('span').textContent(),value(count)+' 款商品有销售额数据');
        assert.equal(await previous.locator('span').isVisible(),false);
        await page.getByRole('button',{name:'最近1个月',exact:true}).click();
        assert.equal(await overview.locator('[data-market-kpi="units"] strong').innerText(),value(oct));
        assert.equal(await cumulative.locator('[data-lifetime-units]').innerText(),value(total)+' 台');
        assert.deepEqual(await snapshots.locator('article > strong').allTextContents(),amounts);
        assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2026-10|2026-10');
      }
    }
    await go({country:'BR',platform:'ml',category:'fabric',...selectedMonths});
    const snapshots=page.locator('[data-ml-month-revenue]');
    const lifetimeDownload=page.waitForEvent('download');
    await page.getByRole('button',{name:'导出累计数据'}).click();
    await (await lifetimeDownload).saveAs(out+'/mercado-br-fabric-lifetime.csv');
    const lifetimeCsv=await fs.readFile(out+'/mercado-br-fabric-lifetime.csv','utf8');
    assert.equal(lifetimeCsv.trim().split(/\r?\n/).length,791);
    assert.match(lifetimeCsv,/"MLB26797988","[^"]+","2026-11-12","69031","","BRL"/);
    assert.equal(lifetimeCsv.trim().split(/\r?\n/).filter(line=>line.includes('历史月销量之和超过累计销量，待核')).length,4);
    assert.equal(await snapshots.locator('[data-revenue-snapshot="2026-11-05"] > strong').textContent(),'3,738,252 BRL');
    assert.equal(await snapshots.locator('[data-revenue-snapshot="2026-11-06"] > strong').textContent(),'3,562,822 BRL');
    assert.equal(await snapshots.locator('[data-revenue-snapshot="2026-11-12"] > strong').textContent(),'4,139,728 BRL');
    assert.equal(await snapshots.locator('[data-backstage-only]:visible').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    const revenueDownload=page.waitForEvent('download');
    await snapshots.getByRole('button',{name:'导出销售额数据'}).click();
    await (await revenueDownload).saveAs(out+'/mercado-br-fabric-revenue.csv');
    const revenueCsv=await fs.readFile(out+'/mercado-br-fabric-revenue.csv','utf8');
    assert.equal(revenueCsv.trim().split(/\r?\n/).length,4);
    assert.match(revenueCsv,/"2026-11-05","近30天；起止日期未提供","3738252","BRL","27"/);
    assert.match(revenueCsv,/"2026-11-06","近30天；起止日期未提供","3562822","BRL","772"/);
    assert.match(revenueCsv,/"2026-11-12","近30天；起止日期未提供","4139728","BRL","191"/);
    await page.reload({waitUntil:'domcontentloaded'});
    await snapshots.waitFor();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2026-09|2026-11');
    await page.getByRole('button',{name:'全部时间',exact:true}).click();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2024-12|2026-10');
    assert.equal(await page.locator('[data-period-month]').count(),23);
    assert.equal(await page.locator('[data-ml-period-overview] [data-market-kpi="units"] strong').innerText(),'120,791');
    await go({country:'MX',platform:'ml',category:'mattress',...selectedMonths});
    await page.getByRole('button',{name:'全部时间',exact:true}).click();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2025-09|2026-10');

    await page.setViewportSize({width:1440,height:960});
    await go({country:'BR',platform:'ml',category:'fabric',...selectedMonths});
    await page.locator('#platform').selectOption('all');
    const allChannels=page.locator('[data-market-overview-template="all-channels"]');
    const mlChannel=allChannels.locator('[data-market-channel="ml"]');
    const amazonChannel=allChannels.locator('[data-market-channel="amazon"]');
    await allChannels.waitFor();
    assert.equal(await page.evaluate(()=>state.platform+'|'+state.startMonth+'|'+state.endMonth),'all|2026-09|2026-11');
    assert.equal(await mlChannel.locator('[data-market-kpi="units"] strong').innerText(),'10,606');
    assert.match(await mlChannel.locator('[data-market-kpi="units"] span').innerText(),/期间总销量/);
    assert.equal(await mlChannel.locator('[data-lifetime-units]').innerText(),'144,664 台');
    assert.match(await mlChannel.locator('[data-lifetime-review]').innerText(),/有 4 款商品/);
    assert.equal(await mlChannel.locator('[data-period-month="2026-09"] [data-month-sample-units]').innerText(),'6,108 台');
    assert.equal(await mlChannel.locator('[data-period-month="2026-10"] [data-month-sample-units]').innerText(),'4,498 台');
    assert.equal(await mlChannel.locator('[data-period-month="2026-11"] [data-month-sample-units]').innerText(),'—');
    assert.equal(await mlChannel.locator('[data-revenue-snapshot="2026-11-12"] > strong').innerText(),'4,139,728 BRL');
    assert.equal(await amazonChannel.locator('[data-market-kpi="revenue"] strong').innerText(),'—');
    const channelDownload=page.waitForEvent('download');
    await page.locator('#export').click();
    await (await channelDownload).saveAs(out+'/br-fabric-sales-by-channel.csv');
    const salesByChannel=await fs.readFile(out+'/br-fabric-sales-by-channel.csv','utf8');
    assert.match(salesByChannel,/"自然月","BR","Mercado Libre","fabric","BRL","2026-09","2026-11","2026-09","","6108",""/);
    assert.match(salesByChannel,/"上架以来累计","BR","Mercado Libre","fabric","BRL","","","","2026-11-05 至 2026-11-12","144664",""/);
    assert.match(salesByChannel,/4 个商品组的销量档案待核/);
    assert.match(salesByChannel,/"近30天快照","BR","Mercado Libre","fabric","BRL","","","","2026-11-12","","4139728"/);
    await page.screenshot({path:out+'/all-channels-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    await page.screenshot({path:out+'/all-channels-mobile.png'});
    await page.getByRole('button',{name:'全部时间',exact:true}).click();
    assert.equal(await mlChannel.locator('[data-market-kpi="units"] strong').innerText(),'120,791');
    await page.reload({waitUntil:'domcontentloaded'});
    await allChannels.waitFor();
    assert.equal(await page.evaluate(()=>state.startMonth+'|'+state.endMonth),'2024-12|2026-10');
    await page.goBack({waitUntil:'domcontentloaded'});
    assert.equal(await mlChannel.locator('[data-market-kpi="units"] strong').innerText(),'10,606');

    for(const [country,scopes] of Object.entries(completeSamples)){
      for(const [index,[sep,oct]] of scopes.entries()){
        await go({country,platform:'all',category:categories[index],...selectedMonths});
        assert.equal(await mlChannel.locator('[data-market-kpi="units"] strong').innerText(),value(sep+oct));
        assert.equal(await mlChannel.locator('[data-lifetime-units]').innerText(),value(lifetime[country][index][0])+' 台');
        assert.equal(await amazonChannel.count(),['MX','BR'].includes(country)?1:0);
      }
    }
    await go({country:'MX',platform:'all',category:'wash',...selectedMonths});
    assert.equal(await amazonChannel.locator('[data-market-kpi="units"] strong').innerText(),'308');
    assert.equal(await amazonChannel.locator('[data-market-kpi="revenue"] strong').innerText(),'2,418,839.9');
    assert.equal(await mlChannel.locator('[data-market-kpi="units"] strong').innerText(),'951');
    await go({country:'CA',platform:'all',category:'fabric'});
    const amazonOnly=page.locator('[data-market-overview-template]');
    await amazonOnly.waitFor();
    assert.equal(await allChannels.count(),0);
    assert.equal(await amazonOnly.locator('[data-market-kpi="revenue"] strong').innerText(),'8,635,388.45');
    assert.equal(await amazonOnly.locator('[data-market-kpi="units"] strong').innerText(),'74,154');

    await go({country:'BR',platform:'ml',category:'mattress'});
    const archive=page.locator('.ml-archived-snapshot');
    await page.locator('.ml-coverage-summary>summary').click();
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
    await go({country:'BR',platform:'ml',category:'fabric',view:'products',evidenceQuery:'MLB26797988'});
    const listing=page.locator('.ml-product');
    await listing.getByText('商品信息与来源',{exact:true}).click();
    assert.match(await listing.innerText(),/上架以来累计销量 69,031 台 · 2026-11-12 采集/);
    const listedSnapshots=listing.locator('[data-ml-listing-snapshots]');
    assert.deepEqual(await listedSnapshots.locator('time').allTextContents(),['2026-11-05','2026-11-06','2026-11-12']);
    assert.match(await listedSnapshots.locator('[data-ml-observation-date="2026-11-05"]').innerText(),/539\.9 BRL.*2,239 台.*1,167,719 BRL/);
    assert.match(await listedSnapshots.locator('[data-ml-observation-date="2026-11-12"]').innerText(),/539\.9 BRL.*3,223 台.*1,660,259 BRL/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);

    await go({country:'MX',category:'fabric',view:'products',evidenceDetail:'amazon:mx:B0D11TKT2Z'});
    const priceArchive=page.locator('#rq-dialog [data-amazon-price-archive]');
    await priceArchive.getByText('历史价格参考 · 10 个月',{exact:true}).click();
    assert.equal(await priceArchive.locator('tbody tr').count(),10);
    assert.match(await priceArchive.locator('thead').innerText(),/来源月度价格 \/ MXN/);
    assert.match(await priceArchive.locator('[data-archive-month="2026-01"]').innerText(),/3,199\s+3,162\.43/);
    assert.match(await priceArchive.locator('[data-archive-month="2026-10"]').innerText(),/更新时该月尚未结束/);
    assert.equal(await priceArchive.getByText(/销量|销售额/).count(),0);
    const priceDownload=page.waitForEvent('download');
    await priceArchive.getByRole('button',{name:'导出历史价格参考'}).click();
    await (await priceDownload).saveAs(out+'/amazon-mx-product-prices.csv');
    const priceCsv=await fs.readFile(out+'/amazon-mx-product-prices.csv','utf8');
    assert.equal(priceCsv.trim().split(/\r?\n/).length,11);
    assert.match(priceCsv,/"MX","Amazon","fabric","B0D11TKT2Z","2026-01","2026-10-30","MXN","3199","3162\.43"/);
    assert.doesNotMatch(priceCsv,/销售额|销量/);
    assert.equal(await page.locator('.private-research-evidence:visible').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    await page.screenshot({path:out+'/amazon-price-archive-mobile.png'});
    const archiveCoverage=await page.evaluate(()=>{
      const listingKeys=new Map(UWANT_PUBLISHED_RESEARCH.cachedCalendar.map(r=>[
        [r.country,r.category,r.asin].join('|'),{country:r.country,platform:'amazon',category:r.category,productId:r.asin}
      ]));
      return {
        products:[...listingKeys.values()].length,
        prices:[...listingKeys.values()].flatMap(r=>ResearchArchive.publicPrices(r)).length,
        mercadoListings:MERCADO_DATA.records.filter(r=>ResearchSnapshot.observations(r).length>1).length,
        mxJanuary:ResearchArchive.publicPrices({country:'MX',platform:'amazon',category:'fabric',productId:'B0D11TKT2Z'},
          {startMonth:'2026-01',endMonth:'2026-01'}).map(r=>r.price)
      };
    });
    assert.deepEqual(archiveCoverage,{products:22,prices:220,mercadoListings:1550,mxJanuary:[3199]});
    assert.equal(await page.locator('.seller-monthly-controls').count(),0);
    const sellerUrl=new URL(base);
    sellerUrl.searchParams.set('research','seller');
    sellerUrl.hash=new URLSearchParams({
      page:'market',view:'overview',country:'MX',platform:'all',category:'vacuum',...selectedMonths
    }).toString();
    await page.goto(sellerUrl.href,{waitUntil:'domcontentloaded'});
    const seller=page.locator('[data-seller-monthly]');
    const localFile=page.locator('.seller-monthly-controls input[type="file"]');
    await localFile.waitFor({state:'attached'});
    assert.equal(await seller.count(),0);
    const fact={country:'MX',category:'vacuum',currency:'MXN',month:'2026-10',form:'dry',units:17,revenue:1240.5,
      parentAsin:'B0TEST0001',asins:['B0TEST0001'],brand:'Study sample',retrievedAt:'2026-11-24'};
    const file=(rows)=>({name:'research.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify({format:'uwant-sellersprite-monthly-v1',facts:rows}))});
    const requestLeak=[];
    page.on('request',request=>{
      if([request.url(),request.postData()||''].some(value=>value.includes(fact.parentAsin))) requestLeak.push(request.url());
    });
    await localFile.setInputFiles(file([fact]));
    await seller.waitFor();
    assert.equal(await seller.locator('[data-seller-kpi="units"] strong').innerText(),'17');
    assert.equal(await seller.locator('[data-seller-kpi="revenue"] strong').innerText(),'1,240.5');
    assert.equal(await seller.locator('tr[data-period-month="2026-11"] td').allTextContents().then(row=>row.join('|')),'—|—');
    assert.equal(await page.locator('[data-market-channel="ml"] [data-market-kpi="units"] strong').innerText(),'567');
    const importedDownload=page.waitForEvent('download');
    await seller.getByRole('button',{name:'导出本机月度样本'}).click();
    await (await importedDownload).saveAs(out+'/imported-seller-study.csv');
    assert.match(await fs.readFile(out+'/imported-seller-study.csv','utf8'),/"B0TEST0001","B0TEST0001","Study sample","17","1240.5"/);
    await localFile.setInputFiles(file([fact,fact]));
    await page.getByRole('status').filter({hasText:'重复的商品组月度记录'}).waitFor();
    assert.equal(await seller.locator('[data-seller-kpi="units"] strong').innerText(),'17');
    await page.setViewportSize({width:1440,height:960});
    await page.locator('#platform').selectOption('ml');
    assert.equal(await seller.count(),0);
    await page.locator('#platform').selectOption('all');
    assert.equal(await seller.locator('[data-seller-kpi="units"] strong').innerText(),'17');
    await page.reload({waitUntil:'domcontentloaded'});
    await localFile.waitFor({state:'attached'});
    assert.equal(await seller.count(),0);
    assert.deepEqual(requestLeak,[]);
    assert.deepEqual(errors,[]);
    const retail = await page.evaluate(months=>MarketValidation.localCatalogue(months,decisionCatalog),months);
    await fs.writeFile(out+'/audit.json',JSON.stringify({...audit,retail,browserScopes:36,mobile:true,exported:true},null,2));
    console.log('PASS all 36 market overviews agree with the audit, including missing values, original country/currency, Chile exclusions, CSV, local retail and mobile.');
  } finally {
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
