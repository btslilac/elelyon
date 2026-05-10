'use client'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { sidebarLinks } from "@/constants"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import Footer from "./Footer"
import { LayoutDashboard, Users, CreditCard, Landmark, Menu } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/clients': Users,
  '/loans': CreditCard,
}

const MobileNav = ({ user }: MobileNavProps) => {
  const pathname = usePathname();

  return (
    <section className="w-fit">
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200/70">
            <Menu size={20} className="text-gray-600" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="border-none bg-white p-0 w-72 shadow-xl">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Main navigation links for El Elyon</SheetDescription>
          <div className="flex flex-col h-full px-4 py-5">

            {/* Brand */}
            <SheetClose asChild>
              <Link href="/" className="sidebar-brand">
                <div className="sidebar-logo">
                  <Image
                    src="/icons/logo.svg"
                    alt="El Elyon Logo"
                    width={40}
                    height={40}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="sidebar-brand-info">
                  <span className="sidebar-brand-name">El Elyon</span>
                  <span className="sidebar-brand-tagline">Capital &amp; Credit Solutions</span>
                </div>
              </Link>
            </SheetClose>

            {/* Nav */}
            <nav className="sidebar-nav">
              {sidebarLinks.map((item) => {
                const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)
                const Icon = iconMap[item.route] || LayoutDashboard

                return (
                  <SheetClose asChild key={item.route}>
                    <Link
                      href={item.route}
                      className={cn('sidebar-link', { 'sidebar-link-active': isActive })}
                    >
                      <Icon className="sidebar-icon" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="sidebar-label">{item.label}</span>
                    </Link>
                  </SheetClose>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
              <Footer user={user} type="mobile" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

export default MobileNav