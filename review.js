'use strict';
const M=ResearchModel,D=REVIEW_DATA;D.own=REVIEW_OWN;D.focus=FOCUS_BRANDS;D.history=AmazonResearch.mergeHistory(window.REVIEW_HISTORY);window.UWANT_HISTORY_VIEW=D.history;
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>x==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:0}).format(x);
let state=M.parse(location.hash),drawerKey='',lastFocus=null,lastFocusToken='',toastTimer;
const requestedCountry=new URLSearchParams(location.hash.slice(1)).get('country');if(state.platform==='ml'&&['CA','US'].includes(requestedCountry)&&requestedCountry!==state.country){history.replaceState(history.state,'',M.encode(state));setTimeout(()=>notify('美客多尚无该站点数据，已切换墨西哥。'),0);}
const country=()=>M.countries[state.country],money=n=>n==null?'—':`${new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)} ${country().currency}`;
const url=r=>`https://www.${country().domain}/dp/${r.asin}`;
const tier=r=>({T1:'T1 核心自集尘',T2:'T2 同价位',T3:'T3 白牌（分组待核）'})[r.tier]||'未核层级';
const brandLabel=brand=>{const b=D.focus.roster.find(b=>b.name.toLowerCase()===String(brand).toLowerCase());return b?`${b.zh} ${b.name}`:brand;};
const featureLabel=r=>state.category==='vacuum'?(r.autoEmpty?'自动集尘（标题标称）':'—'):(r.classificationReason||'—');
const pageNames={brands:'品牌分析',competitors:'竞品对比',market:'市场总览',overview:'经营总览',analysis:'经营分析',products:'SKU 表现',profit:'利润与补货',inventory:'库存监控',calendar:'促销日历',tasks:'运营任务',access:'访问设置'};
let operationsReady=false,operationsTimer,frameRoute='';
function operationPayload(){return {type:'uwant:navigate',page:state.page,country:state.country.toLowerCase(),platform:state.platform,category:state.category,dataset:state.dataset,view:state.view,own:state.own,marketQuery:state.marketQuery,marketSort:state.marketSort,marketOffset:state.marketOffset,marketTop:state.marketTop,priceBand:state.priceBand,opsPeriod:state.opsPeriod,opsChannel:state.opsChannel,opsSku:state.opsSku,...ResearchCatalog.stateFrom(state),historyRows:M.isHistory(state.dataset)?D.history.rows.filter(r=>r.country===state.country&&r.category===state.category&&r.month===state.dataset):[],historyAsOf:D.history.asOf};}
function isDecisionRoute(s){return ['brands','competitors'].includes(s.page)||s.page==='market'&&['overview','products','brands','competitors','opportunities','coverage','research','data','changes','keywords','macro','pricing'].includes(s.view)||s.page==='market'&&s.platform==='ml'&&s.view==='monthly';}
function isOuterResearch(s){return ['brands','competitors'].includes(s.page)||isDecisionRoute(s);}
function updateNavigation(){
 let page=state.page,view=state.view;
 if(page==='market'){
  if(['macro','pricing','opportunities'].includes(view))view='overview';
  else if(['coverage','research','changes'].includes(view))view='data';
  else if(['brands','competitors'].includes(view)){page=view;view='overview';}
 }
 document.querySelectorAll('.sidebar nav [data-route]').forEach(a=>a.setAttribute('aria-current',a.dataset.route===page&&(page!=='market'||(a.dataset.view||'overview')===view)?'page':'false'));
}
function operationPage(){
 const research=isOuterResearch(state);
 updateNavigation();
 const pageTitle=state.page==='market'?({products:'商品研究',data:'数据管理',coverage:'数据覆盖',macro:'市场环境',changes:'变化记录',opportunities:'UWANT 同价位观察'}[state.view]||pageNames.market):pageNames[state.page];$('crumb').textContent=pageTitle;document.title=pageTitle+' · UWANT';
 $('research-content').hidden=!research;$('operations-content').hidden=research;document.body.classList.toggle('operations-open',!research);
 if(research)return false;
 document.querySelector('#rq-dialog')?.close();$('compare-tray').hidden=true;if($('drawer').open)$('drawer').close();drawerKey='';
 const opResearch=$('operations-research'),opCategory=({D:'wash',V:'vacuum',Y:'fabric',M:'mattress'})[state.opsSku?.[0]]||state.category,opScope={...state,category:opCategory,platform:state.opsChannel==='Mercado Libre'?'ml':'amazon',keywordPurpose:'relevant',keywordQuery:'',keywordAsin:''},opCatalog=state.page==='analysis'?decisionCatalog(opScope):null;
 opResearch.hidden=!opCatalog||!KeywordResearch.select(opCatalog,opScope).availablePeriods?.length;
 if(!opResearch.hidden){opResearch.innerHTML='<details class="operations-keyword-summary"><summary>竞品搜索词研究 · '+esc(({MX:'墨西哥',CA:'加拿大',US:'美国',BR:'巴西'})[opScope.country])+' · '+esc(({wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'})[opScope.category])+' · 展开查看来源与用途词</summary>'+KeywordResearch.render(opCatalog,opScope,{compact:true})+'</details>';KeywordResearch.wire(opResearch,opCatalog,opScope,patch=>change({category:opScope.category,platform:opScope.platform,...patch}),evidenceDownload);}else opResearch.innerHTML='';
 const frame=$('operations-frame');
 if(!frame.dataset.started){
  frame.dataset.started='true';
  if(typeof window.REVIEW_OPERATIONS_HTML==='string')frame.srcdoc=window.REVIEW_OPERATIONS_HTML;else frame.src='operations/index.html?v=d86f8e19420e&country='+state.country.toLowerCase()+'#'+state.page;frameRoute=state.page;
  operationsTimer=setTimeout(()=>{if(!operationsReady){$('operations-status').textContent='加载尚未完成，请重试。';$('operations-retry').hidden=false;}},15000);
 }else if(operationsReady){frame.contentWindow.postMessage(operationPayload(),location.origin==='null'?'*':location.origin);frameRoute=state.page;}
 return true;
}
function handleFrameMessage(e){
 if(e.source!==$('operations-frame').contentWindow||e.origin!==location.origin)return;
 if(e.data?.type==='uwant:evidence-back'){if(history.state?.rqDetail)history.back();else change({evidenceDetail:''},{replace:true});return;}
 if(e.data?.type==='uwant:research'&&['brands','competitors'].includes(e.data.page)){change({page:e.data.page,detail:'',band:state.priceBand||'',...(e.data.own?{own:e.data.own,mode:e.data.mode||'all'}:{})},{scroll:true});return;}
 if(e.data?.type==='uwant:ready'){
  operationsReady=true;clearTimeout(operationsTimer);$('operations-status').hidden=true;$('operations-retry').hidden=true;$('operations-frame').hidden=false;
  if(!isOuterResearch(state))$('operations-frame').contentWindow.postMessage(operationPayload(),location.origin==='null'?'*':location.origin);
 }else if(operationsReady&&e.data?.type==='uwant:route'&&pageNames[e.data.page]&&!isOuterResearch(state)){
  const nextCountry=String(e.data.country||'').toUpperCase(),countryChanged=M.countries[nextCountry]&&state.country!==nextCountry;
  const scope=e.data.page==='market'?Object.fromEntries(['platform','category','dataset','view','priceBand','own','marketQuery','marketSort','marketOffset','marketTop',...Object.keys(ResearchCatalog.defaults)].filter(k=>typeof e.data[k]==='string').map(k=>[k,e.data[k]])):Object.fromEntries(['opsPeriod','opsChannel','opsSku'].filter(k=>typeof e.data[k]==='string').map(k=>[k,e.data[k]]));
  if(state.page!==e.data.page||countryChanged||Object.entries(scope).some(([k,v])=>state[k]!==v)){frameRoute=e.data.page;change({page:e.data.page,detail:'',...scope,...(countryChanged?{country:nextCountry}:{})},{replace:!countryChanged&&state.page===e.data.page&&Object.keys(scope).filter(k=>scope[k]!==state[k]).every(k=>['evidenceQuery','evidencePage','evidencePicks'].includes(k))});}
 }
}
window.addEventListener('message',handleFrameMessage);
// Same-origin route commits synchronously so an immediate refresh sees the new scope.
window.UWANT_RESEARCH_ROUTE=data=>handleFrameMessage({source:$('operations-frame').contentWindow,origin:location.origin,data});
function shortTitle(r){
 const title=String(r.title||'');
 const match=title.match(/\b(?:FLOOR\s*ONE|PURE\s*ONE|Flexi|Dyad|H\d{1,2}|S\d{1,3}|V\d{1,3}|Detect|Stratos|HydroVac|HydroSteam|CrossWave)(?:\s+(?:[A-Z]?\d{1,3}[A-Z]?|Pro|Ultra|Max|Lite|Plus|Steam|Combo|Complete|Detect|Slim|Absolute|Origin|PowerDetect)){0,4}\b/i);
 if(match){const name=match[0].replace(/[,\s.]+$/,'').replace(/\s+(?:Cordless|Wet|Dry|Vacuum|with|for)\b.*$/i,'');return name.toLowerCase().startsWith(String(r.brand||'').toLowerCase())?name:((r.brand||'')+' '+name).trim();}
 return title.split(/\s[|–—]\s|[,，]/)[0].slice(0,72)||r.asin;
}
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function change(patch,{replace=false,scroll=false}={}){
 if(window.Mercado?.rendering)return;
 history.replaceState({...history.state,scrollY:window.scrollY},'',location.href);
 const previous=state;state={...state,...patch};if('dataset' in patch&&!('startMonth' in patch)){state.startMonth='';state.endMonth='';}if(state.startMonth&&state.endMonth)state.dataset=state.endMonth;if(['AR','CL','CO'].includes(state.country)&&state.platform!=='ml'&&['brands','competitors','market'].includes(state.page)){state.country='MX';notify('此国家尚无当前渠道研究数据，已切换墨西哥。');}if(state.platform==='ml'&&['CA','US'].includes(state.country)&&['market','brands','competitors'].includes(state.page)){state.country='MX';notify('美客多当前采集五个拉美站点，已切换墨西哥。');}if(!['market','brands','competitors'].includes(state.page)&&['CL','CO'].includes(state.country)){state.country='MX';notify('该国家尚无经营管理数据，已切换墨西哥。');}if(state.platform!=='ml'&&state.startMonth&&(!M.isHistory(state.startMonth)||!M.isHistory(state.endMonth))){state.startMonth='';state.endMonth='';state.dataset='2026-09';notify('Amazon历史仅支持2026年，已返回可用月份。');}
 if(patch.page==='brands'){state.mode='all';state.tier='all';}
 if(['country','platform','category','dataset'].some(k=>k in patch&&patch[k]!==previous[k])){
  state={...state,brand:'',band:'',q:'',picked:[],detail:'',offset:'0',tier:'all',mode:'all'};
  if(patch.brand!==undefined)state.brand=patch.brand;
  if(previous.picked.length)notify('研究范围已变化，对比清单已清空');
 }
 if(['country','platform','category'].some(k=>k in patch&&patch[k]!==previous[k])){state.evidenceQuery='';state.evidenceBrand='';state.evidenceDetail='';state.evidencePicks='';state.evidenceGroup='';state.evidencePage='0';state.ownListing='';state.priceBand='';state.keywordAsin='';state.keywordQuery='';Object.assign(state,ResearchCatalog.scopeReset(Object.fromEntries(['country','platform','category'].map(k=>[k,k in patch&&patch[k]!==previous[k]]))));}
 if(state.category!=='fabric'&&state.competitionGroup==='alternative')state.competitionGroup='direct';
 if(!('offset' in patch))state.offset='0';
 history[replace?'replaceState':'pushState']({scrollY:scroll?0:window.scrollY,drawer:!!state.detail,rqDetail:!!state.evidenceDetail},'',M.encode(state));
 render();if(patch.evidenceDetail===undefined&&previous.evidenceDetail&&!state.evidenceDetail)document.querySelector('[data-rq-query]')?.focus({preventScroll:true});if(scroll)window.scrollTo({top:0,behavior:'auto'});
}
function detail(kind,key){lastFocus=document.activeElement;lastFocusToken=kind==='brand'?`[data-brand-detail="${CSS.escape(key)}"]`:kind==='product'?`[data-product="${CSS.escape(key)}"]`:'#open-compare';change({detail:`${kind}:${key}`});}
function closeDrawer(){if(!state.detail)return;if(history.state?.drawer)history.back();else change({detail:''},{replace:true});}
function productLabel(r){return `<div class="product-cell">${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<span class="image-empty" aria-label="暂无商品图片">暂无图片</span>'}<div><button class="text-button" data-product="${r.id}" title="${esc(r.title)}"><strong>${esc(shortTitle(r))}</strong></button><small>${esc(r.brand||'品牌未提供')} · ${r.asin}</small></div></div>`;}
function salesEvidence(r,base){const confirmed=HistoryMetrics.metricRows([r],'units',{universe:base.rows}).length>0;return M.isHistory(state.dataset)?'父体原值 '+num(r.parentSales)+' · '+(confirmed?'已去重纳入样本':'归属或数值待核，不计合计'):'父体来源值 '+num(r.sales)+' · '+(confirmed?'当前关系去重':'统计期归属待核，不计合计');}
function miniKpis(v){const cards=[];if(v.sales.value!==null)cards.push(`<article><span>已知样本销量 <small>估算 / 台</small></span><strong>${num(v.sales.value)}</strong><small>${v.sales.known} 个去重销量单位 · 非完整总量</small></article>`);if(v.revenue.value!==null)cards.push(`<article><span>已知样本销售额 <small>估算 / ${country().currency}</small></span><strong>${num(v.revenue.value)}</strong><small>${v.revenue.known} 个去重销售额单位</small></article>`);cards.push(`<article><span>商品数 <small>当前样本</small></span><strong>${num(v.rows.length)}</strong><small>${v.brands.length} 个品牌${v.sales.value===null?' · 暂无可归属销量':''}</small></article>`);return cards.join('');}
function priceHistogram(v){
 if(!v.rows.some(r=>Number.isFinite(r.avgPrice)))return '<p class="detail-copy">当前范围未取得有效价格，暂不展示价格分布。商品档案仍可查看。</p>';
 const bins=v.bins,w=1120,h=260,left=48,right=20,top=25,bottom=190,plot=w-left-right,slot=plot/bins.length,max=Math.max(1,...bins.map(b=>b.count)),ceiling=Math.max(4,Math.ceil(max/4)*4);
 return `<svg class="price-histogram" viewBox="0 0 ${w} ${h}" role="group" aria-label="价格分布柱状图，点击柱子筛选价格段"><text x="${left}" y="13" class="axis-caption">商品数</text>${Array.from({length:5},(_,i)=>{const count=ceiling*i/4,y=bottom-count/ceiling*(bottom-top);return `<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" class="chart-grid"/><text x="${left-12}" y="${y+4}" text-anchor="end" class="axis-label">${count}</text>`;}).join('')}${bins.map(b=>{const x=left+b.index*slot+slot*.16,bw=slot*.68,bh=b.count/ceiling*(bottom-top),cx=x+bw/2;return `<g role="button" tabindex="0" data-band="${b.index}" aria-label="${b.label}，${b.count}件商品" aria-pressed="${state.band===String(b.index)}"><title>${b.label} ${country().currency}：${b.count} 件商品</title><rect x="${left+b.index*slot}" y="${top}" width="${slot}" height="${bottom-top}" fill="transparent"/><rect x="${x}" y="${bottom-bh}" width="${bw}" height="${b.count?Math.max(1,bh):0}" rx="3" class="histogram-bar ${state.band===String(b.index)?'selected':''}"/><text x="${cx}" y="${bottom-bh-7}" text-anchor="middle" class="chart-count">${b.count||''}</text><text transform="translate(${cx},${bottom+15}) rotate(-36)" text-anchor="end" class="axis-label">${b.label}</text></g>`;}).join('')}<text x="${w-right}" y="${h-2}" text-anchor="end" class="axis-caption">价格 / ${country().currency} · 每档 ${num(M.priceStep(state.country))}</text></svg>`;
}
function render(){
 if(window.Mercado)Mercado.restore();
 for(const option of $('country').options)option.disabled=isOuterResearch(state)?state.platform==='ml'?!['MX','BR','AR','CL','CO'].includes(option.value):['AR','CL','CO'].includes(option.value):['CL','CO'].includes(option.value);
 if(operationPage())return;
 $('export').onclick=()=>exportResults();
 if(window.ResearchDataAdmin?.isRoute(state)){renderDataWorkspace();return;}
 if(state.platform==='ml'&&isDecisionRoute(state)){Mercado.render(state,change,evidenceDownload);return;}
 if(isDecisionRoute(state)){renderDecisionWorkspace();return;}
 const historical=M.isHistory(state.dataset);$('month-range-controls').innerHTML='';$('dataset').closest('label').hidden=false;
 if(!$('dataset').querySelector('optgroup')){const group=document.createElement('optgroup');group.label='2026 年 · 当前商品历史';for(const month of D.history.months){const option=document.createElement('option');option.value=month;option.textContent=month.replace('-','年')+'月'+(month===new Date().toISOString().slice(0,7)?' · 当前月':'');group.append(option);}$('dataset').prepend(group);}
 document.querySelector('#tier').hidden=state.category!=='vacuum';document.querySelector('input[name=mode][value=config]').parentElement.hidden=state.category!=='vacuum';
 if(state.category!=='vacuum'&&state.mode==='config')state.mode='all';
 const prefix={vacuum:'V',wash:'D',fabric:'Y',mattress:'M'}[state.category],localOwn=Object.keys(D.own[state.country]||{}).filter(k=>k.startsWith(prefix)),ownChoices=localOwn.length?localOwn:({vacuum:['V500','V600'],wash:['D500','D600','D800'],fabric:['Y100S','Y200S'],mattress:['M600']}[state.category]||[]);
 if(!ownChoices.includes(state.own))state.own=ownChoices[0]||'V500';
 $('own').innerHTML=ownChoices.map(sku=>`<option>${sku}</option>`).join('');
 const priceComparable=AmazonResearch.canBenchmarkPrice(D.own[state.country]?.[state.own],state);if(state.mode==='price'&&!priceComparable){state.mode='all';history.replaceState(history.state,'',M.encode(state));notify('缺少同渠道同期间UWANT报价，已显示全部样本');}const priceMode=document.querySelector('input[name=mode][value=price]');priceMode.disabled=!priceComparable;priceMode.parentElement.title=priceComparable?'使用同渠道同期间期末报价':'缺少可比的UWANT报价；内部目标价不用于价格对标';
 const v=M.select(D,state),isBrand=state.page==='brands',base=M.baseRows(D,state),meta=D.markets[state.country],month=historical?state.dataset+(' · '+ResearchContext.period(state.dataset,M.baseRows(D,state).rows).split(' · ').slice(1).join(' · ')):state.dataset==='archive'?meta?.products?.dataMonth:state.dataset==='focus'?'近30天（接口未给出起止日）':'统计起止日未提供';

 updateNavigation();
 $('title').textContent=isBrand?'品牌分析':'竞品对比';
 for(const key of ['country','platform','category','dataset','sort','tier','own'])$(key).value=state[key];
 if(document.activeElement!==$('search'))$('search').value=state.q;
 const brands=[...new Set(base.rows.map(r=>r.brand||'品牌待核'))].sort((a,b)=>a.localeCompare(b));
 if(state.brand&&!brands.includes(state.brand))brands.push(state.brand);
 $('brand').innerHTML='<option value="">全部品牌</option>'+brands.map(b=>`<option value="${esc(b)}">${esc(brandLabel(b))}</option>`).join('');$('brand').value=state.brand;
 const allBins=M.select(D,{...state,q:'',brand:'',band:'',tier:'all',mode:'all'}).bins;
 $('band').innerHTML='<option value="">全部价格带</option>'+allBins.map(b=>`<option value="${b.index}">${b.label} ${country().currency}</option>`).join('');$('band').value=state.band;
 $('scope').innerHTML=`<span>更新 ${historical?D.history.asOf:D.asOf} · ${country().currency}${historical?(state.dataset==='2026-10'?' · '+ResearchContext.period(state.dataset,M.baseRows(D,state).rows):' · '+state.dataset):state.dataset==='focus'?' · 近30天起止日未提供':state.dataset==='curated'?' · 销量起止日未提供':''}</span><a href="#" data-open-notes>${historical?'当前商品历史':state.dataset==='archive'?'类目榜单样本':state.dataset==='focus'?'4 个品牌样本':'历史竞品样本'} · 非全市场 ⓘ</a>`;
 $('chips').innerHTML=[['brand',state.brand],['band',state.band?`${M.bandLabel(state.band,state.country)} ${country().currency}`:''],['q',state.q?`搜索：${state.q}`:''],['tier',state.tier==='all'?'':state.tier],['mode',state.mode==='all'?'':state.mode==='price'?'历史价 ±20%':'自动集尘配置']].filter(([,v])=>v).map(([k,v])=>`<button data-clear="${k}">${esc(v)} ×</button>`).join('');
 $('kpis').innerHTML=isBrand?miniKpis(v):'';$('kpis').hidden=!isBrand;$('comparison-options').hidden=isBrand;
 document.querySelectorAll('[name=mode]').forEach(r=>{r.checked=r.value===state.mode;r.disabled=r.value==='config'&&state.category!=='vacuum'||r.value==='price'&&!priceComparable;});
 $('sort').options[0].textContent=historical?'合格父体样本销量优先':'合格样本销量优先';$('sort').options[2].disabled=historical;
 $('sort').options[1].textContent=isBrand?(historical?'期末价中位数从低到高':'价格中位数从低到高'):'商品价格从低到高';const own=D.own[state.country]?.[state.own];$('own-note').textContent=own?money(own.price)+' · 历史报价 / '+own.date:'当地报价未提供';
 $('mode-note').textContent=state.mode==='price'?(own?.price>0?'筛选范围：'+money(own.price*.8)+' – '+money(own.price*1.2)+'。商品价与历史报价日期可能不同。':'缺少当地报价，暂时无法按价格匹配。'):state.mode==='config'?'仅保留标题明确标称自动集尘的商品；其他参数在详情中查看。':!priceComparable?'缺少UWANT同渠道同期间报价，内部目标价不用于价格对标。':'';$('mode-note').hidden=!$('mode-note').textContent;
 $('price-note').textContent=`${num(M.priceStep(state.country))} ${country().currency} / 档 · 商品数`;$('price-chart').innerHTML=priceHistogram(v);
 const items=isBrand?v.brands:v.rows,pageSize=12,page=Math.max(0,Math.min(Number(state.offset)||0,Math.max(0,Math.ceil(items.length/pageSize)-1))),shown=items.slice(page*pageSize,(page+1)*pageSize);
 $('result-title').textContent=isBrand?'品牌研究':'商品研究';$('result-note').textContent=isBrand?v.brands.length+' 个品牌 · '+v.rows.length+' 件商品':v.rows.length+' 件商品 · 可选 1–4 件对比';
 const qualifiedUnits=new Map(HistoryMetrics.metricRows(v.rows,'units',{universe:base.rows}).map(r=>[r.id,r.units])),U=window.UIData,columns=isBrand?[
 {key:'brand',label:'品牌',required:true,render:r=>`<div class="brand-cell"><span class="brand-mark">${esc(r.brand.slice(0,1))}</span><button class="text-button" data-brand-detail="${esc(r.brand)}">${esc(brandLabel(r.brand))}</button></div>`},
 {key:'count',label:'商品数',required:true,value:r=>r.count},
 {key:'units',label:'已知销量估算 / 台',value:r=>r.sales,render:r=>num(r.sales)},
 {key:'revenue',label:'已知销售额估算 / '+country().currency,value:r=>r.revenue,render:r=>num(r.revenue)},
 {key:'price',label:(historical?'期末价':'价格')+'中位数',value:r=>r.median,render:r=>num(r.median)},
 {key:'action',label:'',required:true,render:r=>`<button data-research-brand="${esc(r.brand)}">查看商品 →</button>`}
 ]:[
 {key:'pick',label:'对比',required:true,render:r=>`<input type="checkbox" aria-label="选择 ${r.asin}" data-pick="${r.id}" ${state.picked.includes(r.id)?'checked':''}>`},
 {key:'identity',label:'商品',required:true,render:productLabel},
 {key:'price',label:(historical?'期末价':state.dataset==='archive'?'归档月均价':'来源快照价')+' / '+country().currency,value:r=>r.avgPrice,render:r=>money(r.avgPrice)},
 {key:'units',label:'已计入父体销量估算 / 台',value:r=>qualifiedUnits.get(r.id),render:r=>num(qualifiedUnits.get(r.id))},
 {key:'features',label:state.category==='vacuum'?'集尘方式 / 分类':'评分 / 评价数',available:r=>state.category==='vacuum'?r.tier!=='unknown'||r.autoEmpty:Number.isFinite(r.rating)||Number.isFinite(r.reviews??r.ratings),render:r=>state.category==='vacuum'?`${r.tier==='unknown'?'':`<span class="pill">${tier(r)}</span>`}<small>${esc(featureLabel(r))}</small>`:`${r.rating??'—'}<small>${num(r.reviews??r.ratings)} 条评价</small>`},
 {key:'action',label:'',required:true,render:r=>`<a href="${url(r)}" target="_blank" rel="noopener">Amazon ↗</a>`}
 ],layout=U.layout(items,columns);
 $('table-head').innerHTML='<tr>'+layout.columns.map(c=>`<th>${esc(c.label)}</th>`).join('')+'</tr>';
 $('table-body').innerHTML=shown.length?shown.map(r=>'<tr>'+layout.columns.map(c=>`<td>${c.render?c.render(r):esc(c.value(r))}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${layout.columns.length}"><div class="empty"><strong>没有匹配的商品</strong><p>${state.platform!=='amazon'?'该平台尚未接入此月度数据集。':'当前范围未取得匹配记录；缺失不代表销量为零。'}</p><button data-reset>清除筛选</button></div></td></tr>`;
 $('result-gaps').innerHTML=items.length?U.gap(layout.missing,'缺失保留为空；父体原值与归属见商品详情，不用于未核销量排名。'):'';
 $('page-info').textContent=`${items.length?page*pageSize+1:0}–${Math.min((page+1)*pageSize,items.length)} / ${items.length} ${isBrand?'个品牌分组':'件商品'}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=items.length;$('prev').dataset.page=String(page-1);$('next').dataset.page=String(page+1);
 const selected=base.rows.filter(r=>state.picked.includes(r.id));$('compare-tray').hidden=selected.length===0;$('picked-count').textContent=`已选 ${selected.length} / 4 件商品`;$('picked-names').textContent=selected.map(r=>r.brand||r.asin).join(' · ');$('open-compare').disabled=selected.length<1;
 const rawCount=M.normalize(D,state).length;
 $('data-note-count').textContent=base.rows.length+' 件样本';
 $('quality').innerHTML=`<dl class="quality-grid"><dt>来源与期间</dt><dd>卖家精灵 · ${esc(month||'暂无归档月')}。${historical?'按当前已收录商品回查历史，不包含未收录的已退市商品；品牌与品类来自当前档案。日历是否结束与来源是否完整分别判断；采集时未结的记录保留原状态，不自动当作整月。':state.dataset==='focus'?'只含石头、添可、追觅、云鲸四品牌，近30天起止日未提供；不与9月归档合并。':state.dataset==='archive'?'类目榜单最多返回 Top100；不足100不代表已覆盖全类目。':'历史竞品样本缺少销量起止日，不与归档月合并。'} 更新 ${historical?D.history.asOf:D.asOf}。</dd><dt>筛选与去重</dt><dd>原始 ${rawCount} 件，排除不相关商品 ${base.excluded.length} 件，移除重复 ASIN ${base.duplicates.length} 件，保留 ${base.rows.length} 件。当前筛选 ${v.rows.length} 件。</dd><dt>历史父体</dt><dd>${historical?"优先使用接口父体变更记录；未提供历史关系的月份保留当前父体参考，但不据此统计历史销量。仅汇总历史关系已确认且数值一致的父体，其他原值保留待核；原始逐商品记录完整保留在年度明细。":"保留全部ASIN档案；销量单位另行按来源父体去重，未知归属不计合计。"}</dd><dt>缺失字段</dt><dd>确认销量 ${v.sales.known} 个去重单位，确认销售额 ${v.revenue.known} 个去重单位；品牌缺失 ${v.missingBrand} 件，父体缺失 ${v.missingParent} 件。父体缺失可能造成变体重复。合计只包含已提供数值，空值不计为零。</dd><dt>价格</dt><dd>${historical?'月末最后有效价格，非月均价':state.dataset==='archive'?'归档月均价':'查询时价格'}；每档 ${num(M.priceStep(state.country))} ${country().currency}，下限包含、上限不含，空价格不分档。价格中位数仅使用有价商品。UWANT 为原表历史报价，日期分别展示，不据此判断实时价格优势。</dd><dt>销量与配置</dt><dd>销量和销售额为第三方估算，按父体去重；归属或数值冲突不计合计，不反算销售额。配置仅采用已有资料及标题明确描述。T3 为原人工分组，其中含 Dyson 等品牌，白牌身份未核实，暂标分组待核；新品牌不自动归为白牌；空参数不参与优劣评分。</dd><dt>品牌冲突</dt><dd>${v.rows.filter(r=>r.brandConflict).map(r=>esc(r.asin)+'：标题提及 Midea，详情品牌为 '+esc(r.sourceBrand)+'；保留原字段并列入品牌待核').join('；')||'当前筛选未发现已识别的品牌冲突'}</dd></dl><details><summary>查看排除记录（${base.excluded.length} 件）</summary><p>${base.excluded.map(r=>esc(r.asin)+' '+esc(r.title)).join('；')||'当前范围无其他排除项；近30天查询的分类及排除记录见补采记录。'}</p></details><p><a href="focus-brands-audit.json" target="_blank">查看近30天补采记录 ↗</a></p>`;

 renderDrawer(v,base);
 renderEvidenceWorkspace(base);
}
function renderDrawer(v,base){
 if(!state.detail){if($('drawer').open)$('drawer').close();drawerKey='';return;}
 const nextKey=JSON.stringify([state.detail,state.picked,state.own,state.country,state.category,state.dataset,state.q,state.band,state.mode,state.tier]);if(drawerKey===nextKey)return;drawerKey=nextKey;
 const split=state.detail.indexOf(':'),kind=state.detail.slice(0,split),key=state.detail.slice(split+1);let body='';
 $('drawer-kicker').textContent=kind==='compare'?'商品对比':kind==='brand'?'品牌研究':'商品详情';
 if(kind==='brand'){
  const rows=v.rows.filter(r=>(r.brand||'品牌待核')===key),detail=M.select(D,{...state,brand:key});$('drawer-title').textContent=brandLabel(key);
  body=`<div class="kpis">${miniKpis(detail)}</div><button class="primary" data-research-brand="${esc(key)}">查看全部商品 →</button><h3>商品与价格</h3>${(()=>{const t=window.UIData.table(rows,[{key:'product',label:'商品',required:true,render:productLabel},{key:'price',label:'来源价格 / '+country().currency,value:r=>r.avgPrice,render:r=>money(r.avgPrice)}]);return t.html+window.UIData.gap(t.missing,'销量归属及原值分别保留在商品详情中。');})()}`;
 }else if(kind==='product'){
  const r=base.rows.find(r=>r.id===key);$('drawer-title').textContent=r?.brand||'商品详情';
  body=r?`<div class="product-detail-heading">${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="商品图片">`:""}<h3>${esc(r.title)}</h3></div>${r.sourceBullets?.length?`<details class="detail-copy"><summary>查看卖家标称与图片来源</summary>${r.sourceBullets.map(text=>`<p>${esc(text)}</p>`).join("")}</details>`:""}<p class="detail-copy">${r.asin} · ${esc(r.period)}${/未结/.test(r.monthState||'')?' · 采集时未结':''} · ${esc(r.parentAsin?'父体 '+r.parentAsin:'父体未提供')}</p>${(()=>{const u=HistoryMetrics.metricRows([r],'units',{universe:base.rows})[0]?.units??null;return `<div class="kpis">${r.avgPrice!=null?`<article><span>${M.isHistory(state.dataset)?'月末最后有效价格':'归档均价 / 来源快照价'}</span><strong>${money(r.avgPrice)}</strong></article>`:''}${u!=null?`<article><span>合格父体销量估算</span><strong>${num(u)}</strong></article>`:''}</div>${window.UIData.gap([r.avgPrice==null?'有效价格':null,u==null?'合格销量':null].filter(Boolean))}`;})()}<details class="detail-copy"><summary>来源值与归属状态</summary><p>${esc(salesEvidence(r,base))}</p><p>${state.category==='vacuum'?esc(tier(r))+' · '+(r.autoEmpty?'标题明确自动集尘；当地套装仍需核实':'自动集尘配置待核'):'具体功能与当地版本以商品来源证据为准，缺失参数不作优劣判断。'}</p></details><button data-pick-button="${r.id}">${state.picked.includes(r.id)?"移出对比":"加入对比"}</button> <a href="${url(r)}" target="_blank" rel="noopener">查看 Amazon 原商品 ↗</a>`:'<p>该深链接商品不在当前数据集中，请调整研究范围。</p>';
 }else if(kind==='compare'){
  $('drawer-title').textContent=`UWANT ${state.own} · 商品对比`;const rows=base.rows.filter(r=>state.picked.includes(r.id)),own=D.own[state.country]?.[state.own];
  const field=pattern=>own?.fields.find(f=>pattern.test(f.label))?.value||'未核实';
  body=`<div class="compare-toolbar"><span>${rows.length} 件竞品</span><label><input type="checkbox" id="differences-only"> 只看差异</label><button id="export-compare">↓ 导出所选</button></div><p class="detail-copy">UWANT 为历史资料，竞品为所选期间数据。各列保留独立日期。</p><div class="table-scroll"><table class="compare-matrix"><thead><tr><th>比较项</th><th class="own-column">UWANT ${state.own}<small>${esc(own?.source||'当地资料待补')}</small></th>${rows.map(r=>`<th>${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="">`:''}${esc(r.brand||'品牌待核')}<small>${r.asin}</small></th>`).join('')}</tr></thead><tbody>${[
   ['价格',own?money(own.price):'当地报价待核',...rows.map(r=>money(r.avgPrice))],
   ['价格 / 销量日期',own?(own.priceType||'内部资料')+' · '+(own.date||'报价日期未核'):'未提供',...rows.map(r=>r.period+(/未结/.test(r.monthState||'')?' · 采集时未结':''))],
   ['销量与归属','未提供',...rows.map(r=>salesEvidence(r,base))],
   [state.category==='vacuum'?'自动集尘':'自清洁',state.category==='vacuum'?field(/^Auto-Empty$/i):field(/self.clean/i),...rows.map(r=>state.category==='vacuum'?(r.autoEmpty?'标题明确，版本待核':'未核实'):(/self.clean|auto.clean|autolimp/i.test(r.title)?'标题标称，参数待核':'未核实'))],
   ['续航',field(/^Run Time/i),...rows.map(()=> '未核实')],
   ['吸力',field(/^Suction/i),...rows.map(()=> '未核实')],
   ['重量',field(/^Weight$/i),...rows.map(()=> '未核实')],
   ['评分 / 评分人数','未提供',...rows.map(r=>`${r.rating??'—'} / ${num(r.reviews??r.ratings)}`)],
  ].map(cells=>`<tr data-difference="${new Set(cells.slice(1).map(x=>String(x??'未提供'))).size>1}">${cells.map((x,i)=>`<td class="${i===1?'own-column':''}">${esc(x??'未提供')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="detail-copy">标称参数需当地版本和套装复核。空字段不作优劣评分。</p>`;
 }else{$('drawer-title').textContent='链接无效';body='<p>无法识别该详情，请关闭后重新选择。</p>';}
 $('drawer').classList.toggle('compare-expanded',kind==='compare');$('drawer-body').innerHTML=body;if(!$('drawer').open)$('drawer').showModal();
}
function pick(id){const picked=state.picked.includes(id)?state.picked.filter(x=>x!==id):[...state.picked,id];if(picked.length>4){notify('最多对比4件商品，请先移出一件');render();return;}change({picked},{replace:true});}
function download(text,name){try{const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);notify('已导出 CSV');}catch{notify('导出失败，当前筛选已保留，请重试');}}
function exportResults(selected=false){if(isDecisionRoute(state)){exportDecisionWorkspace();return;}if(!selected&&state.researchLayer!=='history'){exportEvidenceDirectory();return;}const v=M.select(D,state),rows=selected?M.baseRows(D,state).rows.filter(r=>state.picked.includes(r.id)):v.rows;if(!rows.length){notify('当前没有可导出的商品');return;}if(state.page==='brands'&&!selected){const q=x=>{let value=String(x??'');if(/^[=+@\-\t\r]/.test(value))value="'"+value;return '"'+value.replaceAll('"','""')+'"';};download('\uFEFF'+[['国家','数据集','品牌','商品数','样本销量估算','样本销售额估算','币种','价格中位数','合格销量父体单位数','合格金额父体单位数','来源性质','统计范围'],...v.brands.map(b=>[state.country,state.dataset,b.brand,b.count,b.sales,b.revenue,country().currency,b.median,ResearchQuality.metricRows(b.rows,'units',{universe:M.baseRows(D,state).rows}).length,ResearchQuality.metricRows(b.rows,'revenue',{universe:M.baseRows(D,state).rows}).length,'第三方样本估算','按来源父体去重，非完整市场'])].map(r=>r.map(q).join(',')).join('\r\n'),`UWANT_${state.country}_brands.csv`);}else download(M.csv(rows,state,{universe:M.baseRows(D,state).rows}),`UWANT_${state.country}_${selected?'comparison':'products'}.csv`);}
for(const key of ['country','platform','category','dataset','brand','band','sort','tier','own'])$(key).addEventListener('change',e=>change({[key]:e.target.value}));
$('search').addEventListener('input',e=>change({q:e.target.value},{replace:true}));
document.querySelectorAll('[name=mode]').forEach(r=>r.addEventListener('change',e=>change({mode:e.target.value})));
function reset(){change({q:'',brand:'',band:'',mode:'all',tier:'all'});}
$('reset').onclick=reset;$('clear-band').onclick=()=>change({band:''});$('prev').onclick=e=>change({offset:e.target.dataset.page});$('next').onclick=e=>change({offset:e.target.dataset.page});
$('export').onclick=()=>exportResults();$('clear-picks').onclick=()=>change({picked:[]},{replace:true});$('open-compare').onclick=()=>detail('compare','selection');$('close-drawer').onclick=closeDrawer;
$('drawer').addEventListener('cancel',e=>{e.preventDefault();closeDrawer();});$('drawer').addEventListener('close',()=>{const target=lastFocus?.isConnected?lastFocus:document.querySelector(lastFocusToken||'#search');target?.focus({preventScroll:true});});
$('drawer').addEventListener('click',e=>{if(e.target===$('drawer')){const r=$('drawer').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)closeDrawer();}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-route],[data-brand-detail],[data-research-brand],[data-product],[data-pick-button],[data-clear],[data-band],[data-reset],#export-compare');if(!a)return;
 if(a.dataset.route){e.preventDefault();change({page:a.dataset.route,module:a.dataset.route==='overview'?'operations':'',view:a.dataset.view||'overview',...(a.dataset.view==='products'?{competitionGroup:'all'}:{}),detail:'',...(a.dataset.route==='market'&&state.page!=='market'?{priceBand:state.band}:{})},{scroll:true});}
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
$('scope-toggle').onclick=()=>{const open=document.querySelector('.filters').classList.toggle('is-expanded');$('scope-toggle').setAttribute('aria-expanded',String(open));};
$('sidebar-menu').onclick=()=>{const open=document.querySelector('.sidebar').classList.toggle('nav-expanded');$('sidebar-menu').setAttribute('aria-expanded',String(open));};
document.addEventListener('click',e=>{if(e.target.closest('[data-route]')){document.querySelector('.sidebar').classList.remove('nav-expanded');$('sidebar-menu').setAttribute('aria-expanded','false');}});
document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){e.target.alt='图片加载失败';e.target.classList.add('failed-image');}},true);
history.replaceState({scrollY:0,drawer:false},'',M.encode(state));render();

function outerCatalog(base,scope=state){const c=ResearchQuality.catalog({scope,historyRows:base.rows,publicRows:ResearchQuality.observations(typeof cpRecords==='undefined'?[]:cpRecords,typeof brRecords==='undefined'?[]:brRecords,typeof brOfficialProfiles==='undefined'?[]:brOfficialProfiles),evidence:window.RESEARCH_EVIDENCE});return typeof AmazonResearch==='undefined'?c:AmazonResearch.integrate(c,{scope,data:window.AMAZON_RESEARCH,Q:ResearchQuality});}
function evidenceOwn(){const prefix={fabric:'Y',wash:'D',vacuum:'V',mattress:'M'}[state.category],items=D.own[state.country]||{},sku=items[state.own]?state.own:Object.keys(items).find(k=>k.startsWith(prefix));return sku?{sku,record:{...items[sku],currency:M.countries[state.country].currency}}:null;}
function evidenceDownload(rows,name){const safe=v=>{const t=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(t)?"'"+t:t).replaceAll('"','""')+'"';};download('\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),name);}
function exportEvidenceDirectory(){const c=outerCatalog(M.baseRows(D,state));evidenceDownload(state.page==='brands'&&state.researchLayer==='observed'?AmazonResearch.brandExportRows(c,state,ResearchCatalog.rowsFor(c,{...state,evidenceGrouping:'listing'}),ResearchQuality):AmazonResearch.exportRows(ResearchCatalog.rowsFor(c,state),ResearchQuality,state),`UWANT_${state.country}_${state.researchLayer}_evidence.csv`);}
function renderEvidenceWorkspace(base){const c=outerCatalog(base),s=ResearchCatalog.stateFrom(state),active=s.researchLayer!=='history';if(active)$('scope').innerHTML=`<span>${s.researchLayer==='observed'?'独立产品资料与价格观察':'研究候选与隔离试采'} · ${country().currency} · 产品日期逐行展示 · 月度指标使用所选月份</span><a href="docs/workbench-release-2026-11-02.md" target="_blank" rel="noopener noreferrer">分层说明 ↗</a>`;$('research-layers').innerHTML=ResearchCatalog.layers(c,s,M.select(D,state).rows.length);document.querySelector('.result-panel').hidden=active;$('price-panel').hidden=active;document.querySelector('.data-note').hidden=active;$('kpis').hidden=active||state.page!=='brands';$('comparison-options').hidden=active||state.page==='brands';if(active)$('compare-tray').hidden=true;$('research-evidence').innerHTML=(active?(state.page==='brands'&&s.researchLayer==='observed'?ResearchCatalog.brands(c,s):ResearchCatalog.table(c,s)):'')+ResearchCatalog.extras(c,s,evidenceOwn());$('research-evidence').insertAdjacentHTML('beforeend',window.CoverageMonitor?.render(state,c)||'');const onState=(patch,opt={})=>{if(opt.close&&history.state?.rqDetail){history.back();return;}change(patch,{replace:opt.replace});if(opt.focusQuery){const q=document.querySelector('[data-rq-query]');q?.focus({preventScroll:true});q?.setSelectionRange(q.value.length,q.value.length);}};ResearchCatalog.wire($('research-content'),{catalog:c,state:s,onState,download:evidenceDownload,notify,own:evidenceOwn()});}

function decisionCatalog(scope=state){const c=outerCatalog(M.baseRows(D,scope),scope),rangeRows=MonthlyRange.select(D.history,scope);return ProductLibrary.build({...c,metricSourceRows:M.isHistory(scope.dataset)?rangeRows:c.metricSourceRows},{history:D.history,scope,sourceRows:['focus','archive','curated'].flatMap(dataset=>M.baseRows(D,{...scope,dataset}).rows)});}
function renderDataWorkspace(){
 const c=state.platform==='ml'?null:decisionCatalog();
 for(const el of [document.querySelector('.result-panel'),$('price-panel'),document.querySelector('.data-note'),$('kpis'),$('comparison-options'),$('compare-tray')])el.hidden=true;
 $('research-layers').innerHTML='';$('title').textContent='数据管理';$('crumb').textContent='数据管理';document.title='数据管理 · UWANT';
 $('dataset').closest('label').hidden=true;document.querySelector('.filters [data-wb-own]').closest('label').hidden=true;document.querySelector('.heading-actions a[download]').hidden=true;$('month-range-controls').innerHTML='';
 for(const key of ['country','platform','category'])$(key).value=state[key];
 $('scope').textContent=country().name+' / '+(ResearchQuality.platforms[state.platform]||state.platform)+' · 数据覆盖、核验与来源记录';
 $('scope-toggle').innerHTML='<span>'+esc(country().name)+' / '+esc(ResearchQuality.platforms[state.platform]||state.platform)+'<small>数据管理</small></span><b>筛选⌄</b>';
 $('research-evidence').innerHTML=ResearchDataAdmin.render(state,c)+(c?ResearchCatalog.extras(c,state,null,{dialogOnly:true}):'');
 ResearchDataAdmin.wire($('research-evidence'),state,change);
 if(c)ResearchCatalog.wire($('research-content'),{catalog:c,state:{...state,researchLayer:'candidates'},own:null,onState:change,download:evidenceDownload,notify});
 $('export').onclick=()=>evidenceDownload(ResearchArchive.csv(state),'source_'+state.country+'_'+state.platform+'_'+state.category+'.csv');
}
function renderDecisionWorkspace(){
 const options=MarketWorkbench.choices[state.category]||[];if(!options.includes(state.own))state.own=options[0];
 const ownSelect=document.querySelector('.filters [data-wb-own]');ownSelect.closest('label').hidden=false;document.querySelector('.heading-actions a[download]').hidden=true;ownSelect.innerHTML=options.map(k=>`<option ${k===state.own?'selected':''}>${esc(k)}</option>`).join('');
 state.researchLayer=state.page==='market'&&state.view==='research'?'candidates':'observed';
 const title=state.page==='brands'?'品牌分析':state.page==='competitors'?'UWANT竞品对比':({products:'商品研究',research:'数据与待核',keywords:'竞品搜索词',macro:'市场大盘',pricing:'价格带'})[state.view]||'市场总览';
 if(['127.0.0.1','localhost'].includes(location.hostname))document.querySelector('.sidebar-note').childNodes[1].textContent=' 本地预览 ';$('title').textContent=title;$('crumb').textContent=title;document.title=title+' · UWANT';
 if(!$('dataset').querySelector('optgroup')){const group=document.createElement('optgroup');group.label='商品月度历史';for(const month of D.history.months){const option=document.createElement('option');option.value=month;option.textContent=month+(month===new Date().toISOString().slice(0,7)?' · 当前月':'');group.append(option);}$('dataset').prepend(group);}
 for(const key of ['country','platform','category','dataset'])$(key).value=state[key];
 $('dataset').querySelector('[value=archive]').textContent=(D.markets[state.country]?.products?.dataMonth||'归档期间未提供')+' · 归档榜单';const routeKey=[state.page,state.view,state.country,state.category].join('|'),keepOpen=$('research-evidence').dataset.wbRoute===routeKey&&document.querySelector('.wb-compare-selection')?.open;$('research-evidence').dataset.wbRoute=routeKey;const base=M.baseRows(D,state),c=decisionCatalog();$('scope').innerHTML=`<div class="scope-period"><span>月度统计：${state.startMonth?esc(state.startMonth+' 至 '+state.endMonth):esc(ResearchContext.period(state.dataset,base.rows))}</span><details class="scope-details"><summary>统计范围</summary><p>${state.startMonth?'区间仅累计有资格且去重的商品月份，缺月不补零。价格取结束月份的期末价，不跨月相加。':'销量与销售额仅计入归属已核实、可去重的第三方估算。'}产品参数、公开报价和档案报价保留各自来源日期；采集中途取得的月份不因日历结束而视为完整月。</p></details></div>`;
 renderMonthControls();
 $('scope-toggle').innerHTML=`<span>${esc(country().name)} / ${esc(ResearchQuality.platforms[state.platform]||'全部已采集渠道')} / ${esc(({fabric:'布艺清洗机',vacuum:'吸尘器',wash:'洗地机',mattress:'除螨仪'})[state.category])}<small>${esc(state.startMonth?state.startMonth+'—'+state.endMonth:state.dataset)} · UWANT ${esc(state.own)}</small></span><b>筛选⌄</b>`;
 for(const el of [document.querySelector('.result-panel'),$('price-panel'),document.querySelector('.data-note'),$('kpis'),$('comparison-options'),$('compare-tray')])el.hidden=true;
 $('research-layers').innerHTML='';$('research-evidence').innerHTML=MarketWorkbench.render(c,decisionState(c))+ResearchCatalog.extras(c,{...decisionState(c),evidencePicks:''},null,{dialogOnly:true});
 $('research-evidence').insertAdjacentHTML('beforeend',window.CoverageMonitor?.render(state,c)||'');const onState=(patch,opt={})=>{if(opt.close&&history.state?.rqDetail){history.back();return;}change(patch,{replace:opt.replace});if(opt.focusWorkbench){const q=document.querySelector('[data-wb-query]');q?.focus({preventScroll:true});q?.setSelectionRange(q.value.length,q.value.length);}if(opt.focusKeyword){const q=document.querySelector('[data-keyword-query]');q?.focus({preventScroll:true});q?.setSelectionRange(q.value.length,q.value.length);}if(opt.focusQuery){document.querySelector('[data-rq-query]')?.focus({preventScroll:true});}};
 const evidenceDialog=$('research-evidence').querySelector('#rq-dialog');if(evidenceDialog?.closest('.workspace-evidence'))$('research-evidence').append(evidenceDialog);
 if(keepOpen&&document.querySelector('.wb-compare-selection'))document.querySelector('.wb-compare-selection').open=true;ResearchCatalog.wire($('research-content'),{catalog:c,state,own:null,onState,download:evidenceDownload,notify});MarketWorkbench.wire($('research-content'),c,decisionState(c),onState,evidenceDownload);
 document.querySelector('[data-wb-scope-data]')?.addEventListener('click',ev=>{ev.preventDefault();onState({page:'market',view:'research',researchLayer:'candidates'});});
 if(M.encode(state)!==location.hash)history.replaceState(history.state,'',M.encode(state));
}
function exportDecisionWorkspace(){const c=decisionCatalog();if((state.page==='market'&&state.view==='overview')||(state.page==='brands'&&state.view==='overview')){evidenceDownload(MarketIntelligence.exportRows(c,state),`UWANT_${state.country}_${state.category}_market_analysis.csv`);return;}if(state.view==='macro'){evidenceDownload(MarketSummary.exportRows(state),`UWANT_${state.country}_market_context.csv`);return;}if(state.view==='keywords'){evidenceDownload(KeywordResearch.csv(c,state),`UWANT_${state.country}_${state.category}_search_terms.csv`);return;}if(state.view==='monthly'){evidenceDownload(MonthlyRange.exportRows(MonthlyWorkbench.selected(c,state),state,{universe:c.metricSourceRows}),`UWANT_${state.country}_${state.startMonth}_${state.endMonth}_monthly.csv`);return;}evidenceDownload(state.view==='research'?AmazonResearch.exportRows(ResearchCatalog.rowsFor(c,{...state,researchLayer:'candidates'}),ResearchQuality,decisionState(c)):MarketWorkbench.exportRows(c,decisionState(c),state.page==='competitors'),`UWANT_${state.country}_${state.own}_${state.view==='research'?'candidates':'research'}.csv`);}

function decisionState(c){if(state.priceBasis!=='auto')return state;const rs=MarketWorkbench.rows(c,state),basis=rs.some(r=>ProductEvidence.price(r,{...state,priceBasis:'history'}))?'history':rs.some(r=>ProductEvidence.price(r,{...state,priceBasis:'public'}))?'public':rs.some(r=>ProductEvidence.price(r,{...state,priceBasis:'source'}))?'source':'history';return {...state,priceBasis:basis,autoBasis:true};}

function renderMonthControls(){
 const box=$('month-range-controls'),active=!!state.startMonth;
 box.innerHTML=`<button class="rq-button" data-month-toggle>${active?'返回单月':'选择月度区间'}</button>${active?`<label>起始月<input type="month" data-month-start aria-label="起始月份" min="2026-01" max="2026-12" value="${esc(state.startMonth)}"></label><span>—</span><label>结束月<input type="month" data-month-end aria-label="结束月份" min="2026-01" max="2026-12" value="${esc(state.endMonth)}"></label><button class="rq-button rq-primary" data-month-apply>应用区间</button><span data-month-error role="status"></span>`:''}`;
 $('dataset').closest('label').hidden=active;
 box.querySelector('[data-month-toggle]').onclick=()=>change(active?{startMonth:'',endMonth:'',dataset:state.endMonth}:{startMonth:M.isHistory(state.dataset)?state.dataset:'2026-01',endMonth:M.isHistory(state.dataset)?state.dataset:'2026-10'});
 box.querySelector('[data-month-apply]')?.addEventListener('click',()=>{const start=box.querySelector('[data-month-start]').value,end=box.querySelector('[data-month-end]').value;if(!MonthlyRange.valid(start)||!MonthlyRange.valid(end)||start>end){box.querySelector('[data-month-error]').textContent='请选择2026年的月份，起始月不能晚于结束月。';return;}change({startMonth:start,endMonth:end,evidenceGroup:'',historyProduct:''});});
}
