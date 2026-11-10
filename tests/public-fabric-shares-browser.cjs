/* Publication acceptance: plain static package/Pages, no personal capture injection. */
const {chromium}=require('playwright'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
function csv(t){const rows=[];let row=[],v='',q=false;for(let i=0;i<t.length;i++){const x=t[i];if(x==='"'){if(q&&t[i+1]==='"'){v+='"';i++;}else q=!q;}else if(!q&&(x===','||x==='\n')){row.push(v.replace(/^\uFEFF/,''));v='';if(x==='\n'){rows.push(row);row=[];}}else if(x!=='\r'||q)v+=x;}if(v||row.length){row.push(v);rows.push(row);}return rows;}
(async()=>{
 const base=process.env.UWANT_TEST_BASE||'http://127.0.0.1:8810/',out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),p=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),checks=[],errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
 const scope={page:'market',view:'overview',country:'CA',platform:'amazon',category:'vacuum',own:'V500',dataset:'2026-09',startMonth:'2026-01',endMonth:'2026-09',competitionGroup:'all',researchLayer:'observed'};
 const go=async patch=>{await p.goto(base+'#'+new URLSearchParams({...scope,...patch}),{waitUntil:'domcontentloaded'});await p.locator('#research-evidence').waitFor();await p.waitForTimeout(160);};
 const test=async(name,fn)=>{if(process.env.ONLY&&!process.env.ONLY.split('|').some(x=>name.startsWith(x)))return;try{await fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',error:e.message});}console.log(JSON.stringify(checks.at(-1)));};
 const report=()=>p.evaluate(()=>SampleSalesShares.report(REVIEW_DATA.history,state));
 const download=async(sel,name)=>{const[d]=await Promise.all([p.waitForEvent('download'),p.locator(sel).click()]);await d.saveAs(out+'/'+name+'.csv');return csv(fs.readFileSync(out+'/'+name+'.csv','utf8'));};
 await test('Published-history shares use one 47-parent-month denominator in both charts',async()=>{
  await go({});const r=await report();assert.equal(r.selected.length,47);assert(Math.abs(r.total-5330501.66)<.001);assert.equal(await p.locator('[data-share-chart]').count(),2);
  assert.equal(await p.evaluate(()=>window.UWANT_PRIVATE_CAPTURE?.access),'public_sanitized');assert.equal(await p.evaluate(()=>window.UWANT_PUBLISHED_RESEARCH?.publication?.scope),'normalized_product_research_only');assert.equal(await p.locator('[data-operating-country]').count(),0);await p.screenshot({path:out+'/market-overview.png',fullPage:true});
 });
 await test('Brand drill and price-band drill expose the actual component months',async()=>{
  await p.locator('[data-share-drill="brand|Levoit"]').click();assert.equal(await p.locator('.sample-share-detail tbody tr').count(),9);await p.locator('[data-share-drill="price|1"]').click();assert.equal(await p.locator('.sample-share-detail tbody tr').count(),23);await p.locator('.sample-shares').screenshot({path:out+'/shares-and-monthly-drill.png'});
 });
 await test('Downloaded share CSV and global CSV agree with visible qualified revenue',async()=>{
  const r=await report(),table=await download('[data-share-export]','qualified-share-facts'),h=table[0],facts=table.slice(1).filter(r=>r[0]==='fact');assert.equal(facts.length,r.selected.length);assert(Math.abs(facts.reduce((n,r)=>n+Number(r[h.indexOf('value')]),0)-r.total)<.001);
  for(const key of ['brand','price'])assert(Math.abs(table.slice(1).filter(r=>r[0]===key).reduce((n,r)=>n+Number(r[h.indexOf('share')]),0)-1)<1e-10);
  const global=await download('#export','market-export');assert.equal(global.slice(1).filter(r=>r[0]==='sample_share_fact').length,47);
 });
 await test('Custom native price bands, metric switch, months and channel isolation work',async()=>{
  await go({});await p.locator('.sample-share-settings > summary').click();await p.locator('[data-share-edges]').fill('0,80,160,320');await p.locator('[data-share-boundaries] button[type=submit]').click();assert.equal((await report()).bands.edges[1],80);
  await p.locator('[data-share-metric]').selectOption('units');assert.equal((await report()).metric,'units');await p.locator('#platform').selectOption('ml');assert.equal((await report()).total,null);assert.equal(await p.locator('[data-share-chart]').count(),0);assert.equal(await p.getByLabel('起始月份').inputValue(),'2026-01');
 });
 await test('No qualified CA fabric revenue produces a compact explanation, not fabricated share charts',async()=>{
  await go({category:'fabric',own:'Y200S'});assert.equal((await report()).total,null);assert.equal(await p.locator('[data-share-chart]').count(),0);assert(await p.locator('.sample-shares').evaluate(el=>el.getBoundingClientRect().height<360));await p.screenshot({path:out+'/canada-fabric-overview.png',fullPage:true});
 });
 await test('Product price distribution remains reachable from market overview',async()=>{
  await go({category:'fabric',own:'Y200S'});await p.locator('.market-inline-links [data-market-route="pricing"]').click();await p.locator('.wb-pricing').waitFor();assert.equal(await p.evaluate(()=>state.view),'pricing');await p.goBack();await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>state.view),'overview');
 });
 await test('Y200S default comparison uses exact local steam models; a selected ordinary extractor stays labeled alternative',async()=>{
  await go({page:'competitors',category:'fabric',own:'Y200S',platform:'all'});const t=await p.locator('.wb-matrix').innerText();assert(t.includes('3618C')&&t.includes('N20 Steam'));assert.equal(await p.locator('[data-operating-country]').count(),0);
  await p.screenshot({path:out+'/canada-y200s-comparison.png',fullPage:true});const id=await p.evaluate(()=>decisionCatalog().observed.find(r=>r.productId==='2513E').id);await go({page:'competitors',category:'fabric',own:'Y200S',platform:'all',evidencePicks:id});assert((await p.locator('.wb-matrix').innerText()).includes('便携抽洗替代'));
 });
 await test('PX251C public quote retains Nov5 date, CAD and out-of-stock status across detail and CSV',async()=>{
  await go({view:'products',category:'fabric',own:'Y200S',platform:'official',priceBasis:'public',evidenceQuery:'PX251C'});const id=await p.evaluate(()=>decisionCatalog().observed.find(r=>r.productId==='PX251C').id);await p.locator('.rq-product-link[data-rq-detail="'+id+'"]').click();await p.locator('#rq-dialog[open]').waitFor();const t=await p.locator('#rq-dialog').innerText();assert(t.includes('179.99')&&t.includes('2026-11-05')&&t.includes('缺货'));await p.locator('#rq-dialog').screenshot({path:out+'/px251c-quote-detail.png'});await p.keyboard.press('Escape');await p.waitForTimeout(150);
  const table=await download('[data-wb-export="products"]','px251c-products'),h=table[0],row=table[1];assert.equal(row[h.indexOf('selectedPrice')],'179.99');assert.equal(row[h.indexOf('selectedPriceDate')],'2026-11-05');assert(row[h.indexOf('quoteAvailability')].includes('缺货'));
 });
 await test('Period/navigation/Back/refresh preserve the selected interval and alternative research scope',async()=>{
  await go({view:'products',category:'fabric',own:'Y200S',platform:'all',competitionGroup:'alternative'});await p.getByLabel('起始月份').fill('2026-02');await p.getByLabel('结束月份').fill('2026-03');await p.locator('[data-month-apply]').click();await p.locator('nav[aria-label="市场研究"] [data-route="brands"]').click();await p.goBack();await p.reload();await p.locator('#research-evidence').waitFor();assert.equal(await p.getByLabel('结束月份').inputValue(),'2026-03');assert.equal(await p.evaluate(()=>state.competitionGroup),'alternative');
 });
 await test('A one-parent sample warns against interpreting 100 percent as market leadership',async()=>{
  await go({country:'MX',category:'wash',own:'D600'});assert.equal((await report()).parents,1);assert((await p.locator('.sample-share-warning').innerText()).includes('不代表'));
 });
 await test('Mobile shares and product comparison fit 390px and keep source access',async()=>{
  await p.setViewportSize({width:390,height:844});await go({});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:out+'/mobile-shares.png',fullPage:true});await go({page:'competitors',category:'fabric',own:'Y200S',platform:'all'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:out+'/mobile-comparison.png',fullPage:true});await p.setViewportSize({width:1440,height:1000});
 });
 await test('Public scope notice and previous publication documents remain accessible',async()=>{
  await go({});await p.locator('details.scope-explanation').count();const link=p.locator('a[href="docs/public-sync-2026-11-06.md"]');assert.equal(await link.count(),1);const r=await p.request.get(base+'docs/public-sync-2026-11-05.md');assert.equal(r.status(),200);assert.deepEqual(errors,[]);
 });
 const result={passed:checks.filter(r=>r.status==='PASS').length,failed:checks.filter(r=>r.status==='FAIL').length,checks,errors};fs.writeFileSync(out+'/browser-results.json',JSON.stringify(result,null,2));await b.close();if(result.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
