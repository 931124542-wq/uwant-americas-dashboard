/* One-click local-file -> owned website handoff. Data travels through window messages, not HTTP. */
(function(root){
 'use strict';
 const schema='uwant-operating-transfer-v1',site='https://931124542-wq.github.io/uwant-americas-dashboard/',version='11.17.4',pending=new Map();
 function targetAllowed(value){try{const u=new URL(value);return u.origin==='https://931124542-wq.github.io'&&u.pathname==='/uwant-americas-dashboard/'||['http://127.0.0.1:8842','http://localhost:8842'].includes(u.origin)&&u.pathname==='/';}catch{return false;}}
 function validateBundle(x){if(x?.schema!==schema||!x.historical&&!x.event||JSON.stringify(x).length>5000000)throw Error('本机经营数据格式无效或过大。');const historical=x.historical?root.OperatingWorkbook.validate(x.historical):null,event=x.event?root.OperatingEvent.validate(x.event):null;if(event&&!event.source.hash)throw Error('活动报表缺少来源标识。');return {schema,historical,event};}
 function importBundle(input){const data=validateBundle(input),old=root.OperatingWorkbook.load();let keptHistory=false,persisted=true;
  // A different existing historical file wins. Never replace it silently during a handoff.
  if(data.historical){if(!old){root.OperatingWorkbook.install(data.historical);try{persisted=JSON.parse(root.localStorage.getItem(root.OperatingWorkbook.storageKey))?.source.hash===data.historical.source.hash;}catch{persisted=false;}}else keptHistory=old.source.hash!==data.historical.source.hash;}
  if(data.event)persisted=root.OperatingEvent.install(data.event).persisted&&persisted;
  root.render?.();return {keptHistory,persisted};
 }
 function sourceStatus(message){const el=root.document?.querySelector('[data-ow-status]');if(el)el.textContent=message;}
 function receiverStatus(message,state){const host=root.document?.getElementById('operations-content');if(!host)return;let el=root.document.getElementById('operating-transfer-status');if(!el){el=root.document.createElement('p');el.id='operating-transfer-status';el.setAttribute('role','status');host.prepend(el);}el.className='operating-transfer-status '+state;el.textContent=message;}
 function openOnline(target=site){
  if(root.location?.protocol!=='file:')throw Error('请从已载入数据的本机看板打开网站。');if(!targetAllowed(target))throw Error('仅可传到UWANT经营网站。');
  const bundle=validateBundle({schema,historical:root.OperatingWorkbook.load(),event:root.OperatingEvent.load()}),token=[...root.crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,'0')).join(''),url=new URL(target);url.search='?v='+version;url.hash=new URLSearchParams({country:'MX',module:'operations',page:'overview',operatingTransfer:token}).toString();
  const popup=root.open(url.href,'_blank');if(!popup){sourceStatus('浏览器拦截了新窗口，请允许后重试“在网站中查看”。');return null;}
  const timer=root.setTimeout(()=>{pending.delete(token);sourceStatus('网站连接未完成。请重试，或在网站中导入原报表；本机数据未变。');},45000);pending.set(token,{popup,origin:url.origin,bundle,timer});sourceStatus('正在打开网站并读取本机数据…');return popup;
 }
 let incoming=null,finished=false,receiverTimer;
 if(root.location&&root.document){const token=new URLSearchParams(root.location.hash.slice(1)).get('operatingTransfer');if(token&&/^[a-f0-9]{48}$/.test(token)&&targetAllowed(root.location.href))incoming={token,opener:root.opener};}
 root.addEventListener?.('message',ev=>{
  const m=ev.data;if(!m||typeof m!=='object')return;
  if(m.type==='uwant:operating-request'){
   const entry=pending.get(m.token);if(!entry||ev.source!==entry.popup||ev.origin!==entry.origin)return;
   // Business values always use the exact owned target origin. '*' is never used for data.
   entry.popup.postMessage({type:'uwant:operating-data',token:m.token,bundle:entry.bundle},entry.origin);
  }else if(m.type==='uwant:operating-accepted'){
   const entry=pending.get(m.token);if(!entry||ev.source!==entry.popup||ev.origin!==entry.origin)return;root.clearTimeout(entry.timer);pending.delete(m.token);sourceStatus('已在网站中显示这份经营数据。之后打开原网站链接即可在当前浏览器查看。');
  }else if(m.type==='uwant:operating-data'){
   if(!incoming||finished||ev.origin!=='null'||ev.source!==incoming.opener||m.token!==incoming.token)return;
   try{const result=importBundle(m.bundle);finished=true;root.clearTimeout(receiverTimer);ev.source.postMessage({type:'uwant:operating-accepted',token:incoming.token},'*');receiverStatus(result.persisted?'已读取本机经营数据并保存在当前浏览器，未上传报表。'+(result.keptHistory?' 原历史报表已保留。':''):'已读取本机数据；浏览器未允许保存，关闭前请备份。','success');try{root.opener=null;}catch{}}
   catch(error){receiverStatus(error.message+' 原有数据保留。','error');}
  }
 });
 function begin(){if(!incoming)return;if(!incoming.opener){receiverStatus('本机连接已失效。请回到已载入数据的本机版，点击“在网站中查看”。','error');return;}receiverStatus('正在从本机看板读取已载入的经营数据…','pending');incoming.opener.postMessage({type:'uwant:operating-request',token:incoming.token},'*');receiverTimer=root.setTimeout(()=>{if(!finished)receiverStatus('尚未连到本机数据。请从本机版重新打开，或使用“导入经营报表”。','error');},20000);}
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',begin,{once:true});else root.setTimeout(begin,0);}
 const api={schema,targetAllowed,validateBundle,importBundle,openOnline};root.OperatingTransfer=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
