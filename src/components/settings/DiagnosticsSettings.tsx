import React from 'react';
import { Activity, RefreshCw, CheckCircle2, XCircle, Server, ShieldCheck, Zap, HardDrive } from 'lucide-react';

export default function DiagnosticsSettings({ diagnostics, checkDiagnostics }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">System Diagnostics</h3>
        <p className="text-gray-500 text-sm">Monitor the health and performance of your autonomous agents and infrastructure.</p>
      </div>

      {diagnostics && !diagnostics.error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {Object.entries(diagnostics.services).map(([service, status]) => (
            <div key={service} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${status ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {service === 'database' ? <HardDrive className="w-6 h-6" /> : 
                   service === 'auth' ? <ShieldCheck className="w-6 h-6" /> : 
                   service === 'api' ? <Zap className="w-6 h-6" /> : 
                   <Server className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base capitalize">{service}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Service Status</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                status 
                  ? 'bg-green-50 text-green-600 border-green-100' 
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {status ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                <span className="hidden sm:inline">{status ? 'Operational' : 'Degraded'}</span>
                <span className="sm:hidden">{status ? 'OK' : 'ERR'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-8 bg-gray-900 rounded-2xl text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Activity className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <h4 className="text-2xl font-bold mb-3 tracking-tight">System Health Check</h4>
          <p className="text-gray-400 mb-8 max-w-md text-sm leading-relaxed">Run a comprehensive diagnostic sweep across all autonomous nodes and vector memory clusters.</p>
          <button 
            onClick={checkDiagnostics}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg shadow-black/20 group text-sm"
          >
            <RefreshCw className="w-4.5 h-4.5 group-active:animate-spin" /> Run Full Diagnostics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'Uptime', value: '99.98%', desc: 'Last 30 days' },
          { label: 'Latency', value: '124ms', desc: 'Average response' },
          { label: 'Memory', value: '2.4GB', desc: 'Current usage' },
        ].map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-xs text-gray-500 font-medium">{stat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
