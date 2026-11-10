(function(root){
 const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0,e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(s,catalog){
  if(!root.ResearchDataAdmin?.isRoute(s))return '';
  const extra=root.ResearchArchive?.render(s)||'';
  let a=(root.COVERAGE_AUDIT||[]).find(x=>x.country===s.country&&x.platform===s.platform&&x.category===s.category);
  if(!a)return extra;
  if(s.platform==='ml'&&root.Mercado){
   const rs=root.Mercado.rows(s),trends=root.MERCADO_DATA.trends;a={...a,...root.MarketInsights.coverage(rs,trends)};
   if(root.PRIVATE_RESEARCH){const market=({MX:'MLM',BR:'MLB',AR:'MLA',CL:'MLC',CO:'MCO'})[s.country],qs=root.PRIVATE_RESEARCH.mlCoverage.filter(q=>q.market===market&&q.category===s.category);a={...a,statisticalUnits:new Set(rs.filter(r=>r.counted&&root.ResearchSnapshot.matches(r,root.MERCADO_DATA)).map(r=>r.statisticalKey)).size,queryPathsChecked:qs.length,queryPathsCompleted:qs.filter(q=>q.complete).length,queryPagesUnfetched:qs.reduce((n,q)=>n+Math.max(0,(q.expectedPages||0)-q.pageNumbers.length),0),multipleBucketHistory:rs.filter(r=>trends[r.product_code]?.covered_day_count>1&&trends[r.product_code]?.monthly_order_series?.length>1).length,manufacturerReferenceProducts:rs.filter(r=>r.modelReferences?.length).length};}
  }else if(root.PRIVATE_RESEARCH&&catalog?.observed){
   const rs=catalog.observed,universe=catalog.metricSourceRows||[];
   a={...a,discoveredRecords:rs.length+catalog.candidates.length,pendingRecords:catalog.candidates.length,listingCount:new Set(rs.map(r=>r.productKey||r.productId||r.id)).size,brands:new Set(rs.map(r=>r.brand).filter(Boolean)).size,sourceTitleModelGroups:new Set(rs.map(r=>r.model).filter(Boolean)).size,verifiedModels:new Set(rs.filter(r=>r.modelEvidence?.verified||r.identityStatus==='manufacturer_model'&&r.modelIdentity?.status==='confirmed').map(r=>[r.country,r.brand,r.model].join('|'))).size,price:rs.filter(r=>finite(r.price)&&r.price>0).length,imageLinks:rs.filter(r=>r.imageUrl).length,parameters:rs.filter(r=>r.claims?.length).length,history:rs.filter(r=>r.monthlyRecordCount>0).length,qualifiedFamilyMonths:['amazon','all'].includes(s.platform)?root.ResearchQuality.metricRows(universe,'revenue',{universe}).length:0,latestDate:rs.map(r=>r.sourceDate||'').sort().at(-1)||null};
  }
  const labels={discoveredRecords:'已发现档案（含待核）',pendingRecords:'待核档案',listingCount:'主库唯一Listing',statisticalUnits:'当前采集批次去重单位',sourceTitleModelGroups:'来源型号分组（未全部独立核实）',verifiedModels:'型号有独立字段或厂家证据',brands:'来源品牌分组',price:'有可用来源档案价',units:'有来源销量',revenue:'有来源销售额',imageLinks:'图片链接（非全部内容核验）',modelIdentified:'来源标题有型号',parameters:'有来源标称参数',history:'有已保存月度资料的Listing',directCompetitors:'已确认直接竞品',latestDate:'最新来源日期',qualifiedFamilyMonths:'当前区间合格父体月份',queryPathsChecked:'本轮当前范围检索路径',queryPathsCompleted:'当前范围取完分页的路径',queryPagesUnfetched:'当前范围尚未采集页数',multipleBucketHistory:'有多月桶且超过一天记录的Listing',manufacturerReferenceProducts:'有厂家型号参考的Listing'};
  const pairs=Object.entries(a).filter(([k,v])=>!['country','platform','category','missing','gaps'].includes(k)&&typeof v!=='object');
  return extra+'<details class="panel coverage-monitor"><summary>样本覆盖与数据缺口</summary><p>只描述已收录样本；没有市场总体分母，不计算全市场覆盖率。型号组与Listing、父体月份不是同一种统计单位。</p><div class="table-scroll"><table><tbody>'+pairs.map(([k,v])=>'<tr><th>'+e(labels[k]||k)+'</th><td>'+e(v==null?'未知':v)+'</td></tr>').join('')+'</tbody></table></div><p>'+e((a.gaps||[]).join('；'))+'</p><a href="docs/system-audit-2026-11-06.md">查看审计说明</a></details>';
 }
 root.CoverageMonitor={render};
})(window);
