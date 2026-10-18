export interface Observation {
    schema: 'movies-online-observation/v1';
    project: 'Movies_Projects';
    observedAt: string;
    sequence: number;
    coordinator: {
        state: 'ready' | 'not_running' | 'unknown';
        version: string | null;
    };
    participants: {
        id: string;
        provider: string;
        state: string;
        observedAt: string;
        filmRoleId: string | null;
    }[];
    filmRoles: string[];
    productionTasks: {
        id: string;
        status: string;
        ownerRole: string;
        dependsOn: string[];
    }[];
    counts: {
        chapters: number;
        assets: number;
    };
    digest: string;
}
export const MAX_OBSERVATION_BYTES: number;
export function validateObservation(input: unknown): Observation;
export function canonicalObservation(input: Observation): string;
