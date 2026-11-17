const fs=require('fs'),path=require('path'),vm=require('vm');
const repo=path.resolve(__dirname,'..'),ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(repo,'intelligence.js'),'utf8')+';globalThis.item=promotionCalendar.find(x=>x.id==="mx-buenfin");',ctx);
const item=ctx.item;if(!item||!item.start||!item.end||item.dateState!=='official')throw Error('Missing source-backed Buen Fin dates');
const data=Object.fromEntries(['id','market','country','name','year','start','end','dateState','source','sourceName','checkedAt'].map(k=>[k,item[k]]));
fs.writeFileSync(path.join(repo,'operating-promotion.js'),'/* Public activity dates derived from the unchanged promotion calendar. No operating records. */\n(function(root){const data='+JSON.stringify(data)+';root.OPERATING_PROMOTION_DATA=data;if(typeof module!=="undefined")module.exports=data;})(typeof window==="undefined"?globalThis:window);\n');
console.log('Built public promotion dates from intelligence.js');
