'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { inviteUser } from '@/lib/actions/user.actions';
import { UserPlus, X, Loader2, CheckCircle, Mail, User, Shield, Send } from 'lucide-react';

type Props = {
  onSuccess?: () => void;
};

export default function InviteUserModal({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'STAFF' as 'STAFF' | 'ADMIN',
  });

  // Focus first field when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => firstRef.current?.focus(), 80);
      setResult(null);
      setForm({ firstName: '', lastName: '', email: '', role: 'STAFF' });
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!form.firstName || !form.lastName || !form.email) {
      setResult({ ok: false, msg: 'First name, last name and email are required.' });
      return;
    }

    startTransition(async () => {
      const res = await inviteUser(form);
      if (res.success) {
        setResult({ ok: true, msg: `An invitation email has been sent to ${form.email}. They will set their own password via the link in the email.` });
        onSuccess?.();
      } else {
        setResult({ ok: false, msg: res.error ?? 'Something went wrong.' });
      }
    });
  };

  const inputStyle = (hasError = false): React.CSSProperties => ({
    width: '100%',
    padding: '0.65rem 0.875rem 0.65rem 2.5rem',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: 9,
    fontSize: '0.875rem',
    color: '#1a2340',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#5a6a8a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  };

  const iconWrap: React.CSSProperties = {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9aa4b8',
    display: 'flex',
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0.6rem 1.25rem',
          background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(15, 76, 129, 0.3)',
          transition: 'opacity 0.2s, transform 0.15s',
        }}
        onMouseOver={e => (e.currentTarget.style.opacity = '0.92')}
        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
      >
        <UserPlus size={16} />
        Invite User
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10, 20, 50, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            animation: 'fadeIn 0.15s ease',
          }}
        />
      )}

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'white',
          borderRadius: 18,
          width: '100%',
          maxWidth: 480,
          padding: '2rem',
          boxShadow: '0 24px 80px rgba(10, 20, 50, 0.22)',
          animation: 'slideUp 0.2s ease',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {/* Modal header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <UserPlus size={20} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f1c3f' }}>
                  Invite New User
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#8a95ab' }}>
                  An invite email will be sent. The user sets their own password.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                border: 'none', background: '#f1f4f9', borderRadius: 8,
                width: 32, height: 32, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5a6a8a', flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Success state */}
          {result?.ok ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.75rem', padding: '1.5rem', textAlign: 'center',
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={30} color="#15803d" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1a2340', fontWeight: 600 }}>
                User Invited!
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#5a6a8a', lineHeight: 1.6 }}>
                {result.msg}
              </p>
              <button
                onClick={() => setOpen(false)}
                style={{
                  marginTop: 8, padding: '0.55rem 1.5rem',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  color: '#15803d', borderRadius: 8, fontSize: '0.85rem',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
                <div>
                  <label style={labelStyle}><User size={11} />First Name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><User size={14} /></span>
                    <input
                      ref={firstRef}
                      type="text"
                      placeholder="John"
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      style={inputStyle()}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}><User size={11} />Last Name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><User size={14} /></span>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      style={inputStyle()}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={labelStyle}><Mail size={11} />Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconWrap}><Mail size={14} /></span>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle()}
                    required
                  />
                </div>
              </div>

              {/* Role */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}><Shield size={11} />Role</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['STAFF', 'ADMIN'] as const).map(r => (
                    <label
                      key={r}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0.6rem 0.875rem',
                        border: `1.5px solid ${form.role === r ? '#1a73e8' : '#e2e8f0'}`,
                        borderRadius: 9, cursor: 'pointer',
                        background: form.role === r ? '#eff6ff' : 'white',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={form.role === r}
                        onChange={() => setForm(f => ({ ...f, role: r }))}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: `2px solid ${form.role === r ? '#1a73e8' : '#cbd5e1'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {form.role === r && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a73e8' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: form.role === r ? '#1d4ed8' : '#1a2340' }}>{r}</div>
                        <div style={{ fontSize: '0.72rem', color: '#8a95ab' }}>
                          {r === 'STAFF' ? 'Read/write access' : 'Full admin access'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {result && !result.ok && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0.65rem 0.875rem',
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: 8, marginBottom: '1rem',
                  fontSize: '0.82rem', color: '#b91c1c',
                }}>
                  <X size={13} style={{ flexShrink: 0 }} />
                  {result.msg}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    flex: 1, padding: '0.7rem',
                    border: '1.5px solid #e2e8f0', background: 'white',
                    color: '#5a6a8a', borderRadius: 10,
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    flex: 2, padding: '0.7rem',
                    background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: '0.875rem', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: isPending ? 0.75 : 1,
                    boxShadow: '0 4px 14px rgba(15, 76, 129, 0.25)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {isPending ? (
                    <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending Invite…</>
                  ) : (
                    <><Send size={15} /> Send Invite</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -46%) } to { opacity: 1; transform: translate(-50%, -50%) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
