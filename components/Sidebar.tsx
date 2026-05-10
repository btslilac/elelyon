'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import { LayoutDashboard, Users, CreditCard } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/clients': Users,
  '/loans': CreditCard,
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

      {/* Footer */}
      <div className="sidebar-footer">
        <Footer user={user} />
      </div>
    </section>
  )
}

export default Sidebar