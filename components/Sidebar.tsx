'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import { LayoutDashboard, Users, CreditCard, BarChart2, UserCog, MessageSquare } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/clients': Users,
  '/loans': CreditCard,
  '/reports': BarChart2,
  '/communications': MessageSquare,
  '/users': UserCog,
}

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="sidebar">
      {/* Brand */}
      <Link href="/" className="sidebar-brand">
        <div className="sidebar-logo">
          <Image
            src="/icons/logo.svg"
            alt="El Elyon Logo"
            width={50}
            height={50}
            style={{ objectFit: 'contain' }}
            priority
            loading="eager"
          />
        </div>
        <div className="sidebar-brand-info">
          <span className="sidebar-brand-name">El Elyon</span>
          <span className="sidebar-brand-tagline">Capital &amp; Credit Solutions</span>
        </div>
      </Link>



      {/* Nav Links */}
      <nav className="sidebar-nav">
        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)
          const Icon = iconMap[item.route] || LayoutDashboard

          return (
            <Link
              href={item.route}
              key={item.label}
              className={cn('sidebar-link', { 'sidebar-link-active': isActive })}
            >
              <Icon className="sidebar-icon" strokeWidth={isActive ? 2.5 : 2} />
              <span className="sidebar-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Admin-only: User Management */}
      {user?.role === 'ADMIN' && (
        <div style={{ padding: '0 0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: '#9aa4b8', padding: '0 0.5rem', marginBottom: 4,
          }}>Admin</div>
          <Link
            href="/users"
            className={cn('sidebar-link', { 'sidebar-link-active': pathname === '/users' || pathname.startsWith('/users/') })}
          >
            <UserCog className="sidebar-icon" strokeWidth={pathname.startsWith('/users') ? 2.5 : 2} />
            <span className="sidebar-label">User Management</span>
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <Footer user={user} />
      </div>
    </section>
  )
}

export default Sidebar