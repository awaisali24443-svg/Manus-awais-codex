import React from 'react';
import { Copy, Check, ExternalLink, Cpu, Globe, Database, Key } from 'lucide-react';

export default function IntegrationsSettings({ diagnostics, copyToClipboard, copied }) {
  const integrations = [
    { name: 'Groq API', status: 'Connected', icon: Cpu, type: 'LLM Provider' },
    { name: 'Anthropic API', status: 'Connected', icon: Brain, type: 'Code Intelligence' },
    { name: 'Supabase', status: 'Connected', icon: Database, type: 'Vector Memory' },
    { name: 'Playwright', status: 'Active', icon: Globe, type: 'Browser Automation' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h3>
        <p className="text-gray-500 text-sm">Connect and manage your external services and API keys.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {integrations.map((item) => (
          <div key={item.name} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">{item.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{item.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-green-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden sm:inline">{item.status}</span>
              <span className="sm:hidden">OK</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Environment Keys</h4>
          <button className="text-xs font-bold text-gray-900 hover:underline flex items-center gap-1">
            Manage Keys <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {diagnostics?.environment && Object.entries(diagnostics.environment)
            .filter(([key]) => key.includes('API_KEY'))
            .map(([key]) => (
              <div key={key} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Key className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{key.replace('VITE_', '').replace('_', ' ')}</p>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">••••••••••••••••••••••••••••</p>
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard('••••••••••••', key)} 
                  className={`p-2 rounded-lg transition-all flex-shrink-0 ${copied === key ? 'bg-green-50 text-green-600' : 'hover:bg-gray-50 text-gray-400 hover:text-gray-900'}`}
                >
                  {copied === key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

import { Brain } from 'lucide-react';
