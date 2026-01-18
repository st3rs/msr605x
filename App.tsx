import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import DeviceCard from './components/DeviceCard';
import { Role, Device, Job, AuditLogEntry, JobType, DeviceStatus, JobStatus } from './types';
import { MockApi } from './services/mockApi';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role>(Role.QA_OPERATOR);
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  // Poll for data to simulate realtime updates
  useEffect(() => {
    const fetchData = async () => {
      const d = await MockApi.getDevices();
      const j = await MockApi.getJobs();
      const a = await MockApi.getAuditLogs();
      setDevices(d);
      setJobs(j);
      setAuditLogs(a);
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // 3s poll
    return () => clearInterval(interval);
  }, []);

  const handleCreateJob = async (type: JobType) => {
    if (!selectedDevice) return;
    setIsProcessing(true);
    try {
      await MockApi.createJob(selectedDevice.id, type, activeRole);
      // Data will refresh via poll
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!process.env.API_KEY) {
        setAiAnalysis("API Key not found. Please configure the environment.");
        return;
    }
    setAiLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const errorLogs = auditLogs.filter(l => l.level === 'WARN' || l.level === 'CRITICAL').slice(0, 10);
        const deviceStats = devices.map(d => `${d.model} (${d.serialNumber}): Errors=${d.telemetry.errorCount}`).join('\n');
        
        const prompt = `
        As a QA Systems Analyst, review the following system telemetry and logs for MSR605X devices.
        Provide 3 bullet points on system health and 1 maintenance recommendation.
        
        Device Stats:
        ${deviceStats}
        
        Recent Alerts:
        ${JSON.stringify(errorLogs)}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        setAiAnalysis(response.text || "No analysis generated.");
    } catch (err: any) {
        setAiAnalysis(`Error generating analysis: ${err.message}`);
    } finally {
        setAiLoading(false);
    }
  };

  // --- Page Renderers ---

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-slate-400 text-sm">Active Devices</h3>
          <p className="text-2xl font-bold text-white mt-1">{devices.filter(d => d.status !== DeviceStatus.OFFLINE).length} / {devices.length}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-slate-400 text-sm">Jobs Today</h3>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{jobs.length}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-slate-400 text-sm">Error Rate (24h)</h3>
          <p className="text-2xl font-bold text-orange-400 mt-1">1.2%</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-slate-400 text-sm">System Status</h3>
          <p className="text-2xl font-bold text-blue-400 mt-1">Healthy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Jobs */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Activity</h3>
            <div className="space-y-3">
                {jobs.slice(0, 5).map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded border border-slate-700/50">
                        <div>
                            <div className="text-sm font-medium text-slate-200">{job.type}</div>
                            <div className="text-xs text-slate-500">Device: {job.deviceId} • User: {job.initiatedBy}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                            job.status === JobStatus.COMPLETED ? 'text-emerald-400 bg-emerald-400/10' :
                            job.status === JobStatus.PROCESSING ? 'text-blue-400 bg-blue-400/10' :
                            'text-slate-400 bg-slate-400/10'
                        }`}>
                            {job.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Device Quick View */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Fleet Health</h3>
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-lg bg-slate-900/30">
                [Visualization: Usage Heatmap Placeholder]
            </div>
        </div>
      </div>
    </div>
  );

  const renderDevices = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
        {devices.map(device => (
          <DeviceCard 
            key={device.id} 
            device={device} 
            onSelect={setSelectedDevice} 
          />
        ))}
      </div>
      
      {/* Device Control Panel */}
      <div className="lg:col-span-1">
        {selectedDevice ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 sticky top-24">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">{selectedDevice.model}</h2>
                        <p className="text-sm text-slate-400">{selectedDevice.serialNumber}</p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded font-bold ${selectedDevice.status === DeviceStatus.ONLINE ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
                        {selectedDevice.status}
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="bg-slate-900 p-3 rounded border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Capabilities</div>
                        <div className="flex flex-wrap gap-2">
                            {['ISO 7811', 'HiCo/LoCo', '3-Track', 'Raw'].map(c => (
                                <span key={c} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-600">{c}</span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-3 rounded border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Location</div>
                        <p className="text-sm text-slate-300">{selectedDevice.location}</p>
                        <p className="text-xs text-slate-500">{selectedDevice.workstation} ({selectedDevice.comPort})</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <button 
                        disabled={selectedDevice.status !== DeviceStatus.ONLINE || isProcessing}
                        onClick={() => handleCreateJob(JobType.IDENTIFY)}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        Identify / Blink
                    </button>
                    <button 
                        disabled={selectedDevice.status !== DeviceStatus.ONLINE || isProcessing}
                        onClick={() => handleCreateJob(JobType.SELF_TEST)}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        Self Test
                    </button>
                    <div className="h-px bg-slate-700 my-2"></div>
                    <button 
                        disabled={selectedDevice.status !== DeviceStatus.ONLINE || isProcessing}
                        onClick={() => handleCreateJob(JobType.READ_VALIDATE)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-sm shadow-lg shadow-blue-900/50 transition-colors disabled:opacity-50"
                    >
                        {isProcessing ? 'Waiting for Device...' : 'Read & Validate'}
                    </button>
                    <button 
                        disabled={selectedDevice.status !== DeviceStatus.ONLINE || isProcessing}
                        onClick={() => handleCreateJob(JobType.WRITE_TEST_PATTERN)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded text-sm shadow-lg shadow-purple-900/50 transition-colors disabled:opacity-50"
                    >
                        Write Test Pattern (ISO)
                    </button>
                </div>
                
                <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                    <p className="text-[10px] text-yellow-500 leading-tight">
                        WARNING: Track data is masked at the edge. Raw data is never transmitted to the dashboard.
                    </p>
                </div>
            </div>
        ) : (
            <div className="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg p-12">
                Select a device to view controls
            </div>
        )}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Level</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Details</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
                {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-3 text-slate-400 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.level === 'CRITICAL' ? 'bg-red-500/20 text-red-500' :
                                log.level === 'WARN' ? 'bg-orange-500/20 text-orange-500' :
                                'bg-blue-500/20 text-blue-500'
                            }`}>
                                {log.level}
                            </span>
                        </td>
                        <td className="px-6 py-3 text-slate-300">{log.user}</td>
                        <td className="px-6 py-3 text-slate-300">{log.action}</td>
                        <td className="px-6 py-3 text-slate-400 max-w-md truncate" title={log.details}>{log.details}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const renderAiInsights = () => (
      <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-2xl">✨</span> AI Operational Analysis
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                  Uses Gemini Flash 3 to analyze telemetry trends, predict maintenance needs, and flag compliance anomalies.
              </p>
              <button 
                onClick={runAiAnalysis}
                disabled={aiLoading}
                className="px-4 py-2 bg-white text-purple-900 font-bold rounded hover:bg-purple-50 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                  {aiLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-purple-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Fleet Data...
                      </>
                  ) : "Run Analysis"}
              </button>
          </div>

          {aiAnalysis && (
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Report</h3>
                  <div className="prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-slate-300">{aiAnalysis}</pre>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <Layout 
        activeRole={activeRole} 
        setActiveRole={setActiveRole}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
    >
      {currentPage === 'Dashboard' && renderDashboard()}
      {currentPage === 'Devices' && renderDevices()}
      {currentPage === 'Jobs' && renderDashboard()} {/* Reusing dashboard jobs view for now */}
      {currentPage === 'Audit Logs' && renderLogs()}
      {currentPage === 'AI Insights' && renderAiInsights()}
    </Layout>
  );
};

export default App;