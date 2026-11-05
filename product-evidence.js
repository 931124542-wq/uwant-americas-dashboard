/* Read-only product evidence. A title claim never grants identity or sales eligibility. */
(function(root){
 const decode=v=>String(v??'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ');
 const currency={CA:'CAD',MX:'MXN',US:'USD',BR:'BRL'};
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const labels={power:'输入功率',heatingPower:'锅炉/加热功率',voltage:'电压标称',suction:'吸力标称',weight:'重量标称',capacity:'尘杯 / 尘袋容量',unspecifiedCapacity:'容量（用途待核）',cleanWater:'清水箱',dirtyWater:'污水箱',cord:'电线长度',hose:'软管长度',runtime:'续航标称',filter:'过滤',autoempty:'自集尘',powerSource:'供电形态',steam:'蒸汽标称',hotwater:'热水标称',tangle:'防缠绕',light:'照尘灯',accessories:'配件',warranty:'保修',uv:'UV标称',ultrasound:'超声波标称',selfclean:'自清洁标称',drying:'烘干标称'};
 function canonicalUrl(value){
  try{const u=new URL(decode(value));if(!['http:','https:'].includes(u.protocol))return null;u.hash='';u.hostname=u.hostname.toLowerCase();
   if(/(?:^|\.)amazon\.(?:com(?:\.mx|\.br)?|ca)$/.test(u.hostname)){const m=u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);if(m){u.hostname=u.hostname.replace(/^(?:smile|m)\./,'www.');u.pathname='/dp/'+m[1].toUpperCase();u.search='';return u.href;}}
   for(const k of [...u.searchParams.keys()])if(/^(?:utm_|ref$|ref_|tag$|qid$|sr$|sprefix$|campaign|gclid$|fbclid$)/i.test(k))u.searchParams.delete(k);
   u.searchParams.sort();u.pathname=u.pathname.replace(/\/+$/,'')||'/';return u.href;
  }catch{return null;}
 }
 function references(r){
  const grouped=new Map(),add=x=>{const url=canonicalUrl(x.url);if(!url)return;let g=grouped.get(url);if(!g){g={url,statements:[],fields:[],dates:[]};grouped.set(url,g);}
   const statement={purpose:x.label||x.purpose||'商品来源',date:x.date||x.sourceDate||null,locator:x.locator||'',fields:x.fields||x.supports||[]};if(!Array.isArray(statement.fields))statement.fields=[statement.fields];
   if(!g.statements.some(v=>JSON.stringify(v)===JSON.stringify(statement)))g.statements.push(statement);g.fields=[...new Set([...g.fields,...statement.fields])];if(statement.date&&!g.dates.includes(statement.date))g.dates.push(statement.date);
  };
  for(const x of r.evidenceReferences||[])if(x.statements?.length)for(const statement of x.statements)add({...statement,url:x.url,label:statement.purpose});else add(x);
  if(r.sourceUrl)add({url:r.sourceUrl,label:'当地商品 / 原始记录',date:r.sourceDate,fields:['商品身份']});
  for(const c of r.claims||[])add({url:c.sourceUrl||r.sourceUrl,label:c.basis||'参数依据',date:c.sourceDate,locator:c.locator,fields:[c.key]});
  if(r.imageEvidence?.sourceUrl)add({url:r.imageEvidence.sourceUrl,label:'图片来源',date:r.imageEvidence.retrievedDate||r.imageEvidence.sourceDate,locator:r.imageEvidence.locator,fields:['图片']});
  return [...grouped.values()];
 }
 function price(r,s={}){
  if(r.displayStatus==='candidate'||['candidate','quarantined_estimate'].includes(r.dataNature))return null;
  const country=String(r.country||s.country||'').toUpperCase(),expected=currency[country];
  if(s.country&&s.country.toUpperCase()!==country||s.platform&&!['all',r.platform||'amazon'].includes(s.platform))return null;
  const month=s.endMonth||s.dataset,requestedPublic=s.priceBasis==='public'||s.evidencePriceBasis==='current'&&!/^2026-\d\d$/.test(month||'');
  let q;
  if(s.priceBasis==='source'){
   const observations=(r.sourceObservations||[]).filter(o=>o.kind==='source_snapshot'&&finite(o.value)&&o.currency===expected&&/^\d{4}-\d{2}-\d{2}$/.test(o.observedDate||'')),latest=observations.map(o=>o.observedDate).sort().at(-1),dated=observations.filter(o=>o.observedDate===latest),details=dated.filter(o=>o.sourceQuery==='asin.detail'||!o.sourceQuery&&o.recordUpdatedAt),lists=dated.filter(o=>o.sourceQuery==='asin.list'),selected=details.length?details:lists.length?lists:dated.filter(o=>o.sourceQuery==='asin.sales.trend:profile');
   if(!selected.length||new Set(selected.map(o=>o.value)).size!==1)return null;const o=selected.at(-1);q={value:Math.round((o.value+Number.EPSILON)*100)/100,sourceValue:o.value,currency:o.currency,date:o.observedDate,month:null,kind:'source_snapshot',sourceDate:o.observedDate,source:o.source||'SellerSprite 商品详情档案',sourceUrl:o.sourceUrl||r.sourceUrl,sourceQuery:o.sourceQuery||(o.recordUpdatedAt?'asin.detail':'asin.list'),sourceUpdatedAt:o.recordUpdatedAt||null,seller:o.seller||null,promotion:o.coupon||null,currencyStatus:o.currencyStatus||'source_field',currencyBasis:o.currencyBasis||'来源返回币种',referenceOnly:true};
  }else if(/^2026-\d\d$/.test(month||'')&&!requestedPublic){
   const candidates=[...(r.historicalObservations||[]),r.historicalObservation,...(r.origin==='history_profile'?[{period:r.period,price:r.price,currency:r.currency,kind:r.priceKind,sourceDate:r.originalRow?.retrievedAt||r.sourceDate}]:[])].filter(h=>h&&h.period===month&&h.kind==='month_end'&&finite(h.price));
   if(!candidates.length||new Set(candidates.map(h=>h.currency+'|'+h.price)).size!==1)return null;
   const h=candidates[0];q={value:h.price,currency:h.currency,date:h.period,month:h.period,kind:'month_end',sourceDate:h.sourceDate||h.retrievedAt||r.originalRow?.retrievedAt||r.sourceDate||null,source:h.source||r.source||'SellerSprite 月度历史',sourceUrl:h.sourceUrl||r.sourceUrl,monthState:h.monthState||null};
  }else if(r.priceKind==='observation'&&finite(r.price)&&r.sourceDate){q={value:r.price,currency:r.currency,date:r.sourceDate,month:null,kind:'observation',sourceDate:r.priceObservationEvidence?.sourceDate||r.sourceDate,source:r.priceObservationEvidence?.source||r.source,sourceUrl:r.priceObservationEvidence?.sourceUrl||r.sourceUrl,promotion:r.promotion||null,availability:r.availability||r.availabilityStatus||null};}
  else if(!/^2026-\d\d$/.test(month||'')&&['snapshot','archive_mean'].includes(r.priceKind)&&finite(r.price)){q={value:r.price,currency:r.currency,date:r.period||r.sourceDate||null,month:r.period||null,kind:r.priceKind,sourceDate:r.sourceDate||null,source:r.source,sourceUrl:r.sourceUrl};}
  if(!q||q.currency!==expected)return null;
  return {...q,country,platform:r.platform||'amazon',productId:r.productId||r.asin,productType:r.productType,recordId:[country,r.platform||'amazon',r.productId||r.asin,q.kind,q.date,q.currency,q.value,q.sourceDate||'',...(q.kind==='source_snapshot'?[q.sourceQuery]:[])].join('|')};
 }
 function extract(r){
  const claims=[],issues=[],title=decode(r.title||''),sources=[{text:title,locator:'来源原标题',basis:'来源标题标称',date:r.titleEvidence?.sourceDate||r.sourceDate},...(r.sourceFeatures||[]).filter(x=>typeof x==='string').map((text,i)=>({text:decode(text),locator:'来源五点 '+(i+1),basis:'来源五点标称',date:r.sourceDate})),...(r.featureEvidence||[]).map(x=>({text:decode(x.text),locator:x.locator,basis:x.basis||'来源五点标称',date:x.sourceDate}))];
  const add=(key,value,raw,source,extra={})=>{if(!claims.some(x=>x.key===key&&x.value===value&&x.locator===source.locator))claims.push({key,label:labels[key]||key,value,rawValue:raw,sourceUrl:r.sourceUrl,sourceDate:source.date||null,locator:source.locator,basis:source.basis,verification:'source_claim',...extra});};
  const number='(?:\\d+(?:[.,]\\d+)?)';
  const normalize=(value,unit)=>/[.,]\d{3}$/.test(value)&&/^(?:Pa|W|ml)$/i.test(unit)?value.replace(/[.,]/g,''):value.replace(',','.');
  for(const source of sources){const t=source.text;if(!t)continue;
   const quantities=[['suction',new RegExp('('+number+')\\s*(kPa|Pa|AW|air\\s*watts?)(?![A-Za-z])','gi')],['power',new RegExp('('+number+')\\s*(W|watts?|vatios?|瓦)(?![A-Za-z])','gi')],['voltage',new RegExp('('+number+')\\s*(V|volts?|voltios?|伏)(?![A-Za-z])','gi')],['weight',new RegExp('('+number+')\\s*(kg|kilograms?|kilogramos?|quilogramas?|公斤|千克)(?![A-Za-z])','gi')]];
   for(const [key,pattern]of quantities)for(const m of t.matchAll(pattern)){
    const around=t.slice(Math.max(0,m.index-35),m.index+m[0].length+15);if(key==='power'&&/AW\s*$/i.test(m[0]))continue;if(key==='power'&&(/^(?:\s*)(?:boiler|锅炉|加热器)/i.test(t.slice(m.index+m[0].length,m.index+m[0].length+20))||/(?:boiler(?: power)?|锅炉|加热器)\s*[:=-]?\s*$/i.test(t.slice(Math.max(0,m.index-24),m.index)))){add('heatingPower',normalize(m[1],'W')+' W',m[0],source,{numericValue:Number(normalize(m[1],'W')),unit:'W'});continue;}
    const prefix=t.slice(Math.max(0,m.index-35),m.index);
    if(key==='power'&&(/W\s*[x×]|[x×]\s*\d+(?:[.,]\d+)?\s*W/i.test(around)||/(?:dimensions|dimensiones|长宽高)[^0-9]{0,15}$/i.test(prefix))){issues.push({field:'power',value:m[0],reason:'W可能表示尺寸宽度，不作为电功率',locator:source.locator});continue;}
    if(key==='power'&&/(?:charger|charging|dock|base|充电|底座)[^,;0-9]{0,20}$/i.test(prefix)){issues.push({field:'power',value:m[0],reason:'底座或充电功率，不擅自作为整机输入功率',locator:source.locator});continue;}
    if(key==='weight'&&/shipping|package weight|peso (?:del paquete|de envio)|包装|运输重量/i.test(around)){issues.push({field:'weight',value:m[0],reason:'来源未区分机器净重与运输/包装重量',locator:source.locator});continue;}
    if(key==='weight'&&/lift|levantar|weight of (?:the )?battery|battery weight|peso de la bater[ií]a|吸起|电池重量/i.test(around)){issues.push({field:'weight',value:m[0],reason:'重量可能指测试负载或配件，不作为整机重量',locator:source.locator});continue;}
    const unit=key==='power'?'W':key==='weight'?'kg':key==='voltage'?'V':/^air/i.test(m[2])?'AW':/^kpa$/i.test(m[2])?'kPa':/^pa$/i.test(m[2])?'Pa':'AW';add(key,normalize(m[1],unit)+' '+unit,m[0],source,{numericValue:Number(normalize(m[1],unit)),unit});
   }
   for(const m of t.matchAll(new RegExp('('+number+')\\s*(litros?|liters?|litres?|l|ml|毫升|升)(?![A-Za-z])','gi'))){const before=t.slice(Math.max(0,m.index-65),m.index),after=t.slice(m.index+m[0].length,m.index+m[0].length+30),types=[['cleanWater','clean.?water|agua limpia|água limpa|清水'],['dirtyWater','dirty.?water|aguas? (?:sucias?|residuales)|água suja|污水'],['capacity','\\bdust\\b|\\bpolvo\\b|\\bpoeira\\b|\\bp[oó]\\b|尘杯|尘袋']],matches=types.filter(([key,pattern])=>new RegExp('(?:'+pattern+')[^0-9,;\\/]{0,30}$','i').test(before)||new RegExp('^\\s*(?:'+pattern+')','i').test(after));let key=matches.length===1?matches[0][0]:'unspecifiedCapacity';
    if(key==='unspecifiedCapacity')issues.push({field:key,value:m[0],reason:'容量用途未明确，不推断为尘杯、清水箱或污水箱',locator:source.locator});add(key,normalize(m[1],m[2])+' '+m[2],m[0],source,{numericValue:Number(normalize(m[1],m[2])),unit:m[2]});}
   const lengths=[['cord',new RegExp('(?:cable|cord|power cable|fio|电线|电源线)\\s*(?:de|do|length|长度)?\\s*[:：-]?\\s*('+number+')\\s*(m|metros?|meters?|metres?|米|ft|feet)(?![A-Za-z])','gi')],['hose',new RegExp('(?:hose|manguera|mangueira|软管)(?:\\s+flexible)?\\s*(?:de|do|length|长度)?\\s*[:：-]?\\s*('+number+')\\s*(m|metros?|meters?|metres?|米|ft|feet)(?![A-Za-z])','gi')]];
   for(const [key,pattern]of lengths)for(const m of t.matchAll(pattern)){const context=t.slice(Math.max(0,m.index-20),m.index+m[0].length+20);if(key==='cord'&&/carga|charging|charger|adaptador|充电/i.test(context)){issues.push({field:'cord',value:m[0],reason:'充电线不作为机器有线供电证据',locator:source.locator});continue;}add(key,m[1].replace(',','.')+' '+m[2],m[0],source);}
   const yes=/self[- ]?empty|auto[- ]?empty|autovaciable|autovaciad[oa]|vaciado autom[aá]tico|esvaziamento autom[aá]tico|自动集尘|自集尘|clean\s*(?:&|and)\s*empty/i,neg=/(?:no|without|sin)\s+(?:self[- ]?empty|auto[- ]?empty|vaciado autom[aá]tico)|不支持自动集尘/i;
   if(neg.test(t))add('autoempty','明确不配自集尘（来源标称）',t.match(neg)[0],source,{booleanValue:false});else if(yes.test(t))add('autoempty','自集尘（来源标称）',t.match(yes)[0],source,{booleanValue:true});
   const wireless=/\bcordless\b|inal[aá]mbric[oa]|sem fio|sin cable|无线/i;if(wireless.test(t))add('powerSource','无线',t.match(wireless)[0],source);
   else if(claims.some(x=>x.key==='cord'&&x.locator===source.locator)||/\bcorded\b|con cable|com fio|有线/i.test(t))add('powerSource','有线',t.match(/\bcorded\b|con cable|com fio|有线/i)?.[0]||claims.find(x=>x.key==='cord'&&x.locator===source.locator).rawValue,source);
   const runtime=new RegExp('(?:runtime|run time|autonom[ií]a|autonomia|tiempo de funcionamiento|续航)\\s*(?:de|hasta|up to|约|最长)?\\s*[:：-]?\\s*('+number+')\\s*(minutes?|mins?|minutos?|分钟)','gi');for(const m of t.matchAll(runtime))add('runtime',m[1].replace(',','.')+' min',m[0],source);
   if(/HEPA/i.test(t))add('filter',/(?:no|without|sin|sem)\s+HEPA|不含HEPA/i.test(t)?'未配HEPA（来源明确否定）':'HEPA（来源标称）',t.match(/HEPA/i)[0],source);if(/filtro lav[aá]vel|filtro lavable|washable filter|可水洗滤网/i.test(t))add('filter','可水洗滤网（来源标称）',t.match(/filtro lav[aá]vel|filtro lavable|washable filter|可水洗滤网/i)[0],source);
   const hoseClean=/hose rinse|self[- ]cleaning hose|clean(?:ing)? (?:the )?hose|limpieza de (?:la )?manguera|软管冲洗/i,rollerClean=/self[- ]cleaning (?:brushroll|roller)|roller self[- ]clean|滚刷自清洁/i,genericClean=/self[- ]clean(?:ing)?|autolimpieza|自清洁/i;
   if(hoseClean.test(t))add('selfclean','软管冲洗（来源标称）',t.match(hoseClean)[0],source);else if(rollerClean.test(t))add('selfclean','滚刷自清洁（来源标称）',t.match(rollerClean)[0],source);else if(genericClean.test(t))add('selfclean','自清洁标称（清洁部位、方式未说明）',t.match(genericClean)[0],source);
   for(const [key,pattern,value]of [['uv',/\bUV(?:-?C)?\b/i,'UV（来源标称，不代表除菌或除螨效果已实测）'],['ultrasound',/ultrasonic|ultrasonido|超声波/i,'超声波（来源标称，效果未独立核实）'],['steam',/\bsteam\b|\bvapor\b|蒸汽/i,'蒸汽（来源标称）'],['drying',/\bdrying\b|\bsecado\b|烘干/i,'烘干（来源标称，条件以原文为准）']])if(pattern.test(t)){const m=t.match(pattern),prefix=t.slice(Math.max(0,m.index-15),m.index);add(key,/(?:no|without|sin|sem|不支持|没有)\s*$/i.test(prefix)?'明确未配该功能（来源否定，见原文）':value,m[0],source);}
   for(const m of t.matchAll(new RegExp('('+number+')[ -]*(?:years?|a[ñn]os?)(?:[ -]*(?:limited|manufacturer|warranty|garant[ií]a)){1,3}','gi')))add('warranty',m[1]+'年（来源标称，适用地区与条件仍需核实）',m[0],source);
  }
  return {claims,issues};
 }
 function modelIdentity(r){
  const model=decode(r.model||'').trim(),uncertain=!model||/待核|型号未|unknown|unconfirmed|conflict|冲突/i.test(model)||r.identityStatus==='partial'||r.identityStatus==='conflict'||/^\w{10}$/.test(model)||/\b\d+(?:\.\d+)?\s*(?:oz|liters?|litres?|ml|L)\b/i.test(model);
  const status=!uncertain&&(r.modelKey||r.modelStatus?.startsWith('confirmed')||['observed_model','current_listing_confirmed','manufacturer_model'].includes(r.identityStatus))?'confirmed':'unconfirmed';
  // A Listing fallback is never a confirmed model group, nor a reason to merge variants.
  return {status,model:model||null,groupKey:status==='confirmed'?(r.modelKey||[r.country,r.platform,r.productId||r.id,'explicit-model'].join(':')):null,basis:status==='confirmed'?(r.modelStatus||'已有当地型号资料'):'型号证据未完整；ASIN仅区分Listing',sourceUrl:r.sourceUrl||null};
 }
 function titleModel(r){const patterns={shark:/\b(?:BU\d{4}[A-Z]*|IP\d{4}[A-Z]*|IA\d{4}[A-Z]*|(?:PX|EX|HX)\d{3}[A-Z]*|IW\d{4}[A-Z]*)\b/gi,bissell:/\b\d{4}[BCENG]\b/g,hoover:/\bFH\d{5}[A-Z]*\b/gi,vacmaster:/\bSCB\d{3,4}[A-Z]?\b/gi,kenmore:/\bKW\d{4}\b/gi,greenote:/\bGSC\d{2,3}\b/gi,jigoo:/\b(?:J\d{3}|T\d{3})\b/g,jimmy:/\b(?:JV\d{2}|BX\d{1,2}(?:\s*Pro)?)\b/gi,roborock:/\bF25(?:\s+(?:ACE|PRO|Combo|RT|ALT|Ultra|BX|XT|LT|GT|Steam|Gen\s*2)){0,3}\b/gi,dreame:/\b(?:H\d{2}(?:\s+(?:Pro|Dual|Ultra)){0,2}|Z\d{2}(?:\s+Station)?)\b/gi};const pattern=patterns[String(r.brand||'').toLowerCase()],values=pattern?[...new Set([...decode(r.title).matchAll(pattern)].map(m=>m[0]))]:[];return values.length===1?{value:values[0],basis:'来源标题型号标称',locator:'来源原标题',sourceUrl:r.sourceUrl,sourceDate:r.sourceDate||null}:null;}
 function displayModelCandidate(r){
  const patterns={dyson:/\b(?:V(?:7|8|9|10|11|12|15)(?:\s+(?:Detect|Slim|Absolute|Origin|Animal|Fluffy|Advanced|Plus|Extra|Motorhead|Cyclone|Submarine)){0,4}|Gen5(?:detect|outsize)?|Outsize\s+Origin)\b/gi,tineco:/\b(?:PURE\s+ONE\s+(?:Station\s+5(?:\s+Pro)?|S\d{2}(?:\s+(?:Pet|Pro))?)|A(?:10|11|20|30|50)S?(?:\s+(?:Essentials|Hero|Dash|Master|Pet|Plus))?)\b/gi};
  const re=patterns[String(r.brand||'').toLowerCase()],values=re?[...new Set([...decode(r.title).matchAll(re)].map(m=>m[0]))]:[];
  return values.length===1?{value:values[0],basis:'来源标题型号线索，未确认当地版本',locator:'来源原标题',sourceUrl:r.sourceUrl,sourceDate:r.titleEvidence?.sourceDate||r.sourceDate||null}:null;
 }
 function enrich(r){const extracted=extract(r),misclassified=(r.claims||[]).filter(c=>c.key==='runtime'&&/^5\s*min/i.test(c.value)&&/secado\s+(?:en\s+)?5\s*min/i.test(r.title||'')&&/productTitle|asin.title|标题|来源原标题/i.test([c.locator,c.basis].join(' '))),claims=(r.claims||[]).filter(c=>!misclassified.includes(c));for(const c of extracted.claims)if(!claims.some(v=>v.key===c.key&&v.value===c.value&&v.basis===c.basis&&v.locator===c.locator))claims.push(c);const next={...r,claims,parameterCorrections:[...new Map([...(r.parameterCorrections||[]),...misclassified.map(original=>({original,reason:'来源明确是5分钟烘干，不是机器续航；原值保留为更正证据'}))].map(x=>[JSON.stringify(x),x])).values()],parameterIssues:[...new Map([...(r.parameterIssues||[]),...extracted.issues].map(x=>[JSON.stringify(x),x])).values()],titleModelCandidate:titleModel(r)||displayModelCandidate(r)};next.modelIdentity=modelIdentity(next);next.evidenceReferences=references(next).map(g=>({url:g.url,label:g.statements.map(x=>x.purpose).filter((v,i,a)=>a.indexOf(v)===i).join('；'),statements:g.statements,fields:g.fields,dates:g.dates}));return next;}
 function vacuumProfile(r){const claims=r.claims||[],derived=extract(r).claims,all=[...claims,...derived],power=[...new Set(all.filter(c=>c.key==='powerSource').map(c=>c.value))],auto=all.filter(c=>c.key==='autoempty'),positive=auto.some(c=>c.booleanValue===true||/^(?:yes\b|有|是|自集尘)/i.test(c.value)),negative=auto.some(c=>c.booleanValue===false||/^(?:no\b|无|否|明确不)/i.test(c.value));return {powerSource:power.length===1?power[0]:null,powerConflict:power.length>1,autoempty:positive&&!negative?true:negative&&!positive?false:null,autoemptyConflict:positive&&negative,evidence:all.filter(c=>['powerSource','autoempty','cord'].includes(c.key))};}
 function applyPatches(r,patches=[]){const p=patches.find(p=>String(p.country).toLowerCase()===String(r.country).toLowerCase()&&p.platform===(r.platform||'amazon')&&p.productId===r.productId);if(!p)return r;
  // Supplemental product fields never replace original prices, periods, parent history or eligibility.
  const next={...r,featureEvidence:[...(r.featureEvidence||[]),...(p.featureEvidence||[])],claims:[...(r.claims||[]),...(p.claims||[])],evidenceReferences:[...(r.evidenceReferences||[]),...(p.evidenceReferences||[])],sourceObservations:[...(r.sourceObservations||[]),...(p.sourceObservations||[])],sourceHistoryVersions:[...(r.sourceHistoryVersions||[]),...(p.sourceHistoryVersions||[])],unresolvedIssues:[...new Set([...(r.unresolvedIssues||[]),...(p.unresolvedIssues||[])])]};
  if(p.identityStatus!=='conflict'&&p.title){next.title=p.title;next.supplementalIdentityEvidence=p.identityEvidence;next.titleEvidence=p.titleEvidence;const model=titleModel(next);if(model){next.model=model.value;next.modelStatus='confirmed_in_source_title';next.modelKey=[r.country,(r.brand||'').toLowerCase(),r.platform,r.productId,'source-model',model.value.toLowerCase()].join(':');}}
  if(p.identityStatus!=='conflict'&&p.imageUrl){next.imageObservations=[...(r.imageObservations||[]),{url:r.imageUrl,evidence:r.imageEvidence}].filter(x=>x.url);next.imageUrl=p.imageUrl;next.imageEvidence=p.imageEvidence;}
  if(p.identityStatus==='conflict')next.unresolvedIssues.push('较新来源身份存在冲突，未据此覆盖商品身份、图片或销量资格');return next;
 }
 const api={decode,canonicalUrl,references,price,extract,enrich,modelIdentity,titleModel,vacuumProfile,applyPatches,labels};if(typeof module!=='undefined')module.exports=api;else root.ProductEvidence=api;
})(typeof window==='undefined'?globalThis:window);
