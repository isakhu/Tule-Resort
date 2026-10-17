"use client";

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';

type UserRow = {
  id: string;
  email: string;
  full_name?: string | null;
  role_id?: number | null;
  primary_department_id?: number | null;
  department_id?: number | null;
};

type RoleOption = {
  id: number;
  name: string;
};

type DepartmentOption = {
  id: number;
  name: string;
};

export default function AdminStaffManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [deptId, setDeptId] = useState<number | ''>('');
  const [actionDeptId, setActionDeptId] = useState<number | ''>('');

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadMeta() {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/roles-and-departments', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        setRoles(json.roles ?? []);
        setDepartments(json.departments ?? []);
        if (json.roles?.length && roleId === '') {
          // Default to 'staff' if available
          const staffRole = json.roles.find((r: RoleOption) => r.name.toLowerCase() === 'staff');
          if (staffRole) setRoleId(staffRole.id);
        }
      }
    } catch (err) {
      console.error('Failed to load roles and departments:', err);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/list-users', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const json = await res.json();
      if (res.ok) {
        setUsers(json.users ?? []);
      } else {
        setErrorMsg(json.error || 'Failed to fetch staff members.');
      }
    } catch {
      setErrorMsg('Failed to fetch staff list. Please verify connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
    fetchUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!roleId) {
      setErrorMsg('Please select a staff role.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName.trim() || null,
          role_id: Number(roleId),
          primary_department_id: deptId ? Number(deptId) : null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Staff account for "${email}" successfully created!`);
        setEmail('');
        setPassword('');
        setFullName('');
        fetchUsers();
      } else {
        setErrorMsg(json.error || 'Failed to create staff account.');
      }
    } catch {
      setErrorMsg('Network error while creating staff account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGrant(userId: string) {
    if (!actionDeptId) {
      setErrorMsg('Please select a department from the dropdown before granting access.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ userId, departmentId: Number(actionDeptId) }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Department access granted successfully.');
        fetchUsers();
      } else {
        setErrorMsg(json.error || 'Failed to grant department access.');
      }
    } catch {
      setErrorMsg('Network error while granting access.');
    }
  }

  async function handleRevoke(userId: string) {
    if (!actionDeptId) {
      setErrorMsg('Please select a department from the dropdown before revoking access.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/admin/revoke-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ userId, departmentId: Number(actionDeptId) }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Department access revoked.');
        fetchUsers();
      } else {
        setErrorMsg(json.error || 'Failed to revoke department access.');
      }
    } catch {
      setErrorMsg('Network error while revoking access.');
    }
  }

  async function handleReset(userId: string, userEmail: string) {
    const newPass = prompt(`Enter new password for ${userEmail} (min 6 characters):`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ userId, newPassword: newPass }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert('Password successfully reset.');
      } else {
        alert(json.error || 'Password reset failed.');
      }
    } catch {
      alert('Network error while resetting password.');
    }
  }

  const roleMap = new Map(roles.map((r) => [r.id, r.name]));
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Users className="h-7 w-7 text-[#0E7480]" /> Staff & Roles Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Provision verified staff accounts and control department permissions across Tule Resort.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3 text-teal-800 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Create Staff Form Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-7">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#C9902F]" /> Provision New Staff Member
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. staff.member@tuleresort.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Temporary Password *
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Abebe Bikila"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-[#0E7480]" /> Role *
            </label>
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none transition-all"
            >
              <option value="">Select Role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-[#0E7480]" /> Primary Department
            </label>
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none transition-all"
            >
              <option value="">Select Department (Optional)...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0E7480] hover:bg-[#0B5E68] rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create Staff Account
            </button>
          </div>
        </form>
      </div>

      {/* Department Access Controller */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-[#0E7480]" />
          <div>
            <p className="text-sm font-bold text-gray-900">Department Access Manager</p>
            <p className="text-xs text-gray-500">
              Select a department below, then click Grant or Revoke on any user row.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <select
            value={actionDeptId}
            onChange={(e) => setActionDeptId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none shadow-sm transition-all"
          >
            <option value="">Choose Department for Action...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" /> Active Staff Directory ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E7480]" />
            <p className="text-xs">Loading staff accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No staff records found. Provision a staff member above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200/80 text-xs font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="py-3 px-6">Staff Member</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Primary Department</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const roleName = (u.role_id ? roleMap.get(u.role_id) : null) || 'Staff';
                  const deptIdVal = u.primary_department_id ?? u.department_id;
                  const deptName = deptIdVal ? deptMap.get(deptIdVal) : null;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900">{u.full_name || 'Staff User'}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{u.email}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            roleName.toLowerCase() === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : roleName.toLowerCase() === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {roleName.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {deptName ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            <Building2 className="h-3 w-3 text-gray-500" />
                            {deptName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Resort-wide (None)</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleGrant(u.id)}
                          title="Grant access to selected department"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5" /> Grant Dept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(u.id)}
                          title="Revoke access to selected department"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          <MinusCircle className="h-3.5 w-3.5" /> Revoke Dept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReset(u.id, u.email)}
                          title="Reset staff password"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Reset Pwd
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
