"use client";

import React, { useCallback, useEffect, useState } from 'react';
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
import { PromptDialog } from '@/components/ui/ConfirmDialog';

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [deptId, setDeptId] = useState<number | ''>('');
  const [actionDeptId, setActionDeptId] = useState<number | ''>('');

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<{ userId: string; userEmail: string } | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/roles-and-departments', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (res.ok) {
        const json = await res.json();
        setRoles(json.roles ?? []);
        setDepartments(json.departments ?? []);
        if (json.roles?.length) {
          const staffRole = json.roles.find((r: RoleOption) => r.name.toLowerCase() === 'staff');
          if (staffRole) {
            setRoleId((prev) => (prev === '' ? staffRole.id : prev));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load roles and departments:', err);
    }
  }, [getToken]);

  const fetchUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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
  }, [getToken]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadMeta();
      void fetchUsers(true);
    });
  }, [loadMeta, fetchUsers]);

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
        setSuccessMsg(`Staff account for "${email}" successfully created.`);
        setEmail('');
        setPassword('');
        setFullName('');
        await fetchUsers(true);
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
        await fetchUsers(true);
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
        await fetchUsers(true);
      } else {
        setErrorMsg(json.error || 'Failed to revoke department access.');
      }
    } catch {
      setErrorMsg('Network error while revoking access.');
    }
  }

  async function handleConfirmReset(newPass: string) {
    if (!resetTarget) return;
    setResetBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ userId: resetTarget.userId, newPassword: newPass }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Password reset for ${resetTarget.userEmail}.`);
        setResetTarget(null);
      } else {
        setErrorMsg(json.error || 'Password reset failed.');
        setResetTarget(null);
      }
    } catch {
      setErrorMsg('Network error while resetting password.');
      setResetTarget(null);
    } finally {
      setResetBusy(false);
    }
  }

  const roleMap = new Map(roles.map((r) => [r.id, r.name]));
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163D32]/15 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#163D32] flex items-center gap-2.5">
            <Users className="h-7 w-7 text-[#7A5A27]" /> Staff & Roles Management
          </h1>
          <p className="text-sm text-[#52645D] mt-1">
            Provision verified staff accounts and control department permissions across Tule Resort.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchUsers()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#163D32] bg-white border border-[#163D32]/20 rounded-xl shadow-xs hover:bg-[#EDE8DC] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-900 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-950 text-sm font-medium">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#163D32]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Create Staff Form Card */}
      <div className="bg-white rounded-2xl border border-[#163D32]/15 shadow-sm p-6 sm:p-7">
        <h2 className="text-base font-bold text-[#163D32] mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#7A5A27]" /> Provision New Staff Member
        </h2>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="admin-staff-email" className="block text-xs font-bold uppercase tracking-wider text-[#52645D] mb-1.5">
              Email Address *
            </label>
            <input
              id="admin-staff-email"
              type="email"
              required
              placeholder="e.g. staff.member@tuleresort.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#F5F0E6]/50 border border-[#163D32]/20 rounded-xl focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15 outline-none transition-all text-[#26312D]"
            />
          </div>

          <div>
            <label htmlFor="admin-staff-password" className="block text-xs font-bold uppercase tracking-wider text-[#52645D] mb-1.5">
              Temporary Password *
            </label>
            <input
              id="admin-staff-password"
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#F5F0E6]/50 border border-[#163D32]/20 rounded-xl focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15 outline-none transition-all text-[#26312D]"
            />
          </div>

          <div>
            <label htmlFor="admin-staff-fullname" className="block text-xs font-bold uppercase tracking-wider text-[#52645D] mb-1.5">
              Full Name
            </label>
            <input
              id="admin-staff-fullname"
              type="text"
              placeholder="e.g. Abebe Bikila"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#F5F0E6]/50 border border-[#163D32]/20 rounded-xl focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15 outline-none transition-all text-[#26312D]"
            />
          </div>

          <div>
            <label htmlFor="admin-staff-role" className="block text-xs font-bold uppercase tracking-wider text-[#52645D] mb-1.5 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-[#163D32]" /> Role *
            </label>
            <select
              id="admin-staff-role"
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 text-sm bg-[#F5F0E6]/50 border border-[#163D32]/20 rounded-xl focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15 outline-none transition-all text-[#26312D]"
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
            <label htmlFor="admin-staff-dept" className="block text-xs font-bold uppercase tracking-wider text-[#52645D] mb-1.5 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-[#163D32]" /> Primary Department
            </label>
            <select
              id="admin-staff-dept"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 text-sm bg-[#F5F0E6]/50 border border-[#163D32]/20 rounded-xl focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15 outline-none transition-all text-[#26312D]"
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
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#F5F0E6] bg-[#163D32] hover:bg-[#0F2D24] rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 text-[#C5A46D]" />}
              Create Staff Account
            </button>
          </div>
        </form>
      </div>

      {/* Department Access Controller */}
      <div className="bg-white border border-[#163D32]/15 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F0E6] text-[#163D32]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#163D32]">Department Access Manager</p>
            <p className="text-xs text-[#52645D]">
              Select a department below, then click Grant or Revoke on any user row.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <label htmlFor="admin-action-dept" className="sr-only">
            Choose department for access grant or revoke
          </label>
          <select
            id="admin-action-dept"
            value={actionDeptId}
            onChange={(e) => setActionDeptId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3.5 py-2 text-sm bg-[#F5F0E6]/60 border border-[#163D32]/20 rounded-xl focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15 outline-none transition-all text-[#26312D]"
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
      <div className="bg-white rounded-2xl border border-[#163D32]/15 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#163D32]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#163D32] flex items-center gap-2">
            <Users className="h-4 w-4 text-[#7A5A27]" /> Active Staff Directory ({users.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#52645D] flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#163D32]" />
            <p className="text-xs font-medium">Loading staff accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[#52645D]">
            No staff records found. Provision a staff member above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F0E6]/70 border-b border-[#163D32]/15 text-xs font-bold uppercase tracking-wider text-[#52645D]">
                <tr>
                  <th className="py-3 px-6">Staff Member</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Primary Department</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#163D32]/10">
                {users.map((u) => {
                  const roleName = (u.role_id ? roleMap.get(u.role_id) : null) || 'Staff';
                  const deptIdVal = u.primary_department_id ?? u.department_id;
                  const deptName = deptIdVal ? deptMap.get(deptIdVal) : null;

                  return (
                    <tr key={u.id} className="hover:bg-[#F5F0E6]/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-[#26312D]">{u.full_name || 'Staff User'}</div>
                        <div className="text-xs text-[#52645D] font-mono mt-0.5">{u.email}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            roleName.toLowerCase() === 'admin'
                              ? 'bg-[#163D32] text-[#F5F0E6]'
                              : roleName.toLowerCase() === 'manager'
                              ? 'bg-[#C5A46D]/25 text-[#7A5A27]'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {roleName.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {deptName ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163D32] bg-[#F5F0E6] px-2.5 py-1 rounded-lg border border-[#163D32]/10">
                            <Building2 className="h-3 w-3 text-[#7A5A27]" />
                            {deptName}
                          </span>
                        ) : (
                          <span className="text-xs text-[#52645D] italic">Resort-wide (None)</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleGrant(u.id)}
                          title="Grant access to selected department"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#163D32] bg-[#F5F0E6] border border-[#163D32]/20 rounded-lg hover:bg-[#EDE8DC] transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5" /> Grant Dept
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRevoke(u.id)}
                          title="Revoke access to selected department"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#7A5A27] bg-[#C5A46D]/15 border border-[#C5A46D]/40 rounded-lg hover:bg-[#C5A46D]/25 transition-colors"
                        >
                          <MinusCircle className="h-3.5 w-3.5" /> Revoke Dept
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetTarget({ userId: u.id, userEmail: u.email })}
                          title="Reset staff password"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#26312D] bg-white border border-[#163D32]/20 rounded-lg hover:bg-[#F5F0E6] transition-colors"
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

      <PromptDialog
        open={Boolean(resetTarget)}
        title="Reset Staff Password"
        description={`Enter a new temporary password for ${resetTarget?.userEmail ?? 'this account'}.`}
        inputLabel="New Password"
        inputType="password"
        placeholder="Minimum 6 characters"
        confirmLabel="Update Password"
        minLength={6}
        busy={resetBusy}
        onSubmit={handleConfirmReset}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
