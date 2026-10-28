/* Presentation only. Existing country/SKU data and evidence rules are retained. */
const cleanTabNames={decisions:'销售决策',matrix:'原表对照',compare:'公开调研',newmodels:'型号核查',demand:'需求销量',validate:'行动复盘',baseline:'当地版本'};
const cleanTabOrder=Object.keys(cleanTabNames);
rdTabs.forEach(tab=>{if(cleanTabNames[tab[0]])tab[1]=cleanTabNames[tab[0]];});
rdTabs.sort((a,b)=>cleanTabOrder.indexOf(a[0])-cleanTabOrder.indexOf(b[0]));
function cleanResearchMode(){document.body.classList.toggle('research-focus',page==='competitors'||page==='market'&&miTab==='compare');}
const cleanRenderBefore=render;render=function(...args){cleanResearchMode();const result=cleanRenderBefore(...args);if(page==='competitors'){$('#page-title').textContent='竞品商品与销量';$('#page-subtitle').textContent='美国、加拿大、墨西哥与巴西 · 商品图片、销量估算与竞争定位';}return result;};
const cleanMiRenderBefore=miRender;miRender=function(...args){cleanResearchMode();return cleanMiRenderBefore(...args);};
