'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Footer from './Footer'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="sidebar">
      <nav className="flex flex-col gap-2">
        <Link href="/" className="mb-10 cursor-pointer flex items-center gap-3 px-2">
          <div className="relative size-10 rounded-xl bg-primary flex-center shadow-premium">
            <Image
              src="/icons/logo.svg"
              width={24}
              height={24}
              alt="logo"
              className="brightness-[10] invert-0"
            />
          </div>
          <h1 className="text-20 font-black text-gray-900 tracking-tight max-xl:hidden">El Elyon</h1>
        </Link>

        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

          return (
            <Link href={item.route} key={item.label}
              className={cn('sidebar-link', { 
                'sidebar-link-active': isActive 
              })}
            >
              <div className="relative size-5">
                <Image
                  src={item.imgURL}
                  alt={item.label}
                  fill
                  className={cn({
                    'brightness-[0.5]': !isActive,
                    'brightness-[1]': isActive
                  })}
                />
              </div>
              <p className="sidebar-label font-medium max-xl:hidden">
                {item.label}
              </p>
            </Link>
          );
        })}
      </nav>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar