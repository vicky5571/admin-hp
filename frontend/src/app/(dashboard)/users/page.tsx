"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppRole,
  AppUser,
  changePassword,
  createUser,
  fetchRoles,
  fetchUsers,
  resetUserPassword,
  updateUser,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface UserForm {
  fullName: string;
  username: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

const emptyForm: UserForm = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const [pwTarget, setPwTarget] = useState<AppUser | null>(null);
  const [pwMode, setPwMode] = useState<"change" | "reset">("change");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");

  const isAdmin = me?.role === "OWNER" || me?.role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(u.data ?? []);
      setRoles(r.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, roleId: roles[0]?.id ? String(roles[0].id) : "" });
    setShowForm(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      username: u.username,
      email: u.email ?? "",
      password: "",
      roleId: String(u.roleId),
      isActive: u.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.fullName || !form.username || !form.roleId) {
      setError("Full name, username, and role are required");
      return;
    }
    if (!editing && !form.password) {
      setError("Password is required for new user");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          fullName: form.fullName,
          username: form.username,
          email: form.email || undefined,
          roleId: Number(form.roleId),
          isActive: form.isActive,
        });
      } else {
        await createUser({
          fullName: form.fullName,
          username: form.username,
          email: form.email || undefined,
          password: form.password,
          roleId: Number(form.roleId),
        });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pwTarget || !newPw) return;
    setError("");
    try {
      if (pwMode === "change") {
        await changePassword(pwTarget.id, currentPw, newPw);
      } else {
        await resetUserPassword(pwTarget.id, newPw);
      }
      setPwTarget(null);
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    }
  };

  const toggleActive = async (u: AppUser) => {
    setError("");
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">
          Access restricted. Admin or Owner role required.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New User
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 sm:mb-6 rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4">
            {editing ? `Edit ${editing.fullName}` : "New User"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={form.roleId}
                onChange={(e) =>
                  setForm({ ...form, roleId: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            {editing && (
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pwTarget && (
        <div className="mb-4 sm:mb-6 rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4">
            {pwMode === "change" ? "Change" : "Reset"} Password for{" "}
            {pwTarget.fullName}
          </h2>
          {pwMode === "change" && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePasswordSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setPwTarget(null);
                setCurrentPw("");
                setNewPw("");
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Full Name</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No users
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">{u.email ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                    {u.role?.name ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-500">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 space-x-3">
                  <button
                    onClick={() => openEdit(u)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  {u.id === me?.id ? (
                    <button
                      onClick={() => {
                        setPwTarget(u);
                        setPwMode("change");
                      }}
                      className="text-amber-600 hover:underline"
                    >
                      Change Password
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPwTarget(u);
                        setPwMode("reset");
                      }}
                      className="text-amber-600 hover:underline"
                    >
                      Reset Password
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(u)}
                    className="text-gray-500 hover:underline"
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
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
