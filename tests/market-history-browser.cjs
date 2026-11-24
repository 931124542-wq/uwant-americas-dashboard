const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
(async()=>{
 const base=process.env.UWANT_TEST_BASE||'http://127.0.0.1:8842/';
 const target=new URL('market-history/',base);
 const b=await chromium.launch({headless:true,executablePath:process.env.UWANT_CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try{
  const p=await b.newPage({viewport:{width:390,height:844},acceptDownloads:true}),errors=[],network=[];
  p.on('pageerror',error=>errors.push(error.message));
  p.on('request',request=>network.push(request.url()));
  const fixture={format:'uwant-market-archive-v1',mercado:{observedDate:'2026-11-05',markets:{
   MX:[['2026-10',50,125000,2500]],BR:[['2026-10',20,85000,null]]}},
   amazon:{date:'2026-11-24',rows:[['MX','vacuum','2026-10',9,3560000000,2]],
    rankMonths:[['MX','vacuum','2026-10',[
     ['B000000001','B000000003',5,425000000,2900000000,'Fixture <title>'],
     ['B000000002','B000000004',4,3135000000,6900000000,'Another fixture']]]]}};
  const record=Buffer.from(JSON.stringify(fixture));
  const upload=buffer=>p.locator('#archive-file').setInputFiles({name:'test-history.json',mimeType:'application/json',buffer});
  target.search=new URLSearchParams({platform:'ml',country:'MX',startMonth:'2026-10',endMonth:'2026-10'});
  await p.goto(target.href);
  assert.equal(await p.locator('#report').innerText(),'');
  await upload(record);
  await p.waitForSelector('[data-total-revenue]');
  assert.equal(await p.locator('[data-total-revenue]').innerText(),'1,250.00');
  assert((await p.locator('#report').innerText()).includes('MLM31572'));
  await p.selectOption('#country','BR');
  await p.getByRole('button',{name:'应用',exact:true}).click();
  assert.equal(await p.locator('[data-total-revenue]').innerText(),'850.00');
  const download=p.waitForEvent('download');
  await p.getByRole('button',{name:'导出所选月份'}).click();
  assert((await fs.readFile(await (await download).path(),'utf8')).includes('"BRL","20","850.00",""'));
  await p.selectOption('#platform','amazon');
  await p.selectOption('#country','MX');
  await p.getByRole('button',{name:'应用',exact:true}).click();
  assert.equal(await p.locator('#top10 tbody tr').count(),2);
  assert.equal(await p.locator('#top10 tbody tr a').first().getAttribute('href'),'https://www.amazon.com.mx/dp/B000000003');
  await p.selectOption('[data-rank-metric]','revenue');
  assert.equal(await p.locator('#top10 tbody tr a').first().getAttribute('href'),'https://www.amazon.com.mx/dp/B000000004');
  await p.selectOption('[data-rank-band]','2');
  assert.equal(await p.locator('#top10 tbody tr').count(),1);
  assert.equal(await p.locator('#top10 tbody tr a').first().innerText(),'Fixture <title>');
  await upload(Buffer.from('{"format":"wrong"}'));
  assert.match(await p.locator('#file-status').innerText(),/无法读取/);
  assert.equal(await p.locator('[data-total-units]').innerText(),'9');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  assert(network.every(url=>new URL(url).pathname.includes('/market-history/')));
  console.log('PASS account-free history: browser file validation, two sources, local currency, rank, links, CSV, mobile and no data uploads.');
 }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
