/* Assert the final visible DOM after every presentation layer has mounted. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 assert(process.argv[2]);const out=path.resolve(process.argv[2]);assert(out!==process.cwd()&&!out.startsWith(process.cwd()+path.sep));fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:true,executablePath:process.env.UWANT_CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try{
  const p=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[],base=process.env.UWANT_TEST_BASE||'http://127.0.0.1:8842/';p.on('pageerror',e=>errors.push(e.message));
  const go=async patch=>{await p.goto(base+'#'+new URLSearchParams({page:'market',view:'overview',country:'CA',platform:'amazon',category:'vacuum',dataset:'2026-09',startMonth:'2026-01',endMonth:'2026-09',competitionGroup:'all',own:'V500',...(patch.platform==='ml'?{marketPeriod:'snapshot'}:{}),...patch}),{waitUntil:'domcontentloaded'});await p.waitForSelector(patch?.view==='monthly'?'.monthly-product':'[data-market-overview-template]');};
  for(const patch of [{},{country:'BR',platform:'ml'},{country:'US',category:'fabric',own:'Y100S'}]){
   await go(patch);const available=await p.evaluate(()=>{const c=state.platform==='ml'?null:decisionCatalog();return MarketOverviewLayout.leaderRows({...state,marketTop:'20'},c,MarketDecisionModel.report(c?decisionState(c):state,c)).rows.length;});assert(available>5);assert.equal(await p.locator('.market-leaders tbody tr').count(),Math.min(10,available));await p.locator('[data-overview-top]').selectOption('5');assert.equal(await p.locator('.market-leaders tbody tr').count(),5);await p.locator('[data-overview-top]').selectOption('10');assert.equal(await p.locator('.market-leaders tbody tr').count(),Math.min(10,available));
   await p.locator('[data-overview-top]').selectOption('20');const count=await p.locator('.market-leaders tbody tr').count();assert.equal(count,available);assert.equal(new URLSearchParams(new URL(p.url()).hash.slice(1)).get('marketTop'),'20');
   await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('[data-overview-top]');assert.equal(await p.locator('[data-overview-top]').inputValue(),'20');assert.equal(await p.locator('.market-leaders tbody tr').count(),count);
   await p.goBack();await p.waitForFunction(()=>document.querySelector('[data-overview-top]')?.value==='10');assert.equal(await p.locator('.market-leaders tbody tr').count(),Math.min(10,available));await p.goForward();await p.waitForFunction(()=>document.querySelector('[data-overview-top]')?.value==='20');
  }
  await go({shareMetric:'revenue'});
  const overviewLinks=await p.locator('.market-leaders .market-product-link').evaluateAll(links=>links.map(link=>link.href));
  assert.equal(overviewLinks.length,10);
  assert(overviewLinks.every(url=>/^https:\/\/www\.amazon\.ca\/dp\/[A-Z0-9]{10}$/.test(url)));
  const band=p.locator('[data-share-drill="price|1"]');
  await band.click();
  const amazonRank=p.locator('.sample-share-detail [data-market-ranking]');
  assert.equal(await amazonRank.locator('tbody tr').count(),7);
  assert.equal(await amazonRank.locator('tbody .market-product-link[href^="https://www.amazon.ca/dp/"]').count(),7);
  const revenues=await amazonRank.locator('tbody tr td:last-child').allTextContents();
  const asNumbers=revenues.map(value=>Number(value.replaceAll(',','')));
  assert(asNumbers.every((value,i)=>value>0&&(!i||asNumbers[i-1]>=value)));
  assert.equal(new Set(await amazonRank.locator('[data-ranked-product]').evaluateAll(rows=>rows.map(row=>row.dataset.rankedProduct))).size,7);
  await go({country:'MX',platform:'ml',shareMetric:'revenue'});
  const categoryArchive=new URL(await p.locator('[data-ml-category-archive]').getAttribute('href'),p.url());
  assert.equal(categoryArchive.origin,new URL(p.url()).origin);
  assert(categoryArchive.pathname.endsWith('/market-history/'));
  assert.deepEqual(Object.fromEntries(categoryArchive.searchParams),{platform:'ml',country:'MX',category:'vacuum',startMonth:'2026-01',endMonth:'2026-09',scope:'category'});

  const supplemental=p.locator('[data-ml-batch="2026-11-12"]');
  assert.match(await supplemental.innerText(),/499 台 · 1,091,300 MXN/);
  assert.match(await supplemental.innerText(),/20 款有销量 · 20 款有销售额/);
  await supplemental.getByRole('button',{name:'查看该日榜单'}).click();
  assert.equal(await supplemental.locator('[data-market-ranking] tbody tr').count(),10);
  assert.equal(await supplemental.locator('[data-market-ranking] tbody .market-product-link').count(),10);
  await supplemental.locator('[data-ml-batch-metric]').selectOption('units');
  assert.equal(await supplemental.locator('[data-market-ranking] h3').innerText(),'销量 Top 10');
  const reviewed=await p.evaluate(()=>Mercado.rows(state).filter(r=>r.catalogueOnly&&r.sourceDate==='2026-11-24').map(r=>[r.form,r.counted,r.selling_price,r.orders_last_30_days,r.revenue_last_30_days]));
  assert.equal(reviewed.length,8);
  assert(reviewed.every(r=>JSON.stringify(r)===JSON.stringify(['stick',false,null,null,null])));
  assert.equal(await p.locator('.market-kpi>strong').first().innerText(),'117,092');

  await p.locator('[data-ml-band="4000 – < 8000"]').click();
  const mlRank=p.locator('[data-ml-detail] [data-market-ranking]');
  assert.equal(await mlRank.locator('tbody tr').count(),1);
  assert.equal(await mlRank.locator('[data-ranked-product]').first().getAttribute('data-ranked-product'),'MLM72234235');
  const productLink=mlRank.getByRole('link',{name:/UWANT.*V500/i});
  const destination=new URL(await productLink.getAttribute('href'));
  assert.equal(destination.hostname,'www.mercadolibre.com.mx');
  assert(destination.pathname.endsWith('/p/MLM72234235'));
  assert.equal(destination.searchParams.get('pdp_filters'),'item_id:MLM5603603324');
  assert.equal(destination.searchParams.has('ua'),false);
  await p.context().route('https://www.mercadolibre.com.mx/**',route=>route.fulfill({body:'Product page destination',contentType:'text/plain'}));
  const nextTab=p.waitForEvent('popup');
  await productLink.click();
  const popup=await nextTab;
  await popup.waitForURL(destination.href);
  assert.equal(await p.locator('[data-ml-detail] .market-price-detail-all tbody tr').count(),4);
  await popup.close();
  await go({country:'BR',platform:'ml',category:'fabric',own:'Y100S',marketPeriod:'monthly',startMonth:'2026-09',endMonth:'2026-11'});
  const monthlyRank=p.locator('[data-market-ranking]');
  assert((await monthlyRank.innerText()).includes('销量 Top 10'));
  assert.equal(await p.locator('[data-ml-category-archive]').count(),0);
  assert((await p.locator('[data-ml-sample-history]').getAttribute('href')).includes('category=fabric'));

  assert.equal(await monthlyRank.getByRole('columnheader',{name:'销量（台）'}).count(),1);
  assert.equal(await monthlyRank.getByRole('columnheader',{name:/销售额|报价/}).count(),0);
  const monthlyLinks=await monthlyRank.locator('.market-product-link').evaluateAll(links=>links.map(link=>new URL(link.href).hostname));
  assert.equal(monthlyLinks.length,await monthlyRank.locator('tbody tr').count());
  assert(monthlyLinks.length>0&&monthlyLinks.every(host=>host.endsWith('.mercadolivre.com.br')));
  await go({country:'BR',platform:'all',category:'fabric',own:'Y100S',marketPeriod:'monthly',startMonth:'2026-09',endMonth:'2026-11'});
  assert((await p.locator('[data-market-channel="ml"] [data-market-ranking]').innerText()).includes('销量 Top 10'));
  // Hard-coded historical expectations: model and UI changing together cannot hide a regression.
  const expected=[['CA','vacuum','5,330,501.66','38,405'],['CA','fabric','7,251,035.25','63,676'],['US','vacuum','54,585,318.95','408,677'],['MX','wash','10,764,825.62','1,228']];
  for(const [country,category,revenue,units]of expected){await go({country,category});assert.equal(await p.locator('[data-market-kpi="revenue"]>strong').innerText(),revenue);assert.equal(await p.locator('[data-market-kpi="units"]>strong').innerText(),units);}
  // Use synthetic ranks only. No personal MCP response or source report is a test fixture.
  await go({});await p.evaluate(()=>{const c=decisionCatalog(),id=MarketWorkbench.rows(c,MarketIntelligence.cleanScope(state))[0].productId;window.UWANT_PRIVATE_CAPTURE={access:'personal_local_only',sourceRankSnapshots:['2026-08','2026-09'].map((month,i)=>({country:'CA',platform:'amazon',category:'vacuum',month,categoryId:'synthetic-continuity-fixture',requestedTopN:100,items:[{asin:id,title:'Synthetic test fixture',ranking:2-i,avgPrice:100}]}))};render();});
  const dynamics=p.locator('[data-overview-preserve="leaders"]');assert(await dynamics.isVisible());assert((await dynamics.innerText()).includes('重点商品同榜单变化'));assert((await dynamics.innerText()).includes('↑ 1'));assert.equal(await p.locator('[data-market-kpi="units"]>strong').innerText(),'38,405');await p.screenshot({path:out+'/rank-module-desktop.png',fullPage:false});
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('[data-market-overview-template]');assert.equal(await p.locator('[data-overview-preserve="leaders"]').count(),0,'Synthetic/private ranks must not appear on the public page');
  await go({page:'brands',view:'monthly',country:'US',dataset:'2026-08',startMonth:'',endMonth:'',historyProduct:'B0HCZJV1NJ'});
  assert(await p.locator('[data-monthly-group-reference]').isVisible());assert((await p.locator('[data-monthly-group-reference]').innerText()).includes('不是单个ASIN销量'));assert((await p.locator('.monthly-product').innerText()).includes('442'));assert((await p.locator('.monthly-product').innerText()).includes('B0HG1XM6VL'));assert(!(await p.locator('.monthly-product').innerText()).includes('所属商品组销售额参考'));assert((await p.locator('[aria-label="区间已知样本合计"]').innerText()).includes('74,259'));
  const pending=p.waitForEvent('download');await p.locator('[data-month-export]').click();await(await pending).saveAs(out+'/monthly-source.csv');assert(fs.readFileSync(out+'/monthly-source.csv','utf8').includes('B0HCZJV1NJ'));await p.screenshot({path:out+'/group-reference-desktop.png',fullPage:false});
  await p.setViewportSize({width:390,height:844});assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.locator('.monthly-product tbody td').last().scrollIntoViewIfNeeded();await p.screenshot({path:out+'/group-reference-mobile.png',fullPage:false});
  await go({country:'BR',platform:'ml',marketTop:'20'});assert(await p.locator('[data-overview-top]').isVisible());assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.locator('.market-leaders .market-section-heading').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/top-limit-mobile.png',fullPage:false});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({topLimitsAcrossThreePaths:true,marketplaceProductLinks:true,datedSupplementalRank:true,refreshBackForward:true,fixedHistoricalBaselineScopes:expected.length,sourceRankModulePreserved:true,noPrivateRanksPublished:true,groupReferenceWithoutDoubleCounting:true,conflictingRevenueStillExcluded:true,csv:true,mobile:true,errors},null,2));console.log('PASS final-DOM continuity: Top5/10/20 on all paths, direct product links, URL/refresh/back/forward, four fixed historical totals, rank module, safe parent reference, CSV and mobile.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
