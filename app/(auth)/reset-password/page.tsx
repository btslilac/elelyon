'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { updatePassword } from '@/lib/actions/user.actions';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [isInvite, setIsInvite] = useState(false);

  // The session is now established by the /auth/callback route before the user
  // lands here. We just verify it to show the form or an error.
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      if (err || !session) {
        setSessionError('This link is invalid or has expired. Please request a new password reset.');
      } else {
        setIsInvite(!!session.user?.invited_at);
      }
      setSessionReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);
    setIsLoading(false);

    if (result.success) {
      setDone(true);
      // Auto-redirect after 3 seconds
      setTimeout(() => router.push('/sign-in'), 3000);
    } else {
      setError(result.error ?? 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left Brand Panel ── */}
      <div className="auth-panel-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="auth-logo">
              <Image src="/icons/logo.svg" width={120} height={120} alt="logo" />
            </div>
            <span className="auth-brand-name">El Elyon</span>
          </div>
          <div className="auth-hero">
            <h2 className="auth-hero-title">
              {isInvite ? <>Welcome to<br />El Elyon!</> : <>Set your<br />new password</>}
            </h2>
            <p className="auth-hero-sub">
              {isInvite
                ? 'Your account is ready. Set a password to start using the system.'
                : 'Choose a strong password to keep your lending dashboard secure.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">

          {/* Mobile logo */}
          <div className="auth-mobile-brand">
            <div className="auth-logo-dark">
              <Image src="/icons/logo.svg" width={36} height={36} alt="logo" />
            </div>
            <span className="auth-mobile-brand-name">El Elyon</span>
          </div>

          {done ? (
            /* ── Success State ── */
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircle size={52} strokeWidth={1.5} color="#16a34a" />
              </div>
              <h1 className="auth-form-title" style={{ marginBottom: '0.5rem' }}>
                {isInvite ? 'Account Activated!' : 'Password Updated!'}
              </h1>
              <p className="auth-form-sub" style={{ marginBottom: '2rem' }}>
                {isInvite
                  ? 'Your password has been set. You can now sign in to your account.'
                  : 'Your password has been changed successfully. Redirecting to sign in…'}
              </p>
              <Link href="/sign-in" className="auth-submit-btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                Go to Sign In
              </Link>
            </div>
          ) : sessionError ? (
            /* ── Invalid / Expired Link ── */
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h1 className="auth-form-title" style={{ marginBottom: '0.5rem', color: '#dc2626' }}>Link expired</h1>
              <p className="auth-form-sub" style={{ marginBottom: '2rem' }}>{sessionError}</p>
              <Link href="/forgot-password" className="auth-submit-btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                Request a new link
              </Link>
            </div>
          ) : !sessionReady ? (
            /* ── Waiting for token exchange ── */
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <Loader2 size={32} className="auth-spinner" style={{ margin: '0 auto 1rem' }} />
              <p className="auth-form-sub">Verifying your reset link…</p>
            </div>
          ) : (
            /* ── New Password Form ── */
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">
                {isInvite ? 'Set Your Password' : 'New Password'}
              </h1>
              <p className="auth-form-sub">
                {isInvite
                  ? 'Choose a password to activate your El Elyon account.'
                  : 'Enter and confirm your new password below.'}
              </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate>

                {/* New Password */}
                <div className="auth-field">
                  <label className="auth-label"><Lock size={12} />New Password</label>
                  <div className="auth-password-wrap">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input auth-password-input"
                      autoFocus
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="auth-toggle-pw"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.3rem' }}>Minimum 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div className="auth-field">
                  <label className="auth-label"><Lock size={12} />Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`auth-input${confirm && confirm !== password ? ' auth-input-error' : ''}`}
                  />
                  {confirm && confirm !== password && (
                    <p className="auth-field-error">Passwords do not match</p>
                  )}
                </div>

                {error && (
                  <div className="auth-error-banner">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="auth-submit-btn">
                  {isLoading
                    ? <><Loader2 size={16} className="auth-spinner" /><span>Updating…</span></>
                    : <span>Update Password</span>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
