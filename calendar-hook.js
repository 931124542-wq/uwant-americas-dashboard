const renderBeforeAnnualCalendar=render;
render=function(){
  renderBeforeAnnualCalendar();
  if(!data)return;
  if(page==='calendar'){
    document.querySelector('#page-title').textContent=marketProfiles[market].name+' · 促销日历';
    document.querySelector('#page-subtitle').textContent='查看重要活动、节日和准备时间。';
    document.querySelector('#export').disabled=!!calendarValidationErrors.length;
    document.querySelector('#export').textContent='↓ 导出筛选日历';
  }else document.querySelector('#export').textContent='↓ 导出当前数据';
};
if(data)render();
