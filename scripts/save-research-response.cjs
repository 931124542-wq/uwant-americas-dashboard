#!/usr/bin/env node
/* Preserve complete source JSON without ever truncating or replacing raw evidence. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function save({workspace,file,body}){
 if(!workspace||!/^[A-Za-z0-9][A-Za-z0-9_.-]*\.json$/.test(file||''))throw Error('Explicit workspace and plain JSON filename required');
 const root=fs.realpathSync(workspace),repo=fs.realpathSync(path.join(__dirname,'..'));
 if(root===repo||root.startsWith(repo+path.sep))throw Error('Private source responses cannot be saved in the public repository');
 const parsed=JSON.parse(body);if(!parsed.request||!parsed.response)throw Error('Preserve both request and response');
 const raw=path.join(root,'raw'),staging=path.join(root,'staging');for(const d of [raw,staging]){fs.mkdirSync(d,{recursive:true});if(!fs.realpathSync(d).startsWith(root+path.sep))throw Error('Source directories must stay inside the private workspace');}
 const target=path.join(raw,file);if(fs.existsSync(target))throw Error('Existing raw evidence is immutable: '+file);
 const temp=path.join(staging,crypto.randomUUID()+'.json'),fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,body,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 const actual=fs.readFileSync(temp,'utf8');if(actual!==body)throw Error('Incomplete staged response');JSON.parse(actual);
 // Hard linking is atomic and fails on an existing destination, including a race.
 fs.linkSync(temp,target);return {file,bytes:Buffer.byteLength(actual),sha256:crypto.createHash('sha256').update(actual).digest('hex'),overwroteExisting:false};
}
module.exports=save;
if(require.main===module){const a=process.argv.slice(2),get=k=>a[a.indexOf(k)+1];if(!a.includes('--workspace')||!a.includes('--file'))throw Error('--workspace and --file required');console.log(JSON.stringify(save({workspace:get('--workspace'),file:get('--file'),body:fs.readFileSync(0,'utf8')})));}
