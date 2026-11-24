/* The workbench uses portable local backups for editing and restoration. */
let csMessage='工作记录可导出为本机备份。';
function csSnapshot(){return {schema:1,ledger:lgRecords,samples:rdSamples,radar:biSnapshots,watch:sdWatchSaved,prices:amPrices};}
function csSerialized(){return JSON.stringify(csSnapshot());}
let csLastBackup=csSerialized();
function csPending(){return csSerialized()!==csLastBackup;}
function csStatus(){return `<section class="cs-status" aria-label="工作记录备份"><div class="cs-state-label"><strong>工作记录备份</strong><p id="cs-message" role="status">${rdE(csMessage)}</p></div><div class="cs-buttons"><button type="button" class="mi-button" id="cs-backup">下载工作记录</button><label class="mi-button cs-file">恢复备份<input id="cs-import" type="file" accept=".json,application/json" aria-label="选择工作记录备份文件"></label></div></section>`;}
function csUpdate(){const label=document.querySelector('#cs-message');if(label)label.textContent=csMessage;}
function csBackup(){
 const snapshot=csSerialized(),backup={...JSON.parse(snapshot),exportedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='UWANT_Workspace_'+rdToday()+'.json';link.click();
 csLastBackup=snapshot;lgDirty=false;setTimeout(()=>URL.revokeObjectURL(url),1000);
 return backup;
}
function csValidate(raw){
 if(!raw||raw.schema!==1||!Array.isArray(raw.ledger)||!Array.isArray(raw.samples)||raw.samples.length>5000||!raw.watch||typeof raw.watch!=='object'||Array.isArray(raw.watch)||!raw.prices||typeof raw.prices!=='object'||Array.isArray(raw.prices))throw Error('工作备份格式无效');
 const ledger=lgParseBackup(JSON.stringify({schema:1,records:raw.ledger}));
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 const samples=raw.samples.length?rdParseSamples([rdColumns,...raw.samples.map(r=>rdColumns.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\n')):[];
 const watch={};if(Object.keys(raw.watch).length>100)throw Error('固定竞品数量无效');
 for(const [k,v] of Object.entries(raw.watch)){const [c,s,role]=k.split('|');if(k.split('|').length!==3||!Object.hasOwn(amSourceData,c)||!Object.hasOwn(amSourceData[c],s)||!sdWatchRoles.some(x=>x[0]===role)||typeof v!=='string'||v.length>300)throw Error('固定竞品格式无效');watch[k]=v;}
 const prices={mx:{},ca:{}};
 for(const [c,entries] of Object.entries(raw.prices)){if(!Object.hasOwn(prices,c)||!entries||typeof entries!=='object'||Array.isArray(entries))throw Error('价格假设格式无效');for(const [s,v] of Object.entries(entries)){if(!Object.hasOwn(amSourceData[c],s)||!['number','string'].includes(typeof v)||(v!==''&&(!Number.isFinite(Number(v))||Number(v)<=0)))throw Error('价格假设无效');prices[c][s]=v;}}
 const radar=UwantRadarCore.validateRecords(raw.radar||[],rdToday());
 return {schema:1,ledger,samples,radar,watch,prices};
}
function csApply(state){const s=csValidate(state);lgRecords=s.ledger;rdSamples=s.samples;biSnapshots=s.radar;rdSampleGroup='';for(const k of Object.keys(sdWatchSaved))delete sdWatchSaved[k];Object.assign(sdWatchSaved,s.watch);for(const c of ['mx','ca']){for(const k of Object.keys(amPrices[c]))delete amPrices[c][k];Object.assign(amPrices[c],s.prices[c]);}amLocalWrite('uwant-watch-v1',sdWatchSaved);lgEditId=null;lgDirty=false;}
function csWireControls(){
 document.querySelector('#cs-backup')?.addEventListener('click',()=>{
  csBackup();csMessage='已生成工作记录备份。';csUpdate();
 });
 document.querySelector('#cs-import')?.addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
   if(file.size>9*1024*1024)throw Error('备份超过 9 MB');
   const next=csValidate(JSON.parse(await file.text()));
   if(csPending())csBackup();
   csApply(next);csLastBackup=csSerialized();csMessage='已读取工作记录备份。';
   if(page==='access')render();else cpRefresh();
  }catch(error){csMessage='未能读取备份：'+error.message;csUpdate();}
 });
}
const csWireBefore=cpWire;cpWire=function(){csWireBefore();if(rdActive())csWireControls();};
const csRenderBefore=render;render=function(){csRenderBefore();if(page==='access'&&data)csWireControls();};
window.addEventListener('beforeunload',event=>{if(csPending()){event.preventDefault();event.returnValue='';}});
