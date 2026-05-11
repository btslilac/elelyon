import { getLoggedInUser, getPendingUsers } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { Users, ShieldAlert, CheckCircle, Clock, XCircle } from 'lucide-react';
import UsersTable from '@/components/UsersTable';
import InviteUserModal from '@/components/InviteUserModal';

export const metadata = {
  title: 'User Management | El Elyon',
  description: 'Admin panel to approve or reject user access requests.',
};

export default async function UsersPage() {
  const loggedIn = await getLoggedInUser();

  // Only ADMINs can access this page
  if (!loggedIn || loggedIn.role !== 'ADMIN') {
    redirect('/');
  }

  const allUsers = await getPendingUsers();

  const pending  = allUsers.filter((u: any) => u.userStatus === 'pending');
  const active   = allUsers.filter((u: any) => u.userStatus === 'active');
  const rejected = allUsers.filter((u: any) => u.userStatus === 'rejected');

  const stats = [
    { label: 'Total Users',     value: allUsers.length, icon: Users,       color: '#1a73e8', bg: '#eff6ff' },
    { label: 'Active',          value: active.length,   icon: CheckCircle, color: '#15803d', bg: '#f0fdf4' },
    { label: 'Pending Approval',value: pending.length,  icon: Clock,       color: '#c2410c', bg: '#fff7ed' },
    { label: 'Rejected',        value: rejected.length, icon: XCircle,     color: '#b91c1c', bg: '#fef2f2' },
  ];

  return (
    <div style={{
      padding: '2rem 1.5rem',
      maxWidth: 1100,
      margin: '0 auto',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #0f4c81, #1a73e8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert size={20} color="white" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f1c3f' }}>
              User Management
            </h1>
          </div>
          <p style={{ margin: 0, color: '#5a6a8a', fontSize: '0.9rem' }}>
            Review and approve access requests for new users.
          </p>
        </div>
        <InviteUserModal />
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{
            background: 'white',
            border: '1px solid #e8edf5',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 2px 8px rgba(15, 76, 129, 0.06)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f1c3f', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: '#5a6a8a', marginTop: 4 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: '0.75rem',
          }}>
            <Clock size={16} color="#c2410c" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f1c3f' }}>
              Pending Approval
              <span style={{
                marginLeft: 8, background: '#fff7ed', color: '#c2410c',
                border: '1px solid #fed7aa', borderRadius: 100,
                padding: '0.1rem 0.6rem', fontSize: '0.75rem',
              }}>{pending.length}</span>
            </h2>
          </div>
          <div style={{
            background: 'white', border: '1px solid #fed7aa',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(194, 65, 12, 0.08)',
          }}>
            <UsersTable users={pending} />
          </div>
        </section>
      )}

      {/* All users section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
          <Users size={16} color="#1a73e8" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f1c3f' }}>
            All Users
          </h2>
        </div>
        <div style={{
          background: 'white', border: '1px solid #e8edf5',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15, 76, 129, 0.06)',
        }}>
          <UsersTable users={allUsers} />
        </div>
      </section>
    </div>
  );
}
