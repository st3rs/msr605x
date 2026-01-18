export enum Role {
  SUPER_ADMIN = "SuperAdmin",
  OPS_ADMIN = "OpsAdmin",
  QA_OPERATOR = "QAOperator",
  AUDITOR = "Auditor",
  LAB_ENGINEER = "LabEngineer"
}

export enum DeviceStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  BUSY = "BUSY",
  ERROR = "ERROR",
  MAINTENANCE = "MAINTENANCE"
}

export enum JobType {
  IDENTIFY = "IDENTIFY",
  SELF_TEST = "SELF_TEST",
  READ_VALIDATE = "READ_VALIDATE",
  WRITE_TEST_PATTERN = "WRITE_TEST_PATTERN",
  ERASE = "ERASE"
}

export enum JobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export interface Device {
  id: string;
  serialNumber: string;
  model: string;
  location: string;
  workstation: string;
  comPort: string;
  status: DeviceStatus;
  lastSeen: string;
  telemetry: {
    readCount: number;
    writeCount: number;
    errorCount: number;
    temperature?: number;
  };
}

export interface Job {
  id: string;
  deviceId: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: {
    success: boolean;
    message: string;
    details?: string; // Masked data
  };
  initiatedBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
}