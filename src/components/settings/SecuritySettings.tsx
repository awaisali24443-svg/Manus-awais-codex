import React, { useState } from 'react';
import { Shield, Lock, Smartphone, Eye, EyeOff, ChevronRight, Key, History, CheckCircle2 } from 'lucide-react';
import { User as FirebaseUser, auth } from '../../firebase';
import { updatePassword } from 'firebase/auth';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out flex items-center px-1.5 ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
  >
    <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-0'}`} />
  </button>
);

export default function SecuritySettings({ user }: { user: FirebaseUser | null }) {
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleUpdatePassword = async () => {
    if (!user || !newPassword) return;
    setIsUpdating(true);
    setError('');
    try {
      await updatePassword(user, newPassword);
      setShowSuccess(true);
      setNewPassword('');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. You may need to re-authenticate.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <Shield className="w-16 h-16 mb-4 opacity-10" />
        <p className="text-lg font-medium">Please sign in to view security settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Security</h3>
        <p className="text-gray-500 text-sm">Protect your account with advanced security features and protocols.</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-500 font-medium">Use an authenticator app to secure your sign-ins.</p>
            </div>
          </div>
          <Toggle enabled={false} onChange={() => {}} />
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-6 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Password Management</h4>
              <p className="text-sm text-gray-500 font-medium">Update your password to keep your account safe.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 max-w-md">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative group">
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all font-medium text-sm" 
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600 font-medium ml-1">{error}</p>}
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-bold ml-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Password updated successfully!
              </div>
            )}
            <button 
              onClick={handleUpdatePassword}
              disabled={isUpdating || !newPassword}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-[0.98] text-sm disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all cursor-pointer">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <History className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Active Sessions</h4>
              <p className="text-sm text-gray-500 font-medium">Manage your active sessions and logged-in devices.</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
        </div>
      </div>

      <div className="p-8 bg-red-50/50 border border-red-100 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Shield className="w-32 h-32 text-red-600" />
        </div>
        <h4 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h4>
        <p className="text-sm text-red-700/80 mb-8 max-w-md font-medium leading-relaxed">Permanently delete your account and all associated data. This action is irreversible and will remove all your agents and history.</p>
        <button className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-[0.98] text-sm">Delete Account</button>
      </div>
    </div>
  );
}
