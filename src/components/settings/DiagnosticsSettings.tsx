import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Terminal, Cpu, Database, Globe } from 'lucide-react';
import { User as FirebaseUser } from '../../firebase';

export default function DiagnosticsSettings({ diagnostics, checkDiagnostics }: { 
  diagnostics: any, 
  checkDiagnostics: () => void 
}) {
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (diagnostics && !diagnostics.error) {
      setLastChecked(new Date());
    }
  }, [diagnostics]);

  const configuredCount = diagnostics?.environment ? Object.values(diagnostics.environment).filter(Boolean).length : 0;
  const verifiedCount = diagnostics?.services ? Object.values(diagnostics.services).filter(Boolean).length : 0;
  const errorCount = diagnostics?.errors ? Object.keys(diagnostics.errors).length : 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">System Diagnostics</h3>
          <p className="text-gray-500 text-sm">Monitor system health and service availability.</p>
        </div>
        <button 
          onClick={checkDiagnostics}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-[0.98] text-sm"
        >
          <RefreshCw className="w-4.5 h-4.5" /> Run Diagnostics
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-6 mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Core Services</h4>
              <p className="text-sm text-gray-500 font-medium">Status of internal processing engines.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Task Manager', status: diagnostics?.services?.firestore ? 'Healthy' : 'Error' },
              { label: 'Agent Loop', status: 'Healthy' },
              { label: 'Sandbox Environment', status: diagnostics?.services?.sandbox ? 'Healthy' : 'Error' },
            ].map((service) => (
              <div key={service.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-700">{service.label}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  service.status === 'Healthy' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-6 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">External APIs</h4>
              <p className="text-sm text-gray-500 font-medium">Connectivity to third-party providers.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Groq API', status: diagnostics?.services?.groq ? 'Healthy' : 'Error' },
              { label: 'Anthropic API', status: diagnostics?.services?.anthropic ? 'Healthy' : 'Error' },
              { label: 'Supabase', status: diagnostics?.services?.supabase ? 'Healthy' : 'Error' },
            ].map((api) => (
              <div key={api.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-700">{api.label}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  api.status === 'Healthy' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {api.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'APIs Configured', value: configuredCount, desc: 'Total env variables set' },
          { label: 'APIs Verified',   value: verifiedCount, desc: 'Live connection confirmed' },
          { label: 'API Errors',      value: errorCount,    desc: 'Failed to connect' },
        ].map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-xs text-gray-500 font-medium">{stat.desc}</p>
          </div>
        ))}
      </div>
      
      {lastChecked && (
        <p className="text-center text-xs text-gray-400 font-medium">
          Last checked: {lastChecked.toLocaleString()}
        </p>
      )}
    </div>
  );
}
