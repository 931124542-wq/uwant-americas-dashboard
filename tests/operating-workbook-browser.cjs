/* Public CI uses a synthetic OOXML workbook. Real user files are optional local-only inputs. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),cp=require('child_process'),F=require('./operating-workbook-fixture.cjs');
(async()=>{
 assert(process.argv[2]);const out=path.resolve(process.argv[2]);assert(out!==process.cwd()&&!out.startsWith(process.cwd()+path.sep));fs.mkdirSync(out,{recursive:true});
 let file=process.env.UWANT_WORKBOOK_FILE,expected={metrics:['7','9','8','0','30'],salesRows:4,channel:'Mercado Libre',channelUnits:'2',sku:'M600',skuUnits:'2'};
 if(file){assert(process.env.UWANT_WORKBOOK_EXPECTED);expected=JSON.parse(fs.readFileSync(process.env.UWANT_WORKBOOK_EXPECTED,'utf8'));}else{
  file=out+'/synthetic.xlsx';cp.execFileSync('python3',['-c',String.raw`import sys,json,zipfile,html
s=json.load(sys.stdin);esc=lambda x:html.escape(str(x),quote=True)
with zipfile.ZipFile(sys.argv[1],'w',compression=zipfile.ZIP_DEFLATED) as z:
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
 z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+''.join('<sheet name="'+esc(n)+'" sheetId="'+str(i)+'" r:id="r'+str(i)+'"/>' for i,n in enumerate(s,1))+'</sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join('<Relationship Id="r'+str(i)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+str(i)+'.xml"/>' for i in range(1,len(s)+1))+'</Relationships>')
 for i,(name,rs) in enumerate(s.items(),1):
  rows=[]
  for r in rs:
   cells=[]
   for c in r.values():
    v=c['v'];coord=c['r'];cells.append('<c r="'+coord+'"'+(' t="inlineStr"><is><t>'+esc(v)+'</t></is></c>' if isinstance(v,str) else '><v>'+str(v)+'</v></c>'))
   if cells:rows.append('<row>'+''.join(cells)+'</row>')
  z.writestr('xl/worksheets/sheet'+str(i)+'.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(rows)+'</sheetData></worksheet>')
`,file],{input:JSON.stringify(F())});
 }
 const b=await chromium.launch({headless:true,executablePath:process.env.UWANT_CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try{
  const p=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[],writes=[],base=process.env.UWANT_TEST_BASE||'http://127.0.0.1:8842/';p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()==='POST'||r.method()==='PUT')writes.push(r.url());});
  await p.goto(base+'#page=market&country=MX',{waitUntil:'domcontentloaded'});await p.waitForSelector('[data-market-overview-template]');assert.equal(await p.locator('#operations-navigation nav a:visible').count(),7);assert(!(await p.locator('#management-navigation').evaluate(x=>x.open)));
  await p.locator('#operations-navigation [data-route="overview"]').click();await p.waitForSelector('[data-ow-import]');assert.equal(new URLSearchParams(new URL(p.url()).hash.slice(1)).get('module'),'operations');
  await p.locator('[data-ow-import]').setInputFiles(file);await p.waitForSelector('body.personal-operating-active');assert.deepEqual(await p.locator('.ow-metrics strong').allTextContents(),expected.metrics);assert.equal(await p.evaluate(()=>OperatingWorkbook.load().sales.length),expected.salesRows);assert(!(await p.locator('#operations-frame').isVisible()));assert(!(await p.locator('#management-navigation').evaluate(x=>x.open)));
  await p.screenshot({path:out+'/overview-desktop.png',fullPage:false});
  await p.locator('[data-ow-filter="channel"]').selectOption(expected.channel);assert.equal(await p.locator('[data-ow-metric="units"] strong').innerText(),expected.channelUnits);assert.equal(await p.locator('[data-ow-metric="stock"] strong').innerText(),expected.metrics[1]);
  const event=p.waitForEvent('download');await p.locator('[data-ow-export]').click();await(await event).saveAs(out+'/filtered-sales.csv');assert(fs.readFileSync(out+'/filtered-sales.csv','utf8').includes(expected.channel));
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('body.personal-operating-active');assert.equal(await p.locator('[data-ow-filter="channel"]').inputValue(),expected.channel);assert.equal(await p.locator('[data-ow-metric="units"] strong').innerText(),expected.channelUnits);await p.locator('[data-ow-reset]').click();
  await p.locator('[data-ow-filter="sku"]').selectOption(expected.sku);assert.equal(await p.locator('[data-ow-metric="units"] strong').innerText(),expected.skuUnits);await p.locator('[data-ow-reset]').click();
  for(const page of ['analysis','products','inventory']){await p.locator('#operations-navigation [data-route="'+page+'"]').click();await p.waitForFunction(page=>state.page===page,page);assert(await p.locator('#operating-workbook').isVisible());assert.deepEqual(await p.locator('.ow-metrics strong').allTextContents(),expected.metrics);}
  const inventory=p.waitForEvent('download');await p.locator('[data-ow-export]').click();await(await inventory).saveAs(out+'/inventory.csv');assert(fs.readFileSync(out+'/inventory.csv','utf8').includes('stockUnits'));
  await p.screenshot({path:out+'/inventory-desktop.png',fullPage:false});
  await p.locator('[data-ow-switch]').click();await p.waitForSelector('#operations-frame:visible');assert(!(await p.locator('.ow-metrics').count()));await p.locator('[data-ow-switch]').click();await p.waitForSelector('.ow-metrics');
  await p.locator('[data-ow-import]').setInputFiles(file);await p.waitForFunction(()=>document.querySelector('[data-ow-status]').textContent.includes('同一报表'));assert.equal(await p.evaluate(()=>OperatingWorkbook.load().sales.length),expected.salesRows);
  await p.locator('[data-ow-import]').setInputFiles({name:'invalid.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('invalid workbook')});await p.waitForFunction(()=>document.querySelector('[data-ow-status]').textContent.includes('已有报表保留'));assert.equal(await p.evaluate(()=>OperatingWorkbook.load().sales.length),expected.salesRows);
  await p.locator('#operations-navigation [data-route="profit"]').click();await p.waitForSelector('#operations-frame:visible');assert.equal(await p.evaluate(()=>state.page),'profit');assert(!(await p.locator('#management-navigation').evaluate(x=>x.open)));
  await p.locator('#operations-navigation [data-route="overview"]').click();await p.waitForSelector('.ow-metrics');await p.setViewportSize({width:390,height:844});assert(await p.locator('.sidebar-operations-quick').isVisible());assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));await p.screenshot({path:out+'/overview-mobile.png',fullPage:false});
  await p.locator('#sidebar-menu').click();assert.equal(await p.locator('#operations-navigation nav a:visible').count(),7);await p.locator('#operations-navigation [data-route="inventory"]').click();await p.waitForSelector('.ow-metrics');assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
  await p.locator('.sidebar [data-route="market"]').first().click();await p.waitForSelector('[data-market-overview-template]');assert.equal(await p.evaluate(()=>REVIEW_DATA.markets.MX.stats.items[0].totalRevenue),10200593.41);assert.equal(await p.locator('[data-backstage-only]:visible').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({source:process.env.UWANT_WORKBOOK_FILE?'private-local-file':'synthetic-fixture',operatingNavigationVisible:7,import:true,metrics:expected.metrics,refresh:true,filtersAndExports:true,stockScopeIndependent:true,originalModulesRetained:true,duplicateImportIdempotent:true,failedImportKeepsData:true,mobile:true,marketDataUnchanged:true,noUploads:true,errors},null,2));console.log('PASS operating workbook browser: visible operations, local OOXML import, four business views, filters/CSV/refresh, legacy view, repeat/error imports, mobile, market isolation and no uploads.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
