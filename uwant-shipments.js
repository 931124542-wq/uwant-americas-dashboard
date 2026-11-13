/* Personal-browser shipment aggregates. No network or bundled business records. */
(function(root){
 const fields=['recordId','country','platform','category','month','sku','shippedUnits','source','dataNature','coverageStatus'];
 const countries=['MX','CA','US','BR','AR','CL','CO'],platforms=['amazon','ml','bestbuy','official','retail','all'],categories=['wash','vacuum','fabric','mattress'];
 const month=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(v),currentMonth=()=>new Date().toISOString().slice(0,7),key='uwant.personal.shipments.v1';
 const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),n=x=>new Intl.NumberFormat('zh-CN').format(x);
 function parseCSV(text,customFields){
  const required=customFields||fields;
  if(typeof text!=='string'||text.length>5000000)throw Error('请选择5MB以内的CSV月度汇总表。');
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
   else if(c==='"'){if(cell||closed)throw Error('CSV引号格式错误。');quoted=true;}
   else if(c===','){row.push(cell);cell='';closed=false;}
   else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';closed=false;}
   else{if(closed)throw Error('CSV引号后只能接逗号或换行。');cell+=c;}}
  if(quoted)throw Error('CSV引号未闭合。');if(cell||row.length){row.push(cell);if(row.some(v=>v.trim()))rows.push(row);}
  const header=rows.shift()?.map(x=>x.trim());if(!header||new Set(header).size!==header.length||required.some(f=>!header.includes(f)))throw Error('缺少必需字段，请使用出货模板。');
  if(!rows.length)throw Error('模板尚无出货记录。');if(rows.length>20000)throw Error('单次最多导入20,000条月度型号汇总。');
  const mapped=rows.map((r,i)=>{if(r.length!==header.length)throw Error('第'+(i+2)+'行列数不匹配。');return Object.fromEntries(required.map(f=>[f,r[header.indexOf(f)]]));});return customFields?mapped:validate(mapped);
 }
 function validate(input){
  if(!Array.isArray(input)||!input.length||input.length>20000)throw Error('出货记录为空或超过单次限制。');
  const rows=[],ids=new Map(),cells=new Set(),scope=new Map();let duplicates=0;
  for(const [i,raw]of input.entries()){
   const r=Object.fromEntries(fields.map(f=>[f,String(raw[f]??'').trim()]));
   if(!r.recordId||r.recordId.length>120||!countries.includes(r.country)||!platforms.includes(r.platform)||!categories.includes(r.category)||!month(r.month)||r.month>currentMonth()||!r.sku||r.sku.length>80||!r.source||r.source.length>500||r.dataNature!=='actual'||!['complete','partial','unknown'].includes(r.coverageStatus)||!/^\d+$/.test(r.shippedUnits)||!Number.isSafeInteger(Number(r.shippedUnits)))throw Error('第'+(i+2)+'行字段无效；仅接收已发生的实际出货月度汇总，未知数量不能填0。');
   r.shippedUnits=Number(r.shippedUnits);const encoded=JSON.stringify(r);
   if(ids.has(r.recordId)){if(ids.get(r.recordId)!==encoded)throw Error('同一recordId有冲突：'+r.recordId);duplicates++;continue;}ids.set(r.recordId,encoded);
   const cell=[r.country,r.platform,r.category,r.month,r.sku.toUpperCase()].join('|');if(cells.has(cell))throw Error('同国家、平台、品类、月份、型号只能保留一条汇总；不可重复计算。');cells.add(cell);
   const group=[r.country,r.category,r.month].join('|');if(!scope.has(group))scope.set(group,new Set());scope.get(group).add(r.platform);rows.push(r);
  }
  for(const ps of scope.values())if(ps.has('all')&&ps.size>1)throw Error('同月不可同时导入全渠道合计和分渠道汇总，避免重复出货。');
  if(!Number.isSafeInteger(rows.reduce((v,r)=>v+r.shippedUnits,0)))throw Error('出货量超出安全数值范围。');
  return {rows,duplicates};
 }
 function report(rows,s){
  const scoped=rows.filter(r=>r.country===s.country&&r.category===s.category&&(s.platform==='all'||r.platform===s.platform)),available=[...new Set(scoped.map(r=>r.month))].sort(),last=available.at(-1)||'',start=month(s.shipmentStartMonth)?s.shipmentStartMonth:last,end=month(s.shipmentEndMonth)?s.shipmentEndMonth:start;
  const [lo,hi]=[start,end].sort(),selected=scoped.filter(r=>r.month>=lo&&r.month<=hi),groups=new Map(),months=new Set(selected.map(r=>r.month));
  for(const r of selected){const sku=r.sku.toUpperCase();groups.set(sku,(groups.get(sku)||0)+r.shippedUnits);}
  const total=selected.length?selected.reduce((v,r)=>v+r.shippedUnits,0):null,expected=lo&&hi?(Number(hi.slice(0,4))-Number(lo.slice(0,4)))*12+Number(hi.slice(5))-Number(lo.slice(5))+1:0;
  return {selected,available,start:lo,end:hi,total,groups:[...groups].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label)),months:months.size,expected,partial:selected.some(r=>r.coverageStatus!=='complete'||r.month===currentMonth())||months.size<expected};
 }
 let memory=[],loaded=false,storageError='';
 function load(){if(loaded)return memory;loaded=true;try{const text=root.localStorage?.getItem(key);if(text)memory=validate(JSON.parse(text)).rows;}catch(_){storageError='本机记录无法读取或未通过校验，请重新导入。';}return memory;}
 function save(rows){const checked=validate(rows);try{root.localStorage.setItem(key,JSON.stringify(checked.rows));storageError='';}catch(_){storageError='浏览器未允许保存；本次仅在当前页面内存中使用，刷新会丢失。';}memory=checked.rows;loaded=true;}
 function admin(){load();return '<section class="panel shipment-admin"><h2>UWANT出货数据 · 仅本机</h2><p>导入每个国家、渠道、品类、自然月、型号的一条实际出货汇总。记录只保存在当前浏览器，不会上传到网站或公开仓库。</p><div class="shipment-admin-tools"><button class="rq-button" data-shipment-template>下载CSV模板</button><label class="shipment-file">导入并替换本机出货库<input data-shipment-import type="file" accept=".csv,text/csv"></label><button class="rq-button" data-shipment-backup '+(!memory.length?'disabled':'')+'>导出本机备份</button><button class="rq-button" data-shipment-clear>清除本机出货库</button></div><p role="status" data-shipment-status>'+e(storageError||('本机已保存 '+memory.length+'条出货月度汇总。'))+'</p><details><summary>填写说明与字段</summary><p>shippedUnits为已发生的出货台数；dataNature必须为actual。coverageStatus填写complete、partial或unknown，保留来源覆盖状态。source填写出货台账或报表编号；不使用订单预测、库存、销售估算代替出货。country用MX/CA/US/BR/AR/CL/CO，platform用amazon/ml/bestbuy/official/retail/all，category用wash/vacuum/fabric/mattress，month格式YYYY-MM。all为全渠道合计，只在全部渠道范围显示，不能同时导入重叠的分渠道合计。月份缺失不补零，数量未知的记录不导入。</p></details></section>';}
 function panel(s){const r=report(load(),s),options=value=>[...new Set([...r.available,value].filter(Boolean))].sort().map(m=>'<option '+(m===value?'selected':'')+'>'+m+(r.available.includes(m)?'':' · 无记录')+'</option>').join('');return '<section class="shipment-overview"><div class="market-section-heading"><h3>UWANT出货占比</h3><span class="market-period-tag">实际数据 · 仅此浏览器</span></div>'+(r.available.length?'<div class="shipment-period"><label>起始月<select data-shipment-start>'+options(r.start)+'</select></label><label>截止月<select data-shipment-end>'+options(r.end)+'</select></label><button class="rq-button" data-shipment-export>导出本期</button></div><p class="shipment-scope">'+r.start+'—'+r.end+' · '+r.months+'/'+r.expected+'月有记录'+(r.partial?' · 存在部分或未知覆盖':' · 来源标记完整')+'</p>'+(r.total>0?root.MarketShareChart.render(r.groups,r.total,{center:'合计 / 台',metric:'出货',unit:'台',className:'shipment-share-visual'}):'<p class="market-chart-empty">'+(r.total===0?'已导入实际出货为0，无法计算占比。':'所选月份没有出货记录。')+'</p>')+'<p class="market-chart-foot">型号占比 = 该型号已导入出货量 ÷ 当前范围已导入出货量。与平台样本市占分别计算。</p>':'<p class="shipment-empty">尚未导入出货数据。</p><button class="rq-button" data-shipment-manage>导入实际出货数据 →</button>')+'</section>';}
 function mount(s,change,download){
  if(root.ResearchDataAdmin?.isRoute(s)){const adminRoot=document.querySelector('.research-data-admin');if(!adminRoot||adminRoot.querySelector('.shipment-admin'))return;adminRoot.insertAdjacentHTML('beforeend',admin());const status=adminRoot.querySelector('[data-shipment-status]');adminRoot.querySelector('[data-shipment-template]').onclick=()=>download([fields],'UWANT_shipment_monthly_template.csv');adminRoot.querySelector('[data-shipment-backup]').onclick=()=>download([fields,...load().map(r=>fields.map(f=>r[f]))],'UWANT_shipments_local_backup.csv');adminRoot.querySelector('[data-shipment-clear]').onclick=()=>{try{root.localStorage.removeItem(key);memory=[];loaded=true;storageError='';status.textContent='已清除当前浏览器出货库。';adminRoot.querySelector('[data-shipment-backup]').disabled=true;}catch(_){status.textContent='浏览器拒绝清除，原记录保留。';}};adminRoot.querySelector('[data-shipment-import]').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('请选择5MB以内的CSV。');const parsed=parseCSV(await file.text());save(parsed.rows);status.textContent='已接入 '+parsed.rows.length+'条，重复去除 '+parsed.duplicates+'条。'+(storageError||'已保存到当前浏览器。');adminRoot.querySelector('[data-shipment-backup]').disabled=false;}catch(error){status.textContent=error.message+' 原本机记录保留。';}ev.target.value='';};return;}
  if(s.page!=='market'||s.view!=='overview')return;
  const ownSection=[...document.querySelectorAll('.market-block')].find(el=>el.querySelector('.market-block-heading h2')?.textContent==='UWANT对标');if(!ownSection||ownSection.querySelector('.shipment-overview'))return;ownSection.insertAdjacentHTML('beforeend',panel(s));const el=ownSection.querySelector('.shipment-overview');el.querySelector('[data-shipment-manage]')?.addEventListener('click',()=>change({page:'market',view:'data'}));const update=()=>change({shipmentStartMonth:el.querySelector('[data-shipment-start]').value,shipmentEndMonth:el.querySelector('[data-shipment-end]').value});el.querySelector('[data-shipment-start]')?.addEventListener('change',update);el.querySelector('[data-shipment-end]')?.addEventListener('change',update);el.querySelector('[data-shipment-export]')?.addEventListener('click',()=>{const r=report(load(),s);download([fields,...r.selected.map(x=>fields.map(f=>x[f]))],'UWANT_shipment_'+s.country+'_'+s.category+'_'+r.start+'_'+r.end+'.csv');});
 }
 root.addEventListener?.('storage',ev=>{if(ev.key===key||ev.key===null){loaded=false;memory=[];root.render?.();}});
 root.UwantShipments={fields,parseCSV,validate,report,mount,load,storageKey:key};if(typeof module!=='undefined')module.exports=root.UwantShipments;
})(typeof window==='undefined'?globalThis:window);
