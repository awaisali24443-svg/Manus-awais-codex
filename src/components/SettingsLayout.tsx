import React from 'react';
import { User, CreditCard, Key, Settings as SettingsIcon, Activity, LogOut, ArrowLeft, Bell, Shield, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SettingsLayout({ children, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, path: '/settings/account' },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, path: '/settings/subscription' },
    { id: 'integrations', label: 'Integrations', icon: Key, path: '/settings/integrations' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications' },
    { id: 'security', label: 'Security', icon: Shield, path: '/settings/security' },
    { id: 'team', label: 'Team', icon: Users, path: '/settings/team' },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon, path: '/settings/preferences' },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity, path: '/settings/diagnostics' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 shadow-sm z-30">
        <div className="p-8 border-b border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg shadow-gray-200">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Settings</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">System Console</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div>
            <h3 className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">General</h3>
            <nav className="space-y-1">
              {tabs.slice(0, 4).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    location.pathname === tab.path 
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${location.pathname === tab.path ? 'text-white' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">System</h3>
            <nav className="space-y-1">
              {tabs.slice(4).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    location.pathname === tab.path 
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${location.pathname === tab.path ? 'text-white' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold transition-all duration-200 group">
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-gray-900">Settings</h2>
          </div>
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-4 h-4 text-white" />
          </div>
        </header>

        {/* Mobile Horizontal Scroll Nav */}
        <nav className="lg:hidden flex overflow-x-auto bg-white border-b border-gray-100 px-4 py-2.5 scrollbar-hide gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                location.pathname === tab.path 
                  ? 'bg-gray-900 text-white shadow-md shadow-gray-200' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-16 bg-gray-50/50">
          <div className="max-w-4xl mx-auto">
            {/* Desktop Header (Inside Content) */}
            <div className="hidden lg:flex items-center justify-between mb-12">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Dashboard
              </button>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span>Settings</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-gray-900">{tabs.find(t => t.path === location.pathname)?.label || 'Account'}</span>
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
