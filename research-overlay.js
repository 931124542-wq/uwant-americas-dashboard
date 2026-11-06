/* Optional loopback-only research overlay. No network request and no bundled private data. */
(function(root){
 const currencies={MX:'MXN',CA:'CAD',US:'USD',BR:'BRL',AR:'ARS',CL:'CLP',CO:'COP'},markets={MLM:'MX',MLB:'BR',MLA:'AR',MLC:'CL',MCO:'CO'},cats=['wash','vacuum','fabric','mattress'];
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const key=r=>[r.country.toUpperCase(),r.platform,r.productId].join('|');
 function resolveImage(r,repairs){const original=r.picture_link,p=repairs?.[original];if(!p?.ok||p.width<32||p.height<32)return r;try{const expected=String(original).replaceAll('{sanitizedTitle}','').replace(/^http:/,'https:');if(p.originalUrl!==original||p.url!==expected||new URL(expected).hostname!=='http2.mlstatic.com')return r;}catch{return r;}return {...r,picture_link:p.url,originalPictureUrl:original,imageLinkValid:true,imageEvidence:{sourceUrl:original,resolvedUrl:p.url,method:p.method,observedAt:p.observedAt,width:p.width,height:p.height,modelVerified:false}};}
 function validate(r){
  if(!currencies[r.country]||!cats.includes(r.category)||!['ml','amazon','retail','official'].includes(r.platform))return 'unsupported_scope';
  if(r.platform==='amazon'&&(!['MX','CA','US','BR'].includes(r.country)||!/^B[A-Z0-9]{9}$/.test(r.productId)))return 'amazon_identity';
  if(r.platform==='ml'&&(!/^(MLM|MLB|MLA|MLC|MCO)\d+$/.test(r.productId)||markets[String(r.productId).slice(0,3)]!==r.country))return 'ml_country_identity';
  if(r.platform==='ml'){try{const u=new URL(r.detail_link||r.sourceUrl),domain=({MX:'mercadolibre.com.mx',BR:'mercadolivre.com.br',AR:'mercadolibre.com.ar',CL:'mercadolibre.cl',CO:'mercadolibre.com.co'})[r.country];if(u.protocol!=='https:'||!(u.hostname===domain||u.hostname.endsWith('.'+domain)))return 'ml_source_country_url';}catch{return 'ml_source_country_url';}}
  if(r.currency&&r.currency!==currencies[r.country])return 'currency_conflict';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.sourceDate||''))return 'missing_observation_date';
  if(!r.title||!r.sourceFiles?.length)return 'missing_provenance';
  return null;
 }
 function historyValid(t,r){return !!r&&t.product_code===r.productId&&markets[t.market_code]===r.country&&t.data_available===true&&t.covered_day_count>0&&Array.isArray(t.monthly_order_series)&&t.monthly_order_series.every(x=>/^\d{4}-(0[1-9]|1[012])$/.test(x.month)&&x.month<=r.sourceDate.slice(0,7)&&finite(x.orders))&&new Set(t.monthly_order_series.map(x=>x.month)).size===t.monthly_order_series.length;}
 function apply(target,payload){
  if(payload?.access!=='personal_local_only'||!['localhost','127.0.0.1','[::1]'].includes(target.location?.hostname))return {applied:false,reason:'loopback_only'};
  const valid=[],rejected=[];for(const r of payload.records||[]){const reason=validate(r);if(reason)rejected.push({key:key(r),reason});else valid.push(r);}
  const map=new Map(valid.map(r=>[key(r),r])),histories={},historyRejected=[];
  for(const [id,t]of Object.entries(payload.histories||{})){const prior=target.MERCADO_DATA?.records.find(x=>x.product_code===id),r=valid.find(x=>x.platform==='ml'&&x.productId===id)||(prior?{...prior,productId:id,sourceDate:payload.asOf}:null);if(historyValid(t,r))histories[id]=t;else historyRejected.push(id);}
  if(target.MERCADO_DATA){const d=target.MERCADO_DATA,byId=new Map(d.records.map(r=>[r.product_code,{...r,sourceDate:r.sourceDate||d.asOf}]));
   for(const r of [...(payload.priorMlRecords||[]).filter(r=>!validate(r)),...valid.filter(r=>r.platform==='ml')]){const old=byId.get(r.productId);let next=resolveImage({...r,priorObservations:old?[...(old.priorObservations||[]),old]:[]},payload.imageUrlRepairs);const cached=old&&resolveImage(old,payload.imageUrlRepairs),usable=u=>typeof u==='string'&&/^https:\/\//.test(u)&&!/[{}]/.test(u);if(!usable(next.picture_link)&&cached&&usable(cached.picture_link)&&cached.country===r.country&&cached.category===r.category&&(cached.product_name||cached.title)===(r.product_name||r.title)){next={...next,picture_link:cached.picture_link,originalPictureUrl:r.picture_link||null,imageLinkValid:true,imageEvidence:{sourceDate:cached.sourceDate||d.asOf,sourceUrl:cached.detail_link,cached:true,method:'exact_country_listing_and_title_cache',modelVerified:false}};}byId.set(r.productId,next);}
   for(const p of payload.baselineScopeIsolation||[]){const r=byId.get(p.productId);if(r&&r.category==='vacuum')byId.set(p.productId,{...r,counted:false,sourceScopeTier:'adjacent',statIsolationReason:p.reason});}
   target.MERCADO_DATA={...d,records:[...byId.values()].map(r=>resolveImage(r,payload.imageUrlRepairs)),asOf:payload.asOf,researchMode:true,researchSnapshot:payload.asOf,trends:{...d.trends,...histories},coverage:[...d.coverage,...(payload.mlCoverage||[])]};
  }
  // Existing independently reviewed identities and all historical eligibility remain intact.
  const capture=payload.legacyCapture||{access:'personal_local_only',listings:[]},old=new Map((capture.listings||[]).map(r=>[r.country.toUpperCase()+'|amazon|'+r.productId,r]));
  for(const r of payload.amazonListings||[]){const k=[r.country.toUpperCase(),'amazon',r.productId].join('|');if(!map.has(k))continue;const prior=old.get(k);if(prior)old.set(k,{...prior,researchSnapshots:[...(prior.researchSnapshots||[]),map.get(k)]});else old.set(k,r);}
  target.UWANT_PRIVATE_CAPTURE={...capture,access:'personal_local_only',listings:[...old.values()]};
  if(target.LOCAL_CHANNEL_PRODUCTS){const existing=new Map(target.LOCAL_CHANNEL_PRODUCTS.records.map(r=>[[r.country,r.platform,r.channel,r.productId].join('|'),r]));for(const r of payload.retailListings||[])if(map.has([r.country.toUpperCase(),'retail',r.productId].join('|')))existing.set([r.country,r.platform,r.channel,r.productId].join('|'),r);target.LOCAL_CHANNEL_PRODUCTS={...target.LOCAL_CHANNEL_PRODUCTS,records:[...existing.values()]};}
  target.PRIVATE_RESEARCH={...payload,records:valid,histories,rejected,historyRejected};
  return {applied:true,records:valid.length,rejected,historyRejected};
 }
 const api={validate,historyValid,apply,key,resolveImage};if(typeof module!=='undefined')module.exports=api;else{root.ResearchOverlay=api;if(root.UWANT_RESEARCH_PAYLOAD)api.apply(root,root.UWANT_RESEARCH_PAYLOAD);}
})(typeof window==='undefined'?globalThis:window);
