/* Reviewed admission rules. Original source records are preserved without mutation. */
(function(root){
 const currencies={MX:'MXN',CA:'CAD',US:'USD',BR:'BRL',AR:'ARS',CL:'CLP',CO:'COP'};
 const reviewed=[
  ['MX','wash','MLM3504925382','原商品图为滤网与清洁刷，非整机'],
  ['MX','wash','MLM2007413215','原商品图为滤网与清洁刷，非整机'],
  ['MX','wash','MLM2193042605','原商品图为滤网与清洁刷，非整机'],
  ['MX','wash','MLM2746022912','原商品图为滤网与清洁刷，非整机'],
  ['MX','wash','MLM1987865757','原商品图为滚刷与滤网配件，非整机'],
  ['MX','wash','MLM2008674165','原商品图为滚刷与滤网配件，非整机'],
  ['BR','wash','MLB5266551189','原商品图为滚刷与滤网配件，非整机'],
  ['CL','wash','MLC2050496239','原商品图为替换滚刷，非整机'],
  ['CO','wash','MCO2017052367','原商品图为滤网与清洁刷，非整机'],
  ['CO','wash','MCO2007413215','原商品图为滤网与清洁刷，非整机'],
  ['CO','fabric','MCO1554603377','原标题为便携布艺机收纳包，非整机；图片为占位图'],
  ['CO','fabric','MCO3204386442','原标题及原商品图均为收纳包，非整机']
 ].map(([country,category,id,reason])=>({country,platform:'ml',category,id,reason,reviewedAt:'2026-11-13',status:'excluded_accessory'}));
 const byId=new Map(reviewed.map(r=>[r.country+'|'+r.id,r]));
 function review(r){return byId.get(String(r.country||'').toUpperCase()+'|'+(r.product_code||r.productId||r.asin||''))||null;}
 function allows(r){return !review(r);}
 function snapshotIssue(r,sourceDate=r.sourceDate){if(!allows(r))return 'reviewed_accessory';if(!currencies[r.country]||r.currency!==currencies[r.country])return 'currency_conflict';if(!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate||''))return 'missing_source_date';return null;}
 function exclusions(records,s){return records.filter(r=>(!s||r.country===s.country&&r.category===s.category)&&!allows(r)).map(record=>({record,review:review(record)}));}
 function applicable(country,platform){return platform==='amazon'?['MX','CA','US','BR'].includes(country):platform==='ml'?['MX','BR','AR','CL','CO'].includes(country):false;}
 const api={currencies,reviewed,review,allows,snapshotIssue,exclusions,applicable};root.MarketIntegrity=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
