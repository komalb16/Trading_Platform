'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersData = await apiClient.get('/admin/users');
      const logsData = await apiClient.get('/admin/logs');
      setUsers(usersData);
      setLogs(logsData);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    try {
      const res = await apiClient.post('/admin/invite-codes', { max_uses: 1 });
      setInviteToken(res.token);
      loadData();
    } catch (err) {
      alert("Failed to generate token");
    }
  };

  const approveUser = async (userId: string) => {
    try {
      await apiClient.post(`/admin/users/${userId}/approve`, {});
      loadData();
    } catch (err) {
      alert("Approval failed");
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading Command Center...</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Control</h1>
          <p className="text-slate-400">Institutional Governance & User Oversight</p>
        </div>
        <button onClick={generateInvite} className="btn-primary flex items-center gap-2">
          <span>Generate Invite Token</span>
        </button>
      </header>

      {inviteToken && (
        <div className="glass-card p-4 border-blue-500/50 bg-blue-500/10 mb-6">
          <p className="text-sm font-semibold text-blue-400">New High-Entropy Token Generated:</p>
          <div className="flex gap-4 items-center mt-2">
            <code className="bg-slate-900 p-2 rounded text-blue-300 flex-1 truncate">{inviteToken}</code>
            <button onClick={() => navigator.clipboard.writeText(inviteToken)} className="text-xs text-slate-400 hover:text-white underline">Copy</button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">⚠️ This token is displayed only once for security.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Table */}
        <section className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="font-semibold">User Directory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(user => (
                  <tr key={user.id} className="table-row-hover transition-colors">
                    <td className="p-4 font-medium">{user.email}</td>
                    <td className="p-4">
                      <span className={`status-badge ${
                        user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 
                        user.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{user.role}</td>
                    <td className="p-4">
                      {user.status === 'PENDING' && (
                        <button onClick={() => approve_user(user.id)} className="text-blue-400 hover:text-blue-300 font-semibold underline">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Logs */}
        <section className="glass-card flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="font-semibold">Audit Trail</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-4">
            {logs.map(log => (
              <div key={log.id} className="text-xs border-l-2 border-slate-700 pl-3 py-1">
                <p className="font-semibold text-slate-300">{log.action}</p>
                <p className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</p>
                <p className="text-slate-400 mt-1 italic">{log.details}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
