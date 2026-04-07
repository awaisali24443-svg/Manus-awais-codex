import React from 'react';
import { Moon, Sun, Trash2, Globe, Monitor, Zap, Layout } from 'lucide-react';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out flex items-center px-1.5 ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
  >
    <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-0'}`} />
  </button>
);

export default function PreferencesSettings({ darkMode, setDarkMode, clearHistory }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Preferences</h3>
        <p className="text-gray-500 text-sm">Customize your workspace and application behavior.</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              {darkMode ? <Moon className="w-6 h-6 text-gray-900" /> : <Sun className="w-6 h-6 text-gray-900" />}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Appearance</h4>
              <p className="text-sm text-gray-500 font-medium">Switch between light and dark themes.</p>
            </div>
          </div>
          <Toggle enabled={darkMode} onChange={() => setDarkMode(!darkMode)} />
        </div>

        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Language</h4>
              <p className="text-sm text-gray-500 font-medium">Select your preferred display language.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-gray-100 text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">English (US)</button>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Auto-save</h4>
              <p className="text-sm text-gray-500 font-medium">Automatically save your changes in real-time.</p>
            </div>
          </div>
          <Toggle enabled={true} onChange={() => {}} />
        </div>
      </div>

      <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Layout className="w-5 h-5 text-gray-400" />
          </div>
          <h4 className="text-lg font-bold text-gray-900">Workspace Layout</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['Default', 'Compact', 'Wide', 'Focus'].map((layout) => (
            <button key={layout} className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${layout === 'Default' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {layout}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        <button 
          onClick={clearHistory} 
          className="w-full flex items-center justify-center gap-3 p-5 bg-red-50 text-red-600 rounded-2xl text-sm font-bold hover:bg-red-100 transition-all border border-red-100 group"
        >
          <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> Clear Chat & Agent History
        </button>
      </div>
    </div>
  );
}
