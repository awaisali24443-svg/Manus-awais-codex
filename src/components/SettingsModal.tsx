import React from 'react';
import { X, User, CreditCard, Key, Settings as SettingsIcon, Activity, Trash2, Download, Sun, Moon, LogOut, Copy, Check } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, diagnostics, checkDiagnostics, isCheckingDiagnostics, clearHistory, logs }) {
  const [activeTab, setActiveTab] = React.useState('account');
  const [copied, setCopied] = React.useState(null);

  if (!isOpen) return null;

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  ];

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-panel max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row rounded-[32px] shadow-2xl bg-white overflow-hidden animate-fade-in-up">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-8 md:mb-8">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible flex-1 pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <button className="hidden md:flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium mt-4">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="hidden md:flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Mobile Header */}
          <h3 className="md:hidden text-xl font-bold text-gray-900 capitalize mb-6">{activeTab}</h3>

          {activeTab === 'account' && (
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-medium">awaisali24443@gmail.com</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="font-medium">Awais Ali</p>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="p-6 bg-gray-900 text-white rounded-2xl">
                <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                <p className="text-xl font-bold">Pro Plan</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage</span>
                  <span>80%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 w-[80%]" />
                </div>
              </div>
              <button className="w-full py-3 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200">Manage Subscription</button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              {diagnostics && Object.entries(diagnostics.environment).filter(([key]) => key.includes('API_KEY')).map(([key]) => (
                <div key={key} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-700 truncate mr-2">{key}</span>
                  <button onClick={() => copyToClipboard('••••••••••••', key)} className="p-2 hover:bg-gray-200 rounded-full flex-shrink-0">
                    {copied === key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium">Dark Mode</span>
                <div className="w-10 h-6 bg-gray-200 rounded-full p-1 cursor-pointer"><div className="w-4 h-4 bg-white rounded-full" /></div>
              </div>
              <button onClick={clearHistory} className="w-full flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100">
                <Trash2 className="w-4 h-4" /> Clear Chat History
              </button>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {diagnostics && !diagnostics.error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(diagnostics.services).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm font-medium capitalize">{service}</span>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {status ? 'OK' : 'FAIL'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button 
                onClick={checkDiagnostics}
                className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
              >
                Refresh Diagnostics
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
