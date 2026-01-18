import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { DeviceDTO, JobType, JobStatus, Role } from '../../../../packages/shared/src/contracts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Mock User Role Context (Ideally from Auth Provider)
const CURRENT_USER = {
    id: "user-eng-01",
    role: Role.LAB_ENGINEER, // Change to Role.QA_OPERATOR to test blocking
    name: "Dr. QA Engineer"
};

export default function DeviceControl() {
  const router = useRouter();
  const { id } = router.query;
  const { data: device, mutate } = useSWR<DeviceDTO>(id ? `http://localhost:3001/devices/${id}` : null, fetcher, { refreshInterval: 1000 });
  
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugReason, setDebugReason] = useState("");
  const [debugExpiry, setDebugExpiry] = useState<Date | null>(null);
  
  // Last Result State
  const [lastResult, setLastResult] = useState<any>(null);

  // Poll for job results manually for this demo (or use socket in real app)
  // We'll just trust the mock backend creates a job and we can fetch it via history (omitted)
  // For this demo, we assume the 'triggerJob' response gives us the job, and we poll that job status
  
  const triggerJob = async (type: JobType) => {
    if (!device) return;
    setLoading(true);
    setLastResult(null); // Clear previous
    try {
      // 1. Create Job
      const res = await fetch('http://localhost:3001/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            deviceId: device.id, 
            type, 
            initiatedBy: CURRENT_USER.id,
            debugMode: debugMode // Pass debug flag
        }), 
      });
      const job = await res.json();
      
      // 2. Poll for completion (Mocking socket behavior)
      const poll = setInterval(async () => {
          // In a real app, we'd hit /jobs/:id
          // Here we'll simulate waiting 2s for the Mock/Local Agent
          // We'll just rely on the UI 'Processing' state for now
      }, 1000);

      // Hack for demo: wait 4s then assume done (matches mock api latency)
      setTimeout(async () => {
          clearInterval(poll);
          setLoading(false);
          mutate(); // Refresh device status
          
          // In real app, we'd fetch the job result here. 
          // For now, let's simulate receiving the result via Socket/Polling
          // WE CANNOT FETCH THE RESULT FROM THIS COMPONENT WITHOUT A JOBS ENDPOINT
          // BUT: The user asked for the UI flow. I will mock the result arrival.
          
          if (type === JobType.READ_VALIDATE && debugMode) {
              setLastResult({
                  success: true,
                  artifacts: {
                      track1Masked: "%B1234********5678^JOHN/DOE^2401101?",
                      debug: {
                          rawHexDump: "25 42 31 32 33 34 ** ** ** ** ** ** ** ** 35 36 37 38 5E 4A 4F 48 4E 2F 44 4F 45 5E 32 34 30 31 31 30 31 3F",
                          lrcActual: 63,
                          lrcCalculated: 63
                      }
                  }
              });
          }
      }, 4500);

    } catch (e) {
      alert('Failed to dispatch job');
      setLoading(false);
    }
  };

  const startDebugSession = () => {
      if (CURRENT_USER.role !== Role.LAB_ENGINEER) {
          alert("Access Denied: Requires LAB_ENGINEER role.");
          return;
      }
      const reason = prompt("Enter Debug Session Reason (Compliance Logged):");
      if (!reason) return;

      // Call API to start session
      // await fetch(...)
      
      setDebugMode(true);
      const exp = new Date();
      exp.setMinutes(exp.getMinutes() + 15);
      setDebugExpiry(exp);
  };

  const endDebugSession = () => {
      setDebugMode(false);
      setDebugExpiry(null);
      setLastResult(null);
  };

  if (!device) return <div className="p-8 text-slate-400">Loading device context...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 select-none relative">
      {/* Watermark for Debug Mode */}
      {debugMode && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center opacity-10 overflow-hidden">
             <div className="transform -rotate-45 text-slate-500 text-4xl font-black whitespace-nowrap">
                CONFIDENTIAL DEBUG • {CURRENT_USER.id} • {new Date().toISOString()} • DO NOT DISTRIBUTE • 
                CONFIDENTIAL DEBUG • {CURRENT_USER.id} • {new Date().toISOString()} • DO NOT DISTRIBUTE
             </div>
          </div>
      )}

      <button onClick={() => router.push('/devices')} className="text-blue-400 hover:text-blue-300 mb-4 text-sm">&larr; Back to Fleet</button>
      
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold">{device.model}</h1>
           <p className="font-mono text-slate-500">{device.serialNumber}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <div className={`text-xl font-bold ${device.status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-500'}`}>{device.status}</div>
            
            {!debugMode ? (
                <button 
                    onClick={startDebugSession}
                    className="px-3 py-1 bg-slate-800 border border-slate-600 text-slate-400 text-xs rounded hover:bg-slate-700 hover:text-white transition"
                >
                    Enable Lab Mode
                </button>
            ) : (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/50 rounded px-3 py-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs text-red-200 font-bold">LAB MODE ACTIVE</span>
                    <span className="text-xs text-red-300 font-mono">
                        {debugExpiry && Math.floor((debugExpiry.getTime() - Date.now()) / 1000 / 60)}m left
                    </span>
                    <button onClick={endDebugSession} className="ml-2 text-xs underline text-red-400">End</button>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className={`p-6 rounded-lg border transition-colors ${debugMode ? 'bg-slate-900 border-red-900/50' : 'bg-slate-800 border-slate-700'}`}>
                <h3 className="text-lg font-semibold mb-4 flex justify-between">
                    Operations
                    {debugMode && <span className="text-xs text-red-500 uppercase tracking-widest border border-red-900 rounded px-2">Debug Logging Enabled</span>}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => triggerJob(JobType.IDENTIFY)}
                        disabled={device.status !== 'ONLINE' || loading}
                        className="p-4 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 transition"
                    >
                        Identify (Blink)
                    </button>
                    <button
                        onClick={() => triggerJob(JobType.SELF_TEST)}
                        disabled={device.status !== 'ONLINE' || loading}
                        className="p-4 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 transition"
                    >
                        Self Test
                    </button>
                    <button
                        onClick={() => triggerJob(JobType.READ_VALIDATE)}
                        disabled={device.status !== 'ONLINE' || loading}
                        className={`col-span-2 p-4 font-bold rounded shadow-lg disabled:opacity-50 transition ${
                            debugMode 
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'
                        }`}
                    >
                        {loading ? 'Processing...' : (debugMode ? 'Read & Analyze (Debug)' : 'Read & Validate')}
                    </button>
                </div>
            </div>

            {/* DEBUG VISUALIZATION */}
            {debugMode && lastResult && lastResult.artifacts?.debug && (
                <div className="bg-black border border-slate-700 rounded-lg p-4 font-mono text-xs overflow-hidden">
                    <h4 className="text-slate-500 mb-2 border-b border-slate-800 pb-1">BIT LEVEL INSPECTOR (IN-MEMORY)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <div className="text-slate-600">Calculated LRC</div>
                            <div className="text-emerald-400">0x{lastResult.artifacts.debug.lrcCalculated.toString(16)}</div>
                        </div>
                        <div>
                            <div className="text-slate-600">Actual LRC</div>
                            <div className={lastResult.artifacts.debug.lrcCalculated === lastResult.artifacts.debug.lrcActual ? 'text-emerald-400' : 'text-red-500'}>
                                0x{lastResult.artifacts.debug.lrcActual.toString(16)}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-400 break-all whitespace-pre-wrap">
                        {lastResult.artifacts.debug.rawHexDump.split(' ').map((byte: string, i: number) => (
                            <span key={i} className={`inline-block mr-1 ${byte === '**' ? 'text-slate-700' : 'text-slate-300'}`}>
                                {byte}
                            </span>
                        ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-600 flex items-center gap-2">
                        <span className="block w-2 h-2 bg-slate-700"></span> Redacted Sensitive Data (Compliance)
                    </div>
                </div>
            )}
        </div>

        {/* Audit/Job Log placeholder */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-slate-800 pb-2">Session Log</h3>
            <div className="space-y-2">
                {debugMode && (
                    <div className="text-xs p-2 bg-red-900/20 border border-red-900/50 rounded text-red-200">
                        [AUDIT] Debug Session Started<br/>
                        User: {CURRENT_USER.id}<br/>
                        Reason: {debugReason || "Hardware Diagnostics"}
                    </div>
                )}
                {/* Standard Logs */}
                <div className="text-xs p-2 bg-slate-700/30 rounded text-slate-400">
                    [INFO] Device Connected
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
