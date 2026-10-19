export type Provider = 'claude' | 'codex' | 'gemini' | 'opencode' | 'amp' | 'copilot';

export type LaneState = 'working' | 'idle' | 'stopped';

export interface Lane {
  id: string;
  name: string;
  provider: Provider;
  state: LaneState;
  branch: string;
  worktree: string;
  lastEvent: string;
  lastEventTs: number;
  ownedIssues: string[];
  unreadMail: number;
  unacknowledgedMail: number;
  leases: string[];
  denials: number;
  calls: number;
  tokens: number;
  idleSeconds: number;
  currentTask: string;
  reviewStatus: 'clean' | 'pending' | 'conflict' | 'none';
  liveness: boolean;
  contextUsagePercent: number;
}

export type IssueStatus = 'open' | 'claimed' | 'in_progress' | 'review' | 'completed';
export type IssuePriority = 'critical' | 'high' | 'normal' | 'low';

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  assignee: string | null;
  priority: IssuePriority;
  churnCount: number;
  branch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  path: string;
  owner: string;
  reason: string;
  acquiredAt: string;
  ttlSeconds: number;
}

export interface Message {
  id: number;
  from: string;
  to: string[];
  subject: string;
  body: string;
  threadId: string;
  replyTo?: number;
  ackRequired: boolean;
  acknowledged: boolean;
  read: boolean;
  timestamp: string;
}

export interface Plan {
  id: string;
  title: string;
  proposer: string;
  description: string;
  envelope: {
    maxFiles: number;
    allowedDirectories: string[];
    tokenCap: number;
  };
  status: 'pending_approval' | 'approved' | 'rejected' | 'applied';
  proposedAt: string;
}

export interface Budget {
  tokenCap: number;
  tokensUsed: number;
  callsCap: number;
  callsUsed: number;
  hoursCap: number;
  hoursUsed: number;
  enforced: boolean;
  lastResumedAt?: string;
}

export interface Problem {
  id: string;
  type: 'churn_detected' | 'overdue_claim' | 'advisory_conflict' | 'unacknowledged_mail' | 'inactivity_warning' | 'budget_exhausted';
  severity: 'error' | 'warning' | 'info';
  lane: string;
  detail: string;
  timestamp: string;
}

export interface CoordinationEvent {
  id: string;
  timestamp: string;
  type: 'claim' | 'handoff' | 'wake' | 'refusal' | 'merge' | 'message' | 'reservation' | 'plan';
  lane: string;
  detail: string;
}

export interface TopSummary {
  lanesTotal: number;
  lanesWorking: number;
  lanesIdle: number;
  lanesStopped: number;
  issuesOpen: number;
  issuesClaimed: number;
  issuesInReview: number;
  issuesCompleted: number;
  activeLeases: number;
  budgetUsedPercent: number;
  unresolvedProblems: number;
}

export interface EnvVariable {
  name: string;
  category?: 'Network' | 'Runtime' | 'Integrations' | 'Security';
  value?: string | null;
  isSecret?: boolean;
  isSet: boolean;
  status: 'healthy' | 'warning' | 'error' | 'optional_missing';
  expected?: string;
  description?: string;
  notes?: string;
}

export interface DiagnosticsData {
  status: 'healthy' | 'degraded';
  timestamp: string;
  variables: EnvVariable[];
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    uptimeSeconds: number;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  checks: {
    networkBinding: boolean;
    portConfig: boolean;
    mcpServiceReady: boolean;
    fileSystemEphemeral: boolean;
  };
}

export interface KlingPromptRequest {
  roughPrompt: string;
  version: 'kling-1.6-pro' | 'kling-2.0-master';
  shotType: string;
  cameraMovement: string;
  lightingStyle: string;
  intensity: number;
  sceneNumber: string;
  shotNumber: string;
  character: string;
  descriptor: string;
  project: string;
}

export interface KlingPromptResult {
  enhancedPrompt: string;
  negativePrompt: string;
  cameraMotionSpec: {
    pan: number;
    tilt: number;
    zoom: number;
    horizontal: number;
    vertical: number;
    roll: number;
    speed: string;
  };
  recommendedSettings: {
    mode: string;
    duration: string;
    cfgScale: number;
    aspectRatio: string;
  };
  namingPattern: {
    filename: string;
    assetId: string;
    relativePath: string;
    csvRow: string;
    tags: string[];
  };
  modelUsed: string;
  handoffTaskJson: any;
}

export interface KlingVisionRequest {
  imageBase64: string;
  mimeType: string;
  directorFeedback: string;
  currentPrompt?: string;
  currentFilename?: string;
  sceneNumber?: string;
  shotNumber?: string;
  character?: string;
}

export interface KlingVisionResult {
  visualCritique: {
    compositionQuality: string;
    lightingAndColor: string;
    temporalMotionEvaluation: string;
    klingArtifactsDetected: string[];
    directorFeedbackAddressed: string;
  };
  revisedPrompt: string;
  negativePrompt: string;
  recommendedCameraAdjustment: string;
  namingPattern: {
    revisionFilename: string;
    revisionAssetId: string;
    relativePath: string;
    csvRow: string;
    tags: string[];
  };
  modelUsed: string;
  handoffTaskJson: any;
}

