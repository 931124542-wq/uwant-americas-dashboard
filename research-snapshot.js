/* Snapshot dates are separate observations, never an additive market timeline. */
(function(root){
 function matches(r,d){return !d?.researchMode||(r.sourceDate||d.asOf)===(d.researchSnapshot||d.asOf);}
 function eligible(r,d,metric){return matches(r,d)&&(!root.MarketIntegrity||!root.MarketIntegrity.snapshotIssue(r,r.sourceDate||d?.asOf))&&r.counted===true&&typeof r[metric]==='number'&&Number.isFinite(r[metric])&&r[metric]>=0;}
 function priceEligible(r){return typeof r.selling_price==='number'&&Number.isFinite(r.selling_price)&&r.selling_price>0&&r.statPriceEligible!==false;}
 function observations(product){
  const rows=[...(product.priorObservations||[]),product,product.latestSourceObservation].filter(row=>
   row&&row.product_code===product.product_code&&row.category===product.category&&row.country===product.country&&
   row.currency===product.currency&&row.form===product.form&&row.metricPeriod==='near_30_days_unknown_bounds'&&
   !root.MarketIntegrity?.snapshotIssue(row)
  );
  return rows.filter(row=>rows.filter(other=>other.sourceDate===row.sourceDate).length===1)
   .sort((a,b)=>a.sourceDate.localeCompare(b.sourceDate));
 }
 const api={matches,eligible,priceEligible,observations};if(typeof module!=='undefined')module.exports=api;else root.ResearchSnapshot=api;
})(typeof window==='undefined'?globalThis:window);
