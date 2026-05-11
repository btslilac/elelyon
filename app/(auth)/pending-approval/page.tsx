import { logoutAccount } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

async function handleSignOut() {
  'use server';
  await logoutAccount();
  redirect('/sign-in');
}

export default function PendingApprovalPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: '3rem 2.5rem',
        maxWidth: 460,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(15, 76, 129, 0.12)',
        border: '1px solid rgba(15, 76, 129, 0.08)',
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 24px rgba(15, 76, 129, 0.3)',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f1c3f', margin: '0 0 0.75rem' }}>
          Account Pending Approval
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#5a6a8a', lineHeight: 1.7, margin: '0 0 2rem' }}>
          Your account has been created and is currently under review.
          The administrator will approve your access shortly.
          You will be able to sign in once your account is activated.
        </p>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#fff7ed', border: '1px solid #fed7aa',
          borderRadius: 100, padding: '0.4rem 1rem',
          fontSize: '0.8rem', fontWeight: 600, color: '#c2410c',
          marginBottom: '2rem',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
          Awaiting Admin Review
        </div>

        {/* Sign out form */}
        <form action={handleSignOut}>
          <button type="submit" style={{
            width: '100%', padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(15, 76, 129, 0.25)',
            transition: 'opacity 0.2s',
          }}>
            Sign Out
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#9aa4b8' }}>
          Questions? Contact{' '}
          <a href="mailto:timtheesam@gmail.com" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 600 }}>
            the administrator
          </a>
        </p>
      </div>
    </div>
  );
}
