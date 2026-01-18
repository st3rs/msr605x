import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { JobType, JobStatus, JobResultPayload } from '../../../../../packages/shared/src/contracts';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('device-jobs') private jobsQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async createJob(dto: { deviceId: string; type: JobType; initiatedBy: string }) {
    // 1. Get Device to ensure it exists and get serial
    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId }
    });

    if (!device) throw new Error("Device not found");
    if (device.status === 'OFFLINE') throw new Error("Device is offline");

    // 2. Create DB Record
    const job = await this.prisma.job.create({
      data: {
        type: dto.type as any,
        status: JobStatus.PENDING as any,
        deviceId: dto.deviceId,
        initiatedBy: dto.initiatedBy,
      },
    });

    // 3. Add to Redis Queue
    await this.jobsQueue.add('execute', { 
      dbId: job.id, 
      serialNumber: device.serialNumber,
      type: dto.type 
    }, {
      jobId: job.id,
      removeOnComplete: true,
      attempts: 1 // Don't retry automatically on hardware failures immediately
    });

    return job;
  }

  async processJobResult(payload: JobResultPayload) {
    const status = payload.success ? JobStatus.COMPLETED : JobStatus.FAILED;

    await this.prisma.$transaction([
      // Update Job
      this.prisma.job.update({
        where: { id: payload.jobId },
        data: {
          status: status as any,
          result: payload.artifacts as any || { message: payload.message },
          completedAt: new Date(),
        },
      }),
      // Create Audit Log
      this.prisma.auditLog.create({
        data: {
          action: 'JOB_RESULT',
          details: { 
            jobId: payload.jobId, 
            code: payload.code,
            msg: payload.message 
          },
          ipAddress: 'AGENT',
          timestamp: new Date()
        }
      }),
      // Update Device Stats
      this.prisma.device.update({
        where: { serialNumber: payload.serialNumber },
        data: { 
          status: 'ONLINE', // Unlock
          readCount: { increment: payload.success && payload.artifacts?.track1Masked ? 1 : 0 },
          errorCount: { increment: payload.success ? 0 : 1 }
        } 
      })
    ]);
  }
}
