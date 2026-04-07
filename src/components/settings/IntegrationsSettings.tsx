import React from 'react';
import { Box, GitBranch, Database, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import { User as FirebaseUser } from '../../firebase';

export default function IntegrationsSettings({ user, diagnostics, copyToClipboard, copied }: { 
  user: FirebaseUser | null, 
  diagnostics: any, 
  copyToClipboard: (text: string, id: string) => void,
  copied: string | null
}) {
  const integrations = [
    { id: 'groq', name: 'Groq API', icon: Box, desc: 'High-performance LLM inference', status: diagnostics?.services?.groq ? 'Connected' : 'Disconnected' },
    { id: 'anthropic', name: 'Anthropic', icon: GitBranch, desc: 'Claude 3.5 Sonnet integration', status: diagnostics?.services?.anthropic ? 'Connected' : 'Disconnected' },
    { id: 'supabase', name: 'Supabase', icon: Database, desc: 'Vector memory and database', status: diagnostics?.services?.supabase ? 'Connected' : 'Disconnected' },
  ];

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <Box className="w-16 h-16 mb-4 opacity-10" />
        <p className="text-lg font-medium">Please sign in to view integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h3>
        <p className="text-gray-500 text-sm">Connect and manage external services and API keys.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {integrations.map((item) => (
          <div key={item.id} className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${item.status === 'Connected' ? 'bg-green-50' : 'bg-red-50'}`}>
                <item.icon className={`w-6 h-6 ${item.status === 'Connected' ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{item.name}</h4>
                <p className="text-sm text-gray-500 font-medium">{item.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                item.status === 'Connected' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {item.status === 'Connected' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {item.status}
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
                <ExternalLink className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-gray-900 rounded-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Database className="w-32 h-32" />
        </div>
        <h4 className="text-lg font-bold mb-2">API Access</h4>
        <p className="text-sm text-gray-400 mb-8 max-w-md font-medium leading-relaxed">Use your Synod API key to integrate with external tools and workflows.</p>
        <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md max-w-md">
          <code className="flex-1 text-xs font-mono text-gray-300 truncate">sk_live_********************</code>
          <button 
            onClick={() => copyToClipboard('sk_live_demo_key', 'api-key')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {copied === 'api-key' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}
