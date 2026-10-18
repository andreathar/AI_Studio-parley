/** Pinned gate adapters; never install hooks, alter guards or publish approvals. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { WorkflowSnapshot } from './store';
import { projectHandoff, verifyHandoffFiles } from './compatibility';
export type GateName = 'handoff-check.py' | 'successor-check.py' | 'zero-face-gate.py';
export type GateContracts = {
    schema: 'movies-workflow/gate-contracts/v1';
    root: string;
    hashes: Record<string, string>;
};
const sources = ['.claude/hooks/_common.py', '.claude/hooks/zero-face-gate.py'];
/** Capture source hashes only, with no environment, token or media inspection. */
export function captureGateContracts(root: string): GateContracts {
    if (!path.isAbsolute(root) || fs.realpathSync(root) !== root)
        throw Error('Canonical legacy contract root required');
    const hashes = Object.fromEntries(sources.map(relative => { const file = path.join(root, relative); if (fs.realpathSync(file) !== file)
        throw Error('Contract symlink refused'); return [relative, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]; }));
    return { schema: 'movies-workflow/gate-contracts/v1', root, hashes };
}
/** Run exact pure helpers only after bounded receipt/evidence checks. */
export async function evaluateCycleGate(options: {
    snapshot: WorkflowSnapshot;
    receiptId: string;
    gate: GateName;
    evidenceRoot: string;
    contracts: GateContracts;
}) {
    const { snapshot: s, receiptId, gate, contracts } = options;
    if (!['handoff-check.py', 'successor-check.py', 'zero-face-gate.py'].includes(gate) || contracts.schema !== 'movies-workflow/gate-contracts/v1' || JSON.stringify(captureGateContracts(contracts.root)) !== JSON.stringify(contracts))
        throw Error('Gate contract or source revision refused');
    const packet = projectHandoff(s, receiptId), problems = verifyHandoffFiles(options.evidenceRoot, packet.document);
    let result: {
        decision: string;
        problems: string[];
    } = { decision: 'deny', problems };
    if (!problems.length) {
        const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/movies_cycle_gate.py');
        result = await new Promise((resolve, reject) => { const child = execFile('python3', ['-B', script], { timeout: 5000, maxBuffer: 65536 }, (error, stdout) => { if (error) {
            reject(Error('Gate adapter refused'));
            return;
        } try {
            const value = JSON.parse(stdout);
            if (!['allow', 'deny'].includes(value.decision) || !Array.isArray(value.problems))
                throw Error();
            resolve(value);
        }
        catch {
            reject(Error('Gate adapter response refused'));
        } }); child.stdin?.end(JSON.stringify({ contracts, packet, evidenceRoot: options.evidenceRoot, gate })); });
    }
    return { schema: 'movies-workflow/gate-result/v1', projectId: s.projectId, cycleId: s.cycleId, graphRevision: s.graphRevision, stateVersion: s.stateVersion, receiptId, gate, ...result, changesTaskState: false, creativeApproval: false, readOnly: true };
}
