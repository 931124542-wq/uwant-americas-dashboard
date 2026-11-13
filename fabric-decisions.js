/* Evidence-backed decision aid. Proposals do not change prices, campaigns or metric eligibility. */
(function(root){
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(v,c)=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:c}).format(v);
 function report(c,s){
  const C=root.ResearchContext,L=root.LocalProductContext,F=root.FabricResearch;
  const o=L.own(c,s),all=c.observed.filter(r=>!L.isOwn(r)),rows=all.map(r=>({r,match:C.comparison(r,o,'fabric')}));
  const direct=rows.filter(x=>x.match.group==='direct'),alternative=rows.filter(x=>x.match.group==='alternative'),adjacent=rows.filter(x=>x.match.group==='adjacent'),pending=rows.filter(x=>x.match.group==='pending');
  const unique=xs=>new Set(xs.map(x=>x.r.modelIdentity?.status==='confirmed'?x.r.modelIdentity.groupKey:x.r.id)).size;
  const pricing=direct.map(x=>({r:x.r,price:root.ProductEvidence.price(x.r,{...s,priceBasis:'public'})})).filter(x=>x.price);
  const sales=root.SampleSalesShares.report(root.REVIEW_DATA.history,s);
  const steamAsins=new Set(direct.filter(x=>x.r.fabricResearch?.segment==='steam').map(x=>x.r.productId));
  const steamFacts=sales.facts.filter(f=>f.asins.some(a=>steamAsins.has(a)));
  const known=r=>({productId:r.productId,name:C.name(r),sourceUrl:r.sourceUrl,features:L.features(r)});
  const n20=direct.find(x=>F.code(x.r)==='N20 STEAM'),bissell=direct.find(x=>['3618C','3618B'].includes(F.code(x.r)));
  const evidence=[],findings=[];
  if(s.own==='Y200S'&&!o.record){
   if(n20){
    const r=known(n20.r);evidence.push(r);
    findings.push({title:'蒸汽与软管冲洗不是独有卖点',text:'N20 Steam也有蒸汽抽洗、约35秒蒸汽准备和软管冲洗标称。Y200S应验证同条件清洁效果与收纳维护，不能只靠功能名称主张领先。',basis:[o.sourceId,r.sourceUrl]});
    findings.push({title:'自动配液仍有配置缺口',text:'N20 Steam有独立清洁液箱自动配比。Y200S内部资料未明确同类能力，暂不认定有或没有；本地样机需要验证配液步骤、耗材成本和清洁便利性。',basis:[o.sourceId,r.sourceUrl]});
    findings.push({title:'污水箱容量可以作为验证点',text:'内部Y200S标称1,400±100 mL，N20 Steam加拿大资料为0.75 L。只支持标称容量差异；需确认本地版本，再实测倒水次数与携带负担。',basis:[o.sourceId,r.sourceUrl]});
   }
   if(bissell){const r=known(bissell.r);evidence.push(r);findings.push({title:'多模式本身也有竞争',text:'HydroSteam有蒸汽与抽洗模式。不能用其带条件的干燥时间当烘干功能，也不能把普通ProHeat当成同配置蒸汽机。',basis:[o.sourceId,r.sourceUrl]});}
   if(s.country==='CA')findings.push({title:'配置表链接需重新对应',text:'内部Y200S配置表附的是普通Y200页面。全球官网另有Y200 Steam页面，但这仍不证明Y200S加拿大ASIN、版本或保修；上架前应按实物标签重新关联。',basis:[o.sourceId,'https://uwant.global/products/uwant-y200-steam-spot-cleaner']});
   findings.push({title:'当前不能确认价格优势',text:'Y200S当地准确版本、ASIN和可成交报价未闭合。内部价格表仅供定价讨论，不参与同价位差额、价格排名或销售份额。',basis:[o.sourceId]});
  }else findings.push({title:'逐项比较，保留来源差异',text:'按当前型号资料比较模式、容量、软管、刷头与保修；缺项不等于对手没有该功能。',basis:[o.sourceId]});
  const anchor=(root.AMAZON_RESEARCH?.anchors||[]).find(a=>a.country===s.country.toLowerCase()&&a.sku===s.own);
  const priceField=anchor?.fields?.find(f=>s.country==='CA'?/target MSRP/i.test(String(f.value)):/Self-operated Price/.test(f.label)&&typeof f.value==='number');
  const target=priceField?(typeof priceField.value==='number'?priceField.value:Number(String(priceField.value).match(/\d+(?:\.\d+)?/)?.[0])):null;
  const context=(root.UWANT_PRIVATE_CAPTURE?.operatingContext||[]).find(x=>x.country===s.country&&x.platform==='amazon');
  const operating=context&&['all','amazon'].includes(s.platform)?{
   seller:context.seller||'加拿大卖家（名称待确认）',platform:'Amazon',source:context.evidenceLabel,date:context.confirmedDate,
   status:context.stockStatus==='not_received'?'尚未收货':'卖家已确认；该SKU库存另行核实',sku:s.own,
   price:target?money(target,s.country==='CA'?'CAD':'MXN')+' · 内部'+(s.country==='CA'?'Best Buy渠道目标MSRP（非Amazon试价）':'价格表参考')+'，不是当地报价':'暂无可靠定价基准',
   action:context.stockStatus==='not_received'?'先核到货型号、电压、数量、套装及保修责任；准备对应商品链接和蒸汽/普通抽洗演示，收到货并可售后再安排广告。':'先把'+s.own+'实物标签、当地ASIN与套装对应，再由卖家确认可售库存、售价、优惠和退货责任；版本未确认前不借用其他UWANT链接投放。',
   validation:context.stockStatus==='not_received'?'以入库签收、可售库存、商品链接版本和售后责任确认作为上架条件；不把计划发货当零售销量。':'到货和版本确认后，固定流量结构，以清洁演示与容量说明分别试验；记录日期、净售价、广告、订单、退货与贡献毛利，避免价格和素材同时改动。',
   priceGate:'内部价格日期未提供，不能回答“比同功能竞品贵多少”。取得同渠道近期报价及成本底线后再确定试价；不自动改价或执行促销。',
   priceSource:anchor?.sourceId||null,priceSourceDate:anchor?.date||null,authorization:'卖家身份不代表代理授权，未补造代理名称。',evidence:context.evidenceReference
  }:null;
  return {country:s.country,own:s.own,direct:direct.map(x=>x.r),alternative:alternative.map(x=>x.r),adjacent:adjacent.map(x=>x.r),pending:pending.map(x=>x.r),directModels:unique(direct),prices:pricing,findings,evidence,sales:{familyMonths:sales.facts.length,parents:sales.parents,steamFamilyMonths:steamFacts.length,scope:sales.scope},operating};
 }
 function render(c,s){
  if(s.category!=='fabric')return '';
  const d=report(c,s),e=escape,C=root.ResearchContext;
  const links=d.evidence.map(r=>`<a href="${e(r.sourceUrl)}" target="_blank" rel="noopener">${e(r.name)} · 配置依据 ↗</a>`).join(' · ');
  const op=d.operating,primaryTitles=['当前不能确认价格优势','蒸汽与软管冲洗不是独有卖点','污水箱容量可以作为验证点'],primary=d.findings.filter(f=>primaryTitles.includes(f.title)),secondary=d.findings.filter(f=>!primary.includes(f)),item=f=>`<div><dt>${e(f.title)}</dt><dd>${e(f.text)}<details><summary>判断依据</summary>${f.basis.map(x=>/^https?:/.test(x)?`<a href="${e(x)}" target="_blank" rel="noopener">型号来源 ↗</a>`:`<span>${e(x)} · 内部配置，非当地销售认证</span>`).join('<br>')}</details></dd></div>`;
  return `<section class="wb-actions fabric-decisions" aria-label="布艺机市场分析"><h2>${e(s.own)} · 竞争位置与销售准备</h2><button class="rq-button" data-fabric-decision-export>导出判断及行动依据</button><p>${d.direct.length}条同功能商品资料 / ${d.directModels}个确认型号组；${d.alternative.length}条便携抽洗替代。各组不混算价格定位。</p><dl>${(primary.length?primary:d.findings).map(item).join('')}</dl>${primary.length&&secondary.length?`<details><summary>自动配液、清洁模式与型号依据</summary><dl>${secondary.map(item).join('')}</dl></details>`:''}${links?`<p class="wb-mobile-hint">${links}</p>`:''}<p class="wb-empty">销售表现：所选期间可统计${d.sales.familyMonths}个商品组月份、${d.sales.parents||0}个商品组；其中同功能蒸汽组${d.sales.steamFamilyMonths}个商品组月份。${d.sales.steamFamilyMonths===0?'当前不能判断蒸汽细分市场的品牌销售占比。':'仅代表已核分组的第三方估算样本。'}</p>${op?`<div class="fabric-operating" data-operating-country="${e(s.country)}"><h3>${e(op.seller)} · ${e(op.platform)}${s.country==='CA'?'加拿大':'墨西哥'}</h3><p><strong>${e(op.status)}</strong> · ${e(op.source)}（${e(op.date)}）</p><dl><div><dt>产品及价格讨论</dt><dd>${e(op.sku)} · ${e(op.price)}<br>${e(op.priceGate)}</dd></div><div><dt>下一步动作</dt><dd>${e(op.action)}</dd></div><div><dt>如何验收</dt><dd>${e(op.validation)}</dd></div></dl><details><summary>卖家依据与责任边界</summary><p>${e(op.authorization)} ${e(op.evidence)}</p></details></div>`:''}</section>`;
 }
 function csv(c,s){const d=report(c,s);return [['recordType','country','platform','sku','topic','statement','basis','status'],...d.findings.map(f=>['decision',s.country,s.platform,s.own,f.title,f.text,JSON.stringify(f.basis),'研究判断；未执行']),...(d.operating?[['operating_context',s.country,'amazon',s.own,d.operating.seller,d.operating.status,d.operating.source+' / '+d.operating.date,'用户确认；非代理认证'],['operating_proposal',s.country,'amazon',s.own,d.operating.price,d.operating.action+' '+d.operating.validation,JSON.stringify({limitations:d.operating.priceGate,priceSource:d.operating.priceSource,priceSourceDate:d.operating.priceSourceDate}),'建议；未执行']]:[])];}
 root.FabricDecisions={report,render,csv};
})(typeof window==='undefined'?globalThis:window);
