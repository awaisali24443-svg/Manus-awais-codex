import React, { useState, useEffect } from 'react';
import { UserPlus, MoreVertical, Shield, User, Mail, Search, X } from 'lucide-react';
import { db, collection, onSnapshot, User as FirebaseUser, doc, setDoc, deleteDoc } from '../../firebase';

export default function TeamSettings({ user }: { user: FirebaseUser | null }) {
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Member' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'team'), (snap) => {
      const teamData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(teamData);
    });
    return () => unsub();
  }, []);

  const handleInvite = async () => {
    if (!newMember.name || !newMember.email) return;
    try {
      const memberId = newMember.email.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'team', memberId), {
        ...newMember,
        status: 'Pending',
        avatar: newMember.name[0].toUpperCase()
      });
      setIsInviting(false);
      setNewMember({ name: '', email: '', role: 'Member' });
    } catch (err) {
      console.error('Failed to invite member', err);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <User className="w-16 h-16 mb-4 opacity-10" />
        <p className="text-lg font-medium">Please sign in to view team settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Team Management</h3>
          <p className="text-gray-500 text-sm">Manage your team members and their access levels.</p>
        </div>
        <button 
          onClick={() => setIsInviting(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-[0.98] text-sm"
        >
          <UserPlus className="w-4.5 h-4.5" /> Invite Member
        </button>
      </div>

      {isInviting && (
        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-gray-900">Invite New Member</h4>
            <button onClick={() => setIsInviting(false)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Name" 
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 text-sm"
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 text-sm"
            />
            <select 
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 text-sm font-medium"
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
              <option value="Owner">Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsInviting(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:text-gray-900 text-sm">Cancel</button>
            <button onClick={handleInvite} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all text-sm">Send Invitation</button>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4.5 h-4.5 text-gray-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search members by name or email..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
              {filteredMembers.map((member) => (
                <tr key={member.id} className="group hover:bg-gray-50/50 transition-colors">
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
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
