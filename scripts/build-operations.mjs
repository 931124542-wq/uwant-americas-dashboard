import fs from 'node:fs';
const source=new URL('../',import.meta.url).pathname,out=source+'/operations';fs.mkdirSync(out,{recursive:true});
const sourceEntry=fs.existsSync(source+'/operations/source-entry.txt')?source+'/operations/source-entry.txt':source+'/index.html';
let html=fs.readFileSync(sourceEntry,'utf8');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,href)=>'<style>\n'+fs.readFileSync(source+'/'+href.split('?')[0],'utf8')+'\n</style>');
const data=fs.readFileSync(source+'/data.json','utf8').trim(),csv=fs.readFileSync(source+'/market-import-template.csv').toString('base64');
html=html.replace(/<script src="([^"]+)" defer><\/script>/g,(_,src)=>{
 const name=src.split('?')[0];let js=fs.readFileSync(source+'/'+name,'utf8');
 if(name==='app.js')js=js.replace("fetch('data.json')",`Promise.resolve({ok:true,json:async()=>(${data})})`);
 if(name==='app.js')js=js.replace('当前仅你可访问此预览站点。企业微信登录和团队只读访问尚未启用，链接暂不能作为团队正式入口。','当前网站公开可访问。企业微信登录和成员权限尚未启用。工作记录使用文件备份。').replace('工作记录在线保存</span><span class="tag">已接入','工作记录文件备份</span><span class="tag">已接入');
 if(name==='shared-state.js')js=js.replace("csOffline?'离线版'", "csOffline?'文件备份'");
 js=js.replaceAll('href="market-import-template.csv"',`href="data:text/csv;base64,${csv}"`);
 return '<script data-source="'+name+'">\n'+js.replace(/<\/script/gi,'<\\/script')+'\n</script>';
});
html=html.replace('</head>',`<script>window.UWANT_OFFLINE=true;</script><style>
body>.sidebar,body>main>header{display:none!important}body>main{margin-left:0!important}.content{max-width:none;padding:24px 30px 70px!important}.market-heading,.market-status,.market-code,.market-indicator,.market-name small,.market-top{display:none!important}.markets{display:flex!important;gap:6px!important;margin:0 0 18px!important;padding:0!important;background:none!important;overflow:auto}.market{width:auto!important;flex:0 0 auto!important;padding:6px 14px!important;min-height:0!important;border-radius:6px!important}.market-name{margin:0!important;font-size:12px!important}.market-heading small{display:none!important}.page-heading .eyebrow,.page-heading #page-subtitle{display:none!important}.page-heading{margin-bottom:18px!important}#page-title{font-size:24px!important;margin:0!important}.notice{font-size:11px!important}.panel-subtitle,.panel-head p{font-size:11px!important}footer{font-size:10px!important}@media(max-width:780px){.content{padding:18px 14px 65px!important}.market{padding:6px 10px!important}}
</style></head>`);
const bridge=`
const embeddedPages=new Set(['overview','analysis','products','profit','inventory','calendar','tasks','access','market']);
const embeddedOrigin=location.origin==='null'?'*':location.origin;
function embeddedSend(type,extra={}){parent.postMessage({type,...extra},embeddedOrigin);}
const embeddedInitial=new URLSearchParams(parent.location.hash.slice(1));
const embeddedCountry=new URLSearchParams(location.search).get('country')||embeddedInitial.get('country');
if(['mx','ca','ar','br','us'].includes(String(embeddedCountry).toLowerCase()))market=String(embeddedCountry).toLowerCase();
const embeddedPage=embeddedInitial.get('page');
let embeddedDesired=embeddedPages.has(location.hash.slice(1))?location.hash.slice(1):embeddedPages.has(embeddedPage)?embeddedPage:'overview';
function embeddedApplyScope(route){
 if(route.platform&&['amazon','ml','all','bestbuy','official','retail'].includes(route.platform))biPlatform=route.platform;
 if(Object.hasOwn(biCategories,route.category))biCategory=route.category;
 if(typeof route.dataset==='string')biDataset=route.dataset;
 biHistorySlice=Array.isArray(route.historyRows)?route.historyRows:(parent.REVIEW_HISTORY?.rows||[]).filter(r=>r.country.toLowerCase()===market&&r.category===biCategory&&r.month===biDataset);
}
embeddedApplyScope(Object.fromEntries(embeddedInitial));
const embeddedScroll=new Map();let embeddedLast='',embeddedStarted=false,embeddedControlled=false;
const embeddedBefore=render;render=function(){
 embeddedBefore();if(!data)return;
 if(embeddedLast!==page){if(embeddedLast)embeddedScroll.set(embeddedLast,window.scrollY);embeddedLast=page;window.scrollTo(0,embeddedScroll.get(page)||0);}
 if(embeddedStarted&&!embeddedControlled)embeddedSend('uwant:route',{page,country:market,...(page==='market'?{platform:biPlatform,category:biCategory,dataset:biDataset}:{})});
};
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='uwant:navigate'||!embeddedPages.has(event.data.page))return;
 embeddedDesired=event.data.page;const nextCountry=event.data.country,countryChanged=['mx','ca','ar','br','us'].includes(nextCountry)&&market!==nextCountry;
 if(countryChanged)market=nextCountry;embeddedApplyScope(event.data);
 page=embeddedDesired;if(!location.href.startsWith('about:srcdoc'))history.replaceState(null,'','#'+page);embeddedControlled=true;try{render();}finally{embeddedControlled=false;}
});
document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(!link)return;const target=link.getAttribute('href').slice(1);if(embeddedPages.has(target)){event.preventDefault();embeddedDesired=target;page=target;if(!location.href.startsWith('about:srcdoc'))history.replaceState(null,'','#'+page);render();}});
appReady().then(()=>{page=embeddedDesired;embeddedStarted=true;render();embeddedSend('uwant:ready');});
`;
html=html.replace('</body>','<script>'+bridge+'</script></body>');
fs.writeFileSync(out+'/index.html',html);console.log('Preserved original main modules in preview ('+Buffer.byteLength(html)+' bytes)');
