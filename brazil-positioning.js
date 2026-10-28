/* SKU positioning uses local evidence, never national share or an inferred score. */
const brSkuCategories={V500:'vacuum',V600:'vacuum',D500:'wash',D600:'wash',D800:'wash',Y100S:'fabric',Y200S:'fabric',M600:'mattress'};
let brCompareSku='D600',brCompareRelation='all';
const brCompareSelections={};
function brRelationType(relation){return relation.includes('替代')?'substitute':relation.includes('升级')?'upgrade':'direct';}
function brCatalog(){
 const groups=new Map();
 for(const p of brOfficialProfiles)groups.set(p.key,{key:p.key,brand:p.brand,model:p.model,category:p.category,relation:p.relation,official:p,rows:[]});
 for(const r of brRecords){
  const profile=brOfficialProfiles.find(p=>p.matches.includes(r.id));
  // ERG24 suffixes remain visible, grouped only for family observation.
  const key=profile?.key||(r.brand==='Electrolux'&&['ERG24N','ERG24C'].includes(r.model)?'electrolux-erg24':r.brand.toLowerCase()+'|'+r.model.toLowerCase());
  if(!groups.has(key))groups.set(key,{key,brand:r.brand,model:key==='electrolux-erg24'?'ERG24系列（N / C后缀待对齐）':r.model,category:r.category,relation:r.relation,official:null,rows:[]});
  groups.get(key).rows.push(r);
 }
 return [...groups.values()];
}
function brCompareCandidates(){return brCatalog().filter(g=>g.category===brSkuCategories[brCompareSku]&&(brCompareRelation==='all'||brRelationType(g.relation)===brCompareRelation)).sort((a,b)=>Number(!!b.official)-Number(!!a.official)||Number(brRelationType(a.relation)==='substitute')-Number(brRelationType(b.relation)==='substitute'));}
function brCompareSelected(){
 const choices=brCompareCandidates(),key=brCompareSku+'|'+brCompareRelation;
 const ids=brCompareSelections[key]??choices.slice(0,3).map(g=>g.key);
 return Array.from({length:3},(_,i)=>choices.find(g=>g.key===ids[i])||null);
}
function brCompareChange(index,id){const key=brCompareSku+'|'+brCompareRelation,ids=brCompareSelected().map(g=>g?.key||'');for(let i=0;i<ids.length;i++)if(i!==index&&ids[i]===id)ids[i]='';ids[index]=id;brCompareSelections[key]=ids;}
function brGroupFeatures(g){return g.official?.features||[...new Set(g.rows.map(r=>r.features))].join(' / ');}
function brGroupSource(g){return g.official?g.official.source:g.rows[0]?.source;}
function brOfficialOffer(p){if(!p?.offer)return '未取得展示价格';return `${brMoney(p.offer.amount)} · 官网展示快照（${p.checkedAt}）`;}
function brGroupConditions(g){return g.official?[g.official.voltage,g.official.availability,g.official.warranty||'售后待核',g.official.bundle||'套装待核'].map(s=>s.replace(/[。；]$/,'')).join('；'):g.rows.map(r=>`${brPlatforms[r.platform]}：${r.voltage}；${r.availability}`).join(' / ')+'；具体卖家、套装和售后待核';}
function brGroupDates(g){return [...new Set([g.official?.checkedAt,...g.rows.map(r=>r.checkedAt)].filter(Boolean))].sort().join(' / ');}
const brPositionAdvice={
 wash:{angle:'把清洁后的地面、边角处理和整机维护过程拍清楚，让顾客看到日常能省多少操作。',risk:'Arno已存在当地官网的无线洗地产品；不能把洗地功能或无线本身当作UWANT独有优势。',test:'D500 / D600 / D800分别确认巴西版本后，与同功能产品在同污渍、同地面、同清洁面积下比较；记录清洁结果、残水和维护时间。'},
 vacuum:{angle:'确认巴西供货套装后，展示一次完整清洁和倒尘流程；如含集尘底座，再解释免手动倒尘的实际价值。',risk:'当地已有无线二合一产品；有线低价机属于替代参照。底座、尘袋和附件不同，不能只比较裸机售价。',test:'核实V500 / V600巴西版本、底座及附件清单；同地面、同垃圾比较清洁效果、整机重量、续航条件和耗材成本。'},
 fabric:{angle:'用同一块布料上的真实污渍展示清洗、抽吸和清理机器的完整过程；蒸汽卖点须对应实际供货版本。',risk:'WAP已提供便携喷洗抽吸、自清洁喷嘴和厂家保修说明；仅强调能洗沙发不足以建立差异。',test:'确认Y100S / Y200S巴西版本后，对比残留污渍、抽吸残水、附件维护和滤网耗材；不能用输入功率直接证明吸力更强。'},
 mattress:{angle:'先解释何时需要床垫专用机，再用可复现的床垫除尘过程展示效果和滤网清理。',risk:'WAP当地产品已标称UV、振动和双重过滤；这些功能本身不能证明M600领先。',test:'核实M600巴西电压和标称功能，按相同床垫、面积与次数比较收集灰尘、清理滤网和握持体验；健康效果不从功能表推定。'}
};
function brCompareCell(g,kind){
 if(!g)return '<span class="br-muted">未选择</span>';
 const p=g.official;
 if(kind==='relation')return `<span class="br-status">${rdE(g.relation)}</span>`;
 if(kind==='status')return p?`官网商品正文已读<small>${p.checkedAt} · 平台记录另列</small>`:[...new Set(g.rows.map(r=>`${brEvidence[r.evidence]} · ${r.checkedAt}`))].map(rdE).join('<br>');
 if(kind==='features')return rdE(brGroupFeatures(g));
 if(kind==='price')return p?`${rdE(brOfficialOffer(p))}${p.offer?`<details class="br-detail"><summary>付款与适用条件</summary><p>${rdE(p.offer.conditions)}</p></details>`:'<small>官网暂未提供可读报价</small>'}`:'平台正式报价待核<small>索引参考价格不用于判定同价位</small>';
 if(kind==='conditions')return p?`${rdE(p.voltage)}<details class="br-detail"><summary>库存、套装与售后</summary><p>${rdE(p.availability)}</p><p>${rdE(p.bundle||'套装待核')}</p><p>${rdE(p.warranty||'售后待核')}</p></details>`:rdE(brGroupConditions(g));
 if(kind==='evidence')return `${p?brLink(p.source,'品牌当地官网')+'<small>'+p.checkedAt+' · 商品正文已读</small>':''}${g.rows.map(r=>`${brLink(r.source,brPlatforms[r.platform]+' · '+(r.productId||'列表线索'))}<small>${r.checkedAt} · ${brEvidence[r.evidence]}</small>`).join('')}`;
 if(kind==='question')return rdE(p?.question||[...new Set(g.rows.map(r=>r.note))].join(' / '));
 return '';
}
function brPositionView(){
 const choices=brCompareCandidates(),selected=brCompareSelected(),category=brSkuCategories[brCompareSku],advice=brPositionAdvice[category];
 const dims=[['relation','关系','巴西本地版本待确认'],['status','证据进度','巴西商品页尚未取得'],['features','功能依据','当地版本功能表待补；其他市场参数不自动适用于巴西。'],['price','价格与条件','巴西建议零售价、套装和到手价待定；暂不能判断同价位优势。'],['conditions','电压、库存、套装与售后','需确认巴西供货版本、当地库存与售后安排。'],['question','需要继续核实','同条件实测完成后，再确认性能优势与不足。'],['evidence','来源与核查日期','巴西商品页尚未取得。']];
 return `<section class="br-section br-position"><div class="br-section-heading"><div><h3>先选 UWANT，再看当地对手</h3><p class="br-muted">同屏最多三组竞品；跨平台同型号合并观察，版本差异保留在来源中。</p></div><button type="button" class="mi-button" id="br-compare-export">导出这组对照</button></div><div class="br-filters"><label>UWANT 型号<select id="br-compare-sku">${Object.entries(brSkuCategories).map(([s,c])=>`<option value="${s}" ${s===brCompareSku?'selected':''}>${s} · ${brCategories[c]}</option>`).join('')}</select></label><label>竞争关系<select id="br-compare-relation">${[['all','全部关系'],['direct','直接候选'],['upgrade','升级观察'],['substitute','替代产品']].map(([k,v])=>`<option value="${k}" ${k===brCompareRelation?'selected':''}>${v}</option>`).join('')}</select></label><span class="br-muted">可选 ${choices.length} 组 · 按产品用途匹配，关系尚待当地版本和价格确认</span></div><div class="br-compare-picks">${selected.map((g,i)=>`<label>竞品 ${i+1}<select id="br-compare-${i}" data-br-compare-slot="${i}"><option value="">不选择</option>${choices.map(c=>`<option value="${rdE(c.key)}" ${c.key===g?.key?'selected':''}>${rdE(c.brand+' '+c.model)}</option>`).join('')}</select></label>`).join('')}</div>${choices.length?'':'<p class="br-empty" role="status">这一关系下尚无对应的当地产品依据。可切回“全部关系”继续查看。</p>'}<div class="br-table br-comparison" tabindex="0" aria-label="横向滚动查看完整竞品对照"><table><caption>巴西 · ${brCategories[category]} · 参数为品牌 / 卖家标称，价格按各自核查日期展示</caption><thead><tr><th scope="col">比较项目</th><th scope="col" class="br-own">UWANT ${brCompareSku}</th>${selected.map(g=>`<th scope="col">${g?rdE(g.brand+' '+g.model):'未选择竞品'}</th>`).join('')}</tr></thead><tbody>${dims.map(([k,label,own])=>`<tr><th scope="row">${label}</th><td class="br-own">${own}</td>${selected.map(g=>`<td>${brCompareCell(g,k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section><section class="br-section"><h3>${brCompareSku} 的销售准备</h3><div class="br-position-notes"><article><span>可以先做</span><p>${advice.angle}</p></article><article><span>需要正面应对</span><p>${advice.risk}</p></article><article><span>用什么验证</span><p>${advice.test}</p></article></div><p class="br-muted">以上是销售假设与验证方向。巴西本地定价、完整套装与同条件测试尚不齐备，目前不能认定UWANT处于领先、性价比最高或已形成份额优势。</p></section><details class="br-section br-detail"><summary>四份当地官网补充依据 · ${brOfficialCheckedAt}</summary><p>官网补充与34条平台记录分开；不计入两平台前10。X-CLEAN 7为相对现有基准新增的核查型号，上市时间待核。</p>${brOfficialProfiles.map(p=>`<p><b>${rdE(p.brand+' '+p.model)}</b> · ${rdE(p.code)}<br>${brLink(p.source,'当地官网商品页')} · ${p.checkedAt}<br>${rdE(brOfficialOffer(p))}</p>`).join('')}</details>`;
}
function brPositionExportRows(){return [['国家','UWANT型号','品类','竞品品牌','竞品型号/观察系列','竞争关系','品牌或卖家标称功能','官网展示快照BRL（非实时到手价）','官网价格条件','电压/库存/套装/售后','官网来源','官网核查日期','平台来源与商品ID','平台核查日期','待核问题'],...brCompareSelected().filter(Boolean).map(g=>['br',brCompareSku,brCategories[g.category],g.brand,g.model,g.relation,brGroupFeatures(g),g.official?.offer?.amount??'',g.official?.offer?.conditions||'',brGroupConditions(g),g.official?.source||'',g.official?.checkedAt||'',g.rows.map(r=>`${brPlatforms[r.platform]} | ${r.productId||'列表'} | ${r.source}`).join('\n'),[...new Set(g.rows.map(r=>r.checkedAt))].join(' / '),g.official?.question||g.rows.map(r=>r.note).join(' / ')])];}
function brPositionWire(){
 document.querySelector('#br-compare-sku')?.addEventListener('change',e=>{brCompareSku=e.target.value;brCompareRelation='all';cpRefresh();});
 document.querySelector('#br-compare-relation')?.addEventListener('change',e=>{brCompareRelation=e.target.value;cpRefresh();});
 document.querySelectorAll('[data-br-compare-slot]').forEach(el=>el.addEventListener('change',e=>{brCompareChange(Number(el.dataset.brCompareSlot),e.target.value);cpRefresh();}));
 document.querySelector('#br-compare-export')?.addEventListener('click',brExport);
}
