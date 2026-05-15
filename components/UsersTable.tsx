'use client';

import { useState, useTransition } from 'react';
import { approveUser, rejectUser } from '@/lib/actions/user.actions';
import { CheckCircle, XCircle, Clock, UserCheck, UserX, Shield, Mail, Calendar } from 'lucide-react';

type UserRow = {
  $id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  userStatus: string;
};

type Props = {
  users: UserRow[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: '#c2410c', bg: '#fff7ed', icon: Clock },
  active: { label: 'Active', color: '#15803d', bg: '#f0fdf4', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['pending'];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      borderRadius: 100, padding: '0.3rem 0.75rem',
      fontSize: '0.75rem', fontWeight: 600,
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function UsersTable({ users }: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const handleApprove = (id: string) => {
    setActionUserId(id);
    setFeedback(null);
    startTransition(async () => {
      const result = await approveUser(id);
      setFeedback({ id, msg: result.success ? 'User approved.' : result.error ?? 'Failed.', ok: result.success });
      setActionUserId(null);
    });
  };

  const handleReject = (id: string) => {
    if (!confirm('Mark this user as rejected? They will not be able to access the system.')) return;
    setActionUserId(id);
    setFeedback(null);
    startTransition(async () => {
      const result = await rejectUser(id);
      setFeedback({ id, msg: result.success ? 'User rejected.' : result.error ?? 'Failed.', ok: result.success });
      setActionUserId(null);
    });
  };

  if (users.length === 0) {
    return (
      <div style={{
        padding: '3rem', textAlign: 'center', color: '#9aa4b8',
        background: 'white', borderRadius: 12, border: '1px solid #e8edf5',
      }}>
        <UserCheck size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No users found.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8fafd', borderBottom: '2px solid #e8edf5' }}>
            {['User', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
              <th key={h} style={{
                padding: '0.85rem 1rem', textAlign: 'left',
                fontWeight: 700, color: '#5a6a8a', fontSize: '0.75rem',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => {
            const isActing = actionUserId === user.$id && isPending;
            const fb = feedback?.id === user.$id ? feedback : null;
            return (
              <tr key={user.$id} style={{
                borderBottom: '1px solid #f0f4fa',
                background: i % 2 === 0 ? 'white' : '#fafbff',
                transition: 'background 0.15s',
              }}>
                {/* User */}
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      {(user.firstName?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1a2340' }}>{user.name}</div>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td style={{ padding: '1rem', color: '#5a6a8a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} style={{ flexShrink: 0 }} />
                    {user.email}
                  </div>
                </td>

                {/* Role */}
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: user.role === 'ADMIN' ? '#eff6ff' : '#f8fafd',
                    color: user.role === 'ADMIN' ? '#1d4ed8' : '#5a6a8a',
                    border: `1px solid ${user.role === 'ADMIN' ? '#bfdbfe' : '#e8edf5'}`,
                    borderRadius: 6, padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    <Shield size={11} />
                    {user.role}
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: '1rem' }}>
                  <StatusBadge status={user.userStatus} />
                </td>

                {/* Actions */}
                <td style={{ padding: '1rem' }}>
                  {fb ? (
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: fb.ok ? '#15803d' : '#b91c1c',
                    }}>{fb.msg}</span>
                  ) : user.userStatus === 'pending' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprove(user.$id)}
                        disabled={isActing}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                          background: '#15803d', color: 'white',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          opacity: isActing ? 0.6 : 1, transition: 'opacity 0.2s',
                        }}
                      >
                        <UserCheck size={13} />
                        {isActing ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(user.$id)}
                        disabled={isActing}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '0.4rem 0.9rem', borderRadius: 8,
                          border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          opacity: isActing ? 0.6 : 1, transition: 'opacity 0.2s',
                        }}
                      >
                        <UserX size={13} />
                        Reject
                      </button>
                    </div>
                  ) : user.userStatus === 'active' ? (
                    <button
                      onClick={() => handleReject(user.$id)}
                      disabled={isActing}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '0.4rem 0.9rem', borderRadius: 8,
                        border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c',
                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        opacity: isActing ? 0.6 : 1,
                      }}
                    >
                      <UserX size={13} />
                      Revoke
                    </button>
                  ) : user.userStatus === 'rejected' ? (
                    <button
                      onClick={() => handleApprove(user.$id)}
                      disabled={isActing}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                        background: '#15803d', color: 'white',
                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        opacity: isActing ? 0.6 : 1,
                      }}
                    >
                      <UserCheck size={13} />
                      Restore
                    </button>
                  ) : (
                    <span style={{ color: '#c0c8d8', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
