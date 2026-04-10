import React from 'react';
import { User, CreditCard, Key, Settings as SettingsIcon, Activity, LogOut, ArrowLeft, Bell, Shield, Users, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SettingsLayout({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, path: '/settings/account' },
    { id: 'integrations', label: 'Integrations', icon: Key, path: '/settings/integrations' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications' },
    { id: 'security', label: 'Security', icon: Shield, path: '/settings/security' },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon, path: '/settings/preferences' },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity, path: '/settings/diagnostics' },
  ];

  const renderNavGroup = (groupLabel: string, groupTabs: typeof tabs) => (
    <div className="mb-6">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">{groupLabel}</p>
      <nav className="space-y-1">
        {groupTabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
                active 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-gray-300' : 'text-gray-400'}`} />
              <span className="flex-1">{tab.label}</span>
              {active && <ChevronRight className="w-3 h-3 text-gray-500" />}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 z-30">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Settings</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          {renderNavGroup('General', tabs.slice(0, 3))}
          {renderNavGroup('System', tabs.slice(3))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-gray-900 text-sm">Settings</h2>
          </div>
        </header>

        {/* Mobile Horizontal Scroll Nav */}
        <nav className="lg:hidden flex overflow-x-auto bg-white border-b border-gray-100 px-4 py-2 scrollbar-hide gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                location.pathname === tab.path 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-8 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            {/* Desktop Header (Inside Content) */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
              <span>Dashboard</span>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-gray-900">{tabs.find(t => t.path === location.pathname)?.label || 'Account'}</span>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
