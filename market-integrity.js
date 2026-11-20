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
 for(const id of ['MLM2017847932','MLM2003963698','MLM1420134604','MLM2033190670','MLM2030587012','MLM3355332430','MLM1379974982']){
  reviewed.push({country:'MX',platform:'ml',category:'vacuum',id,reason:'原标题为 LANMU 扳机固定扣，仅与 Dyson 吸尘器兼容',reviewedAt:'2026-11-19',status:'excluded_accessory'});
 }
 const accessoryBatches=[
  ['CO','vacuum','原标题为 LANMU 扳机固定扣，仅与 Dyson 吸尘器兼容', [
   'MCO2650632488','MCO2003963698'
  ]],
  ['CO','wash','原标题为 Shark HydroVac WD161 替换滚刷与滤网套件', [
   'MCO1565323843','MCO2877852508','MCO2782264642'
  ]],
  ['CO','wash','原标题为 Tineco Floor One / iFloor 替换滚刷或滤网', [
   'MCO2003258917','MCO1523303285','MCO2742004330'
  ]],
  ['CO','wash','原标题为 Tineco Floor One 替换滤网', [
   'MCO3024144336'
  ]],
  ['AR','vacuum','原标题为 LANMU 扳机固定扣，仅与 Dyson 吸尘器兼容', [
   'MLA2030587012','MLA2017847932','MLA2003963698','MLA2033190670','MLA1465603325'
  ]],
  ['AR','wash','原标题为 Tineco Floor One / iFloor 替换滚刷或滤网', [
   'MLA2032355333','MLA2006385923','MLA2039852354','MLA2022458480'
  ]],
  ['BR','vacuum','原标题为兼容 Dyson 的替换刷头', [
   'MLB3939849503'
  ]],
  ['BR','wash','原标题为 BISSELL CrossWave 替换滚刷', [
   'MLB5478452102'
  ]],
  ['CL','vacuum','原标题为 LANMU 扳机固定扣，仅与 Dyson 吸尘器兼容', [
   'MLC2030587012','MLC2003963698','MLC2692170514','MLC2033190670','MLC2017847932'
  ]],
  ['CL','wash','原标题为 Tineco Floor One / iFloor 替换滚刷或滤网', [
   'MLC2022458480','MLC2003258917','MLC1597532881','MLC2849588822','MLC2791020360','MLC2014152719',
   'MLC2006385923','MLC2903137384','MLC1540655681','MLC2920129962','MLC3012216724','MLC2032355333',
   'MLC1598610911','MLC2751227572','MLC2751305364','MLC1611096775','MLC2890454508','MLC2791180164',
   'MLC2008230477','MLC2779002534','MLC1543590043','MLC2002769621'
  ]],
  ['MX','vacuum','原标题为兼容 Dyson 的替换刷头', [
   'MLM4123947394'
  ]],
  ['MX','wash','原标题为 BISSELL CrossWave 替换滚刷', [
   'MLM2026468490','MLM3730981518','MLM1857184493'
  ]],
  ['MX','wash','原标题为 BISSELL CrossWave 多只替换滤网', [
   'MLM1985713523'
  ]],
  ['MX','wash','原标题为 Tineco Floor One / iFloor 替换滚刷或滤网', [
   'MLM3808864030','MLM2212122145','MLM2013027118','MLM3177708930','MLM3687975178','MLM3512240614',
   'MLM2039852354','MLM2948786252','MLM2022458480','MLM3167436378','MLM2821611772','MLM2309825493',
   'MLM3811409432','MLM2397052237','MLM2006385923','MLM2308537429','MLM3711778664','MLM3748512896',
   'MLM2003258917','MLM2213231835','MLM3528876320','MLM3463857230','MLM3556491952','MLM3442686524'
  ]],
  ['MX','wash','原标题为 Tineco Floor One / iFloor 滚刷盖', [
   'MLM3403579188','MLM3408207876','MLM3146803090','MLM2257814227','MLM3524061138','MLM2006623302',
   'MLM3004384324','MLM2354053721','MLM4118998380','MLM4125531206'
  ]],
  ['MX','wash','原标题为 Tineco Floor One 替换滤网六件装', [
   'MLM3660142072'
  ]],
 ];
 for(const [country,category,reason,ids] of accessoryBatches){
  for(const id of ids)reviewed.push({country,platform:'ml',category,id,reason,reviewedAt:'2026-11-20',status:'excluded_accessory'});
 }
 const byId=new Map(reviewed.map(r=>[r.country+'|'+r.id,r]));
 function review(r){return byId.get(String(r.country||'').toUpperCase()+'|'+(r.product_code||r.productId||r.asin||''))||null;}
 function allows(r){return !review(r);}
 function snapshotIssue(r,sourceDate=r.sourceDate){if(!allows(r))return 'reviewed_accessory';if(!currencies[r.country]||r.currency!==currencies[r.country])return 'currency_conflict';if(!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate||''))return 'missing_source_date';return null;}
 function exclusions(records,s){return records.filter(r=>(!s||r.country===s.country&&r.category===s.category)&&!allows(r)).map(record=>({record,review:review(record)}));}
 function applicable(country,platform){return platform==='amazon'?['MX','CA','US','BR'].includes(country):platform==='ml'?['MX','BR','AR','CL','CO'].includes(country):false;}
 const api={currencies,reviewed,review,allows,snapshotIssue,exclusions,applicable};root.MarketIntegrity=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
