import React from 'react';
import { User, Mail, Camera, Save, ShieldCheck } from 'lucide-react';

export default function AccountSettings() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h3>
        <p className="text-gray-500 text-sm">Update your profile information and manage your public identity.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-gray-900 to-gray-800 relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row sm:items-end gap-6 -mt-12">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gray-900 border-4 border-white flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-xl">
                AA
              </div>
              <button className="absolute -bottom-2 -right-2 p-2.5 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 text-gray-600">
                <Camera className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="flex-1 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xl font-bold text-gray-900">Awais Ali</h4>
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm text-gray-500 font-medium mb-4">awaisali24443@gmail.com</p>
              <div className="flex gap-2">
                <span className="px-2.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">Owner</span>
                <span className="px-2.5 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-100">Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
            <input 
              type="text" 
              defaultValue="Awais Ali"
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium text-gray-900"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
            <input 
              type="email" 
              defaultValue="awaisali24443@gmail.com"
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium text-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
        <button className="px-6 py-3 text-gray-500 font-bold hover:text-gray-900 transition-colors text-sm">Cancel</button>
        <button className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-[0.98] text-sm">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}
