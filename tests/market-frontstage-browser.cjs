/* Market UI regression: source metrics, maintenance separation, filters and personal imports. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 assert(process.argv[2],'Use an output directory outside the public checkout');
 const out=path.resolve(process.argv[2]),cwd=path.resolve('.');assert(out!==cwd&&!out.startsWith(cwd+path.sep));fs.mkdirSync(out,{recursive:true});
 const base=process.env.UWANT_TEST_BASE||'http://127.0.0.1:8833/';
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),p=await context.newPage(),errors=[],posts=[],scopes=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 const go=async(patch={})=>{await p.goto(base+'#'+new URLSearchParams({country:'BR',platform:'ml',category:'wash',own:'D600',dataset:'2026-09',page:'market',view:'overview',competitionGroup:'all',...patch}),{waitUntil:'load'});await p.waitForFunction(()=>document.body.dataset.workspace&&document.querySelector('#title').textContent);};
 const openManagement=async()=>{const menu=p.locator('#management-navigation');if(!await menu.evaluate(x=>x.open))await menu.locator(':scope>summary').click();await p.locator('.sidebar [data-view="data"]').click();await p.waitForSelector('.research-data-admin');};
 try{
  for(const platform of ['amazon','ml'])for(const country of platform==='amazon'?['MX','CA','US','BR']:['MX','BR','AR','CL','CO'])for(const category of ['wash','vacuum','fabric','mattress']){
   const own={wash:'D600',vacuum:'V500',fabric:'Y100S',mattress:'M600'}[category];await go({platform,country,category,own});await p.waitForSelector('[data-market-overview-template]');
   const actual=await p.evaluate(()=>{const c=state.platform==='ml'?null:decisionCatalog(),r=MarketDecisionModel.report(c?decisionState(c):state,c),fmt=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x);return {scope:{country:state.country,platform:state.platform,category:state.category},source:[r.revenue.total,r.units.total],expected:[fmt(r.revenue.total),fmt(r.units.total)],shown:[...document.querySelectorAll('.market-kpi>strong')].slice(0,2).map(x=>x.textContent)};});
   assert.deepEqual(actual.scope,{country,platform,category});assert.deepEqual(actual.shown,actual.expected);
   assert.deepEqual(await p.locator('[data-overview-section]>.market-block-heading h2').allTextContents(),['市场大盘','品牌与价格带','UWANT对标']);
   assert.equal(await p.locator('.decision-actions,.decision-matrix,.coverage-monitor,.shipment-overview,.decision-operating').count(),0);
   assert(!await p.locator('#management-navigation').evaluate(x=>x.open));
   await p.locator('.sidebar [data-view="products"]').click();await p.waitForSelector('#research-evidence .ml-controls,.wb-products');
   assert.equal(await p.locator('.workspace-kpis,.wb-own,.coverage-monitor,.wb-sample-note,.private-research-evidence').count(),0);
   assert(!await p.locator('.decision-extra-filters').evaluate(x=>x.open));
   scopes.push({...actual.scope,revenue:actual.source[0],units:actual.source[1]});
  }
  await go();await p.screenshot({path:path.join(out,'market-desktop.png'),fullPage:true});
  await go({country:'CA',platform:'amazon',category:'fabric',own:'Y100S',view:'products'});
  await p.locator('[data-product-brand]').selectOption('Hoover');await p.waitForFunction(()=>state.evidenceBrand==='Hoover');
  assert(await p.evaluate(()=>MarketIntelligence.productRows(decisionCatalog(),decisionState(decisionCatalog())).every(r=>r.brand==='Hoover')));
  await p.locator('.decision-extra-filters>summary').click();await p.locator('[data-wb-price-basis]').first().selectOption('source');await p.waitForFunction(()=>state.priceBasis==='source');
  const exportCount=await p.evaluate(()=>MarketWorkbench.exportRows(decisionCatalog(),decisionState(decisionCatalog())).length-1),event=p.waitForEvent('download');await p.locator('#export').click();const download=await event;await download.saveAs(path.join(out,'filtered-products.csv'));assert(exportCount>0);assert(fs.readFileSync(path.join(out,'filtered-products.csv'),'utf8').includes('Hoover'));
  await p.reload({waitUntil:'load'});assert.equal(await p.evaluate(()=>state.evidenceBrand),'Hoover');assert.equal(await p.evaluate(()=>state.priceBasis),'source');
  await p.screenshot({path:path.join(out,'products-desktop.png'),fullPage:false});
  await go({country:'CA',platform:'amazon',category:'vacuum',own:'V500',startMonth:'2026-01',endMonth:'2026-09'});await p.waitForSelector('.decision-cohort');
  assert.equal(await p.evaluate(()=>MarketDecisionModel.report(decisionState(decisionCatalog()),decisionCatalog()).units.total),38405);
  await p.locator('.sidebar [data-route="brands"]').click();await p.waitForSelector('.market-brand-performance');assert.equal(await p.locator('.market-brand-chart').count(),0);
  await go({country:'CA',platform:'amazon',category:'fabric',own:'Y100S',page:'competitors'});await p.waitForSelector('.wb-own');assert.equal(await p.locator('.wb-own').count(),1);assert.equal(await p.locator('.wb-sample-note').count(),1); // The comparison context remains accessible here.
  await go();await openManagement();assert(await p.locator('#management-navigation').evaluate(x=>x.open));assert.equal(await p.locator('.coverage-monitor').count(),1);assert.equal(await p.locator('[data-shipment-import],[data-operating-import]').count(),2);
  await p.locator('.decision-matrix>summary').click();await p.waitForSelector('[data-decision-matrix-body] tbody tr');assert.equal(await p.locator('[data-decision-matrix-body] tbody tr').count(),7);assert(await p.locator('[data-decision-scope="CA|wash"]').isDisabled());
  await p.reload({waitUntil:'load'});await p.waitForSelector('.research-data-admin');assert(await p.locator('#management-navigation').evaluate(x=>x.open));await p.locator('[data-admin-return]').click();await p.waitForSelector('[data-market-overview-template]');assert(!await p.locator('#management-navigation').evaluate(x=>x.open));
  await p.setViewportSize({width:390,height:844});await p.reload({waitUntil:'load'});await p.waitForSelector('[data-market-overview-template]');assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.screenshot({path:path.join(out,'market-mobile.png'),fullPage:false});
  await p.locator('#sidebar-menu').click();await p.locator('.sidebar [data-view="products"]').click();await p.waitForSelector('.decision-mobile-products');assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.screenshot({path:path.join(out,'products-mobile.png'),fullPage:false});
  await p.locator('#sidebar-menu').click();await openManagement();assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.screenshot({path:path.join(out,'management-mobile.png'),fullPage:false});
  const shipmentHeader=await p.evaluate(()=>UwantShipments.fields.join(','));await p.locator('[data-shipment-import]').setInputFiles({name:'test-only.csv',mimeType:'text/csv',buffer:Buffer.from(shipmentHeader+'\ns1,BR,ml,wash,2025-09,D600,200,test-only-personal-fixture,actual,complete')});await p.waitForFunction(()=>document.querySelector('[data-shipment-status]').textContent.includes('已接入 1条'));
  const operatingHeader=await p.evaluate(()=>LocalOperating.fields.join(','));await p.locator('[data-operating-import]').setInputFiles({name:'test-only.csv',mimeType:'text/csv',buffer:Buffer.from(operatingHeader+'\no1,BR,ml,wash,2025-09,D600,100,100,50,0,50,2025-09-30,test-only-personal-fixture,actual,complete')});await p.waitForFunction(()=>document.querySelector('[data-operating-status]').textContent.includes('已接入1条'));
  await p.locator('[data-admin-return]').click();await p.waitForSelector('.operating-metrics');assert.equal(await p.locator('.shipment-overview').count(),1);assert.equal(await p.locator('.decision-operating').count(),1);assert.deepEqual(await p.locator('.operating-metrics strong').allTextContents(),['200','50','100','50','2.14','66.7%']);assert.equal(await p.evaluate(()=>MarketDecisionModel.report(state).revenue.total),677169);
  await go({country:'US',platform:'amazon',category:'fabric',own:'Y100S'});assert.equal(await p.locator('.shipment-overview,.decision-operating').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({scopes,sourceMetricsMatch:true,publicDataUnchanged:true,managementOnlyCoverage:true,emptyPrivatePanelsHidden:true,realPrivateChartsPreserved:true,filtersExportRefresh:true,mobile:true,posts,errors},null,2));
  console.log('PASS: 36 country/platform/category scopes, unchanged sales metrics, front/admin separation, filters/CSV/refresh, month range, mobile and private shipment/stock charts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
