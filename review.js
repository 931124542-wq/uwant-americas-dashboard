'use strict';
const M=ResearchModel,D=REVIEW_DATA;D.own=REVIEW_OWN;D.focus=FOCUS_BRANDS;D.history=window.REVIEW_HISTORY;
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:0}).format(x);
let state=M.parse(location.hash),drawerKey='',lastFocus=null,lastFocusToken='',toastTimer;
const country=()=>M.countries[state.country],money=n=>n==null?'—':`${new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)} ${country().currency}`;
const url=r=>`https://www.${country().domain}/dp/${r.asin}`;
const tier=r=>({T1:'T1 核心自集尘',T2:'T2 同价位',T3:'T3 白牌'})[r.tier]||'未核层级';
const brandLabel=brand=>{const b=D.focus.roster.find(b=>b.name.toLowerCase()===String(brand).toLowerCase());return b?`${b.zh} ${b.name}`:brand;};
const featureLabel=r=>state.category==='vacuum'?(r.autoEmpty?'自动集尘（标题标称）':'—'):(r.classificationReason||'—');
const pageNames={brands:'品牌分析',competitors:'竞品对比',market:'市场总览',overview:'经营总览',analysis:'经营分析',products:'SKU 表现',profit:'利润与补货',inventory:'库存监控',calendar:'促销日历',tasks:'运营任务',access:'访问设置'};
let operationsReady=false,operationsTimer,frameRoute='';
function operationPayload(){return {type:'uwant:navigate',page:state.page,country:state.country.toLowerCase(),platform:state.platform,category:state.category,dataset:state.dataset,historyRows:M.isHistory(state.dataset)?D.history.rows.filter(r=>r.country===state.country&&r.category===state.category&&r.month===state.dataset):[],historyAsOf:D.history.asOf};}
function operationPage(){
 const research=['brands','competitors'].includes(state.page);
 document.querySelectorAll('[data-route]').forEach(a=>a.setAttribute('aria-current',a.dataset.route===state.page?'page':'false'));
 $('crumb').textContent=pageNames[state.page];document.title=pageNames[state.page]+' · UWANT';
 $('research-content').hidden=!research;$('operations-content').hidden=research;document.body.classList.toggle('operations-open',!research);
 if(research)return false;
 $('compare-tray').hidden=true;if($('drawer').open)$('drawer').close();drawerKey='';
 const frame=$('operations-frame');
 if(!frame.dataset.started){
  frame.dataset.started='true';
  if(typeof window.REVIEW_OPERATIONS_HTML==='string')frame.srcdoc=window.REVIEW_OPERATIONS_HTML;else frame.src='operations/index.html?v=20261029-monthly&country='+state.country.toLowerCase()+'#'+state.page;frameRoute=state.page;
  operationsTimer=setTimeout(()=>{if(!operationsReady){$('operations-status').textContent='加载尚未完成，请重试。';$('operations-retry').hidden=false;}},15000);
 }else if(operationsReady){frame.contentWindow.postMessage(operationPayload(),location.origin==='null'?'*':location.origin);frameRoute=state.page;}
 return true;
}
window.addEventListener('message',e=>{
 if(e.source!==$('operations-frame').contentWindow||e.origin!==location.origin)return;
 if(e.data?.type==='uwant:ready'){
  operationsReady=true;clearTimeout(operationsTimer);$('operations-status').hidden=true;$('operations-retry').hidden=true;$('operations-frame').hidden=false;
  if(!['brands','competitors'].includes(state.page))$('operations-frame').contentWindow.postMessage(operationPayload(),location.origin==='null'?'*':location.origin);
 }else if(operationsReady&&e.data?.type==='uwant:route'&&pageNames[e.data.page]&&!['brands','competitors'].includes(state.page)){
  const nextCountry=String(e.data.country||'').toUpperCase(),countryChanged=M.countries[nextCountry]&&state.country!==nextCountry;
  const scope=e.data.page==='market'?Object.fromEntries(['platform','category','dataset'].filter(k=>typeof e.data[k]==='string').map(k=>[k,e.data[k]])):{};
  if(state.page!==e.data.page||countryChanged||Object.entries(scope).some(([k,v])=>state[k]!==v)){frameRoute=e.data.page;change({page:e.data.page,detail:'',...scope,...(countryChanged?{country:nextCountry}:{})});}
 }
});
function shortTitle(r){
 const title=String(r.title||'');
 const match=title.match(/\b(?:FLOOR\s*ONE|PURE\s*ONE|Flexi|Dyad|H\d{1,2}|S\d{1,3}|V\d{1,3}|Detect|Stratos|HydroVac|HydroSteam|CrossWave)(?:\s+(?:[A-Z]?\d{1,3}[A-Z]?|Pro|Ultra|Max|Lite|Plus|Steam|Combo|Complete|Detect|Slim|Absolute|Origin|PowerDetect)){0,4}\b/i);
 if(match){const name=match[0].replace(/[,\s.]+$/,'').replace(/\s+(?:Cordless|Wet|Dry|Vacuum|with|for)\b.*$/i,'');return name.toLowerCase().startsWith(String(r.brand||'').toLowerCase())?name:((r.brand||'')+' '+name).trim();}
 return title.split(/\s[|–—]\s|[,，]/)[0].slice(0,72)||r.asin;
}
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function change(patch,{replace=false,scroll=false}={}){
 history.replaceState({...history.state,scrollY:window.scrollY},'',location.href);
 const previous=state;state={...state,...patch};
 if(patch.page==='brands'){state.mode='all';state.tier='all';}
 if(['country','platform','category','dataset'].some(k=>k in patch&&patch[k]!==previous[k])){
  state={...state,brand:'',band:'',q:'',picked:[],detail:'',offset:'0',tier:'all',mode:'all'};
  if(patch.brand!==undefined)state.brand=patch.brand;
  if(previous.picked.length)notify('研究范围已变化，对比清单已清空');
 }
 if(!('offset' in patch))state.offset='0';
 history[replace?'replaceState':'pushState']({scrollY:scroll?0:window.scrollY,drawer:!!state.detail},'',M.encode(state));
 render();if(scroll)window.scrollTo({top:0,behavior:'auto'});
}
function detail(kind,key){lastFocus=document.activeElement;lastFocusToken=kind==='brand'?`[data-brand-detail="${CSS.escape(key)}"]`:kind==='product'?`[data-product="${CSS.escape(key)}"]`:'#open-compare';change({detail:`${kind}:${key}`});}
function closeDrawer(){if(!state.detail)return;if(history.state?.drawer)history.back();else change({detail:''},{replace:true});}
function productLabel(r){return `<div class="product-cell">${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<span class="image-empty" aria-label="暂无商品图片">暂无图片</span>'}<div><button class="text-button" data-product="${r.id}" title="${esc(r.title)}"><strong>${esc(shortTitle(r))}</strong></button><small>${esc(r.brand||'品牌未提供')} · ${r.asin}</small></div></div>`;}
function miniKpis(v){return `<article><span>样本销量 <small>估算 / 台</small></span><strong>${num(v.sales.value)}</strong><small>${v.sales.known===v.rows.length?'':v.sales.known+' / '+v.rows.length+' 件有销量'}</small></article><article><span>样本销售额 <small>估算 / ${country().currency}</small></span><strong>${num(v.revenue.value)}</strong><small>${v.revenue.known===v.rows.length?'':v.revenue.known+' / '+v.rows.length+' 件有销售额'}</small></article><article><span>商品数 <small>当前样本</small></span><strong>${num(v.rows.length)}</strong><small>${v.brands.length} 个品牌</small></article>`;}
function priceHistogram(v){
 if(!v.rows.length)return '<p class="detail-copy">当前范围没有可用于价格分布的商品。</p>';
 const bins=v.bins,w=1120,h=260,left=48,right=20,top=25,bottom=190,plot=w-left-right,slot=plot/bins.length,max=Math.max(1,...bins.map(b=>b.count)),ceiling=Math.max(4,Math.ceil(max/4)*4);
 return `<svg class="price-histogram" viewBox="0 0 ${w} ${h}" role="group" aria-label="价格分布柱状图，点击柱子筛选价格段"><text x="${left}" y="13" class="axis-caption">商品数</text>${Array.from({length:5},(_,i)=>{const count=ceiling*i/4,y=bottom-count/ceiling*(bottom-top);return `<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" class="chart-grid"/><text x="${left-12}" y="${y+4}" text-anchor="end" class="axis-label">${count}</text>`;}).join('')}${bins.map(b=>{const x=left+b.index*slot+slot*.16,bw=slot*.68,bh=b.count/ceiling*(bottom-top),cx=x+bw/2;return `<g role="button" tabindex="0" data-band="${b.index}" aria-label="${b.label}，${b.count}件商品" aria-pressed="${state.band===String(b.index)}"><title>${b.label} ${country().currency}：${b.count} 件商品</title><rect x="${left+b.index*slot}" y="${top}" width="${slot}" height="${bottom-top}" fill="transparent"/><rect x="${x}" y="${bottom-bh}" width="${bw}" height="${Math.max(1,bh)}" rx="3" class="histogram-bar ${state.band===String(b.index)?'selected':''}"/><text x="${cx}" y="${bottom-bh-7}" text-anchor="middle" class="chart-count">${b.count||''}</text><text transform="translate(${cx},${bottom+15}) rotate(-36)" text-anchor="end" class="axis-label">${b.label}</text></g>`;}).join('')}<text x="${w-right}" y="${h-2}" text-anchor="end" class="axis-caption">价格 / ${country().currency} · 每档 ${num(M.priceStep(state.country))}</text></svg>`;
}
function render(){
 if(operationPage())return;
 const historical=M.isHistory(state.dataset);
 if(!$('dataset').querySelector('optgroup')){const group=document.createElement('optgroup');group.label='2026 年 · 当前商品历史';for(const month of D.history.months){const option=document.createElement('option');option.value=month;option.textContent=month.replace('-','年')+'月'+(month==='2026-10'?' · 未结月':'');group.append(option);}$('dataset').prepend(group);}
 if(state.category!=='vacuum'&&state.mode==='config')state.mode='all';
 const prefix={vacuum:'V',wash:'D',fabric:'Y',mattress:'M'}[state.category],localOwn=Object.keys(D.own[state.country]||{}).filter(k=>k.startsWith(prefix)),ownChoices=localOwn.length?localOwn:({vacuum:['V500','V600'],wash:['D500','D600','D800'],fabric:['Y100S','Y200S'],mattress:['M600']}[state.category]||[]);
 if(!ownChoices.includes(state.own))state.own=ownChoices[0]||'V500';
 $('own').innerHTML=ownChoices.map(sku=>`<option>${sku}</option>`).join('');
 const v=M.select(D,state),isBrand=state.page==='brands',base=M.baseRows(D,state),meta=D.markets[state.country],month=historical?state.dataset+(state.dataset==='2026-10'?'（未结月接口值）':''):state.dataset==='archive'?meta?.products?.dataMonth:state.dataset==='focus'?'近30天（接口未给出起止日）':'统计起止日未提供';

 document.querySelectorAll('[data-route]').forEach(a=>a.setAttribute('aria-current',a.dataset.route===state.page?'page':'false'));
 $('title').textContent=isBrand?'品牌分析':'竞品对比';
 for(const key of ['country','platform','category','dataset','sort','tier','own'])$(key).value=state[key];
 if(document.activeElement!==$('search'))$('search').value=state.q;
 const brands=[...new Set(base.rows.map(r=>r.brand||'品牌待核'))].sort((a,b)=>a.localeCompare(b));
 if(state.brand&&!brands.includes(state.brand))brands.push(state.brand);
 $('brand').innerHTML='<option value="">全部品牌</option>'+brands.map(b=>`<option value="${esc(b)}">${esc(brandLabel(b))}</option>`).join('');$('brand').value=state.brand;
 const allBins=M.select(D,{...state,q:'',brand:'',band:'',tier:'all',mode:'all'}).bins;
 $('band').innerHTML='<option value="">全部价格带</option>'+allBins.map(b=>`<option value="${b.index}">${b.label} ${country().currency}</option>`).join('');$('band').value=state.band;
 $('scope').innerHTML=`<span>更新 ${D.asOf} · ${country().currency}${historical?(state.dataset==='2026-10'?' · 10月未结月':' · '+state.dataset):state.dataset==='focus'?' · 近30天起止日未提供':state.dataset==='curated'?' · 销量起止日未提供':''}</span><a href="#" data-open-notes>${historical?'当前商品历史':state.dataset==='archive'?'类目榜单样本':state.dataset==='focus'?'4 个品牌样本':'历史竞品样本'} · 非全市场 ⓘ</a>`;
 $('chips').innerHTML=[['brand',state.brand],['band',state.band?`${M.bandLabel(state.band,state.country)} ${country().currency}`:''],['q',state.q?`搜索：${state.q}`:''],['tier',state.tier==='all'?'':state.tier],['mode',state.mode==='all'?'':state.mode==='price'?'历史价 ±20%':'自动集尘配置']].filter(([,v])=>v).map(([k,v])=>`<button data-clear="${k}">${esc(v)} ×</button>`).join('');
 $('kpis').innerHTML=isBrand?miniKpis(v):'';$('kpis').hidden=!isBrand;$('comparison-options').hidden=isBrand;
 document.querySelectorAll('[name=mode]').forEach(r=>{r.checked=r.value===state.mode;r.disabled=r.value==='config'&&state.category!=='vacuum';});
 $('sort').options[1].textContent=isBrand?(historical?'期末价中位数从低到高':'价格中位数从低到高'):'商品价格从低到高';const own=D.own[state.country]?.[state.own];$('own-note').textContent=own?money(own.price)+' · 历史报价 / '+own.date:'当地报价未提供';
 $('mode-note').textContent=state.mode==='price'?(own?'筛选范围：'+money(own.price*.8)+' – '+money(own.price*1.2)+'。商品价与历史报价日期可能不同。':'缺少当地报价，暂时无法按价格匹配。'):state.mode==='config'?'仅保留标题明确标称自动集尘的商品；其他参数在详情中查看。':'';$('mode-note').hidden=!$('mode-note').textContent;
 $('price-note').textContent=`${num(M.priceStep(state.country))} ${country().currency} / 档 · 商品数`;$('price-chart').innerHTML=priceHistogram(v);
 const items=isBrand?v.brands:v.rows,pageSize=12,page=Math.max(0,Math.min(Number(state.offset)||0,Math.max(0,Math.ceil(items.length/pageSize)-1))),shown=items.slice(page*pageSize,(page+1)*pageSize);
 $('result-title').textContent=isBrand?'品牌排行':'商品榜单';$('result-note').textContent=isBrand?v.brands.length+' 个品牌 · '+v.rows.length+' 件商品':v.rows.length+' 件商品 · 可选 1–4 件对比';
 $('table-head').innerHTML=isBrand?`<tr><th>品牌</th><th class="num">商品数</th><th class="num">销量 / 台</th><th class="num">销售额 / ${country().currency}</th><th class="num">${historical?'期末价中位数':'价格中位数'}</th><th></th></tr>`:`<tr><th><span class="sr-only">选择商品</span></th><th>商品</th><th class="num" title="${historical?'月末最后有效价格，非月均价':state.dataset==='archive'?'归档月均价':'查询时价格'}">${historical?'期末价':state.dataset==='archive'?'月均价':'商品价'} / ${country().currency}</th><th class="num">销量 / 台</th><th>${state.category==='vacuum'?'集尘方式 / 分类':'评分 / 评价数'}</th><th></th></tr>`;
 const maxSales=Math.max(1,...v.brands.map(b=>b.sales||0));
 $('table-body').innerHTML=shown.length?shown.map(r=>isBrand?`<tr><td><div class="brand-cell"><span class="brand-mark">${esc(r.brand.slice(0,1))}</span><button class="text-button" data-brand-detail="${esc(r.brand)}">${esc(brandLabel(r.brand))}</button></div></td><td class="num">${r.count}</td><td class="num"><div class="sales-bar"><i><b style="width:${(r.sales||0)/maxSales*100}%"></b></i><span>${num(r.sales)}</span></div></td><td class="num">${num(r.revenue)}<small>${country().currency}</small></td><td class="num">${num(r.median)}</td><td><button data-research-brand="${esc(r.brand)}">查看商品 →</button></td></tr>`:`<tr><td><input type="checkbox" aria-label="选择 ${r.asin}" data-pick="${r.id}" ${state.picked.includes(r.id)?'checked':''}></td><td>${productLabel(r)}</td><td class="num">${money(r.avgPrice)}</td><td class="num">${num(r.sales)}</td><td>${state.category==='vacuum'?`${r.tier==='unknown'?'':`<span class="pill">${tier(r)}</span>`}<small>${esc(featureLabel(r))}</small>`:`${r.rating??'—'}<small>${num(r.reviews??r.ratings)} 条评价</small>`}</td><td><a href="${url(r)}" target="_blank" rel="noopener">Amazon ↗</a></td></tr>`).join(''):`<tr><td colspan="6"><div class="empty"><strong>没有匹配的商品</strong>${state.platform!=='amazon'?'该平台尚未接入此数据集。':state.dataset!=='focus'&&!historical&&state.category!=='vacuum'?'该期间仅收录吸尘器。可切换到近30天品牌样本查看其他品类。':state.country==='BR'&&state.dataset==='archive'?'卖家精灵未返回巴西归档月表，可切换到已核竞品样本。':historical?'当前商品在该月没有匹配记录；缺失不代表销量为零。':'请调整搜索词或筛选条件。'}<p><button data-reset>清除筛选</button></p></div></td></tr>`;
 $('page-info').textContent=`${items.length?page*pageSize+1:0}–${Math.min((page+1)*pageSize,items.length)} / ${items.length} ${isBrand?'个品牌分组':'件商品'}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=items.length;$('prev').dataset.page=String(page-1);$('next').dataset.page=String(page+1);
 const selected=base.rows.filter(r=>state.picked.includes(r.id));$('compare-tray').hidden=selected.length===0;$('picked-count').textContent=`已选 ${selected.length} / 4 件商品`;$('picked-names').textContent=selected.map(r=>r.brand||r.asin).join(' · ');$('open-compare').disabled=selected.length<1;
 const rawCount=M.normalize(D,state).length;
 $('data-note-count').textContent=base.rows.length+' 件样本';
 $('quality').innerHTML=`<dl class="quality-grid"><dt>来源与期间</dt><dd>卖家精灵 · ${esc(month||'暂无归档月')}。${historical?'按当前已收录商品回查历史，不包含未收录的已退市商品；品牌与品类来自当前档案。10月为未结月接口值，11—12月尚未发生。':state.dataset==='focus'?'只含石头、添可、追觅、云鲸四品牌，近30天起止日未提供；不与9月归档合并。':state.dataset==='archive'?'类目榜单最多返回 Top100；不足100不代表已覆盖全类目。':'历史竞品样本缺少销量起止日，不与归档月合并。'} 更新 ${D.asOf}。</dd><dt>筛选与去重</dt><dd>原始 ${rawCount} 件，排除不相关商品 ${base.excluded.length} 件，合并重复 ASIN / 已知父体 ${base.duplicates.length} 件，保留 ${base.rows.length} 件。当前筛选 ${v.rows.length} 件。</dd><dt>历史父体</dt><dd>${historical?"优先使用接口父体变更记录；未提供历史关系的月份沿用当前档案父体并明确标注。按已知父体合并，历史关系不全可能影响样本合计；原始逐商品记录完整保留在年度明细。":"按已提供的父体字段合并。"}</dd><dt>缺失字段</dt><dd>销量 ${v.sales.known}/${v.rows.length} 件，销售额 ${v.revenue.known}/${v.rows.length} 件；品牌缺失 ${v.missingBrand} 件，父体缺失 ${v.missingParent} 件。父体缺失可能造成变体重复。合计只包含已提供数值，空值不计为零。</dd><dt>价格</dt><dd>${historical?'月末最后有效价格，非月均价':state.dataset==='archive'?'归档月均价':'查询时价格'}；每档 ${num(M.priceStep(state.country))} ${country().currency}，下限包含、上限不含，空价格不分档。价格中位数仅使用有价商品。UWANT 为原表历史报价，日期分别展示，不据此判断实时价格优势。</dd><dt>销量与配置</dt><dd>销量和销售额为第三方估算，不反算销售额。配置仅采用已有资料及标题明确描述。T3 白牌沿用原有人工分类，新品牌不自动归为白牌；空参数不参与优劣评分。</dd><dt>品牌冲突</dt><dd>${v.rows.filter(r=>r.brandConflict).map(r=>esc(r.asin)+'：标题提及 Midea，详情品牌为 '+esc(r.sourceBrand)+'；保留原字段并列入品牌待核').join('；')||'当前筛选未发现已识别的品牌冲突'}</dd></dl><details><summary>查看排除记录（${base.excluded.length} 件）</summary><p>${base.excluded.map(r=>esc(r.asin)+' '+esc(r.title)).join('；')||'当前范围无其他排除项；近30天查询的分类及排除记录见补采记录。'}</p></details><p><a href="focus-brands-audit.json" target="_blank">查看近30天补采记录 ↗</a></p>`;

 renderDrawer(v,base);
}
function renderDrawer(v,base){
 if(!state.detail){if($('drawer').open)$('drawer').close();drawerKey='';return;}
 const nextKey=JSON.stringify([state.detail,state.picked,state.own,state.country,state.category,state.dataset,state.q,state.band,state.mode,state.tier]);if(drawerKey===nextKey)return;drawerKey=nextKey;
 const split=state.detail.indexOf(':'),kind=state.detail.slice(0,split),key=state.detail.slice(split+1);let body='';
 $('drawer-kicker').textContent=kind==='compare'?'商品对比':kind==='brand'?'品牌研究':'商品详情';
 if(kind==='brand'){
  const rows=v.rows.filter(r=>(r.brand||'品牌待核')===key),detail=M.select(D,{...state,brand:key});$('drawer-title').textContent=brandLabel(key);
  body=`<div class="kpis">${miniKpis(detail)}</div><button class="primary" data-research-brand="${esc(key)}">查看全部商品 →</button><h3>商品与价格</h3><table><tbody>${rows.map(r=>`<tr><td>${productLabel(r)}</td><td class="num">${money(r.avgPrice)}<small>${num(r.sales)} 台</small></td></tr>`).join('')}</tbody></table>`;
 }else if(kind==='product'){
  const r=base.rows.find(r=>r.id===key);$('drawer-title').textContent=r?.brand||'商品详情';
  body=r?`<div class="product-detail-heading">${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="商品图片">`:""}<h3>${esc(r.title)}</h3></div>${r.sourceBullets?.length?`<details class="detail-copy"><summary>查看卖家标称与图片来源</summary>${r.sourceBullets.map(text=>`<p>${esc(text)}</p>`).join("")}</details>`:""}<p class="detail-copy">${r.asin} · ${esc(r.period)}${r.monthState==='未结月接口快照'?' · 未结月':''} · ${esc(r.parentAsin?'父体 '+r.parentAsin:'父体未提供')}</p><div class="kpis"><article><span>${M.isHistory(state.dataset)?"月末最后有效价格":"归档均价 / 快照价"}</span><strong>${money(r.avgPrice)}</strong></article><article><span>月销量估算</span><strong>${num(r.sales)}</strong></article></div><p class="detail-copy">${tier(r)} · ${r.autoEmpty?'标题明确自动集尘；当地套装仍需核实':'自动集尘、续航、吸力、噪声等配置待核'}。</p><button data-pick-button="${r.id}">${state.picked.includes(r.id)?"移出对比":"加入对比"}</button> <a href="${url(r)}" target="_blank" rel="noopener">查看 Amazon 原商品 ↗</a>`:'<p>该深链接商品不在当前数据集中，请调整研究范围。</p>';
 }else if(kind==='compare'){
  $('drawer-title').textContent=`UWANT ${state.own} · 商品对比`;const rows=base.rows.filter(r=>state.picked.includes(r.id)),own=D.own[state.country]?.[state.own];
  const field=pattern=>own?.fields.find(f=>pattern.test(f.label))?.value||'未核实';
  body=`<div class="compare-toolbar"><span>${rows.length} 件竞品</span><label><input type="checkbox" id="differences-only"> 只看差异</label><button id="export-compare">↓ 导出所选</button></div><p class="detail-copy">UWANT 为历史资料，竞品为所选期间数据。各列保留独立日期。</p><div class="table-scroll"><table class="compare-matrix"><thead><tr><th>比较项</th><th class="own-column">UWANT ${state.own}<small>${esc(own?.source||'当地资料待补')}</small></th>${rows.map(r=>`<th>${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="">`:''}${esc(r.brand||'品牌待核')}<small>${r.asin}</small></th>`).join('')}</tr></thead><tbody>${[
   ['价格',own?money(own.price):'当地报价待核',...rows.map(r=>money(r.avgPrice))],
   ['价格 / 销量日期',own?own.priceType+' · '+own.date:'未提供',...rows.map(r=>r.period+(r.monthState==='未结月接口快照'?' · 未结月':''))],
   ['月销量估算','未提供',...rows.map(r=>num(r.sales))],
   [state.category==='vacuum'?'自动集尘':'自清洁',state.category==='vacuum'?field(/^Auto-Empty$/i):field(/self.clean/i),...rows.map(r=>state.category==='vacuum'?(r.autoEmpty?'标题明确，版本待核':'未核实'):(/self.clean|auto.clean|autolimp/i.test(r.title)?'标题标称，参数待核':'未核实'))],
   ['续航',field(/^Run Time/i),...rows.map(()=> '未核实')],
   ['吸力',field(/^Suction/i),...rows.map(()=> '未核实')],
   ['重量',field(/^Weight$/i),...rows.map(()=> '未核实')],
   ['评分 / 评分人数','未提供',...rows.map(r=>`${r.rating??'—'} / ${num(r.reviews??r.ratings)}`)],
  ].map(cells=>`<tr data-difference="${new Set(cells.slice(1).map(x=>String(x??'未提供'))).size>1}">${cells.map((x,i)=>`<td class="${i===1?'own-column':''}">${esc(x||'未提供')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="detail-copy">标称参数需当地版本和套装复核。空字段不作优劣评分。</p>`;
 }else{$('drawer-title').textContent='链接无效';body='<p>无法识别该详情，请关闭后重新选择。</p>';}
 $('drawer-body').innerHTML=body;if(!$('drawer').open)$('drawer').showModal();
}
function pick(id){const picked=state.picked.includes(id)?state.picked.filter(x=>x!==id):[...state.picked,id];if(picked.length>4){notify('最多对比4件商品，请先移出一件');render();return;}change({picked},{replace:true});}
function download(text,name){try{const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);notify('已导出 CSV');}catch{notify('导出失败，当前筛选已保留，请重试');}}
function exportResults(selected=false){const v=M.select(D,state),rows=selected?M.baseRows(D,state).rows.filter(r=>state.picked.includes(r.id)):v.rows;if(!rows.length){notify('当前没有可导出的商品');return;}if(state.page==='brands'&&!selected){const q=x=>{let value=String(x??'');if(/^[=+@\-\t\r]/.test(value))value="'"+value;return '"'+value.replaceAll('"','""')+'"';};download('\uFEFF'+[['国家','数据集','品牌','商品数','样本销量估算','样本销售额估算','币种','价格中位数'],...v.brands.map(b=>[state.country,state.dataset,b.brand,b.count,b.sales,b.revenue,country().currency,b.median])].map(r=>r.map(q).join(',')).join('\r\n'),`UWANT_${state.country}_brands.csv`);}else download(M.csv(rows,state),`UWANT_${state.country}_${selected?'comparison':'products'}.csv`);}
for(const key of ['country','platform','category','dataset','brand','band','sort','tier','own'])$(key).addEventListener('change',e=>change({[key]:e.target.value}));
$('search').addEventListener('input',e=>change({q:e.target.value},{replace:true}));
document.querySelectorAll('[name=mode]').forEach(r=>r.addEventListener('change',e=>change({mode:e.target.value})));
function reset(){change({q:'',brand:'',band:'',mode:'all',tier:'all'});}
$('reset').onclick=reset;$('clear-band').onclick=()=>change({band:''});$('prev').onclick=e=>change({offset:e.target.dataset.page});$('next').onclick=e=>change({offset:e.target.dataset.page});
$('export').onclick=()=>exportResults();$('clear-picks').onclick=()=>change({picked:[]},{replace:true});$('open-compare').onclick=()=>detail('compare','selection');$('close-drawer').onclick=closeDrawer;
$('drawer').addEventListener('cancel',e=>{e.preventDefault();closeDrawer();});$('drawer').addEventListener('close',()=>{const target=lastFocus?.isConnected?lastFocus:document.querySelector(lastFocusToken||'#search');target?.focus({preventScroll:true});});
$('drawer').addEventListener('click',e=>{if(e.target===$('drawer')){const r=$('drawer').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)closeDrawer();}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-route],[data-brand-detail],[data-research-brand],[data-product],[data-pick-button],[data-clear],[data-band],[data-reset],#export-compare');if(!a)return;
 if(a.dataset.route){e.preventDefault();change({page:a.dataset.route,detail:''},{scroll:true});}
 else if(a.dataset.brandDetail)detail('brand',a.dataset.brandDetail);
 else if(a.dataset.researchBrand)change({page:'competitors',brand:a.dataset.researchBrand,detail:''},{scroll:true});
 else if(a.dataset.product)detail('product',a.dataset.product);
 else if(a.dataset.pickButton)pick(a.dataset.pickButton);
 else if(a.dataset.clear){const k=a.dataset.clear;change({[k]:['mode','tier'].includes(k)?'all':''});}
 else if(a.dataset.band!==undefined)change({band:a.dataset.band});else if(a.hasAttribute('data-reset'))reset();else if(a.id==='export-compare')exportResults(true);
});
document.addEventListener('change',e=>{if(e.target.dataset.pick)pick(e.target.dataset.pick);if(e.target.id==='differences-only')document.querySelectorAll('.compare-matrix tbody tr[data-difference="false"]').forEach(row=>row.hidden=e.target.checked);});
$('operations-retry').onclick=()=>{operationsReady=false;$('operations-frame').removeAttribute('src');$('operations-frame').removeAttribute('srcdoc');delete $('operations-frame').dataset.started;$('operations-status').hidden=false;$('operations-status').textContent='正在加载…';$('operations-retry').hidden=true;render();};
document.addEventListener('click',e=>{if(e.target.closest('[data-open-notes]')){e.preventDefault();document.querySelector('.data-note').open=true;document.querySelector('.data-note').scrollIntoView({block:'start',behavior:'smooth'});}});
document.addEventListener('keydown',e=>{const target=e.target.closest('g[data-band]');if(target&&['Enter',' '].includes(e.key)){e.preventDefault();change({band:target.dataset.band});}});
window.addEventListener('popstate',()=>{state=M.parse(location.hash);drawerKey='';render();requestAnimationFrame(()=>window.scrollTo({top:history.state?.scrollY||0,behavior:'auto'}));});
window.addEventListener('hashchange',()=>{if(M.encode(state)!==location.hash){state=M.parse(location.hash);drawerKey='';render();}});
$('sidebar-menu').onclick=()=>{const open=document.querySelector('.sidebar').classList.toggle('nav-expanded');$('sidebar-menu').setAttribute('aria-expanded',String(open));};
document.addEventListener('click',e=>{if(e.target.closest('[data-route]')){document.querySelector('.sidebar').classList.remove('nav-expanded');$('sidebar-menu').setAttribute('aria-expanded','false');}});
document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){e.target.alt='图片加载失败';e.target.classList.add('failed-image');}},true);
history.replaceState({scrollY:0,drawer:false},'',M.encode(state));render();
