// Shared Data Contracts & Protocol Definitions

// --- Enums ---
export enum Role {
  SUPER_ADMIN = "SuperAdmin",
  OPS_ADMIN = "OpsAdmin",
  QA_OPERATOR = "QAOperator",
  AUDITOR = "Auditor",
  LAB_ENGINEER = "LabEngineer"
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

export enum JobType {
  IDENTIFY = 'IDENTIFY',
  SELF_TEST = 'SELF_TEST',
  READ_VALIDATE = 'READ_VALIDATE',
  WRITE_TEST_PATTERN = 'WRITE_TEST_PATTERN',
  ERASE = 'ERASE'
}

export enum JobStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum AgentState {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  LOCKED = 'LOCKED',
  DEBUG_MODE = 'DEBUG_MODE'
}

// --- Topic/Event Names ---
export const WsEvents = {
  // Agent -> Server
  HEARTBEAT: 'agent:heartbeat',
  JOB_PROGRESS: 'agent:job_progress',
  JOB_RESULT: 'agent:job_result',
  
  // Server -> Agent
  JOB_DISPATCH: 'server:job_dispatch',
  CMD_ABORT: 'server:cmd_abort',
  CMD_SET_DEBUG: 'server:set_debug' // New Debug Command
};

// --- Payloads ---

export interface HeartbeatPayload {
  serialNumber: string;
  timestamp: string;
  version: string;
  state: AgentState;
  currentJobId: string | null;
  telemetry: {
    memoryUsage: number;
    uptime: number;
  };
}

export interface JobDispatchPayload {
  jobId: string;
  type: JobType;
  timestamp: string;
  // Security: JWT containing { jobId, deviceId, nonce, action, exp }
  token: string; 
  params?: Record<string, any>;
  debugMode?: boolean; // Flag to enable expanded reporting
}

export interface JobProgressPayload {
  jobId: string;
  progress: number; // 0-100
  status: string; // e.g., "Waiting for swipe..."
}

export interface BitAnalysis {
  byteIndex: number;
  hex: string;     // e.g. "42" or "**" if sensitive
  char: string;    // e.g. "B" or "*"
  parityOk: boolean;
  isSensitive: boolean;
}

export interface DebugArtifacts {
  // TECHNICAL ANALYSIS ONLY
  // NO RAW PAN strings allowed here.
  rawHexDump?: string; // "25 42 ** ** ... 3F" (Masked)
  bitAnalysis?: BitAnalysis[];
  lrcCalculated: number;
  lrcActual: number;
  startSentinelIndex: number;
  endSentinelIndex: number;
  fieldSeparatorIndices: number[];
}

export interface JobArtifacts {
  // COMPLIANCE: Strict Allowlist of fields
  track1Masked?: string;
  track1Length?: number;
  track1LRC?: boolean;
  track2Masked?: string;
  track2Length?: number;
  track2LRC?: boolean;
  track3Masked?: string;
  track3Length?: number;
  track3LRC?: boolean;
  integrityHash?: string; // SHA256 of raw data
  writeSuccess?: boolean;
  firmwareVersion?: string;
  
  // Only present if debug session is active
  debug?: DebugArtifacts;
}

export interface JobResultPayload {
  jobId: string;
  serialNumber: string;
  success: boolean;
  code: string; // "SUCCESS", "ERR_TIMEOUT", "ERR_HARDWARE", "ERR_LOCKED"
  message: string;
  timestamp: string;
  artifacts?: JobArtifacts;
}

// --- REST DTOs ---

export interface DeviceDTO {
  id: string;
  serialNumber: string;
  model: string;
  location: string;
  workstation: string;
  status: DeviceStatus;
  lastSeen: string;
}