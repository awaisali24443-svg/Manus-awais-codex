import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Globe, Clock, Trash2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { db, doc, onSnapshot, updateDoc, User as FirebaseUser } from '../../firebase';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out flex items-center px-1.5 ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
  >
    <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-0'}`} />
  </button>
);

export default function PreferencesSettings({ user, clearHistory }: { user: FirebaseUser | null, clearHistory: () => void }) {
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'English (US)',
    timezone: 'UTC -7:00'
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.preferences) {
          setPreferences(prev => ({ ...prev, ...data.preferences }));
        }
      }
    });
    return () => unsub();
  }, [user]);

  const updatePreference = async (key: string, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    if (!user) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), { preferences: newPrefs });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update preferences', err);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Preferences</h3>
          {showSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </div>
          )}
        </div>
        <p className="text-gray-500 text-sm">Customize your workspace experience and interface settings.</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              {preferences.darkMode ? <Moon className="w-6 h-6 text-gray-900" /> : <Sun className="w-6 h-6 text-gray-900" />}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Dark Mode</h4>
              <p className="text-sm text-gray-500 font-medium">Switch between light and dark themes.</p>
            </div>
          </div>
          <Toggle enabled={preferences.darkMode} onChange={() => updatePreference('darkMode', !preferences.darkMode)} />
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all cursor-pointer">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Language</h4>
              <p className="text-sm text-gray-500 font-medium">{preferences.language}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all cursor-pointer">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Timezone</h4>
              <p className="text-sm text-gray-500 font-medium">{preferences.timezone}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
        </div>
      </div>

      <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-lg">Clear History</h4>
            <p className="text-sm text-gray-500 font-medium">Delete all your task history and logs.</p>
          </div>
        </div>
        <button 
          onClick={clearHistory}
          className="px-8 py-3 bg-white text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-50 transition-all shadow-sm active:scale-[0.98] text-sm"
        >
          Clear All History
        </button>
      </div>
    </div>
  );
}
