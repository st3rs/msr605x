import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { DeviceDTO, DeviceStatus } from '../../../../packages/shared/src/contracts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DevicesList() {
  const { data: devices, error } = useSWR<DeviceDTO[]>('http://localhost:3001/devices', fetcher, { refreshInterval: 2000 });

  if (error) return <div className="p-8 text-red-400">Failed to load fleet data.</div>;
  if (!devices) return <div className="p-8 text-slate-400">Connecting to telemetry...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        Device Fleet
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Link href={`/devices/${device.id}`} key={device.id}>
            <div className="block bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-blue-400">{device.model}</h3>
                  <p className="text-sm text-slate-500 font-mono">{device.serialNumber}</p>
                </div>
                <StatusBadge status={device.status} />
              </div>
              
              <div className="text-xs text-slate-400 space-y-1">
                <p>Location: <span className="text-slate-300">{device.location}</span></p>
                <p>Host: <span className="text-slate-300">{device.workstation}</span></p>
                <p>Last Seen: {new Date(device.lastSeen).toLocaleTimeString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const StatusBadge = ({ status }: { status: DeviceStatus }) => {
  const colors = {
    [DeviceStatus.ONLINE]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    [DeviceStatus.OFFLINE]: 'bg-red-500/20 text-red-400 border-red-500/30',
    [DeviceStatus.BUSY]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [DeviceStatus.ERROR]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-bold border ${colors[status] || colors.OFFLINE}`}>
      {status}
    </span>
  );
};
