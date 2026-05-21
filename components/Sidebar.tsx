'use client'

import { useState, useEffect } from 'react'
import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import Footer from './Footer'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart2,
  UserCog,
  MessageSquare,
  Menu,
  X
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/clients': Users,
  '/loans': CreditCard,
  '/reports': BarChart2,
  '/communications': MessageSquare,
  '/users': UserCog,
}

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Auto-close sidebar panel when a mobile navigation route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet>
      {/* Mobile/Tablet Menu Button */}

      <SheetTrigger asChild>
        <button
          onClick={() => setOpen(true)}
          className="
          fixed top-4
          left-1/2
          -translate-x-1/2
           z-40
          group
          flex items-center justify-center
          h-12 w-12
          rounded-2xl
          border border-slate-200/60
          bg-white/80
          backdrop-blur-md
          shadow-sm
          transition-all duration-300
          hover:scale-105
          active:scale-95
          lg:hidden
"
          aria-label="Open Navigation"
        >
          <Menu
            size={22}
            className="
            text-slate-700
            transition-transform duration-300
            group-hover:rotate-3
          "
          />
        </button>
      </SheetTrigger>

      {/* Backdrop Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "hidden md:fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 transition-all duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Main Sidebar Wrapper */}
      <section
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-[270px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:z-30",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Close Button 
        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 lg:hidden"
          aria-label="Close Navigation"
        >
          <X size={18} />
        </button>  */}

        {/* Brand Header */}
        <Link href="/" className="sidebar-brand">
          <div className="sidebar-logo">
            <Image
              src="/icons/logo.svg"
              alt="El Elyon Logo"
              width={50}
              height={50}
              priority
              loading="eager"
              style={{
                objectFit: 'contain',
                maxWidth: "100%",
                height: "auto"
              }} />
          </div>
          <div className="sidebar-brand-info">
            <span className="sidebar-brand-name">El Elyon</span>
            <span className="sidebar-brand-tagline">Capital &amp; Credit Solutions</span>
          </div>
        </Link>

        {/* Main Navigation Links */}
        <nav className="sidebar-nav">
          {sidebarLinks
            .filter((item) => {
              if (user?.role === 'STAFF') {
                return item.route !== '/' && item.route !== '/reports';
              }
              return true;
            })
            .map((item) => {
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

        {/* Sidebar Footer Wrapper */}
        <div className="border-t border-slate-100 bg-white p-4">
          <Footer user={user} />
        </div>
      </section>
    </Sheet>
  )
}

export default Sidebar