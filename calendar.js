let calendarYear='2026',calendarPeriod='upcoming',calendarKind='all',calendarState='all',calendarSearch='';
const calendarKindLabels={promo:'促销 / 零售节点',national:'全国 / 联邦假日',regional:'地方日期',admin:'行政 / 特定非工作日',bank:'银行行业',cultural:'文化 / 消费节日',context:'情境观察',seasonal:'季节窗口',deadline:'报名 / 入仓节点'};
const calendarStateLabels={official:'官方日期',calendar:'日历锚点',pending:'日期待核',conflict:'待核 · 存在差异'};
const calendarGroups={all:null,promo:['promo','deadline'],holiday:['national','regional','admin','bank'],culture:['cultural','context'],season:['seasonal']};
function calEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function calToday(country=market){const zones={mx:'America/Mexico_City',ca:'America/Toronto',ar:'America/Argentina/Buenos_Aires',br:'America/Sao_Paulo',us:'America/New_York'};return new Intl.DateTimeFormat('en-CA',{timeZone:zones[country]||'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function calDate(v){if(!v)return '待核验';return Number(v.slice(5,7))+'月'+Number(v.slice(8,10))+'日';}
function calRange(e){if(!e.start)return '日期未填';return calDate(e.start)+(e.end!==e.start?' — '+calDate(e.end):'');}
function calStatus(e){return '<span class="tag cal-state-'+e.dateState+'">'+calendarStateLabels[e.dateState]+'</span>';}
function calSort(a,b){return (a.start||'9999').localeCompare(b.start||'9999')||a.name.localeCompare(b.name);}
function calendarAnnual(){return promotionCalendar.filter(e=>e.market===market&&String(e.year)===calendarYear).sort(calSort);}
function calendarFiltered(ignorePeriod=false){
  return calendarAnnual().filter(e=>{
    if(calendarPlatform!=='all'&&!e.platforms.includes('all')&&!e.platforms.includes(calendarPlatform))return false;
    if(calendarGroups[calendarKind]&&!calendarGroups[calendarKind].includes(e.kind))return false;
    if(calendarState!=='all'&&e.dateState!==calendarState)return false;
    const text=[e.name,e.scope,e.platform,e.note,calendarKindLabels[e.kind]].join(' ').toLowerCase();
    if(calendarSearch&&!text.includes(calendarSearch.toLowerCase()))return false;
    if(ignorePeriod||!e.start||calendarPeriod==='all')return true;
    if(calendarPeriod==='upcoming')return e.end>=calToday();
    const month=Number(calendarPeriod);
    return Number(e.start.slice(5,7))<=month&&Number(e.end.slice(5,7))>=month;
  });
}
function calSourceLinks(e){return e.sources.map(k=>sourceLink(calendarSources[k].url,calEscape(calendarSources[k].title))).join('');}
function validateCalendar(){
  const errors=[],ids=new Set(),validKinds=Object.keys(calendarKindLabels);
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(localDate(s).getTime())&&localDate(s).toISOString().slice(0,10)===s;
  for(const e of promotionCalendar){
    if(ids.has(e.id))errors.push('重复节点 '+e.id);ids.add(e.id);
    if(!validKinds.includes(e.kind)||!calendarStateLabels[e.dateState])errors.push('类型或状态无效 '+e.id);
    if(['pending','conflict'].includes(e.dateState)){
      if(e.start!==null||e.end!==null)errors.push('待核项目携带精确日期 '+e.id);
    }else if(!validDate(e.start)||!validDate(e.end)||e.end<e.start||Number(e.start.slice(0,4))!==e.year||Number(e.end.slice(0,4))!==e.year){
      errors.push('日期格式或年份无效 '+e.id);
    }
    for(const v of [e.commemorative,e.observed])if(v&&!validDate(v))errors.push('纪念或补休日无效 '+e.id);
    if(!e.sources?.length||e.sources.some(k=>!calendarSources[k]||!calendarSources[k].url.startsWith('https://')))errors.push('来源缺失 '+e.id);
  }
  for(const [m,c] of Object.entries(holidayCoverage)){
    const actual=promotionCalendar.filter(e=>e.market===m&&e.year===2026&&e.kind==='national').map(e=>e.start);
    for(const d of c.expected)if(!actual.includes(d))errors.push(m+'假日基线遗漏 '+d);
    for(const d of actual)if(!c.expected.includes(d))errors.push(m+'假日基线有未核日期 '+d);
  }
  return errors;
}
const calendarValidationErrors=validateCalendar();
function calendarMonthGrid(){
  const list=calendarFiltered(true).filter(e=>e.start);
  return '<div class="annual-months" role="group" aria-label="按月查看已核日期">'+Array.from({length:12},(_,i)=>{
    const key=String(i+1).padStart(2,'0');
    const rows=list.filter(e=>e.start.slice(5,7)<=key&&e.end.slice(5,7)>=key);
    const major=rows.filter(e=>e.importance==='major').sort(calSort);
    const peek=(major.length?major:rows).slice(0,2);
    return '<button class="month-tile '+(calendarPeriod===key?'month-active':'')+'" data-calendar-month="'+key+'" aria-pressed="'+(calendarPeriod===key)+'"><div class="month-tile-head"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+rows.length+'项</span></div><div class="month-peek">'+(peek.map(e=>'<span class="'+(e.kind==='promo'?'peek-promo':'')+'">'+calEscape(e.name.split(' · ')[0])+'</span>').join('')||'<span class="month-none">暂无已核日期</span>')+'</div>'+(rows.length>2?'<small>另有 '+(rows.length-2)+' 项</small>':'')+'</button>';
  }).join('')+'</div>';
}
function calendarCoveragePanel(){
  if(calendarYear!=='2026')return '<div class="notice">2027为下一年度活动预备清单。这里尚未核验2027全年假日基线，活动期不沿用2026；日期为空的项目不生成倒计时。</div>';
  const c=holidayCoverage[market],found=calendarAnnual().filter(e=>e.kind==='national'),n=c.expected.filter(d=>found.some(e=>e.start===d)).length;
  return '<div class="cal-coverage"><div><span class="cal-small-label">ANNUAL BASELINE</span><h3>'+c.label+' <span>'+n+' / '+c.expected.length+'</span></h3><p>'+calEscape(c.note)+'</p></div><div class="cal-coverage-side">'+sourceLink(calendarSources[c.source].url,'查看基线来源')+'<small>仅表示这份全国 / 联邦基线已逐日核对</small></div></div><div class="cal-boundary"><b>继续核查的范围</b><span>'+calEscape(c.remaining)+'</span></div>';
}
function calendarTable(list){
  if(!list.length)return '<div class="cal-empty">当前筛选没有已核日期。可切换全年、其他类型或查看下方待核清单。</div>';
  return '<div class="table-wrap"><table class="annual-table"><thead><tr><th>节点与适用范围</th><th>当地日期</th><th>类型</th><th>渠道</th><th>日期状态</th><th>依据</th></tr></thead><tbody>'+list.map(e=>{
    const auxiliary=e.commemorative?'<small>纪念日 '+calDate(e.commemorative)+'</small>':e.observed?'<small>联邦休假 '+calDate(e.observed)+'</small>':'';
    return '<tr class="'+(e.id===selectedEvent?'selected-row':'')+'"><td><strong>'+calEscape(e.name)+'</strong><small>'+calEscape(e.scope)+'</small></td><td><b>'+calRange(e)+'</b>'+auxiliary+'</td><td>'+calendarKindLabels[e.kind]+'</td><td>'+calEscape(e.platform)+'</td><td>'+calStatus(e)+'</td><td><button class="link-button" data-event="'+e.id+'" aria-label="查看'+calEscape(e.name)+'的依据">查看 ↗</button></td></tr>';
  }).join('')+'</tbody></table></div>';
}
function calendarPending(list){
  if(!list.length)return '<div class="cal-pending-summary">当前筛选没有日期待核项目。此提示不代表平台后续不会发布新活动。</div>';
  return '<details class="cal-pending"><summary><span><i></i>日期待核清单</span><b>'+list.length+'项</b><small>保留空日期，核实后再排期</small></summary><div class="cal-pending-grid">'+list.map(e=>'<article class="'+(e.id===selectedEvent?'pending-selected':'')+'"><div>'+calStatus(e)+'<small>'+calEscape(e.platform)+'</small></div><h3>'+calEscape(e.name)+'</h3><p>'+calEscape(e.note||'尚未取得当年本国平台的完整活动期。')+'</p><button class="link-button" data-event="'+e.id+'">查看核验要求 ↗</button></article>').join('')+'</div></details>';
}
function calendarRecheckPanel(){
  const notes=calendarYear==='2026'?calendarAuditNotes.filter(e=>e.market===market):[];
  return panel('核查记录与复核规则','日期依据、适用市场与准备建议分别记录。','<div class="cal-audit-records">'+notes.map(n=>'<article><span class="cal-audit-dot"></span><div><h3>'+calEscape(n.title)+'</h3><p>'+calEscape(n.detail)+'</p><div class="cal-inline-sources">'+n.sources.map(k=>sourceLink(calendarSources[k].url,calEscape(calendarSources[k].title))).join('')+'</div></div></article>').join('')+'</div><div class="cal-review-rules"><div><b>1. 核对国家与年份</b><p>以正文适用市场和当年公告为准；同一论坛帖跨站显示不改变适用国家。</p></div><div><b>2. 确认窗口与资格</b><p>节日、平台全期、报名、入仓和物流截止分别核查；未确认项保持空日期。</p></div><div><b>3. 排期前再次复核</b><p>活动前30日、14日、3日建议复核公告和后台变化；目前未启用自动同步或提醒。</p></div></div><div class="sub section-gap">节日日历为经营分析提供时间背景。策略仍需同市场、同平台、同统计期的销售、广告、库存和利润证据，不凭节日名称直接加预算。</div>');
}
eventDetail=function(e){
  const pending=!e.start,officialPromo=e.kind==='promo'&&e.dateState==='official';
  const dateBody=pending?'精确日期待核验':e.start+(e.end!==e.start?' — '+e.end:'');
  let work='';
  if(officialPromo){
    const steps=[[-30,'备货与利润','核对运输与入仓周期、可售库存、主推候选及贡献利润底线。'],[-14,'平台资格与页面','核对报名与资源位、优惠叠加、商品页、评价和实际渠道条件。'],[-7,'价格与广告检查','确认到手价、SKU库存、素材、关键词和测试预算。'],[0,'活动监控','按本地活动期记录销售、转化、广告、库存和异常。'],[7,'归因与结果复盘','待完整活动期及归因回补后，核对退货、费用与利润。']];
    work='<div class="panel-heading section-gap"><h2>围绕官方活动期的准备建议</h2><span class="tag gray">建议排期 · 实际进度未录入</span></div><div class="preparation">'+steps.map(s=>'<article><span class="phase-label">'+(s[0]===0?'活动开始':s[0]>0?'结束后7日':'提前'+Math.abs(s[0])+'日')+'</span><b>'+dayOffset(s[0]>0?e.end:e.start,s[0])+'</b><h3>'+s[1]+'</h3><p>'+s[2]+'</p><span class="tag gray">待录入</span></article>').join('')+'</div><p class="sub section-gap">以上是运营建议日期，不是官方报名或入仓截止。跨境备货起点需按真实生产、运输和入仓周期倒推；30天不代表足够完成备货。</p>';
  }else{
    work='<div class="cal-detail-actions"><article><b>'+(pending?'补齐当年依据':'核对适用范围')+'</b><p>'+(pending?'取得本国当年官方公告、实际后台窗口和时区；日期冲突解决后再排期。':'核对本地范围、节日与实际休息日期，单独确认仓库和承运商安排。')+'</p></article><article><b>'+(e.kind==='promo'?'确认实际平台窗口':'验证业务相关性')+'</b><p>'+(e.kind==='promo'?'日历锚点已经明确；完整促销期、优惠条件、实际报名和SKU资格另核。':'节日存在不等于清洁产品需求增加；内容、促销与投入需用当地数据验证。')+'</p></article><article><b>任务与复盘</b><p>正式计划录入后跟踪截止日期、进度、阻塞和结果；当前不展示虚构完成率。</p></article></div>';
  }
  const extraDates=(e.commemorative?'<div><b>纪念日</b><span>'+e.commemorative+'</span></div>':'')+(e.observed?'<div><b>多数联邦雇员休假日</b><span>'+e.observed+'</span></div>':'');
  return '<section id="event-evidence" class="panel cal-evidence"><div class="panel-heading"><div><span class="cal-small-label">EVENT EVIDENCE</span><h2>'+calEscape(e.country)+' · '+calEscape(e.name)+'</h2><div class="sub">'+dateBody+' · 当地日期</div></div>'+calStatus(e)+'</div><div class="event-summary"><div><b>适用范围</b><span>'+calEscape(e.scope)+'</span></div><div><b>渠道 / 平台</b><span>'+calEscape(e.platform)+'</span></div><div><b>UWANT参与 / 执行</b><span>'+calEscape(e.participation)+'</span></div>'+extraDates+'</div><div class="cal-evidence-line"><b>日期依据</b><span>'+calEscape(e.evidence)+'</span></div><div class="notice '+(pending?'':'green')+' section-gap">'+calEscape(e.note||'日期确认不代表实际停运、平台统一活动或品牌已报名。')+'</div><div class="cal-action-readout"><span>运营建议</span><p>'+calEscape(e.action)+'</p></div>'+work+'<div class="source-line section-gap cal-full-sources">'+calSourceLinks(e)+'<span>核对日 '+e.checkedAt+' · 人工核验快照</span></div></section>';
};
calendarView=function(){
  if(calendarValidationErrors.length)return empty('日历数据校验未通过','存在日期、年份或来源问题，暂不展示排期。'+calendarValidationErrors.map(calEscape).join('；'));
  const annual=calendarAnnual(),list=calendarFiltered(),known=list.filter(e=>e.start),pending=list.filter(e=>!e.start);
  if(!list.some(e=>e.id===selectedEvent))selectedEvent=known[0]?.id||pending[0]?.id||'';
  const current=list.find(e=>e.id===selectedEvent),official=annual.filter(e=>e.kind==='promo'&&e.dateState==='official'),dated=annual.filter(e=>e.start),unverified=annual.filter(e=>!e.start);
  const next=annual.filter(e=>e.kind==='promo'&&e.start&&e.end>=calToday()&&e.importance==='major').sort(calSort)[0];
  const yearOptions=['2026','2027'].map(y=>'<option value="'+y+'" '+(calendarYear===y?'selected':'')+'>'+y+(y==='2027'?' · 预备清单':' · 全年核查')+'</option>').join('');
  const periodOptions=[['upcoming','当前及后续节点'],['all','全年已核节点'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),(i+1)+'月'])].map(o=>'<option value="'+o[0]+'" '+(calendarPeriod===o[0]?'selected':'')+'>'+o[1]+'</option>').join('');
  const stateOptions=[['all','全部日期状态'],...Object.entries(calendarStateLabels)].map(o=>'<option value="'+o[0]+'" '+(calendarState===o[0]?'selected':'')+'>'+o[1]+'</option>').join('');
  const platforms=[['all','全部渠道'],['amazon','Amazon'],['mercado','Mercado Libre / Livre'],['retail','当地零售'],['shopee','Shopee Brasil']].map(o=>'<option value="'+o[0]+'" '+(calendarPlatform===o[0]?'selected':'')+'>'+o[1]+'</option>').join('');
  const groups=[['all','全部类型'],['promo','促销与报名'],['holiday','假日与履约'],['culture','文化与消费'],['season','季节窗口']];
  const hero='<section class="calendar-hero"><div><div class="cal-small-label">LOCAL CALENDAR · VERIFIED SOURCES</div><h2>'+calendarYear+' · 本地经营节奏</h2><p>全年节点可查，日期依据可追溯。<br>节日、平台活动与履约安排分别核验。</p></div><div class="calendar-hero-date"><span>本国最近核对</span><b>'+calEscape(annual.map(e=>e.checkedAt).filter(Boolean).sort().at(-1)||'待核')+'</b><small>当前当地日期 '+calToday()+'<br>各条目保留独立核对日</small></div></section>';
  const controls='<div class="cal-controls"><div><label for="calendar-year">年份</label><select id="calendar-year">'+yearOptions+'</select></div><div><label for="calendar-period">查看期间</label><select id="calendar-period">'+periodOptions+'</select></div><div><label for="calendar-platform">渠道</label><select id="calendar-platform">'+platforms+'</select></div><div><label for="calendar-state">日期依据</label><select id="calendar-state">'+stateOptions+'</select></div><form id="calendar-search-form"><label for="calendar-search">搜索节点 / 地区</label><div><input id="calendar-search" value="'+calEscape(calendarSearch)+'" placeholder="例如：Buen Fin、Quebec"><button class="button" type="submit">搜索</button></div></form></div><div class="cal-type-row"><div class="cal-type-pills" role="group" aria-label="日历节点类型">'+groups.map(o=>'<button class="'+(calendarKind===o[0]?'active':'')+'" data-calendar-kind="'+o[0]+'" aria-pressed="'+(calendarKind===o[0])+'">'+o[1]+'</button>').join('')+'</div><button class="link-button" id="calendar-reset">重置筛选</button></div>';
  const metrics='<div class="metrics cal-metrics">'+metric('全年已有日期',fmt(dated.length),'项','包括假日、文化日期与促销锚点')+metric('官方促销全期',fmt(official.length),'场','当年本国公告明确起止')+metric('精确日期待核',fmt(unverified.length),'项','包含来源差异与平台窗口待补')+metric('下一主要促销节点',next?calDate(next.start):'—','',next?calEscape(next.name):'当前无已核节点')+'</div>';
  const topNotice='<div class="cal-reading-key"><span><i class="key-official"></i>官方日期</span><span><i class="key-calendar"></i>日历锚点 · 平台期另核</span><span><i class="key-pending"></i>未核日期保持空白</span><small>日期确定不代表UWANT已报名</small></div>';
  const listTitle=calendarPeriod==='all'?'全年节点':calendarPeriod==='upcoming'?'当前及后续节点':Number(calendarPeriod)+'月节点';
  const annualBody=panel('十二个月 · 年度视图','月份卡片显示当前类型 / 渠道筛选下的已核日期；点击月份筛选。',calendarMonthGrid());
  return hero+controls+metrics+topNotice+calendarCoveragePanel()+annualBody+'<div class="section-gap">'+panel(listTitle,known.length+'项已有日期 · 当前及后续按当地日期'+calToday()+'筛选 · 各记录保留核对日',calendarTable(known))+'</div><div class="section-gap">'+calendarPending(pending)+'</div>'+(current?'<div class="section-gap">'+eventDetail(current)+'</div>':'')+'<div class="section-gap">'+calendarRecheckPanel()+'</div>';
};
const originalIntelligenceWiring=wireIntelligence;
wireIntelligence=function(){
  originalIntelligenceWiring();
  document.querySelectorAll('[data-event]').forEach(el=>el.addEventListener('click',()=>{document.querySelector('#event-evidence')?.scrollIntoView({behavior:'smooth',block:'start'});}));
  const controls={'#calendar-year':v=>calendarYear=v,'#calendar-period':v=>calendarPeriod=v,'#calendar-state':v=>calendarState=v};
  for(const [selector,set] of Object.entries(controls)){const el=document.querySelector(selector);if(el)el.addEventListener('change',e=>{set(e.target.value);render();});}
  document.querySelectorAll('[data-calendar-month]').forEach(el=>el.addEventListener('click',()=>{calendarPeriod=el.dataset.calendarMonth;render();}));
  document.querySelectorAll('[data-calendar-kind]').forEach(el=>el.addEventListener('click',()=>{calendarKind=el.dataset.calendarKind;render();}));
  const form=document.querySelector('#calendar-search-form');
  if(form)form.addEventListener('submit',e=>{e.preventDefault();calendarSearch=document.querySelector('#calendar-search').value.trim();render();});
  const reset=document.querySelector('#calendar-reset');
  if(reset)reset.addEventListener('click',()=>{calendarPeriod='upcoming';calendarPlatform='all';calendarKind='all';calendarState='all';calendarSearch='';render();});
};
function calendarCsv(){
  const list=calendarFiltered(),head=['国家','年份','节点','类型','适用范围','开始日期','结束日期','纪念日期','休假日期','日期状态','平台','核对日','依据','备注','来源链接','UWANT参与'];
  const rows=list.map(e=>[e.country,e.year,e.name,calendarKindLabels[e.kind],e.scope,e.start??'',e.end??'',e.commemorative??'',e.observed??'',calendarStateLabels[e.dateState],e.platform,e.checkedAt,e.evidence,e.note,e.sources.map(k=>calendarSources[k].url).join(' | '),e.participation]);
  return '\uFEFF'+[head,...rows].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
function exportCalendar(){
  const url=URL.createObjectURL(new Blob([calendarCsv()],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');
  a.href=url;a.download='UWANT_Calendar_'+market.toUpperCase()+'_'+calendarYear+'_Export_'+calToday().replaceAll('-','')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出当前筛选日历及核验来源');
}
