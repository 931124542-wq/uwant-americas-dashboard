/* Shared by the browser and Worker: one validation contract for BI snapshots. */
(function(root){
 const currencies={us:'USD',mx:'MXN',ca:'CAD',br:'BRL'};
 const columns=['country','platform','category','snapshot','dataset','rank_scope','product_id','parent_id','sales_scope','brand','model','currency','price','units','revenue','period_start','period_end','method','rank','rating','reviews','release_date','source'];
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 const group=r=>[r.country,r.platform,r.category,r.snapshot,r.dataset,r.rank_scope,r.method,r.period_start,r.period_end].join('|');
 function validateRecords(records,today){
  if(!Array.isArray(records)||records.length>5000)throw Error('BI记录须为数组，最多5000条');
  const seen=new Set(),ranks=new Set(),families=new Map();
  for(let i=0;i<records.length;i++){
   const r=records[i],fail=message=>{throw Error(`第${i+2}行：${message}`);};
   if(!r||typeof r!=='object'||Array.isArray(r))fail('记录格式无效');
   if(Object.keys(r).some(k=>!columns.includes(k)))fail('包含未支持的字段，请使用当前模板');
   for(const k of columns.filter(k=>!['price','units','revenue','rank','rating','reviews'].includes(k)))if(typeof r[k]!=='string'||r[k].length>2500)fail(k+'格式无效');
   if(!Object.hasOwn(currencies,r.country)||r.currency!==currencies[r.country])fail('国家与币种不一致');
   if(!['amazon','ml','bestbuy','official','retail'].includes(r.platform)||r.platform==='bestbuy'&&r.country!=='ca')fail('平台与国家不一致');
   if(!['mattress','wash','vacuum','fabric'].includes(r.category)||!['actual','estimate','observation'].includes(r.method)||!['listing','family','unknown'].includes(r.sales_scope))fail('品类、数据性质或销量归属无效');
   for(const k of ['dataset','product_id','brand','model','source'])if(!r[k].trim())fail('缺少'+k);
   if(!/^https?:\/\/[^\s]+$/i.test(r.source))fail('来源须为有效http/https链接');
   if(r.platform==='amazon'){
    const host=new URL(r.source).hostname.toLowerCase(),suffix={us:'amazon.com',mx:'amazon.com.mx',ca:'amazon.ca',br:'amazon.com.br'}[r.country];
    if(host!==suffix&&!host.endsWith('.'+suffix)||!/^[A-Z0-9]{10}$/.test(r.product_id))fail('Amazon商品须使用对应国家来源和10位ASIN');
   }
   if(r.platform==='ml'){
    const suffix={mx:'mercadolibre.com.mx',br:'mercadolivre.com.br'}[r.country],host=new URL(r.source).hostname.toLowerCase();
    if(!suffix||host!==suffix&&!host.endsWith('.'+suffix)||!/^ML[MB][A-Z]?-?\d+$/.test(r.product_id))fail('美客多商品须使用MX或BR当地链接和MLM/MLB商品ID');
   }
   if(!date(r.snapshot)||r.snapshot>today)fail('快照日期无效或晚于今天');
   if(r.release_date&&(!date(r.release_date)||r.release_date>r.snapshot))fail('上架日期无效');
   for(const k of ['price','units','revenue','rank','rating','reviews'])if(r[k]!==null&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0||r[k]>1e12))fail(k+'须为非负数字或空白');
   if(r.price!==null&&r.price<=0)fail('价格须大于0');
   for(const k of ['units','rank','reviews'])if(r[k]!==null&&!Number.isSafeInteger(r[k]))fail(k+'须为整数');
   if(r.rank!==null&&(r.rank<1||r.rank>100000||!r.rank_scope.trim()||!['amazon','ml'].includes(r.platform)))fail('名次须为正整数，并填写平台榜单范围');
   if(r.rating!==null&&r.rating>5)fail('评分不得超过5');
   if(r.method==='observation'&&(r.units!==null||r.revenue!==null))fail('公开观察不能填写销量或销售额；请选择实际或估算');
   if(r.units!==null||r.revenue!==null||r.period_start||r.period_end){if(!date(r.period_start)||!date(r.period_end)||r.period_start>r.period_end||r.period_end>r.snapshot)fail('须提供不晚于快照的完整统计期间');}
   if(r.sales_scope==='family'&&!r.parent_id)fail('家族销量须填写parent_id');
   const g=group(r),key=g+'|'+r.product_id;
   if(seen.has(key))fail('同一数据组的商品ID重复');seen.add(key);
   if(r.rank!==null){const rk=g+'|'+r.rank;if(ranks.has(rk))fail('同一榜单名次重复，请核对目录产品/变体');ranks.add(rk);}
   const fk=g+'|'+(r.parent_id||r.product_id),prior=families.get(fk)||[];
   if(prior.some(s=>s==='family'||r.sales_scope==='family'))fail('父级家族与子级数据重叠，不能合计');
   prior.push(r.sales_scope);families.set(fk,prior);
  }
  return records;
 }
 root.UwantRadarCore={columns,date,group,validateRecords};
})(globalThis);
