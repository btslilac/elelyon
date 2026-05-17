'use client';

import Image from "next/image";
import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { authFormSchema } from '@/lib/utils';
import { Loader2, ShieldCheck, TrendingUp, Users, Lock, Mail, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/actions/user.actions';

const FEATURES = [
  { icon: TrendingUp, label: 'Real-time Portfolio Analytics' },
  { icon: Users, label: 'Multi-client Loan Management' },
  { icon: ShieldCheck, label: 'Bank-grade Security & Compliance' },
];

const AuthForm = ({ type }: { type: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const isSignIn = type === 'sign-in';
  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError('');
    try {
      if (type === 'sign-up') {
        const newUser = await signUp({
          firstName: data.firstName!,
          lastName: data.lastName!,
          email: data.email,
          password: data.password,
        });
        if (newUser) {
          setPendingApproval(true);
        } else {
          setError('Sign up failed. Please check your details and try again.');
        }
      }
      if (type === 'sign-in') {
        const response = await signIn({ email: data.email, password: data.password });
        if (response) {
          if (response.userStatus === 'pending') {
            setError('Your account is awaiting admin approval. Please try again later.');
            // Sign out immediately so no session is held
            const { logoutAccount } = await import('@/lib/actions/user.actions');
            await logoutAccount();
          } else if (response.userStatus === 'rejected') {
            setError('Your account request was not approved. Please contact the administrator.');
            const { logoutAccount } = await import('@/lib/actions/user.actions');
            await logoutAccount();
          } else {
            router.push('/');
          }
        } else {
          setError('Invalid email or password. Please try again.');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="auth-page">
      {/* ── Left Brand Panel ── */}
      <div className="auth-panel-left">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />

        <div className="auth-left-inner">
          {/* Brand mark */}
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

          {/* Hero copy */}
          <div className="auth-hero">
            <h2 className="auth-hero-title">
              Enterprise-Grade<br />Loan Management
            </h2>
            <p className="auth-hero-sub">
              The platform built for modern lenders — track portfolios, manage clients, and process repayments at scale.
            </p>
          </div>

          {/* Feature pills */}
          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="auth-feature-item">
                <div className="auth-feature-icon"><Icon size={14} /></div>
                <span>{label}</span>
              </li>
            ))}
          </ul>

          {/* Bottom stat bar */}
          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-num">99.9%</span>
              <span className="auth-stat-label">Uptime SLA</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-num">256-bit</span>
              <span className="auth-stat-label">Encryption</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-num">&lt;100ms</span>
              <span className="auth-stat-label">Query Speed</span>
            </div>
          </div>
        </div>
      </div>
      {/* ── Right Form Panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">

          {/* Mobile logo (hidden on desktop) */}
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

          {/* Heading */}
          <div className="auth-form-header">
            <h1 className="auth-form-title">
              {isSignIn ? 'Welcome back' : 'Request Access'}
            </h1>
            <p className="auth-form-sub">
              {isSignIn
                ? 'Sign in to access your lending dashboard.'
                : 'Submit your details. An administrator will review and approve your account.'}
            </p>
          </div>

          {/* ── Pending Approval Success State ── */}
          {pendingApproval ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              padding: '2rem 1.5rem', textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f4c81', margin: 0 }}>
                Request Submitted!
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.6, maxWidth: 300 }}>
                Your account has been created and is <strong>awaiting admin approval</strong>.
                You will be able to sign in once your access has been granted.
              </p>
              <a href="/sign-in" style={{
                marginTop: 8, padding: '0.6rem 1.5rem', borderRadius: 8,
                background: '#0f4c81', color: 'white', textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
              }}>Back to Sign In</a>
            </div>
          ) : (
            <>
            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>

            {/* Name row — sign-up only */}
            {!isSignIn && (
              <div className="auth-row-2">
                <div className="auth-field">
                  <label className="auth-label"><User size={12} />First Name</label>
                  <input
                    {...register('firstName')}
                    type="text"
                    placeholder="John"
                    className={`auth-input${(errors as any).firstName ? ' auth-input-error' : ''}`}
                  />
                  {(errors as any).firstName && (
                    <p className="auth-field-error">{(errors as any).firstName.message}</p>
                  )}
                </div>
                <div className="auth-field">
                  <label className="auth-label"><User size={12} />Last Name</label>
                  <input
                    {...register('lastName')}
                    type="text"
                    placeholder="Doe"
                    className={`auth-input${(errors as any).lastName ? ' auth-input-error' : ''}`}
                  />
                  {(errors as any).lastName && (
                    <p className="auth-field-error">{(errors as any).lastName.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label"><Mail size={12} />Email Address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={`auth-input${errors.email ? ' auth-input-error' : ''}`}
              />
              {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label"><Lock size={12} />Password</label>
                {isSignIn && (
                  <Link href="/forgot-password" style={{ fontSize: "0.75rem", color: "#0A0A0C", fontWeight: 600, textDecoration: "none" }}>
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="auth-password-wrap">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`auth-input auth-password-input${errors.password ? ' auth-input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="auth-toggle-pw"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
            </div>

            {/* Error banner */}
            {error && (
              <div className="auth-error-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p>{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button type="submit" disabled={isLoading} className="auth-submit-btn">
              {isLoading
                ? <><Loader2 size={16} className="auth-spinner" /><span>Processing…</span></>
                : <span>{isSignIn ? 'Sign In to Dashboard' : 'Submit Request'}</span>
              }
            </button>
          </form>

          {/* Switch link — only show on sign-in page */}
          {isSignIn && (
            <p className="auth-footer-text">
              Need access?{' '}
              <span style={{ color: '#888', fontStyle: 'italic', fontSize: '0.8rem' }}>
                Contact your administrator.
              </span>
            </p>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;