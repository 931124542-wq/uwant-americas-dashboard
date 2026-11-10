/* Keep Mercado research in the established market workspace and navigation. */
(function(root){
 const original=root.Mercado.render,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=x=>x==null?'未取得':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x),cats={wash:'洗地机',vacuum:'吸尘器',fabric:'布艺清洗机',mattress:'除螨仪'};
 function block(number,title,button=''){const section=document.createElement('section');section.className='market-block';section.innerHTML='<div class="market-block-heading"><span>'+number+'</span><h2>'+title+'</h2>'+button+'</div>';return section;}
 const route=(view,label)=>'<button class="rq-button" data-ml-route="'+view+'">'+label+'</button>';
 function arrange(s,change){
  const host=document.getElementById('research-evidence'),workspace=host.querySelector('.ml-workbench');if(!workspace)return;
  const data=root.MERCADO_DATA,all=root.Mercado.rows(s),report=root.Mercado.report(s),currency=all[0]?.currency||'',panels=[...workspace.querySelectorAll(':scope > .panel')],catalog=panels.find(x=>x.querySelector('h2')?.textContent.startsWith('商品列表')),history=panels.find(x=>x.querySelector('h2')?.textContent==='商品月度销量'),shares=workspace.querySelector('.ml-two'),kpis=workspace.querySelector('.ml-kpis'),summary=workspace.querySelector('.ml-summary'),notes=workspace.querySelector('.ml-data-details'),comparison=workspace.querySelector('.ml-comparison'),coverage=workspace.querySelector('.coverage-monitor'),sourceEvidence=workspace.querySelector('.private-research-evidence'),detail=workspace.querySelector('[data-ml-detail]');
  const choices=root.MarketWorkbench.choices[s.category]||[];if(!choices.includes(s.own))s.own=choices[0];
  const own=document.querySelector('.filters [data-wb-own]');own.closest('label').hidden=false;own.innerHTML=choices.map(x=>'<option '+(x===s.own?'selected':'')+'>'+esc(x)+'</option>').join('');own.onchange=e=>change({own:e.target.value});
  const dates=history?.querySelector('.ml-controls');const dateBox=document.getElementById('month-range-controls');dateBox.replaceChildren();if(dates){dates.classList.add('ml-global-months');dateBox.append(dates);dates.insertAdjacentHTML('beforeend','<small>月份用于历史；近30天快照单列</small>');}
  const title=s.page==='brands'?'品牌分析':s.page==='competitors'?'UWANT竞品对比':({products:'商品研究',monthly:'商品月度历史',macro:'市场大盘',pricing:'价格带',research:'数据与待核',coverage:'数据覆盖'})[s.view]||'市场总览';
  document.getElementById('title').textContent=title;document.getElementById('crumb').textContent=title;document.title=title+' · UWANT';
  document.getElementById('scope-toggle').innerHTML='<span>'+esc(root.ResearchModel.countries[s.country].name)+' / Mercado Libre / '+cats[s.category]+'<small>'+esc(s.startMonth?s.startMonth+'—'+s.endMonth:s.dataset)+' · UWANT '+esc(s.own)+'</small></span><b>筛选⌄</b>';
  document.getElementById('scope').innerHTML='<div class="scope-period"><span>'+esc(root.ResearchModel.countries[s.country].name)+' / Mercado Libre / '+cats[s.category]+' · '+esc(currency)+'</span><small>近30天来源快照 '+esc(data.researchSnapshot||data.asOf)+'；商品历史按所选月份展示</small></div>';
  const overview=s.page==='market'&&s.view==='overview',product=s.page==='market'&&s.view==='products',brand=s.page==='brands',compare=s.page==='competitors',monthly=s.page==='market'&&s.view==='monthly';
  // Retain the original controls and listeners; move each module into its proper route.
  workspace.replaceChildren();
  if(overview){
   const first=block('01','市场大盘',route('macro','类目与来源'));if(summary){summary.textContent='美客多已采集样本，非完整市场；近30天快照与自然月历史分列。';first.append(summary);}if(kpis)first.append(kpis);
   first.insertAdjacentHTML('beforeend','<div class="market-inline-links">'+route('monthly','查看商品月度历史 →')+'</div>');
   const second=block('02','品牌与价格带','<button class="rq-button" data-ml-page="brands">品牌分析 →</button>');if(shares)second.append(shares);second.insertAdjacentHTML('beforeend','<div class="market-inline-links">'+route('pricing','产品价格分布 →')+route('products','品牌与产品覆盖 →')+'</div>');if(detail)second.append(detail);
   const third=block('03','UWANT对标','<button class="rq-button" data-ml-page="competitors">查看对标 →</button>');const ownRows=all.filter(r=>/uwant/i.test(r.brand_label||'')&&String(r.product_name).toLowerCase().includes(String(s.own).toLowerCase()));third.innerHTML+='<div class="wb-own"><div class="wb-own-main"><div><div class="wb-target">UWANT 对标<strong>'+esc(s.own)+'</strong></div><p>'+(ownRows.length?'有'+ownRows.length+'条当地来源线索，型号、电压及套装仍需核验。':'尚无已核实的本国美客多同型号报价，暂不计算价格优势。')+'</p></div></div></div>';
   const fourth=block('04','经营判断');fourth.classList.add('market-decisions');fourth.innerHTML+='<dl><div><dt>价格研究</dt><dd>按本币档案价查看同类型商品，核对功能后再判断价格位置。 '+route('pricing','价格带 →')+'</dd></div><div><dt>销售证据</dt><dd>'+report.all.length+'件商品有当前快照估算；月度历史另行查看。 '+route('monthly','历史与覆盖 →')+'</dd></div><div><dt>UWANT行动</dt><dd>核对当地版本、配置和套装，保留未知项。 <button data-ml-page="competitors">查看对标 →</button></dd></div></dl>';
   workspace.append(first,second,third,fourth);
  }else if(product||compare){
   if(compare&&comparison)workspace.append(comparison);if(catalog)workspace.append(catalog);if(product&&comparison)workspace.append(comparison);
  }else if(brand){
   const section=block('','品牌销售样本与覆盖');if(shares)section.append(shares);
   section.insertAdjacentHTML('beforeend','<div class="table-scroll"><table class="market-brand-performance"><thead><tr><th>品牌</th><th>商品覆盖</th><th>参与统计商品</th><th>近30天样本估算 / '+(s.shareMetric==='units'?'台':esc(currency))+'</th><th></th></tr></thead><tbody>'+report.brands.map(([name,value])=>'<tr><th>'+esc(name)+'</th><td>'+all.filter(r=>(r.brandGroup||r.brand_label||'未识别品牌')===name).length+'条Listing</td><td>'+report.all.filter(r=>(r.brandGroup||r.brand_label||'未识别品牌')===name).length+'</td><td>'+fmt(value)+'</td><td><button data-ml-brand="'+esc(name)+'">产品 →</button></td></tr>').join('')+'</tbody></table></div>');workspace.append(section);
  }else if(monthly){if(history)workspace.append(history);if(detail)workspace.append(detail);workspace.insertAdjacentHTML('afterbegin','<div class="market-inline-links">'+route('overview','返回市场总览 →')+route('products','商品研究 →')+'</div>');
  }else if(s.view==='pricing'){const section=block('','品牌与价格带',route('overview','返回市场总览'));if(shares)section.append(shares);if(detail)section.append(detail);workspace.append(section);
  }else{const section=block('','类目与来源',route('overview','返回市场总览'));if(summary)section.append(summary);section.insertAdjacentHTML('beforeend','<p>销量及销售额为第三方估算；近30天快照与自然月记录分别展示。当前样本不代表完整市场。</p>');workspace.append(section);}
  // Collection reports and audits are rendered only at the data-management route.
  if(!host.querySelector('[data-ml-detail]')){const d=document.createElement('div');d.setAttribute('data-ml-detail','');workspace.append(d);}
  host.querySelectorAll('[data-ml-route]').forEach(b=>b.onclick=()=>change({page:'market',view:b.dataset.mlRoute}));host.querySelectorAll('[data-ml-page]').forEach(b=>b.onclick=()=>change({page:b.dataset.mlPage,view:'overview'}));
  host.querySelectorAll('[data-ml-brand]').forEach(b=>b.onclick=()=>change({page:'market',view:'products',evidenceBrand:b.dataset.mlBrand,evidencePage:'0'}));
 }
 root.Mercado.render=function(s,change,download){original(s,change,download);arrange(s,change);};
})(window);
