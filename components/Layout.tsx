import React from 'react';
import { Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeRole, setActiveRole, currentPage, onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex-shrink-0">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            MSR605X Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">Compliance & QA System</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {['Dashboard', 'Devices', 'Jobs', 'Audit Logs', 'AI Insights'].map((item) => (
            <button
              key={item}
              onClick={() => onNavigate(item)}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                currentPage === item 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 mt-auto">
          <label className="text-xs text-slate-500 uppercase font-semibold mb-2 block">
            Role Simulation
          </label>
          <select 
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as Role)}
          >
            {Object.values(Role).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-500">System Operational</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 p-4 sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-200">{currentPage}</h2>
            <div className="flex items-center gap-4">
                <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                    QA Environment
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                    QA
                </div>
            </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;