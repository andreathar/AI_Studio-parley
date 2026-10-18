/** Explicit isolated entry only; never loads the legacy app or environment files. */
import { pathToFileURL } from 'node:url';
import { startIsolatedWorkflow } from './src/workflow/isolatedServer';
export async function isolatedMain(args: string[]): Promise<void> {
    try {
        if (args.length !== 2 && args.length !== 4 || args[0] !== '--workspace' || args.length === 4 && args[2] !== '--port')
            throw Error('Arguments refused');
        const port = args.length === 4 && /^\d+$/.test(args[3]) ? Number(args[3]) : args.length === 2 ? 0 : NaN;
        const instance = await startIsolatedWorkflow({ workspace: args[1], port });
        process.stdout.write(JSON.stringify({ profile: 'synthetic-workflow-isolated', url: instance.url, cycleId: instance.cycleId, http: 'read_only', productionDatabaseChanged: false, dispatchEnabled: false }) + '\n');
        for (const signal of ['SIGINT', 'SIGTERM'] as const)
            process.once(signal, () => { void instance.close().then(() => { process.exitCode = 0; }); });
    }
    catch {
        process.stderr.write('Isolated workflow start refused.\n');
        process.exitCode = 2;
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    void isolatedMain(process.argv.slice(2));
