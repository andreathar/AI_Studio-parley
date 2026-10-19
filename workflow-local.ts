/** Human-operated local entry; no env credentials, autostart or process replacement. */
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import readline from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { APPROVED_ROOT, APPROVAL_REF, CYCLE_ID, PROJECT_ID, MOVIES_ROOT, prepareApprovedCycle, loadApprovedSelection } from './src/workflow/approvedCycle';
import { captureGateContracts, type GateContracts } from './src/workflow/cycleGates';
import { startSessionWorkflow } from './src/workflow/sessionServer';
import { validateSchema } from './src/workflow/schema';
/** Create only missing runtime ancestors, refusing symlinks without changing owners. */
function privateParents(directory: string): void {
    const missing: string[] = [];
    let cursor = directory;
    while (!fs.existsSync(cursor)) {
        missing.push(cursor);
        cursor = path.dirname(cursor);
    }
    if (fs.realpathSync(cursor) !== cursor)
        throw Error('Runtime ancestor refused');
    for (const child of missing.reverse())
        fs.mkdirSync(child, { mode: 0o700 });
}
/** Prepare or run the approved cycle; pairing approval is accepted only on a TTY. */
export async function localMain(args: string[]): Promise<void> {
    try {
        if (args.length === 1 && args[0] === 'prepare') {
            privateParents(path.dirname(APPROVED_ROOT));
            const hash = (relative: string) => createHash('sha256').update(fs.readFileSync(path.join(MOVIES_ROOT, relative))).digest('hex');
            const baseline = { head: execFileSync('git', ['-C', MOVIES_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), registryDigest: hash('agents/registry.json'), policyDigest: hash('AGENTS.md') };
            const prepared = await prepareApprovedCycle({ root: APPROVED_ROOT, baseline });
            fs.writeFileSync(path.join(APPROVED_ROOT, 'gate-contracts-v1.json'), JSON.stringify(captureGateContracts(MOVIES_ROOT), null, 2) + '\n', { flag: 'wx', mode: 0o600 });
            process.stdout.write(JSON.stringify({ prepared: true, projectId: PROJECT_ID, cycleId: CYCLE_ID, status: prepared.snapshot.status, stateVersion: 0, backupRestored: true, approvalRef: APPROVAL_REF }) + '\n');
            return;
        }
        if (args.length === 1 && args[0] === 'inspect') {
            const selection = loadApprovedSelection(path.join(APPROVED_ROOT, 'selection-v1.json'));
            const db = new DatabaseSync(selection.dbPath, { readOnly: true });
            try {
                validateSchema(db);
                const row = db.prepare('SELECT id,project_id,status,graph_revision,state_version FROM cycles WHERE id=? AND project_id=?').get(CYCLE_ID, PROJECT_ID);
                if (!row)
                    throw Error();
                process.stdout.write(JSON.stringify(row) + '\n');
            }
            finally {
                db.close();
            }
            return;
        }
        if (args.length !== 5 || args[0] !== 'serve' || args[1] !== '--port' || !/^\d+$/.test(args[2]) || args[3] !== '--expected-version' || !/^\d+$/.test(args[4]) || !process.stdin.isTTY || !process.stdout.isTTY)
            throw Error('Human terminal required');
        const port = Number(args[2]), expectedStateVersion = Number(args[4]);
        if (port < 0 || port > 65535 || !Number.isSafeInteger(expectedStateVersion))
            throw Error();
        const selection = { ...loadApprovedSelection(path.join(APPROVED_ROOT, 'selection-v1.json')), expectedStateVersion };
        const contractsFile = path.join(APPROVED_ROOT, 'gate-contracts-v1.json');
        if (fs.realpathSync(contractsFile) !== contractsFile || (fs.statSync(contractsFile).mode & 0o077) !== 0)
            throw Error();
        const contracts = JSON.parse(fs.readFileSync(contractsFile, 'utf8')) as GateContracts;
        if (contracts.root !== MOVIES_ROOT)
            throw Error();
        const instance = await startSessionWorkflow({ selection, port, onPending: id => process.stdout.write('Identificador público pendente: ' + id + '\nCompare com a página; somente se coincidir, digite: aprovar ' + id + '\n'), gateContext: { contracts, evidenceRoot: MOVIES_ROOT } });
        process.stdout.write(JSON.stringify({ url: instance.url, projectId: PROJECT_ID, cycleId: CYCLE_ID, paired: false, sessionMinutes: 30, dispatch: false }) + '\n');
        const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
        let closing = false;
        const close = async () => { if (closing)
            return; closing = true; terminal.close(); await instance.close(); };
        terminal.on('line', line => { const match = /^aprovar (PAIR-[a-f0-9]{16})$/.exec(line.trim()); if (match) {
            process.stdout.write(instance.approvePairing(match[1]) ? 'Pareamento aprovado por 30 minutos para producer-andre neste ciclo.\n' : 'Pareamento recusado.\n');
        }
        else if (line.trim() === 'encerrar')
            void close();
        else
            process.stdout.write('Comandos: aprovar <identificador público> | encerrar\n'); });
        terminal.once('close', () => { void close(); });
        for (const signal of ['SIGINT', 'SIGTERM'] as const)
            process.once(signal, () => { void close(); });
    }
    catch {
        process.stderr.write('Local workflow operation refused.\n');
        process.exitCode = 2;
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    void localMain(process.argv.slice(2));
