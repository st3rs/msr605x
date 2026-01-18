import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { JobsService } from '../jobs/jobs.service';
import { WsEvents, JobResultPayload, HeartbeatPayload, JobDispatchPayload } from '../../../../../packages/shared/src/contracts';
import { randomUUID } from 'crypto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);

  // Map SocketID -> SerialNumber
  private activeAgents = new Map<string, string>();
  // Map SerialNumber -> SocketID
  private serialToSocket = new Map<string, string>();

  constructor(
    private readonly devicesService: DevicesService,
    private readonly jobsService: JobsService,
  ) {}

  async handleConnection(client: Socket) {
    const serialNumber = client.handshake.query.serialNumber as string;
    const workstation = client.handshake.query.workstation as string;
    
    if (!serialNumber) {
      client.disconnect();
      return;
    }

    this.logger.log(`Agent connected: ${serialNumber} (${client.id})`);
    this.activeAgents.set(client.id, serialNumber);
    this.serialToSocket.set(serialNumber, client.id);
    
    // Initial registration
    await this.devicesService.registerDevice({
      serialNumber,
      workstation,
      socketId: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    const serialNumber = this.activeAgents.get(client.id);
    if (serialNumber) {
      this.logger.log(`Agent disconnected: ${serialNumber}`);
      await this.devicesService.markOffline(serialNumber);
      this.activeAgents.delete(client.id);
      this.serialToSocket.delete(serialNumber);
    }
  }

  @SubscribeMessage(WsEvents.HEARTBEAT)
  async handleHeartbeat(@MessageBody() payload: HeartbeatPayload) {
    // this.logger.debug(`Heartbeat from ${payload.serialNumber}: ${payload.state}`);
    await this.devicesService.updateHeartbeat(payload.serialNumber, payload);
  }

  @SubscribeMessage(WsEvents.JOB_RESULT)
  async handleJobResult(@MessageBody() payload: JobResultPayload) {
    this.logger.log(`Received job result for ${payload.jobId}: ${payload.code}`);
    await this.jobsService.processJobResult(payload);
  }

  @SubscribeMessage(WsEvents.JOB_PROGRESS)
  async handleJobProgress(@MessageBody() payload: any) {
    // Optional: forward to UI via another gateway or store in Redis
    // this.logger.debug(`Job ${payload.jobId} progress: ${payload.progress}%`);
  }

  // Called by Job Processor
  dispatchJobToAgent(serialNumber: string, jobData: any) {
    const socketId = this.serialToSocket.get(serialNumber);
    if (!socketId) {
      throw new Error(`Device ${serialNumber} not connected`);
    }

    const payload: JobDispatchPayload = {
      jobId: jobData.jobId,
      type: jobData.type,
      timestamp: new Date().toISOString(),
      // MOCK TOKEN: In production, sign this with JWTService
      token: `mock_jwt_${randomUUID()}`,
      params: jobData.params
    };

    this.server.to(socketId).emit(WsEvents.JOB_DISPATCH, payload);
    this.logger.log(`Dispatched job ${jobData.jobId} to ${serialNumber}`);
  }
}
