import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceStatus, HeartbeatPayload } from '../../../../../packages/shared/src/contracts';

// In-memory session store (In prod, use Redis)
interface DebugSession {
    deviceId: string;
    userId: string;
    expiresAt: Date;
    reason: string;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private debugSessions = new Map<string, DebugSession>(); // DeviceId -> Session

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.device.findMany({
        orderBy: { lastSeen: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async getDeviceJobs(id: string) {
    return this.prisma.job.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async registerDevice(data: { serialNumber: string; workstation: string; socketId: string }) {
    await this.prisma.device.upsert({
      where: { serialNumber: data.serialNumber },
      update: {
        status: DeviceStatus.ONLINE,
        lastSeen: new Date(),
        workstation: data.workstation, // Update host if moved
      },
      create: {
        serialNumber: data.serialNumber,
        model: 'MSR605X',
        workstation: data.workstation,
        location: 'Default Location',
        comPort: 'UNKNOWN',
        status: DeviceStatus.ONLINE,
        lastSeen: new Date(),
      },
    });
  }

  async markOffline(serialNumber: string) {
    await this.prisma.device.update({
      where: { serialNumber },
      data: { status: DeviceStatus.OFFLINE },
    });
  }

  async updateHeartbeat(serialNumber: string, payload: HeartbeatPayload) {
    const statusMap = {
      'IDLE': DeviceStatus.ONLINE,
      'BUSY': DeviceStatus.BUSY,
      'LOCKED': DeviceStatus.BUSY,
      'DEBUG_MODE': DeviceStatus.MAINTENANCE
    };

    await this.prisma.device.update({
      where: { serialNumber },
      data: { 
        lastSeen: new Date(),
        status: statusMap[payload.state] || DeviceStatus.ONLINE
      }
    });
  }

  // --- Debug Session Logic ---

  async startDebugSession(deviceId: string, userId: string, reason: string) {
    const device = await this.findOne(deviceId);
    if (!device) throw new Error("Device not found");
    if (device.status === DeviceStatus.OFFLINE) throw new Error("Device offline");

    // Compliance: Max 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    this.debugSessions.set(deviceId, {
        deviceId,
        userId,
        expiresAt,
        reason
    });

    // Log Audit
    await this.prisma.auditLog.create({
        data: {
            action: "DEBUG_SESSION_START",
            user: { connect: { id: userId } } as any, // Assuming relation exists, or use generic string if not
            details: { deviceId, reason, expiresAt },
            timestamp: new Date(),
            ipAddress: "Unknown"
        }
    });

    this.logger.warn(`Debug Session started for ${deviceId} by ${userId}. Reason: ${reason}`);
    
    // In a real app, we'd emit to the Gateway here to notify the Agent
    return { success: true, expiresAt };
  }

  async endDebugSession(deviceId: string) {
    this.debugSessions.delete(deviceId);
    // Audit Log End...
  }

  isDebugSessionActive(deviceId: string): boolean {
      const session = this.debugSessions.get(deviceId);
      if (!session) return false;
      if (new Date() > session.expiresAt) {
          this.debugSessions.delete(deviceId);
          return false;
      }
      return true;
  }
}
