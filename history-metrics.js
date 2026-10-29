(function(root){
function brandName(value){if(!value)return null;const text=String(value).trim();return ({roborock:'Roborock',tineco:'Tineco',dreame:'Dreame',narwal:'Narwal',shark:'Shark',bissell:'BISSELL',eureka:'Eureka',uwant:'UWANT'})[text.toLowerCase()]||text;}
function rejectVacuum(r){return /robot(?:ic)?|robo[tô]|shop.?vac|wet.?dry|commercial|industrial|canister|gallon|ProHeat|carpet cleaner|limpiadora.*alfombra|accessor(?:y|ies)|replacement filter/i.test(r.title||'');}
const monthly=r=>r.origin==='monthly'||!!(r.month&&r.recordStatus);
const parent=r=>r.parent_id||r.parentAsin||'';
const scope=r=>JSON.stringify([String(r.country||'').toUpperCase(),r.currency||'',String(r.platform||r.marketplace||'amazon').toLowerCase(),r.month||r.period||[r.period_start||'',r.period_end||''].join('/'),r.dataset||r.origin||'',r.method||'']);
const identity=r=>scope(r)+'|'+(monthly(r)||r.sales_scope==='family'?'family|'+parent(r):'listing|'+(r.product_id||r.asin||r.id||''));
function metricRows(rows,key,{universe=rows}={}){
 const field=r=>monthly(r)?key==='units'?'parentSales':'parentSalesAmount':key;
 const valid=r=>Number.isFinite(r[field(r)])&&r[field(r)]>=0&&(monthly(r)?r.parentBasis==='历史父体变更记录'&&parent(r):r.sales_scope==='listing'||r.sales_scope==='family'&&parent(r));
 const eligible=universe.filter(valid),families=new Set(eligible.filter(r=>monthly(r)||r.sales_scope==='family').map(r=>scope(r)+'|'+parent(r)));
 const groups=new Map();
 for(const r of eligible){if(!monthly(r)&&r.sales_scope==='listing'&&parent(r)&&families.has(scope(r)+'|'+parent(r)))continue;const id=identity(r);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);}
 const selected=new Map(rows.filter(valid).map(r=>[identity(r),r]));
 const result=[];
 for(const [id,g] of groups){
  // Resolve conflicts against the source scope before search, brand or price filters.
  if(!selected.has(id)||new Set(g.map(r=>r[field(r)])).size!==1)continue;
  const r=selected.get(id),brands=new Set(g.map(r=>brandName(r.brand)||'品牌待核'));
  result.push({...r,brand:brands.size===1?[...brands][0]:'品牌待核',[key]:g[0][field(g[0])],sales_scope:monthly(r)?'family':r.sales_scope});
 }
 return result;
}
const api={metricRows,brandName,rejectVacuum};if(typeof module!=='undefined')module.exports=api;else root.HistoryMetrics=api;
})(globalThis);
