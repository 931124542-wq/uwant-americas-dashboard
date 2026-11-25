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
  target.search=new URLSearchParams({platform:'ml',country:'BR',category:'fabric',scope:'sample',startMonth:'2026-01',endMonth:'2026-10'});
  await p.goto(target.href);
  assert.equal(await p.locator('[data-total-units]').innerText(),'65,204');
  assert.equal(await p.locator('[data-total-revenue]').innerText(),'—');
  assert.equal(await p.locator('[data-report-month]').count(),10);
  assert.equal(await p.locator('#top10 a[href*="mercadolivre.com.br"]').count(),10);
  const matrix=await p.evaluate(()=>{
   const {amazon,mercado}=window.UWANT_PUBLIC_HISTORY;
   return {mercado:Object.keys(mercado.scopes).map(key=>mercado.scopes[key].filter(row=>row[0]>='2026-01').length),
     amazonScenarios:new Set(amazon.rows.map(row=>row.slice(0,2).join('|'))).size,amazonRows:amazon.rows.length};
  });
  assert.deepEqual(matrix,{mercado:Array(20).fill(10),amazonScenarios:6,amazonRows:54});
  target.search=new URLSearchParams({platform:'amazon',country:'CA',category:'fabric',startMonth:'2026-01',endMonth:'2026-10'});
  await p.goto(target.href);
  assert.equal(await p.locator('[data-total-units]').innerText(),'63,676');
  assert.equal(await p.locator('[data-total-revenue]').innerText(),'7,251,035.25');
  assert.equal(await p.locator('[data-report-month]').count(),9);
  assert.match(await p.locator('#report').innerText(),/来源更新时尚未结束.*2026-10/);
  target.search=new URLSearchParams({platform:'ml',country:'MX',category:'vacuum',scope:'category',startMonth:'2026-10',endMonth:'2026-10'});
  await p.goto(target.href);
  assert((await p.locator('#report').innerText()).includes('请选择包含大麦类目历史的本机数据文件'));
  await upload(record);
  await p.waitForFunction(()=>document.querySelector('[data-total-revenue]')?.textContent==='1,250.00');
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
  await p.waitForFunction(()=>document.getElementById('file-status').textContent.includes('无法读取'));
  assert.equal(await p.locator('[data-total-units]').innerText(),'9');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  assert(network.every(url=>new URL(url).pathname.includes('/market-history/')));
  console.log('PASS account-free history: browser file validation, two sources, local currency, rank, links, CSV, mobile and no data uploads.');
 }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
