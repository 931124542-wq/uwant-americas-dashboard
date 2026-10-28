let calendarYear='2026',calendarPeriod='upcoming',calendarKind='all',calendarState='all',calendarSearch='';
const calendarKindLabels={promo:'促销 / 零售节点',national:'全国 / 联邦假日',regional:'地方日期',admin:'行政 / 特定非工作日',bank:'银行行业',cultural:'文化 / 消费节日',context:'情境观察',seasonal:'季节窗口',deadline:'报名 / 入仓节点'};
const calendarStateLabels={official:'日期已确认',calendar:'参考日期',pending:'等待公布',conflict:'日期有出入'};
const calendarGroups={all:null,promo:['promo','deadline'],holiday:['national','regional','admin','bank'],culture:['cultural','context'],season:['seasonal']};
function calEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function calToday(country=market){const zones={mx:'America/Mexico_City',ca:'America/Toronto',ar:'America/Argentina/Buenos_Aires',br:'America/Sao_Paulo',us:'America/New_York'};return new Intl.DateTimeFormat('en-CA',{timeZone:zones[country]||'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function calDate(v){if(!v)return '待公布';return Number(v.slice(5,7))+'月'+Number(v.slice(8,10))+'日';}
function calRange(e){if(!e.start)return '待公布';return calDate(e.start)+(e.end!==e.start?' — '+calDate(e.end):'');}
function calCopy(v){
  return String(v??'')
    .replaceAll('日期尚未核验','日期还未公布')
    .replaceAll('具体日期保持为空','暂不安排日期')
    .replaceAll('尚未取得足够的当年本地日期依据','还没有找到当年当地的可靠日期')
    .replaceAll('取得当年、本国、具体平台的官方公告或后台通知后，再填写活动期和截止时间。','等平台公布当年安排后，再加入活动期和截止时间。')
    .replaceAll('UWANT参与状态待确认','UWANT是否参加：待确认')
    .replaceAll('实际库存待核验','库存待确认')
    .replaceAll('待核验','待确认')
    .replaceAll('核验','确认');
}
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
  return '<div class="annual-months" role="group" aria-label="按月查看活动">'+Array.from({length:12},(_,i)=>{
    const key=String(i+1).padStart(2,'0');
    const rows=list.filter(e=>e.start.slice(5,7)<=key&&e.end.slice(5,7)>=key);
    const major=rows.filter(e=>e.importance==='major').sort(calSort);
    const peek=(major.length?major:rows).slice(0,2);
    return '<button class="month-tile '+(calendarPeriod===key?'month-active':'')+'" data-calendar-month="'+key+'" aria-pressed="'+(calendarPeriod===key)+'"><div class="month-tile-head"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+rows.length+'项</span></div><div class="month-peek">'+(peek.map(e=>'<span class="'+(e.kind==='promo'?'peek-promo':'')+'">'+calEscape(e.name.split(' · ')[0])+'</span>').join('')||'<span class="month-none">暂无活动</span>')+'</div>'+(rows.length>2?'<small>另有 '+(rows.length-2)+' 项</small>':'')+'</button>';
  }).join('')+'</div>';
}
function calendarCoveragePanel(){
  if(calendarYear!=='2026')return '<div class="notice">2027 年活动日期尚未公布。这里先列出需要关注的活动，确认后再安排。</div>';
  const c=holidayCoverage[market],found=calendarAnnual().filter(e=>e.kind==='national'),n=c.expected.filter(d=>found.some(e=>e.start===d)).length;
  return '<div class="cal-coverage"><div><span class="cal-small-label">全年假日</span><h3>'+c.label+' <span>'+n+' / '+c.expected.length+'</span></h3><p>'+calEscape(calCopy(c.note))+'</p></div><div class="cal-coverage-side">'+sourceLink(calendarSources[c.source].url,'查看来源')+'<small>已收录 '+n+' 个全国或联邦假日</small></div></div><div class="cal-boundary"><b>还需关注</b><span>'+calEscape(calCopy(c.remaining))+'</span></div>';
}
function calendarTable(list){
  if(!list.length)return '<div class="cal-empty">当前筛选下没有活动。可以切换年份、月份或活动类型。</div>';
  return '<div class="table-wrap"><table class="annual-table"><thead><tr><th>节点与适用范围</th><th>当地日期</th><th>类型</th><th>渠道</th><th>日期状态</th><th>依据</th></tr></thead><tbody>'+list.map(e=>{
    const auxiliary=e.commemorative?'<small>纪念日 '+calDate(e.commemorative)+'</small>':e.observed?'<small>联邦休假 '+calDate(e.observed)+'</small>':'';
    return '<tr class="'+(e.id===selectedEvent?'selected-row':'')+'"><td><strong>'+calEscape(e.name)+'</strong><small>'+calEscape(calCopy(e.scope))+'</small></td><td><b>'+calRange(e)+'</b>'+auxiliary+'</td><td>'+calendarKindLabels[e.kind]+'</td><td>'+calEscape(e.platform)+'</td><td>'+calStatus(e)+'</td><td><button class="link-button" data-event="'+e.id+'" aria-label="查看'+calEscape(e.name)+'详情">查看 ↗</button></td></tr>';
  }).join('')+'</tbody></table></div>';
}
function calendarPending(list){
  if(!list.length)return '<div class="cal-pending-summary">当前没有等待公布日期的活动。</div>';
  return '<details class="cal-pending"><summary><span><i></i>等待公布日期</span><b>'+list.length+'项</b><small>平台公布后再安排</small></summary><div class="cal-pending-grid">'+list.map(e=>'<article class="'+(e.id===selectedEvent?'pending-selected':'')+'"><div>'+calStatus(e)+'<small>'+calEscape(e.platform)+'</small></div><h3>'+calEscape(e.name)+'</h3><p>'+calEscape(calCopy(e.note||'平台还未公布当年的完整活动日期。'))+'</p><button class="link-button" data-event="'+e.id+'">查看详情 ↗</button></article>').join('')+'</div></details>';
}
function calendarRecheckPanel(){
  const notes=calendarYear==='2026'?calendarAuditNotes.filter(e=>e.market===market):[];
  return panel('日期说明','这些日期从哪里来，以及使用时要注意什么。','<div class="cal-audit-records">'+notes.map(n=>'<article><span class="cal-audit-dot"></span><div><h3>'+calEscape(n.title)+'</h3><p>'+calEscape(calCopy(n.detail))+'</p><div class="cal-inline-sources">'+n.sources.map(k=>sourceLink(calendarSources[k].url,calEscape(calendarSources[k].title))).join('')+'</div></div></article>').join('')+'</div><div class="cal-review-rules"><div><b>1. 看清市场和年份</b><p>同名活动在不同国家、不同年份可能不是同一天。</p></div><div><b>2. 活动日期不等于报名截止</b><p>活动期、报名、入仓和物流截止要分别向平台确认。</p></div><div><b>3. 执行前再确认一次</b><p>建议在活动前30天、14天和3天查看平台后台是否有变化。当前不会自动提醒。</p></div></div><div class="sub section-gap">日历只用于安排节奏。预算、库存和促销力度仍要看实际销售、利润和供货情况。</div>');
}
eventDetail=function(e){
  const pending=!e.start,officialPromo=e.kind==='promo'&&e.dateState==='official';
  const dateBody=pending?'日期待公布':e.start+(e.end!==e.start?' — '+e.end:'');
  let work='';
  if(officialPromo){
    const steps=[[-30,'备货与利润','核对运输与入仓周期、可售库存、主推候选及贡献利润底线。'],[-14,'平台资格与页面','核对报名与资源位、优惠叠加、商品页、评价和实际渠道条件。'],[-7,'价格与广告检查','确认到手价、SKU库存、素材、关键词和测试预算。'],[0,'活动监控','按本地活动期记录销售、转化、广告、库存和异常。'],[7,'归因与结果复盘','待完整活动期及归因回补后，核对退货、费用与利润。']];
    work='<div class="panel-heading section-gap"><h2>活动准备</h2><span class="tag gray">建议时间 · 进度未填写</span></div><div class="preparation">'+steps.map(s=>'<article><span class="phase-label">'+(s[0]===0?'活动开始':s[0]>0?'结束后7日':'提前'+Math.abs(s[0])+'日')+'</span><b>'+dayOffset(s[0]>0?e.end:e.start,s[0])+'</b><h3>'+s[1]+'</h3><p>'+s[2]+'</p><span class="tag gray">未开始</span></article>').join('')+'</div><p class="sub section-gap">这些日期是内部准备建议，不是平台的报名或入仓截止日。备货时间请按实际生产、运输和入仓周期倒排。</p>';
  }else{
    work='<div class="cal-detail-actions"><article><b>'+(pending?'等待平台公布':'确认适用范围')+'</b><p>'+(pending?'确认国家、平台和时区后再安排日期。':'确认当地放假安排，以及仓库和承运商是否正常工作。')+'</p></article><article><b>'+(e.kind==='promo'?'确认平台安排':'评估是否相关')+'</b><p>'+(e.kind==='promo'?'活动日期、优惠条件、报名和商品资格需要分别确认。':'节日不一定会带来清洁产品需求，投入前请先看当地销售数据。')+'</p></article><article><b>加入任务</b><p>确定参与后，再填写负责人、截止日期和进度。</p></article></div>';
  }
  const extraDates=(e.commemorative?'<div><b>纪念日</b><span>'+e.commemorative+'</span></div>':'')+(e.observed?'<div><b>多数联邦雇员休假日</b><span>'+e.observed+'</span></div>':'');
  return '<section id="event-evidence" class="panel cal-evidence"><div class="panel-heading"><div><span class="cal-small-label">活动详情</span><h2>'+calEscape(e.country)+' · '+calEscape(e.name)+'</h2><div class="sub">'+dateBody+' · 当地日期</div></div>'+calStatus(e)+'</div><div class="event-summary"><div><b>适用范围</b><span>'+calEscape(calCopy(e.scope))+'</span></div><div><b>渠道 / 平台</b><span>'+calEscape(e.platform)+'</span></div><div><b>UWANT是否参加</b><span>'+calEscape(calCopy(e.participation))+'</span></div>'+extraDates+'</div><div class="cal-evidence-line"><b>日期来源</b><span>'+calEscape(calCopy(e.evidence))+'</span></div><div class="notice '+(pending?'':'green')+' section-gap">'+calEscape(calCopy(e.note||'活动日期已确认，是否参加请以运营计划为准。'))+'</div><div class="cal-action-readout"><span>建议</span><p>'+calEscape(calCopy(e.action))+'</p></div>'+work+'<div class="source-line section-gap cal-full-sources">'+calSourceLinks(e)+'<span>更新于 '+e.checkedAt+'</span></div></section>';
};
calendarView=function(){
  if(calendarValidationErrors.length)return empty('日历数据校验未通过','存在日期、年份或来源问题，暂不展示排期。'+calendarValidationErrors.map(calEscape).join('；'));
  const annual=calendarAnnual(),list=calendarFiltered(),known=list.filter(e=>e.start),pending=list.filter(e=>!e.start);
  if(!list.some(e=>e.id===selectedEvent))selectedEvent=known[0]?.id||pending[0]?.id||'';
  const current=list.find(e=>e.id===selectedEvent),official=annual.filter(e=>e.kind==='promo'&&e.dateState==='official'),dated=annual.filter(e=>e.start),unverified=annual.filter(e=>!e.start);
  const next=annual.filter(e=>e.kind==='promo'&&e.start&&e.end>=calToday()&&e.importance==='major').sort(calSort)[0];
  const yearOptions=['2026','2027'].map(y=>'<option value="'+y+'" '+(calendarYear===y?'selected':'')+'>'+y+(y==='2027'?' · 日期待公布':' · 全年')+'</option>').join('');
  const periodOptions=[['upcoming','接下来的活动'],['all','全年活动'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),(i+1)+'月'])].map(o=>'<option value="'+o[0]+'" '+(calendarPeriod===o[0]?'selected':'')+'>'+o[1]+'</option>').join('');
  const stateOptions=[['all','全部日期状态'],...Object.entries(calendarStateLabels)].map(o=>'<option value="'+o[0]+'" '+(calendarState===o[0]?'selected':'')+'>'+o[1]+'</option>').join('');
  const platforms=[['all','全部渠道'],['amazon','Amazon'],['mercado','Mercado Libre / Livre'],['retail','当地零售'],['shopee','Shopee Brasil']].map(o=>'<option value="'+o[0]+'" '+(calendarPlatform===o[0]?'selected':'')+'>'+o[1]+'</option>').join('');
  const groups=[['all','全部类型'],['promo','促销与报名'],['holiday','假日与履约'],['culture','文化与消费'],['season','季节窗口']];
  const hero='<section class="calendar-hero"><div><div class="cal-small-label">UWANT · 年度日历</div><h2>'+calendarYear+' 年促销日历</h2><p>查看重要促销、节日和履约安排。<br>日期未公布的活动会标为“等待公布”。</p></div><div class="calendar-hero-date"><span>更新至</span><b>'+calEscape(annual.map(e=>e.checkedAt).filter(Boolean).sort().at(-1)||'—')+'</b><small>当地日期 '+calToday()+'</small></div></section>';
  const controls='<div class="cal-controls"><div><label for="calendar-year">年份</label><select id="calendar-year">'+yearOptions+'</select></div><div><label for="calendar-period">查看期间</label><select id="calendar-period">'+periodOptions+'</select></div><div><label for="calendar-platform">渠道</label><select id="calendar-platform">'+platforms+'</select></div><div><label for="calendar-state">日期状态</label><select id="calendar-state">'+stateOptions+'</select></div><form id="calendar-search-form"><label for="calendar-search">搜索活动 / 地区</label><div><input id="calendar-search" value="'+calEscape(calendarSearch)+'" placeholder="例如：Buen Fin、Quebec"><button class="button" type="submit">搜索</button></div></form></div><div class="cal-type-row"><div class="cal-type-pills" role="group" aria-label="活动类型">'+groups.map(o=>'<button class="'+(calendarKind===o[0]?'active':'')+'" data-calendar-kind="'+o[0]+'" aria-pressed="'+(calendarKind===o[0])+'">'+o[1]+'</button>').join('')+'</div><button class="link-button" id="calendar-reset">重置筛选</button></div>';
  const metrics='<div class="metrics cal-metrics">'+metric('已排日期',fmt(dated.length),'项','包括促销、节日和履约安排')+metric('平台大促',fmt(official.length),'场','已公布完整活动日期')+metric('等待公布',fmt(unverified.length),'项','平台尚未公布或日期有出入')+metric('下一场重点活动',next?calDate(next.start):'—','',next?calEscape(next.name):'暂时没有已公布的活动')+'</div>';
  const topNotice='<div class="cal-reading-key"><span><i class="key-official"></i>日期已确认</span><span><i class="key-calendar"></i>参考日期</span><span><i class="key-pending"></i>等待公布</span><small>是否参加请以运营计划为准</small></div>';
  const listTitle=calendarPeriod==='all'?'全年活动':calendarPeriod==='upcoming'?'接下来的活动':Number(calendarPeriod)+'月活动';
  const annualBody=panel('全年日历','点击月份查看活动。',calendarMonthGrid());
  return hero+controls+metrics+topNotice+calendarCoveragePanel()+annualBody+'<div class="section-gap">'+panel(listTitle,known.length+'项 · 按当地日期 '+calToday()+' 更新',calendarTable(known))+'</div><div class="section-gap">'+calendarPending(pending)+'</div>'+(current?'<div class="section-gap">'+eventDetail(current)+'</div>':'')+'<div class="section-gap">'+calendarRecheckPanel()+'</div>';
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
  a.href=url;a.download='UWANT_Calendar_'+market.toUpperCase()+'_'+calendarYear+'_Export_'+calToday().replaceAll('-','')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('日历已导出');
}
