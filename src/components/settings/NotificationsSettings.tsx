import React from 'react';
import { Mail, Smartphone, Bell, MessageSquare, AtSign, Globe } from 'lucide-react';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out flex items-center px-1.5 ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
  >
    <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-0'}`} />
  </button>
);

export default function NotificationsSettings({ emailNotif, setEmailNotif, pushNotif, setPushNotif }) {
  const notificationTypes = [
    { id: 'email', label: 'Email Notifications', desc: 'Receive daily summaries and critical alerts via email.', icon: Mail, color: 'blue', state: emailNotif, setter: setEmailNotif },
    { id: 'push', label: 'Push Notifications', desc: 'Real-time updates on task progress and agent status.', icon: Smartphone, color: 'purple', state: pushNotif, setter: setPushNotif },
    { id: 'mentions', label: 'Mentions & Tags', desc: 'Notify when you are mentioned in a team collaboration.', icon: AtSign, color: 'orange', state: true, setter: () => {} },
    { id: 'browser', label: 'Browser Alerts', desc: 'Show desktop notifications when the app is in background.', icon: Globe, color: 'green', state: false, setter: () => {} },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h3>
        <p className="text-gray-500 text-sm">Configure how and when you want to be notified.</p>
      </div>

      <div className="space-y-4">
        {notificationTypes.map((type) => (
          <div key={type.id} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                type.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                type.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                type.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                'bg-green-50 text-green-600'
              }`}>
                <type.icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{type.label}</h4>
                <p className="text-sm text-gray-500 font-medium max-w-xs">{type.desc}</p>
              </div>
            </div>
            <Toggle enabled={type.state} onChange={() => type.setter(!type.state)} />
          </div>
        ))}
      </div>

      <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
          <h4 className="text-lg font-bold text-gray-900">Notification Frequency</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Real-time', 'Daily Digest', 'Weekly Summary'].map((freq) => (
            <button key={freq} className={`px-6 py-3 rounded-xl text-sm font-bold border transition-all ${freq === 'Real-time' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {freq}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
