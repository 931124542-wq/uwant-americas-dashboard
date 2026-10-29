/* SellerSprite MCP v2 data in market overview, product ranking and brand analysis. */
const ssBiMarket=()=>window.ssLiveData?.markets?.[market.toUpperCase()]||null;
const ssBiAvailable=()=>biCategory==='vacuum'&&(biPlatform==='all'||biPlatform==='amazon')&&ssBiMarket();
const ssBiSelected=c=>ssBiAvailable()&&c.chosen?.first.origin==='sellersprite';
const ssBiExcluded={'MX:B0B94MMCZL':'地毯清洗机，不属于干式吸尘器'};
function ssBiArchiveProducts(data,code){
 const archive=(typeof parent!=='undefined'?parent.REVIEW_DATA:window.REVIEW_DATA)?.markets?.[code]?.products;
 const samePeriod=archive?.dataMonth===data.products?.dataMonth;
 const sameOverlap=samePeriod&&(data.products.items||[]).every(r=>{const a=archive.items.find(x=>x.asin===r.asin);return a&&['sales','revenue','avgPrice','ranking'].every(k=>a[k]===r[k]);});
 return sameOverlap?archive.items:data.products?.items||[];
}
function ssBiArchiveDetail(code,asin){return (typeof parent!=='undefined'?parent.REVIEW_DATA:window.REVIEW_DATA)?.markets?.[code]?.details?.find(r=>r.asin===asin);}
function ssBiRows(){return Object.entries(window.ssLiveData?.markets||{}).flatMap(([code,data])=>{
 const month=data.products?.dataMonth;if(!/^\d{6}$/.test(month||''))return [];
 const start=`${month.slice(0,4)}-${month.slice(4)}-01`,end=`${month.slice(0,4)}-${month.slice(4)}-${new Date(Number(month.slice(0,4)),Number(month.slice(4)),0).getDate()}`;
 return ssBiArchiveProducts(data,code).filter(row=>!ssBiExcluded[`${code}:${row.asin}`]&&!HistoryMetrics.rejectVacuum(row)).map(row=>{
  const known=(window.ssProducts||[]).find(item=>item.market===code&&item.asin===row.asin),detail=ssBiArchiveDetail(code,row.asin),conflict=/\bmidea\b/i.test(row.title||'')&&detail?.brand&&!/midea/i.test(detail.brand);
  return {country:code.toLowerCase(),platform:'amazon',category:'vacuum',snapshot:window.ssLiveData.asOf,dataset:'卖家精灵 · '+month+' 类目商品榜',rank_scope:data.categoryId,product_id:row.asin,parent_id:'',sales_scope:'unknown',sourceBrandName:detail?.brand||known?.brand||null,brand:HistoryMetrics.brandName(conflict?null:detail?.brand||known?.brand)||'品牌待核',model:row.title,currency:ssCurrency[code],price:row.avgPrice,units:row.sales??null,revenue:row.revenue??null,period_start:start,period_end:end,method:'estimate',rank:row.ranking,rating:row.rating??null,reviews:row.reviews??null,release_date:'',source:`https://www.${ssDomains[code]}/dp/${row.asin}`,origin:'sellersprite',uid:`ss-${code}-${row.asin}`,priceNote:'归档月平均价',conditions:'销量归属待核，来源原值不按ASIN合计；家用样本已排除不相关机型，保留源名次；版本、套装与到手价请查看当地商品页',image:row.imageUrl};
 });
});}
const ssBiAllRowsBefore=biAllRows;
biAllRows=function(){return [...ssBiAllRowsBefore(),...ssBiRows()];};
const ssBiBrandName=value=>String(value||'—').split(',')[0].trim();
const ssBiRatio=value=>value==null?'—':`${(value*100).toFixed(1)}%`;
const ssBiLiveMoney=(value,code=market.toUpperCase())=>value==null?'—':`${fmt(value,0)} ${ssCurrency[code]}`;
const ssBiProductTier=product=>{const match=(window.ssProducts||[]).find(row=>row.market===market.toUpperCase()&&row.asin===product.asin);return match?ssTierLabel(match.tier):'类目榜单';};

function ssBiOverview(){
 const data=ssBiMarket(),stat=data?.stats?.items?.[0];
 if(!data)return '';
 if(!stat)return `<section class="ss-bi-panel ss-bi-empty"><div><span class="mi-kicker">SELLERSPRITE MCP V2</span><h3>${biCountries[market]} · 卖家精灵类目数据暂缺</h3><p>卖家精灵未返回该站月度类目表。竞品页继续展示已清洗的商品样本，缺失指标不按 0 处理。</p></div></section>`;
 const period=`${data.stats.periodStart||'—'}～${data.stats.periodEnd||'—'}`;
 return `<section class="ss-bi-panel"><div class="ss-bi-head"><div><span class="mi-kicker">SELLERSPRITE MCP V2</span><h3>${biCountries[market]} · 家用立式吸尘器市场</h3><p>${rdE(data.category)} · 近30天第三方估算 · ${period}</p></div><span class="ss-date">更新 ${window.ssLiveData.asOf}</span></div><div class="ss-bi-kpis"><article><span>类目商品</span><strong>${fmt(stat.totalProducts)}</strong><small>卖家精灵类目统计</small></article><article><span>类目品牌</span><strong>${fmt(stat.brands)}</strong><small>当前统计范围</small></article><article><span>近30天销量</span><strong>${fmt(stat.totalSales)}</strong><small>第三方估算</small></article><article><span>近30天销售额</span><strong>${ssBiLiveMoney(stat.totalRevenue)}</strong><small>第三方估算</small></article><article><span>平均价格</span><strong>${ssBiLiveMoney(stat.avgPrice)}</strong><small>类目样本均价</small></article></div><div class="ss-bi-actions"><button type="button" class="bi-link" data-bi-tab="products">查看商品榜单 →</button><button type="button" class="bi-link" data-bi-tab="brands">查看品牌分析 →</button><button type="button" class="bi-link" data-bi-tab="competitors">查看清洗后竞品 →</button></div><p class="ss-source">市场统计来自卖家精灵 MCP v2；类目总量用于观察市场结构，不等于 UWANT 的直接竞品规模。竞品页另行排除机器人、洗地机、配件、商用和大桶产品。</p></section>`;
}

function ssBiProductRanking(c){
 const data=ssBiMarket(),lookup=new Map(ssBiArchiveProducts(data,market.toUpperCase()).map(row=>[row.asin,row])),rows=biTableRows(c).map(row=>lookup.get(row.product_id)).filter(Boolean),code=market.toUpperCase();
 if(!rows.length)return null;
 return `<section class="bi-panel ss-bi-ranking"><div class="bi-panel-title"><div><h3>卖家精灵商品榜单</h3><p>${biCountries[market]} · ${rdE(data.category)} · ${data.products.dataMonth||'最新归档月'} · ${rows.length} 件 · 当前筛选</p></div><button type="button" class="mi-button" data-bi-tab="competitors">查看自集尘竞品</button></div><div class="ss-bi-product-grid">${rows.map(row=>{const url=`https://www.${ssDomains[code]}/dp/${row.asin}`;return `<article><a class="ss-bi-product-image" href="${url}" target="_blank" rel="noopener noreferrer">${row.imageUrl?`<img src="${rdE(row.imageUrl)}" alt="${rdE(row.title||row.asin)}" loading="lazy" referrerpolicy="no-referrer">`:''}</a><div><div class="ss-card-top"><span class="ss-tier">${rdE(ssBiProductTier(row))}</span><span>#${row.ranking}</span></div><a class="ss-bi-product-title" href="${url}" target="_blank" rel="noopener noreferrer">${rdE(row.title||row.asin)}</a><small>ASIN ${rdE(row.asin)}</small><dl><div><dt>来源月销量估算</dt><dd>${fmt(row.sales)}</dd></div><div><dt>月销售额</dt><dd>${ssBiLiveMoney(row.revenue,code)}</dd></div><div><dt>均价</dt><dd>${ssBiLiveMoney(row.avgPrice,code)}</dd></div><div><dt>评分</dt><dd>${row.rating??'—'} / ${fmt(row.reviews)}</dd></div></dl></div></article>`;}).join('')}</div><p class="ss-source">商品销量为父体或 Listing 口径的月度估算。墨西哥榜单已排除地毯清洗机 B0B94MMCZL，保留原始名次。榜单为清洗后的家用吸尘器样本，名次可能不连续；“T1 / T2 / T3 白牌”仅在商品命中已清洗竞品样本时显示。</p></section>`;
}

function ssBiBrandAnalysis(){
 const data=ssBiMarket(),rows=data?.brands?.items||[];
 if(!rows.length)return null;
 const max=Math.max(...rows.map(row=>row.sales||0),1);
 return `<section class="bi-panel ss-bi-brands"><div class="bi-panel-title"><div><h3>卖家精灵品牌分析</h3><p>${biCountries[market]} · ${rdE(data.category)} · ${data.brands.dataMonth||'最新归档月'} · 按月销量排序</p></div><button type="button" class="mi-button" id="ss-bi-brand-export">导出来源品牌聚合</button></div><div class="ss-bi-brand-list">${rows.map(row=>{const name=ssBiBrandName(row.name);return `<button type="button" data-ss-bi-brand="${rdE(name.toLowerCase())}"><span class="ss-bi-rank">${row.ranking}</span><strong title="来源名称：${rdE(row.name)}">${rdE(name)}</strong><i><b style="width:${Number.isFinite(row.sales)?Math.max(0,row.sales/max*100):0}%"></b></i><span>${fmt(row.sales)} 台</span><small>${ssBiRatio(row.salesShare)} · ${row.products??'—'} 件 · 均价 ${ssBiLiveMoney(row.avgPrice)} · 销售额 ${ssBiLiveMoney(row.revenue)}</small></button>`;}).join('')}</div><p class="ss-source">品牌销量和销售额为卖家精灵类目聚合估算，只代表当前类目和归档月。点击品牌可进入清洗后竞品样本；样本中没有该品牌时会提示暂无商品。品牌数据是来源类目聚合，不随商品 TopN 范围变化；不能据返回列表断言覆盖完整类目。</p></section>`;
}

const ssBiAssessmentBefore=biAssessment;
biAssessment=function(c){return ssBiAssessmentBefore(c);};

const ssBiProductTableBefore=biProductTable;
biProductTable=function(c,compact=false){const view=!compact&&ssBiSelected(c)?ssBiProductRanking(c):null;return ssBiProductTableBefore(c,compact)+(view?'<details class="bi-details"><summary>查看来源榜单商品卡片</summary>'+view+'</details>':'');};
const ssBiBrandChartBefore=biBrandChart;
biBrandChart=function(c,full=false){return ssBiBrandChartBefore(c,full);};

const ssBiKpisBefore=biKpis;
biKpis=function(c){if(!ssBiSelected(c))return ssBiKpisBefore(c);const brands=[...new Set(c.rows.map(row=>row.brand).filter(brand=>brand!=='品牌未提供'))];return ssBiKpisBefore({...c,brands}).replace('样本品牌','已识别品牌').replace('当前筛选内品牌数量','仅统计有品牌字段的商品；其余待补');};
const ssBiWireBefore=biWire;
biWire=function(){ssBiWireBefore();document.querySelector('#ss-bi-open')?.addEventListener('click',()=>{biCategory='vacuum';biPlatform='amazon';biDataset='';biTop=0;biPage=0;biSearch="";render();});document.querySelector('#ss-bi-brand-export')?.addEventListener('click',ssBiBrandExport);document.querySelectorAll('[data-ss-bi-brand]').forEach(button=>button.addEventListener('click',()=>{const brand=button.dataset.ssBiBrand,available=(window.ssProducts||[]).some(row=>row.market===market.toUpperCase()&&row.brand.toLowerCase()===brand);if(!available){toast('当前清洗后的竞品样本中暂无该品牌商品');return;}if(biCat(miSku)!==biCategory){const sku=ssOwnSkus().find(value=>biCat(value)===biCategory);if(sku){miSku=sku;amSku=sku;rhMode="sku";}}ssBrand=brand;ssTier='all';ssSearch='';ssLimit=12;biReturnContext={tab:'brands',scrollY:globalThis.scrollY||0};biTab='competitors';rdTab='compare';render();}));};
function ssBiBrandExport(){const data=ssBiMarket();rdDownload(`SellerSprite_${market}_${data.brands.dataMonth}_brands.csv`,[['国家','归档月','原始品牌名称','排名','商品数','月销量估算','月销售额估算','销量占比','均价','币种'],...data.brands.items.map(row=>[market,data.brands.dataMonth,row.name,row.ranking,row.products,row.sales??'',row.revenue??'',row.salesShare??'',row.avgPrice??'',ssCurrency[market.toUpperCase()]])]);}
