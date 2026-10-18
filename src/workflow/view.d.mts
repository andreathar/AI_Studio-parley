import type {CommandType,CommandData} from './store';
export interface WorkflowReadModel {schema:'movies-workflow/read/v1';projectId:string;cycleId:string;status:string;graphRevision:number;stateVersion:number;tasks:Array<{id:string;title:string;role:string;status:string;dependsOn:string[]}>;assignments:Array<{task_id:string;state:string;transport_state:string;transport_ack:string|null}>;receipts:unknown[]}
export interface WorkflowClient {state:{snapshot:WorkflowReadModel|null;stale:boolean;notice:string};refresh():Promise<WorkflowReadModel>;command<K extends CommandType>(type:K,data:CommandData[K]):Promise<{stateVersion:number}>;retryPending():Promise<{stateVersion:number}>}
export function createWorkflowClient(options:{baseUrl:string;projectId:string;cycleId:string;fetch?:typeof fetch}):WorkflowClient;
export function renderWorkflow(snapshot:WorkflowReadModel|null,options?:{stale?:boolean;notice?:string}):string;
export function mountWorkflowView(root:HTMLElement,client:WorkflowClient):()=>void;
