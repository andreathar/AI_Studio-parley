import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { WorkflowStore } from '../src/workflow/store.ts';
let adapters, identity, host;
test('versioned adapters, verified identity resolver and selected database host exist', async () => {
  await assert.doesNotReject(async () => {
    adapters = await import('../src/workflow/compatibility.ts');
    identity = await import('../src/workflow/identity.ts');
    host = await import('../src/workflow/selectedServer.ts');
  });
});
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture(t, policy = 'movies/handoff/v1') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-adapter-'));
  const dbPath = path.join(dir, 'new-cycle.sqlite3');
  const store = new WorkflowStore(dbPath, {create:true});
  const spec = {projectId:'synthetic-project',episodeId:'fixture-film',producerId:'verified-producer',roles:['producer','continuity','qc'],baseline:{head:'synthetic',registryDigest:'a'.repeat(64),policyDigest:'b'.repeat(64)},handoffPolicy:policy,tasks:[{id:'C01',title:'Synthetic review',role:'continuity',scope:'local_read_only',criteria:'checked report',dependsOn:[]}]};
  const s = store.createCycle(spec);
  t.after(()=>store.close());
  let n=0;
  const cmd=(type,data={},actor='verified-producer')=>store.command(actor,{cycleId:s.cycleId,expectedVersion:store.snapshot(s.cycleId).stateVersion,idempotencyKey:`fixture-${++n}`,type,data});
  const running=()=>{cmd('activate');cmd('register_worker',{id:'worker',role:'continuity',provider:'synthetic',kind:'worker'});const a=cmd('queue',{taskId:'C01',workerId:'worker'});cmd('transport_sent',{assignmentId:a.assignmentId,nativeReceipt:'fixture-observation'});cmd('accept',aRef(a),'worker');cmd('start',aRef(a),'worker');return a;};
  return {dir,dbPath,store,s,cmd,running};
}
const aRef=a=>({assignmentId:a.assignmentId,fence:a.fence});
function evidence(dir) {
  const bytes=Buffer.from('synthetic report\n');fs.mkdirSync(path.join(dir,'reports'));fs.writeFileSync(path.join(dir,'reports/check.txt'),bytes);
  return {schema:'movies/handoff/v1',verification:['synthetic content check passed'],changedFiles:[{path:'reports/check.txt',sha256After:sha(bytes)}],claims:[{evidence:'reports/check.txt',sha256:sha(bytes)}],nextActions:[{owner:'verified-producer',action:'review next stage'}],stageComplete:false,stageCompleteReason:'',zeroFaceLogs:[]};
}
test('new cycles pin evidence policy and refuse incomplete receipts without changing state',t=>{
 const f=fixture(t);assert.equal(f.store.snapshot(f.s.cycleId).handoffPolicy,'movies/handoff/v1');const a=f.running();const before=f.store.snapshot(f.s.cycleId);
 const data={...aRef(a),deliveryKey:'missing',summary:'unverified',artifacts:[{path:'reports/check.txt',sha256:'c'.repeat(64)}]};
 assert.throws(()=>f.cmd('deliver',data,'worker'),/handoff/i);assert.deepEqual(f.store.snapshot(f.s.cycleId),before);
 const h=evidence(f.dir);for(const patch of [{verification:[]},{nextActions:[]},{claims:[{evidence:'reviews/clip.mp4',sha256:'c'.repeat(64)}]},{changedFiles:[{path:'../outside',sha256After:'c'.repeat(64)}]}]){
  assert.throws(()=>f.cmd('deliver',{...data,handoff:{...h,...patch}},'worker'));assert.deepEqual(f.store.snapshot(f.s.cycleId),before);
 }
});
test('one SQLite receipt projects legacy gate and reader shapes with explicit cycle authority',t=>{
 const f=fixture(t);const a=f.running(),h=evidence(f.dir);const r=f.cmd('deliver',{...aRef(a),deliveryKey:'report',summary:'checked synthetic report',artifacts:h.changedFiles.map(x=>({path:x.path,sha256:x.sha256After})),handoff:h},'worker');
 const pending=adapters.projectLegacyRead(f.store.snapshot(f.s.cycleId));assert.equal(pending.tasks[0].workflowStatus,'in_review');assert.equal(pending.tasks[0].status,'blocked');assert.match(pending.tasks[0].blocker,/review/);
 f.cmd('review',{receiptId:r.receiptId,accept:true});const s=f.store.snapshot(f.s.cycleId),read=adapters.projectLegacyRead(s),packet=adapters.projectHandoff(s,r.receiptId);
 assert.equal(read.schema,'movies-workflow/legacy-read/v1');assert.equal(read.authority,'sqlite-cycle');assert.equal(read.legacyHistoricalAuthority,'unchanged');assert.equal(read.stateVersion,s.stateVersion);assert.equal(read.tasks[0].status,'completed');assert.equal(read.tasks[0].id,'C01');assert.equal(read.creativeApprovalsInherited,false);
 assert.deepEqual(packet.document.verification,h.verification);assert.equal(packet.document.agentRole,'continuity');assert.equal(packet.document.changedFiles[0].sha256After,h.changedFiles[0].sha256After);assert.equal(packet.receiptId,r.receiptId);assert.equal(packet.stateVersion,s.stateVersion);
 assert.deepEqual(adapters.verifyHandoffFiles(f.dir,packet.document),[]);fs.writeFileSync(path.join(f.dir,'reports/check.txt'),'changed');assert.ok(adapters.verifyHandoffFiles(f.dir,packet.document).length);
 assert.throws(()=>adapters.projectHandoff(s,'missing'));
});
test('verified resolver denies UID/lane names and mismatched, expired, unregistered or read-only grants',async t=>{
 const f=fixture(t);const request={headers:{'x-actor-id':'verified-producer'},uid:1000,lane:'producer'};
 const good={issuer:'test-verifier',subject:'synthetic-subject',actorId:'verified-producer',projectId:f.s.projectId,cycleId:f.s.cycleId,expiresAt:Date.now()+60000,capabilities:['read','command']};
 const resolver=verify=>identity.createVerifiedResolver({store:f.store,projectId:f.s.projectId,cycleId:f.s.cycleId,trustedIssuer:'test-verifier',verify});
 assert.equal(await resolver(undefined)(request),null);
 for(const patch of [{issuer:'untrusted'},{subject:''},{projectId:'other'},{cycleId:'other'},{expiresAt:0},{actorId:'unknown'},{capabilities:['producer']}])assert.equal(await resolver(async()=>({...good,...patch}))(request),null);
 assert.deepEqual(await resolver(async()=>good)(request),{actorId:'verified-producer',readOnly:false});
 assert.equal((await resolver(async()=>({...good,capabilities:['read']}))(request)).readOnly,true);
});
test('selected host requires explicit authorization, current schema and pinned identity with no fallback',async t=>{
 const f=fixture(t);f.store.close();const selection={schema:'movies-workflow/selection/v1',dbPath:f.dbPath,projectId:f.s.projectId,cycleId:f.s.cycleId,expectedStateVersion:0,expectedGraphRevision:1,approvalRef:'synthetic-only'};
 await assert.rejects(host.startSelectedWorkflow({selection}),/selection/i);
 const options={selection,authorizeSelection:async()=>true};
 for(const patch of [{dbPath:path.join(f.dir,'absent.sqlite3')},{projectId:'other'},{cycleId:'missing'},{expectedStateVersion:9}])await assert.rejects(host.startSelectedWorkflow({...options,selection:{...selection,...patch}}));
 assert.equal(fs.existsSync(path.join(f.dir,'absent.sqlite3')),false);assert.equal(fs.existsSync(f.dbPath+'.writer'),false);
 const instance=await host.startSelectedWorkflow(options);t.after(()=>instance.close());const endpoint=instance.url+`api/workflow/v1/cycles/${f.s.cycleId}`;
 assert.equal((await fetch(endpoint)).status,403);assert.equal((await fetch(instance.url+'api/mcp')).status,404);assert.equal((await fetch(instance.url+'.env')).status,404);assert.match(await (await fetch(instance.url)).text(),/workflow.css/);assert.equal((await fetch(instance.url+'workflow.css')).status,200);
});
test('selected UI/API/SQLite and adapters share committed revision; synthetic authorization and review only',async t=>{
 const f=fixture(t);const a=f.running(),h=evidence(f.dir);const r=f.cmd('deliver',{...aRef(a),deliveryKey:'end-to-end',summary:'synthetic',artifacts:h.changedFiles.map(x=>({path:x.path,sha256:x.sha256After})),handoff:h},'worker');const initial=f.store.snapshot(f.s.cycleId);f.store.close();
 const selection={schema:'movies-workflow/selection/v1',dbPath:f.dbPath,projectId:f.s.projectId,cycleId:f.s.cycleId,expectedStateVersion:initial.stateVersion,expectedGraphRevision:1,approvalRef:'synthetic-acceptance'};
 let permit=false;
 const instance=await host.startSelectedWorkflow({selection,authorizeSelection:async()=>true,trustedIssuer:'fixture',verifyIdentity:async()=>({issuer:'fixture',subject:'test-only',actorId:'verified-producer',projectId:f.s.projectId,cycleId:f.s.cycleId,expiresAt:Date.now()+60000,capabilities:['read','command']}),verifyReview:async packet=>permit&&adapters.verifyHandoffFiles(f.dir,packet.document).length===0});t.after(()=>instance.close());
 const endpoint=instance.url+`api/workflow/v1/cycles/${f.s.cycleId}`;let n=0;const post=()=>fetch(endpoint+'/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cycleId:f.s.cycleId,expectedVersion:initial.stateVersion,idempotencyKey:`http-${++n}`,type:'review',data:{receiptId:r.receiptId,accept:true}})});
 assert.equal((await post()).status,409);assert.equal((await(await fetch(endpoint)).json()).stateVersion,initial.stateVersion);permit=true;assert.equal((await post()).status,200);
 const s=await(await fetch(endpoint)).json(),read=await(await fetch(endpoint+'/compat/legacy-read/v1')).json(),packet=await(await fetch(endpoint+`/compat/handoff/v1/${r.receiptId}`)).json();assert.equal(s.tasks[0].status,'completed');assert.equal(read.stateVersion,s.stateVersion);assert.equal(packet.stateVersion,s.stateVersion);assert.equal(read.tasks[0].workflowStatus,'completed');
 assert.match(await(await fetch(instance.url+'bootstrap.mjs')).text(),new RegExp(f.s.cycleId));assert.equal((await fetch(endpoint,{headers:{Origin:'https://example.invalid'}})).status,403);
 await instance.close();const reopened=new WorkflowStore(f.dbPath);assert.equal(reopened.snapshot(f.s.cycleId).stateVersion,s.stateVersion);reopened.close();
});
test('media evidence needs a bound zero-face log; file checks reject missing, symlinked and changed evidence',t=>{
 const f=fixture(t),a=f.running(),h=evidence(f.dir);fs.mkdirSync(path.join(f.dir,'reviews'));const clip=Buffer.from('non-sensitive synthetic bytes, not a real media file');const log=Buffer.from(JSON.stringify({files:['reviews/clip.mp4']}));fs.writeFileSync(path.join(f.dir,'reviews/clip.mp4'),clip);fs.writeFileSync(path.join(f.dir,'reviews/zero-face-log.json'),log);
 const artifacts=[{path:'reports/check.txt',sha256:h.changedFiles[0].sha256After},{path:'reviews/clip.mp4',sha256:sha(clip)},{path:'reviews/zero-face-log.json',sha256:sha(log)}];
 const handoff={...h,claims:[...h.claims,{evidence:'reviews/clip.mp4',sha256:sha(clip)}],zeroFaceLogs:[{media:'reviews/clip.mp4',log:'reviews/zero-face-log.json',sha256:sha(log)}]};
 const r=f.cmd('deliver',{...aRef(a),deliveryKey:'media-fixture',summary:'synthetic byte fixture only',artifacts,handoff},'worker');const packet=adapters.projectHandoff(f.store.snapshot(f.s.cycleId),r.receiptId);assert.deepEqual(adapters.verifyHandoffFiles(f.dir,packet.document),[]);
 fs.unlinkSync(path.join(f.dir,'reviews/zero-face-log.json'));fs.symlinkSync(path.join(f.dir,'reports/check.txt'),path.join(f.dir,'reviews/zero-face-log.json'));assert.ok(adapters.verifyHandoffFiles(f.dir,packet.document).length);
 fs.unlinkSync(path.join(f.dir,'reviews/zero-face-log.json'));fs.writeFileSync(path.join(f.dir,'reviews/zero-face-log.json'),JSON.stringify({files:[]}));assert.ok(adapters.verifyHandoffFiles(f.dir,packet.document).length);
});
test('selected host refuses legacy, older normalized and non-Movies policy databases without migration',async t=>{
 const {DatabaseSync}=await import('node:sqlite'),{applyMigrations}=await import('../src/workflow/schema.ts');const f=fixture(t,'none');f.store.close();
 const legacy=path.join(f.dir,'legacy.sqlite3'),old=path.join(f.dir,'older.sqlite3');for(const [file,make]of[[legacy,db=>db.exec('CREATE TABLE project_state(payload TEXT)')],[old,db=>applyMigrations(db,2)]]){const db=new DatabaseSync(file);make(db);db.close();}
 const selection={schema:'movies-workflow/selection/v1',dbPath:f.dbPath,projectId:f.s.projectId,cycleId:f.s.cycleId,expectedStateVersion:0,expectedGraphRevision:1,approvalRef:'fixture'};
 for(const dbPath of[f.dbPath,legacy,old]){const before=sha(fs.readFileSync(dbPath));await assert.rejects(host.startSelectedWorkflow({selection:{...selection,dbPath},authorizeSelection:async()=>true}));assert.equal(sha(fs.readFileSync(dbPath)),before);assert.equal(fs.existsSync(dbPath+'.writer'),false);}
});
test('selected database backup/restore preserves policy, receipt evidence and committed adapter versions',async t=>{
 const {backupWorkflow,restoreWorkflow}=await import('../src/workflow/migration.ts');const f=fixture(t),a=f.running(),h=evidence(f.dir);const r=f.cmd('deliver',{...aRef(a),deliveryKey:'backup',summary:'synthetic',artifacts:h.changedFiles.map(x=>({path:x.path,sha256:x.sha256After})),handoff:h},'worker');const expected=f.store.snapshot(f.s.cycleId);
 const backup=path.join(f.dir,'consistent.sqlite3'),restored=path.join(f.dir,'restored.sqlite3');const receipt=await backupWorkflow(f.dbPath,backup);assert.equal(receipt.schemaVersion,3);await restoreWorkflow(backup,restored);const copy=new WorkflowStore(restored,{migrate:false});t.after(()=>copy.close());assert.deepEqual(copy.snapshot(f.s.cycleId),expected);assert.deepEqual(adapters.projectHandoff(copy.snapshot(f.s.cycleId),r.receiptId),adapters.projectHandoff(expected,r.receiptId));await assert.rejects(restoreWorkflow(backup,restored));
});
test('zero-face validation never reads a log rejected for escaping the evidence root',t=>{
 const f=fixture(t),h=evidence(f.dir);const outside=path.join(f.dir,'outside.json');fs.writeFileSync(outside,'{"files":[]}');fs.symlinkSync(outside,path.join(f.dir,'zero-face-log.json'));
 const document={...h,agentRole:'qc',taskId:'C01',summary:'fixture',zeroFaceLogs:[{media:'clip.mp4',log:'zero-face-log.json',sha256:sha('{"files":[]}')}]};const read=fs.readFileSync;let forbiddenReads=0;
 fs.readFileSync=function(file,...args){if(String(file)===path.join(f.dir,'zero-face-log.json'))forbiddenReads++;return read.call(this,file,...args);};try{assert.ok(adapters.verifyHandoffFiles(f.dir,document).length);assert.equal(forbiddenReads,0);}finally{fs.readFileSync=read;}
});
