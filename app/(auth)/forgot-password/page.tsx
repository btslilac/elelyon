'use client';

import Image from "next/image";
import Link from 'next/link';
import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { requestPasswordReset } from '@/lib/actions/user.actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await requestPasswordReset(email.trim());
    setIsLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? 'Failed to send reset email. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left Brand Panel (reuse auth styles) ── */}
      <div className="auth-panel-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="auth-logo">
              <Image
                src="/icons/logo.svg"
                width={120}
                height={120}
                alt="logo"
                style={{
                  maxWidth: "100%",
                  height: "auto"
                }} />
            </div>
            <span className="auth-brand-name">El Elyon</span>
          </div>
          <div className="auth-hero">
            <h2 className="auth-hero-title">Forgot your<br />password?</h2>
            <p className="auth-hero-sub">
              No worries — enter the email linked to your account and we&apos;ll send you a secure reset link.
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
              <Image
                src="/icons/logo.svg"
                width={36}
                height={36}
                alt="logo"
                style={{
                  maxWidth: "100%",
                  height: "auto"
                }} />
            </div>
            <span className="auth-mobile-brand-name">El Elyon</span>
          </div>

          {sent ? (
            /* ── Success State ── */
            (<div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircle size={52} strokeWidth={1.5} color="#16a34a" />
              </div>
              <h1 className="auth-form-title" style={{ marginBottom: '0.5rem' }}>Check your inbox</h1>
              <p className="auth-form-sub" style={{ marginBottom: '2rem' }}>
                We&apos;ve sent a password reset link to <strong>{email}</strong>. 
                The link expires in 1 hour — check your spam folder if you don&apos;t see it.
              </p>
              <Link href="/sign-in" className="auth-submit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                <ArrowLeft size={15} /> Back to Sign In
              </Link>
            </div>)
          ) : (
            /* ── Request Form ── */
            (<>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Reset Password</h1>
                <p className="auth-form-sub">Enter your account email to receive a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="auth-field">
                  <label className="auth-label"><Mail size={12} />Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    autoFocus
                  />
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
                    ? <><Loader2 size={16} className="auth-spinner" /><span>Sending…</span></>
                    : <span>Send Reset Link</span>
                  }
                </button>
              </form>
              <p className="auth-footer-text">
                Remember it?{' '}
                <Link href="/sign-in" className="auth-footer-link">Back to Sign In</Link>
              </p>
            </>)
          )}
        </div>
      </div>
    </div>
  );
}
