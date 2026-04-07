import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Globe, CheckCircle2 } from 'lucide-react';
import { db, doc, onSnapshot, updateDoc, User as FirebaseUser } from '../../firebase';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out flex items-center px-1.5 ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
  >
    <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-0'}`} />
  </button>
);

export default function NotificationsSettings({ user }: { user: FirebaseUser | null }) {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.preferences?.notifications) {
          setNotifications(prev => ({ ...prev, ...data.preferences.notifications }));
        }
      }
    });
    return () => unsub();
  }, [user]);

  const updateNotification = async (key: string, value: any) => {
    const newNotifs = { ...notifications, [key]: value };
    setNotifications(newNotifs);
    if (!user) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        'preferences.notifications': newNotifs 
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update notifications', err);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h3>
          {showSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Updated
            </div>
          )}
        </div>
        <p className="text-gray-500 text-sm">Manage how and when you receive updates from Awais Codex.</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Email Notifications</h4>
              <p className="text-sm text-gray-500 font-medium">Receive task summaries and activity reports via email.</p>
            </div>
          </div>
          <Toggle enabled={notifications.email} onChange={() => updateNotification('email', !notifications.email)} />
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Push Notifications</h4>
              <p className="text-sm text-gray-500 font-medium">Get real-time alerts on your desktop or mobile device.</p>
            </div>
          </div>
          <Toggle enabled={notifications.push} onChange={() => updateNotification('push', !notifications.push)} />
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Product Updates</h4>
              <p className="text-sm text-gray-500 font-medium">Stay informed about new features and improvements.</p>
            </div>
          </div>
          <Toggle enabled={notifications.updates} onChange={() => updateNotification('updates', !notifications.updates)} />
        </div>
      </div>
    </div>
  );
}
