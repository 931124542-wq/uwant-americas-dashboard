const renderBeforeAnnualCalendar=render;
render=function(){
  renderBeforeAnnualCalendar();
  if(!data)return;
  if(page==='calendar'){
    document.querySelector('#page-title').textContent=marketProfiles[market].name+' · 年度促销与节日';
    document.querySelector('#page-subtitle').textContent='全年核查 · 官方日期与日历锚点分开 · 未核日期保持空白';
    document.querySelector('#export').disabled=!!calendarValidationErrors.length;
    document.querySelector('#export').textContent='↓ 导出筛选日历';
  }else document.querySelector('#export').textContent='↓ 导出当前数据';
};
if(data)render();
