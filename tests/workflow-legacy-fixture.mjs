/** Test-only fixture builder for the existing Python contract consumers. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {WorkflowStore} from '../src/workflow/store.ts';
import {projectLegacyRead,projectHandoff} from '../src/workflow/compatibility.ts';
const root=process.argv[2];if(!root||!path.isAbsolute(root))throw Error('Synthetic fixture root required');
const store=new WorkflowStore(path.join(root,'fixture.sqlite3'),{create:true});
try{
 const first=store.createCycle({projectId:'synthetic-contract',episodeId:'fixture',producerId:'producer',roles:['producer','qc'],handoffPolicy:'movies/handoff/v1',baseline:{head:'fixture',registryDigest:'a'.repeat(64),policyDigest:'b'.repeat(64)},tasks:[{id:'C01',title:'Check synthetic evidence',role:'qc',scope:'local_read_only',criteria:'hash and successor',dependsOn:[]}]});let seq=0;
 const cmd=(type,data={},actor='producer')=>store.command(actor,{cycleId:first.cycleId,expectedVersion:store.snapshot(first.cycleId).stateVersion,idempotencyKey:`op-${++seq}`,type,data});
 cmd('activate');cmd('register_worker',{id:'worker',role:'qc',kind:'worker',provider:'synthetic'});const a=cmd('queue',{taskId:'C01',workerId:'worker'}),ref={assignmentId:a.assignmentId,fence:a.fence};cmd('transport_sent',{assignmentId:a.assignmentId,nativeReceipt:'synthetic'});cmd('accept',ref,'worker');cmd('start',ref,'worker');
 const files=[['review/clip.mp4','synthetic bytes only'],['review/zero-face-log.json',JSON.stringify({files:['review/clip.mp4']})]];fs.mkdirSync(path.join(root,'review'));const artifacts=files.map(([p,bytes])=>{fs.writeFileSync(path.join(root,p),bytes);return {path:p,sha256:createHash('sha256').update(bytes).digest('hex')};});
 const handoff={schema:'movies/handoff/v1',verification:['synthetic check'],changedFiles:artifacts.map(e=>({path:e.path,sha256After:e.sha256})),claims:[{evidence:artifacts[0].path,sha256:artifacts[0].sha256}],nextActions:[{owner:'producer',action:'review next stage'}],stageComplete:false,stageCompleteReason:'',zeroFaceLogs:[{media:artifacts[0].path,log:artifacts[1].path,sha256:artifacts[1].sha256}]};
 const r=cmd('deliver',{...ref,deliveryKey:'one',summary:'synthetic',artifacts,handoff},'worker');cmd('review',{receiptId:r.receiptId,accept:true});const s=store.snapshot(first.cycleId);process.stdout.write(JSON.stringify({snapshot:s,read:projectLegacyRead(s),packet:projectHandoff(s,r.receiptId)}));
}finally{store.close();}
