/* Source-level field quality. Visibility never grants sales eligibility. */
(function(root){
 const HM=typeof module!=='undefined'?require('./history-metrics.js'):root.HistoryMetrics;
 const currencies={us:'USD',ca:'CAD',mx:'MXN',br:'BRL'};
 const typeLabels={portable:'Portable Spot Cleaner',steam:'Steam Spot Cleaner',upright:'Upright Carpet Cleaner',wash:'Wet Dry Floor Washer',dry:'干式吸尘器',mattress:'床褥除螨吸尘器',spray:'喷剂抽吸 · 相邻替代',bucket:'桶式干湿吸尘器 · 非同型',unknown:'产品类型待核'};
 const typeFilters={all:'全部产品类型',portable:'便携抽洗（含蒸汽）',steam:'蒸汽便携抽洗',upright:'推行式地毯机',wash:'硬地面洗地机',dry:'干式吸尘器',mattress:'除螨仪',spray:'喷剂抽吸（相邻）',bucket:'桶式干湿吸尘器（非同型）',unknown:'类型待核'};
 const platforms={amazon:'Amazon',ml:'Mercado Libre',bestbuy:'Best Buy',official:'品牌官网 / 分销站',retail:'当地零售',unknown:'渠道待核'};
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const name=b=>HM.brandName(b)||'品牌待核';
 function metricRows(rows,key,{universe=rows}={}){const admissible=r=>!['candidate','quarantined_estimate','model_reference'].includes(r.dataNature)&&r.origin!=='candidate'&&!r.quarantinedHistory;return HM.metricRows(rows.filter(admissible),key,{universe:universe.filter(admissible)});}
 function platformOf(r){
  let h;try{h=new URL(r.sourceUrl||r.source).hostname.toLowerCase().replace(/^www\./,'');}catch{return 'unknown';}
  const is=d=>h===d||h.endsWith('.'+d);
  if(['amazon.com','amazon.ca','amazon.com.mx','amazon.com.br'].some(is))return 'amazon';
  if(['mercadolibre.com.mx','mercadolivre.com.br'].some(is))return 'ml';
  if(is('bestbuy.ca'))return 'bestbuy';
  if(['tsc.ca','walmart.ca','walmart.com.mx','liverpool.com.mx','costco.ca','canadiantire.ca','samsclub.com.mx'].some(is))return 'retail';
  if(['bissell.com','sharkninja.ca','sharkninja.mx','hoover.ca','ca-store.tineco.com','tinecomx.com','ca.dreametech.com','mx.dreametech.com','wap.ind.br','vonder.com.br','mondial.com.br'].some(is))return 'official';
  return 'unknown';
 }
 function productType(r){
  const t=String(r.title||r.model||'').toLowerCase(),hint=r.productTypeHint||r.productType;
  if(/\bgtw\b|\bwd[1-6]\b|shop.?vac|\b(?:[3-9]|[12]\d)\s*(?:gal|gallon)|industrial|commercial|\b(?:15|16|18|20|30|40|50|60)\s*(?:l\b|lit)/.test(t)||hint==='commercial_bucket')return 'bucket';
  if(/hx101|stainforce/.test(t))return 'spray';
  if(/carpet\s*one\s*spot/.test(t))return /steam|dualheat/.test(t)?'steam':'portable';
  if(/carpet\s*one|carpetxpert|carpetforce|powerdash(?!\s*go)|powerscrub|smartwash|allout|proheat\s*2x|revolution|big green|turbobrush/.test(t)||hint==='upright_carpet')return 'upright';
  if(/crosswave|floor\s*one|ifloor|\bf25\b|\bflexi\b|\b(h12|h13|h14|h15|h16)\b/.test(t)||hint==='hardfloor_washer')return 'wash';
  if(/hydrosteam|n20.*steam|steam.*n20/.test(t))return 'steam';
  if(['portable_extractor','portable_spot_cleaner'].includes(hint)||/little\s*green|spotclean|stainstriker|cleanslate|clean\s*slate|spotless|\bpex30a\b|spot cleaner|extratora.*port[aá]til/.test(t))return /\bsteam\b/.test(t)&&!/proheat/.test(t)?'steam':'portable';
  if(hint==='mattress_vacuum'||/mattress|mite cleaner|anti[aá]caro|jigoo|j300|bx7|t600/.test(t))return 'mattress';
  if(hint==='dry_vacuum'||r.category==='vacuum')return 'dry';
  if(r.category==='wash'&&/wet.?dry.*(?:mop|floor)/.test(t))return 'wash';
  return 'unknown';
 }
 function matchesType(r,type){const actual=productType(r);return !type||type==='all'||type==='portable'?(type==='portable'?['portable','steam'].includes(actual):true):actual===type;}
 function quality(r,{universe=[],candidate=false,pilot=null}={}){
  const monthly=r.origin==='monthly'||!!(r.month&&r.recordStatus),price=r.price??r.avgPrice;
  const units=!candidate&&!pilot&&!!universe.length&&metricRows([r],'units',{universe}).length>0;
  const revenue=!candidate&&!pilot&&!!universe.length&&metricRows([r],'revenue',{universe}).length>0;
  const identity=r.brandConflict?'conflict':pilot?(pilot.identityStatus||r.identityStatus||'pending'):candidate?(r.identityStatus||'pending'):r.identityStatus||'source_record';
  const parent=pilot?(pilot.parentStatus||'unconfirmed'):/同日|多个父体/.test(r.parentBasis||'')?'ambiguous_same_day':monthly?r.parentBasis==='历史父体变更记录'&&(r.parentAsin||r.parent_id)?'historical_confirmed':'unconfirmed':r.sales_scope==='family'&&(r.parentAsin||r.parent_id||r.parent)?'current_family':'not_provided';
  const priceCode=candidate?pilot?'quarantined':'missing':!finite(price)?'missing':monthly?'month_end':r.origin==='public'?'observation':(r.priceType==='archive_mean'||r.priceKind==='archive_mean')?'archive_mean':'snapshot';
  const reason=pilot?'试采父体归属有歧义，隔离保存':candidate?'候选不进入销量统计':'归属、字段或来源冲突未满足统计条件';
  return Object.freeze({identityStatus:identity,parentStatus:parent,priceStatus:Object.freeze({code:priceCode,value:finite(price)&&!candidate?price:null,date:monthly?r.month:r.sourceDate||r.snapshot||null,kind:monthly?'期末最后有效点，非月均价':r.origin==='public'?'带日期的价格观察':priceCode==='archive_mean'?'归档期间来源均价':'来源价格',eligibleForDistribution:!candidate&&finite(price)&&productType(r)!=='bucket'}),reviewStatus:pilot?(pilot.reviewStatus||'pending'):r.reviews==null?'missing':'source_snapshot',metricEligibility:Object.freeze({units:Object.freeze({eligible:units,reason:units?'符合原有归属及完整来源冲突隔离规则；估算':reason}),revenue:Object.freeze({eligible:revenue,reason:revenue?'符合原有金额来源及归属规则；估算':reason}),price:Object.freeze({eligible:!candidate&&finite(price),reason:monthly?'期末快照':'独立观察日期'}),marketShare:Object.freeze({eligible:false,reason:'当前目录不是完整市场，不能计算市场份额'})})});
 }
 function historyProfiles(rows,scope){return rows.filter(r=>String(r.country||'').toLowerCase()===scope.country.toLowerCase()&&(!r.category||r.category===scope.category)&&(!r.month||r.month===scope.dataset)&&(r.platform||'amazon')==='amazon').map(r=>{
  const country=scope.country.toLowerCase(),id=r.asin||r.product_id;
  return {id:'history:'+country+':'+id+':'+scope.dataset,country,platform:'amazon',category:scope.category,productId:id,brand:name(r.brand),model:r.model||null,title:r.title||r.model,productType:productType(r),source:r.source||'SellerSprite 商品档案',sourceDate:r.retrievedAt||r.sourceDate||r.snapshot||null,period:r.month||r.period||(r.period_start&&r.period_end?r.period_start+'—'+r.period_end:scope.dataset),sourceUrl:r.source?.startsWith('http')?r.source:'https://www.'+{ca:'amazon.ca',us:'amazon.com',mx:'amazon.com.mx',br:'amazon.com.br'}[country]+'/dp/'+id,price:r.price??r.avgPrice??null,currency:r.currency||currencies[country],priceKind:r.month?'month_end':r.origin==='sellersprite'||scope.dataset==='archive'?'archive_mean':'snapshot',imageUrl:r.imageUrl||null,dataNature:'estimate',origin:'history_profile',identityStatus:r.brandConflict?'conflict':'source_record',quality:quality({...r,priceKind:r.month?'month_end':r.origin==='sellersprite'||scope.dataset==='archive'?'archive_mean':'snapshot'},{universe:rows}),evidenceReferences:[{label:'原商品来源',url:r.source?.startsWith('http')?r.source:'https://www.'+{ca:'amazon.ca',us:'amazon.com',mx:'amazon.com.mx',br:'amazon.com.br'}[country]+'/dp/'+id}],unresolvedIssues:['销量只按原数据集、原期间及合格父体计算；不在研究目录另行加总'],originalRow:r};});}
 function channelOf(url){try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');return {id:h,label:({'tsc.ca':'TSC Canada','walmart.ca':'Walmart Canada','walmart.com.mx':'Walmart México','sharkninja.ca':'Shark Canada','hoover.ca':'Hoover Canada'})[h]||h};}catch{return {id:'unknown',label:'渠道待核'};}}
 function observations(cp=[],br=[],profiles=[]){
  const cat=s=>({D:'wash',V:'vacuum',Y:'fabric',M:'mattress'})[s?.[0]];
  return [...cp,...br,...profiles.map(p=>({...p,id:'official-'+p.key,country:'br',platform:'official',price:p.offer?.eligible?p.offer.amount:null,currency:'BRL'}))].map(r=>{
   const country=r.country.toLowerCase(),platform=r.platform||platformOf(r),date=r.checkedAt||null;
   const locator=/lista\.|\/loja\//.test(r.source||''),pending=locator||String(r.id).startsWith('br-')&&r.evidence!=='page';const price=pending||r.currencyVerified===false?null:r.price??null;const pid=r.productId||r.source?.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1]||r.source?.match(/\/(?:p|up)\/(ML[BM]U?\d+)/i)?.[1]||r.source?.match(/\/(ML[BM])-?(\d+)-/i)?.slice(1).join('')||null;
   const out={id:'observation:'+country+':'+r.id,country,platform,category:r.category||cat(r.sku?.[0]),productId:pid,brand:name(r.brand),model:r.model,title:r.model,productType:productType({...r,category:r.category||cat(r.sku?.[0])}),source:'公开产品 / 价格观察',sourceDate:date,period:null,sourceUrl:r.source,channel:channelOf(r.source).id,channelLabel:channelOf(r.source).label,price,currency:r.currency||currencies[country],priceKind:'observation',imageUrl:r.imageUrl||null,features:[r.features,r.voltage,r.bundle].filter(Boolean),dataNature:pending?'candidate':'observation',origin:'public',identityStatus:pending?'pending':/待核|冲突/.test(r.model||'')?'partial':'observed_model',evidenceReferences:[{label:'当地来源（'+(date||'日期待核')+'）',url:r.source}],unresolvedIssues:[r.note,r.availability,r.warranty].filter(Boolean)};
   out.quality=quality({...out,snapshot:date},{candidate:pending});return out;
  });
 }
 function catalog({scope,historyRows=[],publicRows=[],evidence={}}){
  const country=scope.country.toLowerCase();const pilot=(evidence.quarantinedHistory||[]).find(p=>p.country===country&&(scope.platform==='all'||scope.platform===p.platform));publicRows=publicRows.map(r=>{const override=(evidence.identityOverrides||[]).find(x=>x.country===r.country&&x.platform===r.platform&&x.productId===r.productId);if(!override)return r;const out={...r,dataNature:'candidate',identityStatus:override.identityStatus,price:null,evidenceReferences:[...r.evidenceReferences,override.evidenceReference],unresolvedIssues:[override.reason,...r.unresolvedIssues]};out.quality=quality(out,{candidate:true});return out;});
  const pendingPublic=publicRows.filter(r=>r.dataNature==='candidate');const observed=[...historyProfiles(historyRows,scope),...publicRows.filter(r=>r.dataNature!=='candidate'),...(evidence.modelReferences||[]).map(r=>({...r,origin:'model_reference',period:null,price:null,currency:currencies[r.country],dataNature:'model_reference',productType:productType(r),quality:quality(r)}))];
  const candidates=[...(evidence.candidates||[]).filter(r=>r.role!=='own_identity'),...pendingPublic].map(r=>{const p=(evidence.quarantinedHistory||[]).find(p=>p.country===r.country&&p.platform===r.platform&&p.productId===r.productId);return {...r,source:p?.source||r.source,sourceDate:p?.sourceDate||r.sourceDate,sourceDateNote:p?'复用已保存试采；早期发现缓存未提供独立采集时戳':r.sourceDateNote,dataNature:p?'quarantined_estimate':'candidate',period:null,price:null,currency:currencies[r.country],productType:productType(r),quality:quality(r,{candidate:true,pilot:p}),evidenceReferences:[...r.evidenceReferences,...(p?(p.evidenceReferences||[{label:'隔离试采核验记录',url:p.sourceEvidence}]):[])],quarantinedHistory:p||null,unresolvedIssues:p?[...(p.unresolvedIssues||[]),...r.unresolvedIssues]:r.unresolvedIssues};});
  const uniqueCandidates=[...candidates.reduce((m,r)=>{const key=r.productId?[r.country,r.platform,r.productId].join('|'):r.id;if(!m.has(key))m.set(key,r);else{const prior=m.get(key),next={...prior,...r,id:prior.id,evidenceReferences:[...prior.evidenceReferences,...r.evidenceReferences],unresolvedIssues:[...new Set([...prior.unresolvedIssues,...r.unresolvedIssues])]};m.set(key,next);}return m;},new Map()).values()];
  const match=r=>r.country===country&&r.category===scope.category&&(scope.platform==='all'||r.platform===scope.platform)&&matchesType(r,scope.productType);
  return {metricSourceRows:['all','amazon'].includes(scope.platform)?historyRows.filter(r=>String(r.country||'').toLowerCase()===country&&r.category===scope.category&&(!r.month||r.month===scope.dataset)&&(r.platform||'amazon')==='amazon'):[],observed:observed.filter(match),candidates:uniqueCandidates.filter(match),otherChannelObserved:observed.filter(r=>r.country===country&&r.category===scope.category&&r.platform!==scope.platform&&matchesType(r,scope.productType)).length,pilot};
 }
 function filter(rows,{q='',brand=''}={}){const term=q.trim().toLowerCase();return rows.filter(r=>(!brand||r.brand===brand)&&(!term||[r.brand,r.model,r.title,r.productId].join(' ').toLowerCase().includes(term)));}
 function priceGroups(rows){const groups=new Map();for(const r of rows){if(r.priceKind!=='observation'||!finite(r.price)||!r.sourceDate||!r.quality.priceStatus.eligibleForDistribution)continue;const key=[r.country,r.platform,r.channel||channelOf(r.sourceUrl).id,r.productType,r.currency,r.sourceDate,r.priceKind].join('|');if(!groups.has(key))groups.set(key,{key,platform:r.platform,channel:r.channel||channelOf(r.sourceUrl).id,channelLabel:r.channelLabel||channelOf(r.sourceUrl).label,productType:r.productType,date:r.sourceDate,currency:r.currency,rows:[]});groups.get(key).rows.push(r);}return [...groups.values()].sort((a,b)=>b.rows.length-a.rows.length||b.date.localeCompare(a.date));}
 function exportRows(rows){const keys=['country','platform','channel','category','productId','brand','model','productType','dataNature','source','sourceDate','period','currency','price','priceKind','identityStatus','parentStatus','priceStatus','reviewStatus','unitsEligible','revenueEligible','marketShareEligible','units','revenue','sourceUrl','evidenceReferences','unresolvedIssues'];const out=rows.map(r=>({...r,identityStatus:r.quality.identityStatus,parentStatus:r.quality.parentStatus,priceStatus:r.quality.priceStatus.code,reviewStatus:r.quality.reviewStatus,unitsEligible:r.quality.metricEligibility.units.eligible,revenueEligible:r.quality.metricEligibility.revenue.eligible,marketShareEligible:false,units:null,revenue:null,evidenceReferences:JSON.stringify(r.evidenceReferences||[]),unresolvedIssues:JSON.stringify(r.unresolvedIssues||[])}));return [keys,...out.map(r=>keys.map(k=>r[k]??''))];}
 const api={currencies,typeLabels,typeFilters,platforms,platformOf,productType,matchesType,quality,metricRows,catalog,observations,filter,priceGroups,exportRows};
 if(typeof module!=='undefined')module.exports=api;else root.ResearchQuality=api;
})(typeof window==='undefined'?globalThis:window);
