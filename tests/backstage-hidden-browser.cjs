const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 assert(process.argv[2]);const out=path.resolve(process.argv[2]);assert(out!==process.cwd()&&!out.startsWith(process.cwd()+path.sep));fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:true,executablePath:process.env.UWANT_CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try{
  const p=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[],scopes=[],base=process.env.UWANT_TEST_BASE||'http://127.0.0.1:8842/';p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  const go=async patch=>{await p.goto(base+'#'+new URLSearchParams({page:'market',view:'overview',country:'CA',platform:'amazon',category:'vacuum',dataset:'2026-09',startMonth:'2026-01',endMonth:'2026-09',competitionGroup:'all',own:'V500',...patch}),{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.body.dataset.workspace==='research'&&document.querySelector('#title').textContent);};
  const hidden=async()=>{
   const visible=await p.evaluate(()=>[...document.querySelectorAll('#research-evidence '+MarketPresentation.managementDetails.join(',#research-evidence '))].filter(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden').map(x=>x.className));assert.deepEqual(visible,[]);
   // Opening an old details element cannot bring management content back to the front.
   await p.locator('[data-backstage-only]').evaluateAll(xs=>xs.forEach(x=>{if(x.tagName==='DETAILS')x.open=true;}));
   assert.equal(await p.locator('[data-backstage-only]:visible').count(),0);
  };
  for(const platform of ['amazon','ml'])for(const [page,view]of [['market','overview'],['market','products'],['brands','overview'],['competitors','overview'],['market','monthly']]){
   const country=platform==='ml'?'BR':'CA';console.log(platform,page,view);await go({country,platform,page:view==='monthly'&&platform==='amazon'?'brands':page,view});await hidden();assert.equal(await p.locator('#management-navigation').evaluate(x=>x.open),false);scopes.push({country,platform,page:view==='monthly'&&platform==='amazon'?'brands':page,view});
   if(page==='market'&&view==='overview'){
    assert.deepEqual((await p.locator('.market-kpi>strong').allTextContents()).slice(0,2),platform==='amazon'?['5,330,501.66','38,405']:['2,672,779','4,364']);
    assert(await p.locator('.market-leaders').isVisible());if(platform==='amazon'){const history=p.locator('.decision-native-trend');assert(await history.isVisible());await history.locator(':scope>summary').click();assert(await history.locator('.market-trend,.market-trend-compact').isVisible());await history.locator(':scope>summary').click();}
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:out+'/'+platform+'-market-desktop.png',fullPage:false});
   }
   if(page==='competitors')assert(await p.locator(platform==='ml'?'.ml-comparison':'.wb-own').isVisible());
  }
  await go({country:'BR',platform:'ml',category:'mattress',own:'M600'});await hidden();await p.screenshot({path:out+'/br-mattress-desktop.png',fullPage:false});
  for(const country of ['MX','CA','US']){await go({country});await hidden();assert(await p.locator('[data-original-category-report]').isVisible());assert(await p.locator('[data-original-report-export]').isVisible());}
  const menu=p.locator('#management-navigation');await menu.locator(':scope>summary').click();await p.locator('.sidebar [data-view="data"]').click();await p.waitForSelector('.research-data-admin');assert(await p.locator('.coverage-monitor').isVisible());assert(await p.locator('.market-validation').isVisible());assert(await p.locator('.data-admin-source-report').isVisible());await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.research-data-admin');assert(await p.locator('.coverage-monitor').isVisible());
  await p.locator('[data-admin-return]').click();await p.waitForSelector('[data-market-overview-template]');await hidden();
  await p.setViewportSize({width:390,height:844});await go({country:'BR',platform:'ml',category:'mattress',own:'M600'});await hidden();assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.screenshot({path:out+'/br-mattress-mobile.png',fullPage:false});
  await go({country:'US',page:'brands',view:'monthly',dataset:'2026-08',startMonth:'',endMonth:'',historyProduct:'B0HCZJV1NJ'});await hidden();assert((await p.locator('.monthly-product').innerText()).includes('442'));assert((await p.locator('.monthly-summary').innerText()).includes('月份说明'));assert(!(await p.locator('.monthly-summary').innerText()).includes('商品月份记录'));assert(await p.locator('[data-monthly-group-reference]').isVisible());await p.screenshot({path:out+'/monthly-mobile.png',fullPage:false});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({scopes,adminPanelsHidden:true,openingDetailsCannotReveal:true,originalReportsVisible:3,sourceReportsInManagement:true,managementRefreshReturn:true,historicalChartsRetained:true,groupReferenceRetained:true,mobile:true,errors},null,2));console.log('PASS backstage hidden: ten analysis routes, BR mattress, original three-country reports, historical charts, monthly values, management access/refresh/return and mobile.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
