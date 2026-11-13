/* Product research only. These rules never establish historical sales eligibility. */
(function(root){
 const DREAME='https://ca.dreametech.com/products/n20-steam-portable-carpet-cleaner';
 const BISSELL='https://www.bissell.com/en-ca/product/little-green-hydrosteam-pet-portable-carpet-cleaner-3618C.html';
 const SHARK='https://www.sharkninja.ca/shark-stainstriker-hairpro-pet-portable-deep-cleaner/PX251C.html';
 const labels={steam:'便携蒸汽抽洗',portable:'便携抽洗（蒸汽另核）',upright:'推行式地毯机',spray:'小型喷洒抽吸',steam_only:'蒸汽清洁（抽吸未确认）',pending:'配置待核'};
 const groupLabels={direct:'同功能直接竞品',alternative:'便携抽洗替代',upgrade:'升级选择',adjacent:'相邻产品',pending:'配置待核',own:'UWANT当地型号',own_pending:'UWANT型号待核'};
 const text=r=>[r.model,r.title].filter(Boolean).join(' ');
 const country=r=>String(r.country||'').toUpperCase();
 function code(r){
  if(r.modelIdentity?.status!=='confirmed')return null;
  const patterns={bissell:/\b\d{4}[A-Z]{0,2}\b/gi,shark:/\b(?:PX|EX|HX)\d{3}[A-Z]*\b/gi,hoover:/\bFH\d{5}[A-Z]*\b/gi,dreame:/\bN20\s+Steam\b/gi,tineco:/\bCarpet\s+One\s+Cruiser\b/gi};
  const p=patterns[String(r.brand).toLowerCase()];if(!p)return null;
  const matches=[...new Set((String(r.model).match(p)||[]).map(x=>x.toUpperCase().replace(/\s+/g,' ')))];
  return matches.length===1?matches[0]:null;
 }
 function modelKey(r){const k=code(r);return k&&r.category==='fabric'?[country(r).toLowerCase(),'fabric',String(r.brand).toLowerCase(),r.productType,k.toLowerCase()].join('|'):null;}
 function classify(r){
  const t=text(r),type=r.productType,model=code(r),brand=String(r.brand||'').toLowerCase();
  let segment='pending',basis='缺少可确认的准确型号或抽洗形态',level='incomplete';
  // Manufacturer product form and exact upright families take precedence over the word "portable".
  if(type==='upright'||/carpet\s*one\s*cruiser|carpetxpert|carpetforce|powerdash(?!\s*go)|powerscrub|smartwash|proheat\s*2x|revolution|\bKW4070\b/i.test(t)){
   segment='upright';basis='推行式整毯清洗形态；带软管或局部工具也不等同于便携主机';level='product_form';
  }else if(type==='spray'||/\bHX101C\b|StainForce/i.test(t)){
   segment='spray';basis='喷洒抽吸小型设备；不等同于便携双水箱蒸汽抽洗机';level='product_form';
  }else if(type==='steam_mop'||type==='wash'||type==='bucket'){
   segment='steam_only';basis='用途或形态不同；不纳入便携布艺抽洗同配置比较';level='product_form';
  }else if(type==='steam'){
   const localDreame=country(r)==='CA'&&brand==='dreame'&&model==='N20 STEAM';
   const localBissell=brand==='bissell'&&((country(r)==='CA'&&model==='3618C')||(country(r)==='MX'&&model==='3618B'));
   if(localDreame||localBissell){segment='steam';level=localDreame||model==='3618C'?'manufacturer_model':'local_title';basis=localDreame?'加拿大N20 Steam型号及品牌蒸汽抽洗资料':model==='3618C'?'加拿大3618C型号及品牌蒸汽抽洗资料':'墨西哥ASIN与3618B蒸汽抽洗标称；电压、套装及保修仍逐项核实';}
   else basis='页面标注蒸汽，但准确型号、当地版本或抽吸产品参数尚不足；不默认同配置';
  }else if(type==='portable'){
   segment='portable';level=model?'local_model':'source_form';basis=/ProHeat|2513E/i.test(t)?'便携抽洗；HeatWave维持水温不等同于产生蒸汽':'便携局部抽洗用途；缺少蒸汽资料不能认定具备或不具备蒸汽';
  }
  return {segment,label:labels[segment],basis,evidenceLevel:level,modelCode:model,statisticsUnaffected:true,evidence:[{url:r.sourceUrl,date:r.sourceDate||null,locator:r.productTypeEvidence?.locator||'当地商品型号及产品形态'}]};
 }
 function relation(r,own){
  const c=r.fabricResearch||classify(r),flags=own?.features?.steam||[],positive=flags.some(f=>!/^(no|无|不具备|未提供|待核|未确认)/i.test(f.value)),negative=flags.some(f=>/^(no|无|不具备)/i.test(f.value)),steamTarget=typeof own==='string'&&/^(Y100S|Y200S)$/.test(own)?true:positive&&!negative?true:negative&&!positive?false:null;
  const group=c.segment==='steam'?(steamTarget===null?'pending':steamTarget?'direct':'upgrade'):c.segment==='portable'?(steamTarget===null?'pending':steamTarget?'alternative':'direct'):['upright','spray','steam_only'].includes(c.segment)?'adjacent':'pending';
  return {group,reason:c.basis+(steamTarget===null?'；UWANT蒸汽配置未明确，不据缺失认定为普通机':'')+(group==='alternative'?'；同用途的价格替代，不据此证明与蒸汽机同配置':''),evidence:c.evidence};
 }
 function curate(r){
  if(r.category!=='fabric')return r;
  const next={...r},t=text(r);
  if(/carpet\s*one\s*cruiser|\bKW4070\b/i.test(t))next.productType='upright';
  // "40 oz" is a capacity, not a Hoover model number. Preserve the source text as evidence.
  if(String(r.brand).toLowerCase()==='hoover'&&/40\s*oz/i.test(r.model||'')&&!/\bFH\d{5}/i.test(r.model||'')){
   next.modelCorrections=[...(r.modelCorrections||[]),{rawModel:r.model,reason:'40 oz为容量标称，不是准确型号；不生成已确认型号组',sourceUrl:r.sourceUrl}];
   next.model=null;next.modelStatus='unconfirmed';next.modelIdentity={...r.modelIdentity,status:'unconfirmed',model:null,groupKey:null,basis:'容量文本不作为型号'};
  }
  const m=code(next),ca=country(next)==='CA',claims=[];
  const add=(key,value,url,locator)=>claims.push({key,value,sourceUrl:url,sourceDate:null,retrievedDate:'2026-11-05',locator,basis:'品牌页面标称（检索页面文本；非独立实测）',verification:'manufacturer_claim'});
  if(ca&&m==='N20 STEAM'){
   add('readyTime','约35秒蒸汽准备时间；不是清洁续航',DREAME,'Disclaimer / 35s');
   add('detergentMix','独立清洁液箱自动配比（品牌标称）',DREAME,'30-day auto-mix soap tank');
  }
  if(ca&&m==='3618C')add('dryTime','约25分钟干燥：Steam模式、新聚酯面料测试，结果因条件而异；不是烘干或续航',BISSELL,'Rapid drying / footnote');
  if(ca&&m==='PX251C'&&r.platform==='official'&&r.sourceUrl===SHARK){
   const observation={price:179.99,currency:'CAD',date:'2026-11-05',kind:'observation',source:SHARK,availability:'缺货（商品页及结构化报价）',conditions:'官网促销标价；原价229.99 CAD，缺货，未核税费与配送，不承诺可成交'};
   next.quoteObservations=[...new Map([...(r.quoteObservations||[]),observation].map(q=>[[q.date,q.kind,q.currency,q.price,q.source].join('|'),q])).values()];
   next.price=179.99;next.currency='CAD';next.priceKind='observation';next.sourceDate='2026-11-05';
   next.availability=observation.availability;next.promotion=observation.conditions;next.priceObservationEvidence={source:'Shark加拿大官网',sourceUrl:SHARK,sourceDate:'2026-11-05'};
   next.evidenceReferences=[...new Map([...(r.evidenceReferences||[]),{url:SHARK,date:'2026-11-05',label:'准确型号、CAD179.99促销标价及缺货状态',fields:['price','currency','availability'],locator:'Product JSON-LD offers + view_item'}].map(x=>[JSON.stringify(x),x])).values()];
  }
  next.claims=[...(r.claims||[]),...claims.filter(c=>!(r.claims||[]).some(x=>x.key===c.key&&x.value===c.value&&x.sourceUrl===c.sourceUrl))];
  next.fabricResearch=classify(next);return next;
 }
 const api={labels,groupLabels,code,modelKey,classify,relation,curate};
 if(typeof module!=='undefined')module.exports=api;else root.FabricResearch=api;
})(typeof window==='undefined'?globalThis:window);
