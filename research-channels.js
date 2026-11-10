/* Product coverage across channels; no Mercado signal becomes an Amazon monthly fact. */
(function(root){
 function mercadoProducts(s){
  if(s.platform!=='all')return [];
  return (root.MERCADO_DATA?.records||[]).filter(r=>r.country===s.country&&r.category===s.category).map(r=>({
   id:'ml:'+s.country.toLowerCase()+':'+r.product_code,country:s.country.toLowerCase(),platform:'ml',category:r.category,productId:r.product_code,title:r.product_name,brand:r.brandGroup||r.brand_label||'品牌待核',model:r.model||null,modelStatus:'source_title_unconfirmed',modelEvidence:{status:'source_title',verified:false},versionStatus:'unknown',identityStatus:'source_record',productType:({wash:'wash',vacuum:'dry',fabric:'portable',mattress:'mattress'})[r.category],dataNature:'observation',role:'competitor',source:'Mercado Libre 商品来源',sourceDate:r.sourceDate||root.MERCADO_DATA.asOf,sourceUrl:r.detail_link,price:r.selling_price>0?r.selling_price:null,currency:r.currency,expectedCurrency:r.currency,priceKind:'source_snapshot',imageUrl:r.picture_link,imageEvidence:r.imageEvidence||{sourceUrl:r.picture_link,date:r.sourceDate,modelVerified:false},
   claims:Object.entries(r.claims||{}).map(([key,x])=>({key,value:x.value,label:key,status:'source_title',basis:'来源标题标称',sourceDate:r.sourceDate,sourceUrl:r.detail_link})),evidenceReferences:[{url:r.detail_link,date:r.sourceDate,label:'Mercado Libre 商品页面'}],unresolvedIssues:['型号和当地版本尚未独立核实','近30天信号不并入Amazon自然月统计'],metricEligibility:{units:false,revenue:false,marketShare:false},metricAggregationEligible:false,
   sourceListSnapshot:{platform:'ml',sourceUrl:r.detail_link,sourceDate:r.sourceDate||root.MERCADO_DATA.asOf,dataMode:'NEAR_30_DAYS',rating:r.feedback_score>0?r.feedback_score:null,ratingCount:r.feedback_count??null,bsr:null,seller:r.merchant_name||null},sourceObservations:r.selling_price>0?[{value:r.selling_price,currency:r.currency,observedDate:r.sourceDate||root.MERCADO_DATA.asOf,kind:'source_snapshot',sourceUrl:r.detail_link}]:[]
  }));
 }
 const render=root.MarketWorkbench.render;root.MarketWorkbench.render=function(c,s){return (s.platform==='all'?'<p class="market-channel-note">全部渠道汇总商品资料；Amazon自然月与美客多近30天销量请分别切换平台查看。</p>':'')+render(c,s);};
 root.ResearchChannels={mercadoProducts};
})(window);
