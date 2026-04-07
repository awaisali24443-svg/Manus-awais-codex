import React from 'react';
import { User, CreditCard, Key, Settings as SettingsIcon, Activity, LogOut, ArrowLeft, Bell, Shield, Users } from 'lucide-react';
import AccountSettings from './settings/AccountSettings';
import SubscriptionSettings from './settings/SubscriptionSettings';
import IntegrationsSettings from './settings/IntegrationsSettings';
import NotificationsSettings from './settings/NotificationsSettings';
import SecuritySettings from './settings/SecuritySettings';
import TeamSettings from './settings/TeamSettings';
import PreferencesSettings from './settings/PreferencesSettings';
import DiagnosticsSettings from './settings/DiagnosticsSettings';

export default function SettingsPage({ onClose, diagnostics, checkDiagnostics, clearHistory }) {
  const [activeTab, setActiveTab] = React.useState('account');
  const [copied, setCopied] = React.useState(null);
  const [darkMode, setDarkMode] = React.useState(false);
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [pushNotif, setPushNotif] = React.useState(false);

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  ];

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account': return <AccountSettings />;
      case 'subscription': return <SubscriptionSettings />;
      case 'integrations': return <IntegrationsSettings diagnostics={diagnostics} copyToClipboard={copyToClipboard} copied={copied} />;
      case 'notifications': return <NotificationsSettings emailNotif={emailNotif} setEmailNotif={setEmailNotif} pushNotif={pushNotif} setPushNotif={setPushNotif} />;
      case 'security': return <SecuritySettings />;
      case 'team': return <TeamSettings />;
      case 'preferences': return <PreferencesSettings darkMode={darkMode} setDarkMode={setDarkMode} clearHistory={clearHistory} />;
      case 'diagnostics': return <DiagnosticsSettings diagnostics={diagnostics} checkDiagnostics={checkDiagnostics} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 backdrop-blur-sm">
      {/* Header */}
      <header className="h-16 border-b border-gray-100 flex items-center px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-4">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white/60 backdrop-blur-md p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
          <div className="flex flex-col gap-2 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium mt-4">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto">
          <h3 className="text-2xl font-bold text-gray-900 capitalize mb-8">{activeTab}</h3>
          <div className="max-w-3xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
