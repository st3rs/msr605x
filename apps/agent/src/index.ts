import { io, Socket } from "socket.io-client";
import { createHash, randomUUID } from "crypto";
import { 
  WsEvents, 
  JobType, 
  JobResultPayload, 
  JobDispatchPayload, 
  AgentState,
  HeartbeatPayload,
  BitAnalysis
} from "../../../packages/shared/src/contracts";

// --- Configuration ---
const API_URL = process.env.API_URL || "http://localhost:3001/agent";
const SERIAL_NUMBER = process.env.SERIAL_NUMBER || "MSR-QA-LOCAL-01";
const WORKSTATION = process.env.HOSTNAME || "DEV-WS-01";
const AGENT_VERSION = "1.0.0";

console.log(`[Agent] Starting ${SERIAL_NUMBER} on ${WORKSTATION}`);

// --- State Machine ---
let currentState: AgentState = AgentState.IDLE;
let currentJobId: string | null = null;
let processedNonces = new Set<string>(); // Mock replay protection
let debugModeEnabled = false;

// --- Connection ---
const socket: Socket = io(API_URL, {
  query: { serialNumber: SERIAL_NUMBER, workstation: WORKSTATION },
  reconnection: true,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log(`[Agent] Connected to Gateway (ID: ${socket.id})`);
});

socket.on("disconnect", () => {
  console.log("[Agent] Disconnected. Retrying...");
});

socket.on(WsEvents.CMD_SET_DEBUG, (payload: { enabled: boolean }) => {
    console.log(`[Agent] Debug Mode Set: ${payload.enabled}`);
    debugModeEnabled = payload.enabled;
    // We don't change main state to avoid locking, just a flag
});

// --- Heartbeat Loop (5s) ---
setInterval(() => {
  if (!socket.connected) return;

  const heartbeat: HeartbeatPayload = {
    serialNumber: SERIAL_NUMBER,
    timestamp: new Date().toISOString(),
    version: AGENT_VERSION,
    state: currentState,
    currentJobId: currentJobId,
    telemetry: {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      uptime: process.uptime()
    }
  };

  socket.emit(WsEvents.HEARTBEAT, heartbeat);
}, 5000);

// --- Job Handling ---
socket.on(WsEvents.JOB_DISPATCH, async (payload: JobDispatchPayload) => {
  console.log(`[Agent] Received Dispatch: ${payload.type} (${payload.jobId})`);

  // 1. Lock Check
  if (currentState !== AgentState.IDLE) {
    console.warn(`[Agent] Rejecting job ${payload.jobId}: Agent is ${currentState}`);
    sendResult(payload.jobId, false, "ERR_LOCKED", "Agent is busy");
    return;
  }

  // 2. Security Check (Mock JWT Validation)
  if (!payload.token) {
    console.error(`[Agent] Rejecting job ${payload.jobId}: Missing token`);
    sendResult(payload.jobId, false, "ERR_AUTH", "Missing Security Token");
    return;
  }

  // 3. Lock & Execute
  try {
    currentState = AgentState.BUSY;
    currentJobId = payload.jobId;

    // Send generic progress
    socket.emit(WsEvents.JOB_PROGRESS, { 
      jobId: payload.jobId, 
      progress: 10, 
      status: "Initializing hardware..." 
    });

    // Pass debug flag if enabled globally or per-job
    const isDebug = debugModeEnabled || payload.debugMode;
    const result = await executeMockHardwareOp(payload.type, !!isDebug);
    
    sendResult(payload.jobId, true, "SUCCESS", "Operation Successful", result.artifacts);

  } catch (err: any) {
    sendResult(payload.jobId, false, "ERR_HARDWARE", err.message || "Hardware Error");
  } finally {
    // 4. Release Lock
    currentState = AgentState.IDLE;
    currentJobId = null;
  }
});

function sendResult(jobId: string, success: boolean, code: string, message: string, artifacts?: any) {
  const payload: JobResultPayload = {
    jobId,
    serialNumber: SERIAL_NUMBER,
    success,
    code,
    message,
    timestamp: new Date().toISOString(),
    artifacts
  };
  socket.emit(WsEvents.JOB_RESULT, payload);
  console.log(`[Agent] Job ${jobId} finished: ${code}`);
}

// --- Hardware Abstraction Layer (Mock) ---
async function executeMockHardwareOp(type: JobType, debug: boolean): Promise<{ artifacts?: any }> {
  // Simulate hardware latency
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (type === JobType.READ_VALIDATE) {
    // SIMULATED RAW DATA (Normally read from SerialPort)
    const rawTrack1 = "%B1234567812345678^JOHN/DOE^2401101?";
    const rawTrack2 = ";1234567812345678=2401101?";

    const standardArtifacts = {
        track1Masked: maskPan(rawTrack1),
        track1Length: rawTrack1.length,
        track1LRC: true,
        track2Masked: maskPan(rawTrack2),
        track2Length: rawTrack2.length,
        track2LRC: true,
        integrityHash: createHash('sha256').update(rawTrack1 + rawTrack2).digest('hex'),
    };

    if (debug) {
        // COMPLIANCE: Generate Debug Analysis WITHOUT sensitive data
        return {
            artifacts: {
                ...standardArtifacts,
                debug: generateRedactedBitAnalysis(rawTrack1)
            }
        };
    }

    return { artifacts: standardArtifacts };
  }

  if (type === JobType.SELF_TEST) {
    return { artifacts: { firmwareVersion: "v2.4.1-stable" } };
  }

  return {};
}

// Masking Utility: Show first 6, last 4, mask everything else
function maskPan(trackData: string): string {
    return trackData.replace(/([0-9]{6})([0-9]+)([0-9]{4})/, (match, p1, p2, p3) => {
        return `${p1}${'*'.repeat(p2.length)}${p3}`;
    });
}

function generateRedactedBitAnalysis(rawTrack: string): any {
    // Generate a Byte-level analysis but REDACT the PAN
    // 1. Identify PAN region
    const panRegex = /%B([0-9]+)\^/;
    const match = rawTrack.match(panRegex);
    let panStartIndex = -1;
    let panEndIndex = -1;

    if (match) {
        panStartIndex = 2; // After %B
        panEndIndex = 2 + match[1].length;
    }

    const analysis: BitAnalysis[] = [];
    const hexDumpParts: string[] = [];

    for (let i = 0; i < rawTrack.length; i++) {
        const char = rawTrack[i];
        const isSensitive = (i >= panStartIndex && i < panEndIndex);
        
        // Mock Parity Check (randomly fail 1% for demo)
        const parityOk = Math.random() > 0.01; 

        // Masking Logic
        const displayChar = isSensitive ? '*' : char;
        const displayHex = isSensitive ? '**' : char.charCodeAt(0).toString(16).toUpperCase();

        analysis.push({
            byteIndex: i,
            hex: displayHex,
            char: displayChar,
            parityOk,
            isSensitive
        });
        
        hexDumpParts.push(displayHex);
    }

    return {
        rawHexDump: hexDumpParts.join(' '),
        bitAnalysis: analysis,
        lrcCalculated: 0x3F, // Mock
        lrcActual: 0x3F,
        startSentinelIndex: 0,
        endSentinelIndex: rawTrack.length - 1,
        fieldSeparatorIndices: [panEndIndex]
    };
}
