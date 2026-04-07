import React from 'react';
import { Box, GitBranch, Database, ExternalLink, Copy, Check, AlertCircle, Cpu, Brain, Globe, Server, Zap, Search, Activity } from 'lucide-react';

const API_KEY_DISPLAY = {
  'GROQ_API_KEY':       { name: 'Groq API',        type: 'LLM Orchestration',  icon: Cpu },
  'ANTHROPIC_API_KEY':  { name: 'Anthropic Claude', type: 'Code Generation',    icon: Brain },
  'GEMINI_API_KEY':     { name: 'Google Gemini',    type: 'Research + Vision',  icon: Globe },
  'HUGGINGFACE_API_KEY':{ name: 'HuggingFace',      type: 'Gemma Agent',        icon: Server },
  'HF_QWEN_API_KEY':    { name: 'HF Qwen',          type: 'Code Agent (HF)',    icon: Cpu },
  'DEEPSEEK_API_KEY':   { name: 'DeepSeek',         type: 'Reasoning Agent',    icon: Zap },
  'E2B_API_KEY':        { name: 'E2B Sandbox',      type: 'Cloud Execution',    icon: Box },
  'SERPAPI_KEY':        { name: 'SerpAPI',           type: 'Web Search',         icon: Search },
  'SUPABASE_URL':       { name: 'Supabase',          type: 'Vector Memory',      icon: Database },
};

export default function IntegrationsSettings({ diagnostics, copyToClipboard, copied }: { 
  diagnostics: any, 
  copyToClipboard: (text: string, id: string) => void,
  copied: string | null
}) {
  if (!diagnostics) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <Activity className="w-16 h-16 mb-4 opacity-10" />
        <p className="text-lg font-medium">Run diagnostics to see integration status.</p>
      </div>
    );
  }

  const getStatus = (key: string) => {
    const serviceKey = key.toLowerCase().replace('_api_key', '').replace('_key', '').replace('_url', '');
    if (diagnostics.services?.[serviceKey] === true) return 'Verified';
    if (diagnostics.errors?.[serviceKey]) return 'Error';
    if (diagnostics.environment?.[key]) return 'Configured';
    return 'Not Configured';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-green-50 text-green-600 border-green-100';
      case 'Error': return 'bg-red-50 text-red-600 border-red-100';
      case 'Configured': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      default: return 'bg-gray-50 text-gray-400 border-gray-100';
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h3>
        <p className="text-gray-500 text-sm">Connect and manage external services and API keys.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {Object.entries(API_KEY_DISPLAY).map(([key, info]) => {
          const status = getStatus(key);
          const Icon = info.icon;
          const error = diagnostics.errors?.[key.toLowerCase().replace('_api_key', '').replace('_key', '').replace('_url', '')];

          return (
            <div key={key} className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${status === 'Verified' ? 'bg-green-50' : status === 'Error' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <Icon className={`w-6 h-6 ${status === 'Verified' ? 'text-green-600' : status === 'Error' ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-lg">{info.name}</h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase tracking-wider">{info.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    {error ? <span className="text-red-500">{error}</span> : `Manage your ${info.name} configuration.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                  {status === 'Verified' ? <Check className="w-3 h-3" /> : status === 'Error' ? <AlertCircle className="w-3 h-3" /> : null}
                  {status}
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
                  <ExternalLink className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          );
        })}
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
