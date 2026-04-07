import React from 'react';
import { UserPlus, MoreVertical, Shield, User, Mail, Search } from 'lucide-react';

export default function TeamSettings() {
  const members = [
    { name: 'Awais Ali', email: 'awaisali24443@gmail.com', role: 'Owner', status: 'Active', avatar: 'AA' },
    { name: 'Sarah Chen', email: 'sarah.c@synod.ai', role: 'Admin', status: 'Active', avatar: 'SC' },
    { name: 'Marcus Wright', email: 'm.wright@synod.ai', role: 'Member', status: 'Pending', avatar: 'MW' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Team Management</h3>
          <p className="text-gray-500 text-sm">Manage your team members and their access levels.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-[0.98] text-sm">
          <UserPlus className="w-4.5 h-4.5" /> Invite Member
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4.5 h-4.5 text-gray-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search members by name or email..." 
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium text-sm shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((member) => (
                <tr key={member.email} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-gray-200">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                        <p className="text-xs text-gray-500 font-medium">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${member.role === 'Owner' ? 'text-blue-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-bold text-gray-700">{member.role}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      member.status === 'Active' 
                        ? 'bg-green-50 text-green-600 border-green-100' 
                        : 'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all shadow-sm">
                      <MoreVertical className="w-4.5 h-4.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
