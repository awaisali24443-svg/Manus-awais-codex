import React, { useState, useEffect } from 'react';
import { Box, GitBranch, Database, ExternalLink, Copy, Check, AlertCircle, Cpu, Brain, Globe, Server, Zap, Search, Activity, Eye, EyeOff, Save } from 'lucide-react';

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
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Load saved keys from local storage for Personal Edition
    const saved = localStorage.getItem('synod_api_keys');
    if (saved) {
      setApiKeys(JSON.parse(saved));
    }
  }, []);

  const handleSaveKey = (key: string) => {
    setSaving(key);
    const updated = { ...apiKeys };
    localStorage.setItem('synod_api_keys', JSON.stringify(updated));
    setTimeout(() => setSaving(null), 1000);
  };

  const getStatus = (key: string) => {
    if (apiKeys[key]) return 'Configured';
    const serviceKey = key.toLowerCase().replace('_api_key', '').replace('_key', '').replace('_url', '');
    if (diagnostics?.services?.[serviceKey] === true) return 'Verified';
    if (diagnostics?.errors?.[serviceKey]) return 'Error';
    if (diagnostics?.environment?.[key]) return 'Configured';
    return 'Not Configured';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-green-50 text-green-600 border-green-100';
      case 'Error': return 'bg-red-50 text-red-600 border-red-100';
      case 'Configured': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-gray-50 text-gray-400 border-gray-100';
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations & API Keys</h3>
        <p className="text-gray-500 text-sm">Configure your external providers. Keys are stored locally in Personal Edition.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {Object.entries(API_KEY_DISPLAY).map(([key, info]) => {
          const status = getStatus(key);
          const Icon = info.icon;
          const error = diagnostics?.errors?.[key.toLowerCase().replace('_api_key', '').replace('_key', '').replace('_url', '')];

          return (
            <div key={key} className="p-5 sm:p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4 group hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${status === 'Verified' ? 'bg-green-50' : status === 'Error' ? 'bg-red-50' : status === 'Configured' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <Icon className={`w-5 h-5 ${status === 'Verified' ? 'text-green-600' : status === 'Error' ? 'text-red-600' : status === 'Configured' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900">{info.name}</h4>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase tracking-wider">{info.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {error ? <span className="text-red-500">{error}</span> : key}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                  {status === 'Verified' ? <Check className="w-3 h-3" /> : status === 'Error' ? <AlertCircle className="w-3 h-3" /> : null}
                  {status}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys[key] ? "text" : "password"}
                    value={apiKeys[key] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [key]: e.target.value })}
                    placeholder={`Enter ${info.name} API Key`}
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all font-mono text-sm"
                  />
                  <button 
                    onClick={() => setShowKeys({ ...showKeys, [key]: !showKeys[key] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button 
                  onClick={() => handleSaveKey(key)}
                  className="px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] text-sm flex items-center gap-2 min-w-[80px] justify-center"
                >
                  {saving === key ? <Check className="w-4 h-4" /> : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
