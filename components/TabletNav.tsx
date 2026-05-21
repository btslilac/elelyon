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

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Menu,
  BarChart2,
  UserCog,
  MessageSquare
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/clients': Users,
  '/loans': CreditCard,
  '/reports': BarChart2,
  '/communications': MessageSquare,
  '/users': UserCog,
}

const TabletNav = ({ user }: TabletNavProps) => {
  const pathname = usePathname();

  return (
    <div className="hidden md:block lg:hidden fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <Sheet>
        {/* Floating Apple Button */}
        <SheetTrigger asChild>
          <button
            className="
              group
              flex items-center justify-center
              h-14 w-14
              rounded-2xl
              border border-white/30
              bg-white/70
              backdrop-blur-2xl
              shadow-[0_8px_30px_rgba(0,0,0,0.12)]
              transition-all duration-300
              hover:scale-105
              active:scale-95
            "
          >
            <Menu
              size={22}
              className="
                text-neutral-700
                transition-transform duration-300
                group-hover:rotate-3
              "
            />
          </button>
        </SheetTrigger>

        {/* Floating Apple Panel */}
        <SheetContent
          side="top"
          className="
            top-5
            left-1/2
            translate-x-[-50%]
            rounded-[2rem]
            border border-white/20
            bg-white/75
            backdrop-blur-3xl
            shadow-[0_20px_80px_rgba(0,0,0,0.18)]
            p-10 /* Changed from p-10 to let inner container manage spacing */
            overflow-y-auto /* Allows inner content to scroll if it exceeds max height */
            overflow-x-hidden
            max-h-[85vh] /* Prevents panel from leaking off the mobile viewport */
            min-h-[420px] 
            h-auto
            min-w-fit
            w-[92%]
            max-w-[500px]
            animate-in
            fade-in
            zoom-in-95
            duration-300
          "
        >
          <SheetTitle className="sr-only">
            Navigation Menu
          </SheetTitle>

          <SheetDescription className="sr-only">
            Mobile navigation
          </SheetDescription>

          {/* Core Layout Wrapper */}
          <div className="flex flex-col min-h-[420px] p-8 justify-between">
            
            {/* Top Content (Brand + Nav) */}
            <div className="flex flex-col w-full">
              {/* Brand */}
              <SheetClose asChild>
                <Link
                  href="/"
                  className="
                    flex items-center gap-3
                    px-2 py-3
                    mb-5
                  "
                >
                  <div
                    className="
                      translate-y-[10px]
                      translate-x-[10px]
                      flex items-center justify-center
                      h-12 w-12
                      rounded-2xl
                      bg-none
                      shadow-lg
                    "
                  >
                    <Image
                      src="/icons/logo.svg"
                      alt="Logo"
                      width={62}
                      height={62}
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[17px] font-semibold tracking-tight text-black translate-y-[10px] translate-x-[10px]">
                      El Elyon
                    </span>

                    <span className="text-[11px] text-neutral-500 tracking-wide uppercase translate-y-[10px] translate-x-[10px]">
                      Capital & Credit Solutions LTD
                    </span>
                  </div>
                </Link>
              </SheetClose>

              {/* Navigation */}
              <nav className="flex flex-col gap-2 translate-y-[16px] translate-x-[10px]">
                {sidebarLinks
                  .filter((item) => {
                    if (user?.role === 'STAFF') {
                      return item.route !== '/' && item.route !== '/reports';
                    }
                    return true;
                  })
                  .map((item) => {
                    const isActive =
                      pathname === item.route ||
                      pathname.startsWith(`${item.route}/`)

                    const Icon =
                      iconMap[item.route] || LayoutDashboard

                    return (
                      <SheetClose asChild key={item.route}>
                        <Link
                          href={item.route}
                          className={cn(
                            `
                            group
                            flex items-center gap-4
                            rounded-2xl
                            px-4 py-3.5
                            transition-all duration-300
                          `,
                            isActive
                              ? `
                                bg-black
                                text-white
                                shadow-lg
                              `
                              : `
                                text-neutral-700
                                hover:bg-white/70
                                hover:translate-x-1
                              `
                          )}
                        >
                          <div
                            className={cn(
                              `
                              flex items-center justify-center
                              h-10 w-10
                              rounded-xl
                              transition-all duration-300
                            `,
                              isActive
                                ? 'bg-white/10'
                                : 'bg-neutral-100 group-hover:bg-white'
                            )}
                          >
                            <Icon
                              size={20}
                              className={cn(
                                isActive
                                  ? 'text-white'
                                  : 'text-neutral-600'
                              )}
                            />
                          </div>

                          <span className="text-[15px] font-semibold tracking-tight">
                            {item.label}
                          </span>
                        </Link>
                      </SheetClose>
                    )
                  })}
                
                
              {/* Admin-only: User Management */}
              {user?.role === 'ADMIN' && (
                <div style={{ padding: '0.75rem', marginBottom: '0.01rem' }}>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: '#9aa4b8', padding: '0 0.5rem', marginBottom: 2,
                  }}>Admin</div>
                  <SheetClose asChild>
                    <Link
                      href="/users"
                      className={cn('sidebar-link', { 'sidebar-link-active': pathname === '/users' || pathname.startsWith('/users/') })}
                    >
                      <UserCog className="sidebar-icon" strokeWidth={pathname.startsWith('/users') ? 2.5 : 2} />
                      <span className="sidebar-label">User Management</span>
                    </Link>
                  </SheetClose>
                </div>
              )}
              </nav>
              
              <br/>
      
            </div>



            {/* Sticky Footer Area */}
            <div className="mt-auto pt-5 border-t border-black/5 bg-transparent w-full">
              <Footer user={user} type="mobile" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default TabletNav