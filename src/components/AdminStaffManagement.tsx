"use client";
import React, { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';

type UserRow = { id: string; email: string; full_name?: string; role_id?: number; primary_department_id?: number };

export default function AdminStaffManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [deptId, setDeptId] = useState<number | ''>('');

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function fetchUsers() {
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/admin/list-users', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    const res = await fetch('/api/admin/create-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ email, password, full_name: fullName, role_id: roleId || null, primary_department_id: deptId || null }),
    });
    const json = await res.json();
    if (json.success) {
      setEmail(''); setPassword(''); setFullName(''); setRoleId(''); setDeptId('');
      fetchUsers();
    } else {
      alert(json.error || 'Create failed');
    }
  }

  async function handleGrant(userId: string) {
    const token = await getToken();
    const res = await fetch('/api/admin/grant-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ userId, departmentId: deptId || null }),
    });
    const json = await res.json();
    if (json.success) fetchUsers(); else alert(json.error || 'Grant failed');
  }

  async function handleRevoke(userId: string) {
    const token = await getToken();
    const res = await fetch('/api/admin/revoke-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ userId, departmentId: deptId || null }),
    });
    const json = await res.json();
    if (json.success) fetchUsers(); else alert(json.error || 'Revoke failed');
  }

  async function handleReset(userId: string) {
    const newPass = prompt('Enter new password for user:');
    if (!newPass) return;
    const token = await getToken();
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify({ userId, newPassword: newPass }),
    });
    const json = await res.json();
    if (json.success) alert('Password reset'); else alert(json.error || 'Reset failed');
  }

  return (
    <div>
      <h2>Staff Management</h2>
      <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <input placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input placeholder="Role ID" value={roleId as any} onChange={e => setRoleId(e.target.value ? Number(e.target.value) : '')} />
        <input placeholder="Department ID" value={deptId as any} onChange={e => setDeptId(e.target.value ? Number(e.target.value) : '')} />
        <button type="submit">Create Staff</button>
      </form>

      <div style={{ marginBottom: 16 }}>
        <label>Selected Department ID for grant/revoke actions: </label>
        <input value={deptId as any} onChange={e => setDeptId(e.target.value ? Number(e.target.value) : '')} />
      </div>

      <div>
        <h3>Staff users</h3>
        {loading ? <div>Loading...</div> : (
          <table>
            <thead><tr><th>Email</th><th>Name</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.full_name}</td>
                  <td>
                    <button onClick={() => handleGrant(u.id)}>Grant</button>
                    <button onClick={() => handleRevoke(u.id)}>Revoke</button>
                    <button onClick={() => handleReset(u.id)}>Reset Password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
