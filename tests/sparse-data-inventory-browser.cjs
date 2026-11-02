/* Read-only rendering inventory. Write output outside the repository when private capture is enabled. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{
 const output=path.resolve(process.argv[2]),base=process.env.PREVIEW_URL||'http://127.0.0.1:8800/';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],results=[],routes=[];
 page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
 for(const country of ['CA','MX','US','BR'])for(const category of ['fabric','wash','vacuum','mattress'])for(const view of ['products','monthly','research'])routes.push({page:view==='monthly'?'brands':'market',view,country,category,platform:'amazon',dataset:'2026-02',...(view==='monthly'?{startMonth:'2026-01',endMonth:'2026-09'}:{})});
 for(const name of ['overview','analysis','products','profit','inventory','calendar','tasks','access'])for(const country of ['CA','MX','BR','US'])routes.push({page:name,country});
 for(const country of ['CA','MX','BR','US'])for(const category of ['fabric','wash','vacuum','mattress'])for(const name of ['brands','competitors'])routes.push({page:name,view:'monthly',country,category,dataset:'2026-02',platform:'amazon',researchLayer:'history'});
 for(const opsPeriod of ['sep','all','oct'])routes.push({page:'analysis',country:'MX',opsPeriod});
 for(const country of ['CA','MX','US','BR'])for(const category of ['fabric','wash','vacuum','mattress'])routes.push({page:'brands',country,category,platform:'amazon',dataset:'2026-02',view:'overview'});
 for(const scope of routes){await page.goto(base+'#'+new URLSearchParams(scope));await page.waitForTimeout(160);if(!['market','brands','competitors'].includes(scope.page))await page.frameLocator('#operations-frame').locator('.content').waitFor();
  const documents=[];for(const frame of page.frames()){
   if(frame!==page.mainFrame()&&!await(await frame.frameElement()).isVisible())continue;
   documents.push(await frame.evaluate(()=>{const visible=e=>!!e.getClientRects().length,missing=v=>/^(?:—(?:\s*\/\s*—)?|未提供|未取得|暂无|当前价格范围未覆盖|配置字段不足|归属未核|无同口径价格|参数证据不足|缺历史)/.test(v);
    return {tables:[...document.querySelectorAll('table')].filter(visible).map(table=>{const rows=[...table.querySelectorAll('tbody tr')].filter(visible),headers=[...table.querySelectorAll('thead th')].map(x=>x.innerText.trim()),cells=rows.map(r=>[...r.children].map(c=>c.innerText.trim()));return {className:table.className,headers,rowCount:rows.length,meanHeight:rows.length?rows.reduce((n,r)=>n+r.getBoundingClientRect().height,0)/rows.length:0,emptyNumericColumns:headers.filter((h,i)=>/价格|销量|销售额|Sessions|转化率|SP花费|ROAS|评分|评价数/.test(h)&&rows.length>0&&cells.every(row=>missing(row[i]||'')))};})};}));
  }results.push({scope,documents});
 }
 const emptyNumericColumns=results.flatMap(r=>r.documents.flatMap(d=>d.tables.filter(t=>t.emptyNumericColumns.length).map(t=>({scope:r.scope,...t})))),summary={renderedStates:results.length,runtimeErrors:errors,emptyNumericColumns};
 fs.writeFileSync(output+'/render-inventory.json',JSON.stringify({summary,routes:results},null,2));console.log(JSON.stringify(summary));await browser.close();if(errors.length||emptyNumericColumns.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
