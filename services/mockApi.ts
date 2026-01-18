import { Device, DeviceStatus, Job, JobStatus, JobType, Role, AuditLogEntry } from '../types';

// Initial Mock Data
const DEVICES: Device[] = [
  {
    id: 'dev_01',
    serialNumber: 'MSR-X-9982',
    model: 'MSR605X',
    location: 'Lab A - NYC',
    workstation: 'WS-QA-01',
    comPort: 'COM3',
    status: DeviceStatus.ONLINE,
    lastSeen: new Date().toISOString(),
    telemetry: { readCount: 1240, writeCount: 450, errorCount: 12 }
  },
  {
    id: 'dev_02',
    serialNumber: 'MSR-X-4421',
    model: 'MSR605X',
    location: 'Lab B - London',
    workstation: 'WS-QA-04',
    comPort: '/dev/ttyUSB0',
    status: DeviceStatus.BUSY,
    lastSeen: new Date().toISOString(),
    telemetry: { readCount: 8900, writeCount: 200, errorCount: 5 }
  },
  {
    id: 'dev_03',
    serialNumber: 'MSR-X-1102',
    model: 'MSR605X',
    location: 'Lab A - NYC',
    workstation: 'WS-QA-02',
    comPort: 'COM4',
    status: DeviceStatus.OFFLINE,
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
    telemetry: { readCount: 50, writeCount: 0, errorCount: 0 }
  }
];

const JOBS: Job[] = [
  {
    id: 'job_998',
    deviceId: 'dev_01',
    type: JobType.SELF_TEST,
    status: JobStatus.COMPLETED,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3590000).toISOString(),
    initiatedBy: 'QA_USER_1',
    result: { success: true, message: 'Self test passed. Firmware v2.1' }
  },
  {
    id: 'job_999',
    deviceId: 'dev_02',
    type: JobType.READ_VALIDATE,
    status: JobStatus.PROCESSING,
    createdAt: new Date(Date.now() - 10000).toISOString(),
    updatedAt: new Date(Date.now() - 10000).toISOString(),
    initiatedBy: 'QA_USER_1'
  }
];

const AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud_101',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    user: 'SuperAdmin',
    action: 'SYSTEM_INIT',
    details: 'System cold boot. Services started.',
    level: 'INFO'
  },
  {
    id: 'aud_102',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    user: 'QA_USER_1',
    action: 'JOB_CREATE',
    details: 'Created SELF_TEST for dev_01',
    level: 'INFO'
  },
  {
    id: 'aud_103',
    timestamp: new Date(Date.now() - 500000).toISOString(),
    user: 'System',
    action: 'DEVICE_OFFLINE',
    details: 'dev_03 missed heartbeat',
    level: 'WARN'
  }
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const MockApi = {
  getDevices: async (): Promise<Device[]> => {
    await delay(400);
    return [...DEVICES];
  },

  getJobs: async (): Promise<Job[]> => {
    await delay(300);
    return [...JOBS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    await delay(300);
    return [...AUDIT_LOGS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  createJob: async (deviceId: string, type: JobType, user: string): Promise<Job> => {
    await delay(500);
    const newJob: Job = {
      id: `job_${Math.floor(Math.random() * 10000)}`,
      deviceId,
      type,
      status: JobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initiatedBy: user
    };
    JOBS.unshift(newJob);
    
    // Simulate async processing
    setTimeout(() => {
        newJob.status = JobStatus.PROCESSING;
        // Update device status
        const device = DEVICES.find(d => d.id === deviceId);
        if (device) device.status = DeviceStatus.BUSY;
        
        setTimeout(() => {
            newJob.status = JobStatus.COMPLETED;
            newJob.updatedAt = new Date().toISOString();
            if (device) device.status = DeviceStatus.ONLINE;
            
            // Generate mock result
            if (type === JobType.READ_VALIDATE) {
                newJob.result = {
                    success: true,
                    message: 'Validation Successful',
                    details: 'T1: %B5432********1234^M? T2: ;5432********1234? (MASKED)'
                };
            } else if (type === JobType.WRITE_TEST_PATTERN) {
                 newJob.result = { success: true, message: 'Test pattern written (ISO 7811)' };
            } else {
                 newJob.result = { success: true, message: 'Command executed successfully' };
            }
            
            AUDIT_LOGS.unshift({
                id: `aud_${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: 'System',
                action: 'JOB_COMPLETE',
                details: `Job ${newJob.id} completed with success`,
                level: 'INFO'
            });

        }, 4000); // Job takes 4s
    }, 1000); // Job starts after 1s

    AUDIT_LOGS.unshift({
        id: `aud_${Date.now()}_req`,
        timestamp: new Date().toISOString(),
        user,
        action: 'JOB_CREATE',
        details: `Requested ${type} for device ${deviceId}`,
        level: 'INFO'
    });

    return newJob;
  }
};