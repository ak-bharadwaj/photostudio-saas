'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { 
  Users, 
  Search,
  Mail,
  RefreshCw,
  Building2,
  Calendar,
  KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading';

interface User {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  studio?: { id: string; name: string; slug: string } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isResettingId, setIsResettingId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/users', {
        params: {
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
          search: search || undefined,
          limit: 100
        }
      });
      setUsers(res.data.data);
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const resetPassword = async (userId: string) => {
    if (!window.confirm("Are you sure you want to trigger a password reset for this user? They will receive an email link to reset their password.")) return;
    
    try {
      setIsResettingId(userId);
      const res = await api.post(`/admin/users/${userId}/reset-password`);
      addToast('success', res.data.message || 'Password reset email sent successfully');
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResettingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)] mt-1">
            View all users, split by role, and trigger password resets.
          </p>
        </div>
        
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <div className="flex bg-[var(--background-tertiary)] p-1 rounded-lg border border-[var(--border-light)]">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                roleFilter === 'ALL' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              All
            </button>
            <button
              onClick={() => setRoleFilter('CUSTOMER')}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                roleFilter === 'CUSTOMER' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              Customers
            </button>
            <button
              onClick={() => setRoleFilter('OWNER')}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                roleFilter === 'OWNER' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              Partners
            </button>
          </div>
          
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-tertiary)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-[var(--background-secondary)] border border-[var(--border-light)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </form>
        </div>
      </div>

      <div className="glass-luxury rounded-[var(--radius-lg)] border border-[var(--border-light)] overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <LoadingSpinner size="lg" className="text-[var(--primary)]" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-[var(--foreground-tertiary)] mb-3" />
            <p className="text-lg font-medium text-[var(--foreground)]">No users found</p>
            <p className="text-sm text-[var(--foreground-secondary)] mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] text-sm">
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Contact Details</th>
                  <th className="px-6 py-4 font-medium">Role / Studio</th>
                  <th className="px-6 py-4 font-medium">Joined On</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">{user.name || 'Unnamed User'}</p>
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1",
                            user.role === 'CUSTOMER' ? "bg-blue-500/10 text-blue-400" 
                            : user.role === 'OWNER' ? "bg-amber-500/10 text-amber-400" 
                            : "bg-emerald-500/10 text-emerald-400"
                          )}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm text-[var(--foreground-secondary)]">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-[var(--foreground-secondary)]" />
                          <span className={!user.email ? 'italic text-[var(--foreground-tertiary)]' : ''}>
                            {user.email || 'No email'}
                          </span>
                        </div>
                        {user.phone && (
                          <div className="text-xs">{user.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.studio ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Building2 className="h-4 w-4 text-[var(--primary)]" />
                          {user.studio.name}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--foreground-tertiary)] italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--foreground-secondary)]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => resetPassword(user.id)}
                        disabled={isResettingId === user.id || !user.email}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                          "bg-[var(--background-secondary)] border border-[var(--border-light)] shadow-sm",
                          "hover:bg-[var(--overlay-light)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        title={!user.email ? "Cannot reset: No email attached" : "Send Password Reset Email"}
                      >
                        {isResettingId === user.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
