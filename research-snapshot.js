/* Snapshot dates are separate observations, never an additive market timeline. */
(function(root){
 function matches(r,d){return !d?.researchMode||(r.sourceDate||d.asOf)===(d.researchSnapshot||d.asOf);}
 function eligible(r,d,metric){return matches(r,d)&&(!root.MarketIntegrity||!root.MarketIntegrity.snapshotIssue(r,r.sourceDate||d?.asOf))&&r.counted===true&&typeof r[metric]==='number'&&Number.isFinite(r[metric])&&r[metric]>=0;}
 function priceEligible(r){return typeof r.selling_price==='number'&&Number.isFinite(r.selling_price)&&r.selling_price>0&&r.statPriceEligible!==false;}
 const api={matches,eligible,priceEligible};if(typeof module!=='undefined')module.exports=api;else root.ResearchSnapshot=api;
})(typeof window==='undefined'?globalThis:window);
