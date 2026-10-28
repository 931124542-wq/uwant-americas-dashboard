/* Online records use authenticated storage. Offline files retain explicit backups. */
const csOffline=location.protocol==='file:'||window.UWANT_OFFLINE===true;
let csReady=false,csCanEdit=false,csRevision=0,csBaseline='',csSaving=false,csLoading=false,csTimer=null,csConflict=false,csMessage=csOffline?'工作记录通过文件备份保存。':'正在读取在线记录；读取完成前的修改不会覆盖在线数据。';
function csSnapshot(){return {schema:1,ledger:lgRecords,samples:rdSamples,radar:biSnapshots,watch:sdWatchSaved,prices:amPrices};}
function csSerialized(){return JSON.stringify(csSnapshot());}
const csStart=csSerialized();let csLastBackup=csStart;
function csPending(){return csSerialized()!==(csOffline?csLastBackup:csReady?csBaseline:csStart);}
function csStatusTone(){return csOffline?'offline':csConflict?'warning':!csReady&&!csLoading?'error':csSaving||csLoading||csPending()?'pending':'saved';}
function csStatus(){return `<section class="cs-status" data-save-state="${csStatusTone()}" aria-label="记录保存状态"><div class="cs-state-label"><strong><span class="cs-dot" aria-hidden="true"></span>${csOffline?'离线版':csReady?(csCanEdit?'在线 · 可编辑':'在线 · 只读'):'在线记录'}</strong><p id="cs-message" role="status">${rdE(csMessage)}</p></div><details class="cs-tools"><summary>保存与备份</summary><div class="cs-tools-body"><div class="cs-buttons"><button type="button" class="mi-button" id="cs-backup">↓ 工作记录备份</button><label class="mi-button cs-file">恢复备份<input id="cs-import" type="file" accept=".json,application/json" aria-label="选择工作记录备份文件"></label>${!csOffline?`<button type="button" class="mi-button" id="cs-save" ${!csReady||!csCanEdit||csConflict||csSaving||csLoading?'disabled':''}>${csSaving?'保存中…':'保存在线记录'}</button>${!csReady?`<button type="button" class="mi-button" id="cs-retry" ${csLoading?'disabled':''}>${csLoading?'连接中…':'重新连接'}</button>`:''}<button type="button" class="mi-button" id="cs-reload" ${csSaving||csLoading?'disabled':''}>备份并读取最新</button>`:''}</div><p>保存验证台账、销量样本、BI快照、固定竞品和价格假设。表单草稿仅保留在当前浏览器；成本测算请另行导出。读取最新前会生成本页备份，请确认下载完成。</p></div></details></section>`;}
function csUpdate(){const n=document.querySelector('#cs-message');if(n)n.textContent=csMessage;const box=document.querySelector('.cs-status');if(box)box.dataset.saveState=csStatusTone();const save=document.querySelector('#cs-save');if(save){save.disabled=!csReady||!csCanEdit||csConflict||csSaving||csLoading;save.textContent=csSaving?'保存中…':'保存在线记录';}for(const id of ['#cs-reload','#cs-retry']){const node=document.querySelector(id);if(node)node.disabled=csLoading||csSaving;}}
function csBackup(){const snapshot=csSerialized(),backup={...JSON.parse(snapshot),exportedAt:new Date().toISOString(),revision:csRevision},u=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='UWANT_Workspace_'+rdToday()+'.json';a.click();csLastBackup=snapshot;lgDirty=false;setTimeout(()=>URL.revokeObjectURL(u),1000);return backup;}
async function csRequest(options={}){const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),20000):null;try{const response=await fetch('/api/dashboard-state',{...options,...(controller?{signal:controller.signal}:{})}),result=await response.json();return {ok:response.ok,status:response.status,json:async()=>result};}catch(e){throw Error(e.name==='AbortError'?'连接超时，请重试；保存结果不确定时，请备份后读取最新版本':e.name==='SyntaxError'?'服务返回内容无效，请先保留备份后重试':'连接中断，请检查网络后重试');}finally{if(timer!==null)clearTimeout(timer);}}
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
async function csLoad(force=false){
 if(csOffline||csSaving||csLoading)return;
 const before=csSerialized(),hadChanges=csPending();csLoading=true;csMessage='正在读取在线记录…';csUpdate();
 try{const response=await csRequest({credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error(response.status===401?'登录状态未确认，请重新登录后连接；本页修改仍保留':'在线读取失败；本页数据未清除，请保留备份');const result=await response.json();if(!Number.isSafeInteger(result.revision)||result.revision<0||typeof result.canEdit!=='boolean')throw Error('在线返回格式无效');
  csCanEdit=result.canEdit;
  if(csSerialized()!==before||hadChanges&&!force){csConflict=true;csReady=true;csMessage='本页有尚未同步的修改，已保留。请先备份，再读取最新；可通过恢复备份取回本页内容。';}
  else{if(result.state||force)csApply(result.state||{schema:1,ledger:[],samples:[],watch:{},prices:{mx:{},ca:{}}});csRevision=result.revision;csReady=true;csConflict=false;csBaseline=csSerialized();csMessage=result.updatedAt?'已读取在线版本 '+csRevision+' · '+new Date(result.updatedAt).toLocaleString('zh-CN'):'尚无在线工作记录。首次编辑后自动保存。';}
 }catch(e){csReady=false;csMessage=e.message;}
 finally{csLoading=false;}
 if(typeof data!=='undefined'&&data&&(rdActive()||page==='market'))cpRefresh();else csUpdate();
}
async function csSave(){
 if(csOffline||!csReady||!csCanEdit||csSaving||csLoading||csConflict)return;
 const sent=csSerialized();if(sent===csBaseline){csMessage='在线记录已是最新版本。';csUpdate();return;}
 csSaving=true;csMessage='正在保存在线记录…';csUpdate();
 try{const response=await csRequest({method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:csRevision,state:JSON.parse(sent)})});const result=await response.json();if(!response.ok){if(response.status===409)csConflict=true;throw Error(result.error||'保存失败，请导出备份');}if(!Number.isSafeInteger(result.revision)||result.revision<=csRevision)throw Error('保存返回无效，请先保留备份再读取最新');csRevision=result.revision;csBaseline=sent;lgDirty=csSerialized()!==sent;csMessage='已保存在线版本 '+csRevision+' · '+new Date(result.updatedAt).toLocaleString('zh-CN');}
 catch(e){csMessage=e.message+'；本页修改仍保留。';}
 finally{csSaving=false;csUpdate();}
 // Only retry automatically when a successful save was followed by another edit.
 if(csBaseline===sent&&csSerialized()!==sent)csSchedule();
}
function csSchedule(){if(csOffline||!csReady||!csCanEdit||csConflict||csSaving||csLoading||csSerialized()===csBaseline)return;csMessage='有修改待保存，请等待保存成功后关闭页面。';csUpdate();clearTimeout(csTimer);csTimer=setTimeout(csSave,700);}
const csPanelBefore=cpPanel;cpPanel=function(){const result=csPanelBefore();return Object.hasOwn(amSourceData,market)?csStatus()+result:result;};
function csWireControls(){document.querySelector('#cs-backup')?.addEventListener('click',()=>{csBackup();csMessage='已生成工作记录备份，请确认浏览器下载完成。';csUpdate();});document.querySelector('#cs-save')?.addEventListener('click',csSave);document.querySelector('#cs-retry')?.addEventListener('click',()=>csLoad());document.querySelector('#cs-reload')?.addEventListener('click',()=>{if(csSaving||csLoading)return toast('请等待当前保存或读取完成');csBackup();clearTimeout(csTimer);csConflict=true;csLoad(true);});document.querySelector('#cs-import')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(!csOffline&&csReady&&!csCanEdit)return toast('当前账号只有查看权限');if(csSaving||csLoading)return toast('请等待保存或读取完成');try{if(f.size>9*1024*1024)throw Error('备份超过9MB');const next=csValidate(JSON.parse(await f.text()));csBackup();csApply(next);lgDirty=true;csMessage='已恢复工作备份；原本页数据已生成备份。';cpRefresh();}catch(err){csMessage='未恢复：'+err.message+'；原数据保留。';csUpdate();}});
 if(csReady&&!csCanEdit){document.querySelectorAll('#lg-form input,#lg-form textarea,#lg-form select,#lg-form button,[data-lg-edit],#lg-import,#rd-import,#rd-clear-sample,[data-sd-watch],#sd-watch-reset,#am-price,#pw-base,#am-reset,#pw-base-reset,#cs-import').forEach(el=>el.disabled=true);}
 csSchedule();
}
const csWireBefore=cpWire;cpWire=function(){csWireBefore();if(rdActive())csWireControls();};
window.addEventListener('beforeunload',e=>{if(csPending()){e.preventDefault();e.returnValue='';}});
if(!csOffline&&location.protocol==='https:')csLoad();
