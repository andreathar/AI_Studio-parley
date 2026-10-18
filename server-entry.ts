export function runtimeProfile(env: NodeJS.ProcessEnv): 'observer' | 'demo' {
    if (env.MOVIES_OBSERVER_ONLY === '1')
        return 'observer';
    if (env.MOVIES_OBSERVER_ONLY === undefined || env.MOVIES_OBSERVER_ONLY === '0')
        return 'demo';
    throw Error('Runtime configuration refused');
}
async function main(): Promise<void> {
    try {
        if (runtimeProfile(process.env) === 'observer') {
            const { startObserver } = await import('./src/server/observerServer');
            await startObserver(process.env);
        }
        else {
            await import('./server');
        }
    }
    catch {
        process.stderr.write('Server start refused.\n');
        process.exitCode = 2;
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    void main();
import { pathToFileURL } from 'node:url';
