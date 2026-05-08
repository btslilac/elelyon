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
    <section className="sticky left-0 top-0 flex h-screen w-fit flex-col justify-between border-r border-gray-200 bg-white pt-8 max-md:hidden sm:px-4 xl:px-6 2xl:w-[280px]">
      <nav className="flex flex-col gap-2">
        <Link href="/" className="mb-8 cursor-pointer flex items-center gap-3 px-2">
          <Image
            src="/icons/logo.svg"
            width={32}
            height={32}
            alt="El Elyon logo"
            className="size-8"
          />
          <h1 className="text-20 font-bold text-gray-900 tracking-tight max-xl:hidden">El Elyon</h1>
        </Link>

        <div className="flex flex-col gap-1">
          {sidebarLinks.map((item) => {
            const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

            return (
              <Link href={item.route} key={item.label}
                className={cn('flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all', { 
                  'bg-gray-100 text-gray-900 font-semibold': isActive,
                  'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium': !isActive
                })}
              >
                <div className="relative size-5">
                  <Image
                    src={item.imgURL}
                    alt={item.label}
                    fill
                    className={cn('opacity-60 transition-all', {
                      'opacity-100 invert-0': isActive,
                      'group-hover:opacity-100': !isActive
                    })}
                  />
                </div>
                <p className="text-14 max-xl:hidden">
                  {item.label}
                </p>
              </Link>
            );
          })}
        </div>
      </nav>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar