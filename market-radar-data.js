/* BI data adapters preserve source dates and distinguish samples from markets. */
const biCategories={wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
const biCountries={us:'美国',mx:'墨西哥',ca:'加拿大',br:'巴西'},biCurrencies={us:'USD',mx:'MXN',ca:'CAD',br:'BRL'};
const biPlatforms={amazon:'Amazon',ml:'Mercado Libre',bestbuy:'Best Buy',official:'品牌 / 分销站',retail:'其他当地零售'};
let biSnapshots=[],biTab='overview',biCategory='wash',biPlatform='all',biDataset='',biTop=0,biMetric='count',biSearch='',biSort='rank',biPage=0,biNotice='';
const biToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const biCat=sku=>({D:'wash',V:'vacuum',Y:'fabric',M:'mattress'})[sku?.[0]];
const biNum=(n,d=0)=>n==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:d}).format(n);
const biMoney=n=>n==null?'—':new Intl.NumberFormat('zh-CN',{style:'currency',currency:biCurrencies[market],maximumFractionDigits:2}).format(n);
const biPlatformOf=r=>/amazon\./i.test(r.source)?'amazon':/mercado(?:libre|livre)\./i.test(r.source)?'ml':/bestbuy\.ca/i.test(r.source)?'bestbuy':/liverpool|walmart|canadiantire|costco|samsclub/i.test(r.source)?'retail':'official';
function biPublicRows(){
 const rows=cpRecords.map(r=>({...r,category:biCat(r.sku[0]),platform:biPlatformOf(r),snapshot:r.checkedAt,product_id:r.source.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1]||r.source.match(/ML[A-Z]-?\d+/i)?.[0]||'',price:r.currencyVerified?r.price:null,priceNote:'当地页面历史展示价；库存与结账未复核',conditions:[r.availability,r.warranty,r.delivery,r.note].filter(Boolean).join('；'),units:null,revenue:null,rank:null,rating:null,reviews:null,method:'observation',sales_scope:'unknown',period_start:'',period_end:'',dataset:'公开调研',rank_scope:'',release_date:'',parent_id:'',features:r.features}));
 if(typeof brRecords!=='undefined')for(const r of brRecords)rows.push({...r,snapshot:r.checkedAt,product_id:r.productId||'',priceNote:'平台正式报价未取得',conditions:[r.voltage,r.availability,r.note].join('；'),method:'observation',sales_scope:'unknown',period_start:'',period_end:'',dataset:'公开调研',rank_scope:'',parent_id:'',rating:null,reviews:null,release_date:'',revenue:null});
 if(typeof brOfficialProfiles!=='undefined')for(const p of brOfficialProfiles)rows.push({...p,id:'official-'+p.key,country:'br',platform:'official',snapshot:p.checkedAt,product_id:p.code,price:p.offer?.amount??null,priceNote:'官网展示快照，非实时到手价',conditions:[p.voltage,p.availability,p.offer?.conditions,p.warranty,p.bundle].filter(Boolean).join('；'),currency:'BRL',method:'observation',units:null,revenue:null,rank:null,rank_scope:'',rating:null,reviews:null,parent_id:'',release_date:'',sales_scope:'unknown',period_start:'',period_end:'',dataset:'公开调研'});
 return rows.map(r=>({...r,origin:'public',uid:r.country+'|'+r.id}));
}
function biLegacyRows(){return rdSamples.map((r,i)=>({...r,platform:/amazon/i.test(r.platform)?'amazon':/mercado|\bml\b/i.test(r.platform)?'ml':/best.?buy/i.test(r.platform)?'bestbuy':r.platform,snapshot:r.exported_at,dataset:'已有销量样本',rank_scope:'',rank:null,revenue:null,rating:null,reviews:null,release_date:'',origin:'legacy',uid:'legacy-'+i,priceNote:'导入样本价格；不据此反算历史销售额',conditions:'来源与销量归属以原导入记录为准'}));}
function biAllRows(){return [...biPublicRows(),...biLegacyRows(),...biSnapshots.map((r,i)=>({...r,origin:'import',uid:'import-'+i,priceNote:'用户导入的价格快照；未独立复核',conditions:'电压、优惠、库存和套装需核当地商品页'}))];}
function biGroupKey(r){return r.origin==='public'?['public',r.country,r.category,r.snapshot].join('|'):[r.origin,UwantRadarCore.group(r)].join('|');}
function biDatasets(){
 const groups=new Map();for(const r of biAllRows().filter(r=>r.country===market&&r.category===biCategory&&(biPlatform==='all'||r.platform===biPlatform))){const key=biGroupKey(r);if(!groups.has(key))groups.set(key,{key,first:r,rows:[]});groups.get(key).rows.push(r);}
 return [...groups.values()].sort((a,b)=>b.first.snapshot.localeCompare(a.first.snapshot)||Number(b.first.origin==='import')-Number(a.first.origin==='import'));
}
function biContext(){
 const groups=biDatasets(),chosen=groups.find(g=>g.key===biDataset)||groups[0]||null;
 biDataset=chosen?.key||'';const all=chosen?.rows||[],ranked=all.filter(r=>Number.isInteger(r.rank)&&r.rank_scope),hasRanks=ranked.length>0;
 if(!hasRanks)biTop=0;
 const rows=biTop?ranked.filter(r=>r.rank<=biTop):all;
 const knownScope=rows.length>0&&rows.every(r=>['listing','family'].includes(r.sales_scope)),listing=rows.length>0&&rows.every(r=>r.sales_scope==='listing');
 const units=knownScope&&rows.every(r=>Number.isFinite(r.units))?rows.reduce((n,r)=>n+r.units,0):null;
 const revenue=knownScope&&rows.every(r=>Number.isFinite(r.revenue))?rows.reduce((n,r)=>n+r.revenue,0):null;
 const prices=rows.filter(r=>Number.isFinite(r.price)&&r.price>0),brands=[...new Set(rows.map(r=>r.brand))];
 const complete=!!biTop&&Array.from({length:biTop},(_,i)=>i+1).every(n=>ranked.some(r=>r.rank===n));
 return {groups,chosen,all,rows,ranked,hasRanks,knownScope,listing,units,revenue,prices,brands,complete,weighted:listing&&units>0&&revenue!=null?revenue/units:null};
}
function biCanMetric(c,key){return key==='count'||c.listing&&c.prices.length===c.rows.length&&(key==='units'?c.units!==null:c.revenue!==null);}
function biBins(c,metric=biMetric){
 const ranges=market==='mx'?(biCategory==='mattress'?[0,1000,2000,3000,4000,6000,Infinity]:[0,2000,4000,6000,8000,12000,Infinity]):market==='br'?[0,500,1000,1500,2000,3000,Infinity]:[0,100,200,400,600,800,Infinity];
 return ranges.slice(0,-1).map((lo,i)=>({label:Number.isFinite(ranges[i+1])?`${biNum(lo)}–<${biNum(ranges[i+1])}`:`≥${biNum(lo)}`,value:c.prices.filter(r=>r.price>=lo&&r.price<ranges[i+1]).reduce((n,r)=>n+(metric==='count'?1:r[metric]||0),0)}));
}
function biBrandValues(c,metric='count'){return [...c.rows.reduce((m,r)=>m.set(r.brand,(m.get(r.brand)||0)+(metric==='count'?1:r[metric]||0)),new Map())].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);}
function biPrevious(c){if(!c.chosen||c.chosen.first.origin!=='import')return null;const now=c.chosen.first;return biDatasets().filter(g=>g.first.origin==='import'&&g.first.snapshot<now.snapshot&&['country','platform','category','dataset','rank_scope','method'].every(k=>g.first[k]===now[k])).sort((a,b)=>b.first.snapshot.localeCompare(a.first.snapshot))[0]||null;}
function biChanges(c){const previous=biPrevious(c);if(!previous)return [];const prev=previous.rows;return c.rows.map(r=>{const p=prev.find(x=>x.product_id===r.product_id);return {r,p,rankChange:p&&r.rank!=null&&p.rank!=null?p.rank-r.rank:null,priceChange:p&&r.price!=null&&p.price>0?r.price/p.price-1:null};});}
function biParseCsv(text){
 const raw=rdCSV(text),header=raw.shift()?.map(s=>s.trim());
 if(!header||new Set(header).size!==header.length||UwantRadarCore.columns.some(k=>!header.includes(k))||header.some(k=>!UwantRadarCore.columns.includes(k)))throw Error('请使用BI标准模板，字段须完整且不可重复');
 if(!raw.length||raw.length>5000)throw Error('需要1–5000条商品记录');
 const numeric=new Set(['price','units','revenue','rank','rating','reviews']);
 const rows=raw.map((cells,i)=>{if(cells.length!==header.length)throw Error(`第${i+2}行列数不一致`);const r={};header.forEach((k,j)=>{const v=cells[j].trim();r[k]=numeric.has(k)?v===''?null:Number(v):v;});return r;});
 return UwantRadarCore.validateRecords(rows,biToday());
}
function biMerge(rows){const next=[...biSnapshots,...rows];UwantRadarCore.validateRecords(next,biToday());biSnapshots=next;biDataset='';biPage=0;return rows.length;}
function biCsvRows(rows){return [UwantRadarCore.columns,...rows.map(r=>UwantRadarCore.columns.map(k=>r[k]??''))];}

/* Assess one comparable snapshot only; missing ranks and sales stay missing. */
function biAudit(rows){
 const ranks=new Set(rows.filter(r=>Number.isInteger(r.rank)&&r.rank_scope).map(r=>r.rank));
 const missing=Array.from({length:10},(_,i)=>i+1).filter(n=>!ranks.has(n));
 return {total:rows.length,priced:rows.filter(r=>r.price>0).length,
  sales:rows.filter(r=>Number.isFinite(r.units)&&['listing','family'].includes(r.sales_scope)).length,
  missing,top10:missing.length===0};
}
function biCoverageGroups(country,category,platform){
 const map=new Map();
 for(const r of biAllRows().filter(r=>r.country===country&&r.category===category&&r.platform===platform)){
  const key=biGroupKey(r);if(!map.has(key))map.set(key,{key,first:r,rows:[]});map.get(key).rows.push(r);
 }
 return [...map.values()].sort((a,b)=>b.first.snapshot.localeCompare(a.first.snapshot)||Number(b.first.origin==='import')-Number(a.first.origin==='import'));
}
