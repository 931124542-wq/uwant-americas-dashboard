/* Presentation only: each segment consumes the existing qualified aggregate. */
(function(root){
 const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=x=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(x);
 const percent=x=>x===null?'未取得':x>0&&x<.001?'＜0.1%':(x*100).toFixed(1)+'%';
 const isOwn=x=>String(x||'').trim().toUpperCase()==='UWANT';
 const palette=['#628bc4','#c6a16c','#9a88b7','#6f9a98','#b18883','#a2b86a'];
 function render(groups,total,{metric='销售额',unit='',center='UWANT',ownValue,legendClass='brand-share-legend',className=''}={}){
  const sum=groups.reduce((v,g)=>v+g.value,0);
  if(!(total>0)||groups.some(g=>!Number.isFinite(g.value)||g.value<0)||Math.abs(sum-total)>Math.max(.001,total*1e-9))return '<p class="market-chart-empty">暂无可计算的份额数据</p>';
  if(ownValue===undefined)ownValue=groups.filter(g=>isOwn(g.label)).reduce((v,g)=>(v??0)+g.value,null);
  let offset=0,index=0;
  const rows=groups.map(g=>{const share=g.value/total,color=isOwn(g.label)?'#08765b':/其他|其余|未识别|待核/.test(g.label)?'#c3cec7':palette[index++%palette.length],part={...g,share,color,offset};offset+=share*100;return part;});
  const circles=rows.filter(g=>g.value>0).map(g=>'<circle cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="'+g.color+'" stroke-width="25" stroke-dasharray="'+(g.share*100)+' '+(100-g.share*100)+'" stroke-dashoffset="'+(-g.offset)+'"><title>'+e(g.label)+'：'+percent(g.share)+' · '+n(g.value)+' '+e(unit)+'</title></circle>').join('');
  const missingOwn=center==='UWANT'&&ownValue===null,leader=missingOwn?rows.filter(g=>g.value>0&&!/其他|其余|未识别|待核|unknown|generic/i.test(g.label)).sort((a,b)=>b.value-a.value)[0]:null;
  const centerTitle=missingOwn?(leader?.label||'品牌分布'):center,centerValue=missingOwn?(leader?percent(leader.share):'待识别'):center==='UWANT'?percent(ownValue/total):n(total),label=missingOwn?'样本领先品牌':center==='UWANT'?'样本'+metric+'占比':'已导入出货量';
  return '<div class="brand-share-visual '+e(className)+'" data-own-share-status="'+(missingOwn?'missing':'available')+'" data-brand-share-total="'+total+'"><div class="brand-share-ring"><svg viewBox="0 0 200 200" role="img" aria-label="'+e(metric+'份额图；'+rows.map(g=>g.label+' '+percent(g.share)).join('；'))+'"><g transform="rotate(-90 100 100)">'+circles+'</g></svg><div class="brand-share-center"><span title="'+e(centerTitle)+'">'+e(centerTitle)+'</span><strong>'+e(centerValue)+'</strong><small>'+e(label)+'</small></div></div><div class="'+e(legendClass)+'">'+rows.map(g=>'<'+(g.attrs?'button type="button"':'div')+' class="brand-share-item" '+(g.attrs||'')+' data-market-value="'+g.value+'" title="'+e(g.label+' · '+n(g.value)+' '+unit)+'"><i style="background:'+g.color+'"></i><span>'+e(g.label)+'</span><strong>'+percent(g.share)+'</strong><small>'+n(g.value)+'</small></'+(g.attrs?'button':'div')+'>').join('')+'</div></div>';
 }
 root.MarketShareChart={render,percent,isOwn};if(typeof module!=='undefined')module.exports=root.MarketShareChart;
})(typeof window==='undefined'?globalThis:window);
