export function localOrigin(location: { protocol: string; hostname: string }): boolean;
export function validateSnapshot(input: unknown): Record<string, unknown>;
export function mountLocalMoviesView(root: HTMLElement, initialSnapshot?: unknown, options?: {refresh?:()=>Promise<unknown>}): () => void;
