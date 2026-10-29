(function(root){
function metricRows(rows,key){
 const monthly=rows.some(r=>r.origin==='monthly'||r.month&&r.recordStatus),field=key==='units'?'parentSales':'parentSalesAmount';
 const eligible=monthly?rows.filter(r=>r.parentBasis==='历史父体变更记录'&&(r.parent_id||r.parentAsin)&&Number.isFinite(r[field])):rows.filter(r=>(r.sales_scope==='listing'||r.sales_scope==='family'&&(r.parent_id||r.parentAsin))&&Number.isFinite(r[key]));
 const familyIds=new Set(eligible.filter(r=>r.sales_scope==='family'||monthly).map(r=>(r.parent_id||r.parentAsin)));
 const groups=new Map();for(const r of eligible.filter(r=>r.sales_scope!=='listing'||!familyIds.has((r.parent_id||r.parentAsin)))){const id=monthly||r.sales_scope==='family'?'family|'+((r.parent_id||r.parentAsin)||r.product_id):'listing|'+r.product_id;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);}
 return [...groups.values()].filter(g=>new Set(g.map(r=>monthly?r[field]:r[key])).size===1).map(g=>({...g[0],brand:new Set(g.map(r=>r.brand)).size===1?g[0].brand:'品牌待核',[key]:monthly?g[0][field]:g[0][key],sales_scope:monthly?'family':g[0].sales_scope}));
}
const api={metricRows};if(typeof module!=='undefined')module.exports=api;else root.HistoryMetrics=api;
})(globalThis);
