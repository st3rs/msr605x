import React from 'react';
import { Device, DeviceStatus } from '../types';

interface DeviceCardProps {
  device: Device;
  onSelect: (device: Device) => void;
}

const statusColor = (status: DeviceStatus) => {
  switch (status) {
    case DeviceStatus.ONLINE: return 'bg-emerald-500';
    case DeviceStatus.OFFLINE: return 'bg-red-500';
    case DeviceStatus.BUSY: return 'bg-blue-500';
    case DeviceStatus.ERROR: return 'bg-orange-500';
    default: return 'bg-slate-500';
  }
};

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(device)}
      className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:shadow-blue-900/20"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
            {device.model}
          </h3>
          <p className="text-xs text-slate-500 font-mono">{device.serialNumber}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1 ${statusColor(device.status)} bg-opacity-20 border border-opacity-30 border-white`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor(device.status)}`}></div>
          {device.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
        <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
          <span className="block text-slate-500">Location</span>
          <span className="text-slate-300">{device.location}</span>
        </div>
        <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
          <span className="block text-slate-500">Workstation</span>
          <span className="text-slate-300">{device.workstation}</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs border-t border-slate-700 pt-3">
        <div className="flex gap-3">
             <span title="Reads" className="flex items-center gap-1 text-slate-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {device.telemetry.readCount}
             </span>
             <span title="Errors" className="flex items-center gap-1 text-orange-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {device.telemetry.errorCount}
             </span>
        </div>
        <span className="text-slate-600">{new Date(device.lastSeen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
    </div>
  );
};

export default DeviceCard;