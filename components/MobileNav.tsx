'use client'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { sidebarLinks } from "@/constants"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Footer from "./Footer"

const MobileNav = ({ user }: MobileNavProps) => {
  const pathname = usePathname();

  return (
    <section className="w-full max-w-[264px]">
      <Sheet>
        <SheetTrigger>
          <Image
            src="/icons/hamburger.svg"
            width={30}
            height={30}
            alt="menu"
            className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
          />
        </SheetTrigger>
        <SheetContent side="left" className="border-none bg-white p-0">
          <div className="flex flex-col h-full bg-white pt-8 px-4 pb-4">
            <Link href="/" className="cursor-pointer flex items-center gap-3 px-2 mb-8">
              <Image 
                src="/icons/logo.svg"
                width={32}
                height={32}
                alt="El Elyon logo"
              />
              <h1 className="text-20 font-bold text-gray-900 tracking-tight">El Elyon</h1>
            </Link>
            
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
              <SheetClose asChild>
                <nav className="flex flex-col gap-1 w-full">
                  {sidebarLinks.map((item) => {
                    const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

                    return (
                      <SheetClose asChild key={item.route}>
                        <Link href={item.route} key={item.label}
                          className={cn('flex items-center gap-3 py-3 px-4 rounded-xl transition-all w-full', { 
                            'bg-gray-100 text-gray-900 font-semibold': isActive,
                            'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium': !isActive
                          })}
                        >
                          <Image 
                            src={item.imgURL}
                            alt={item.label}
                            width={20}
                            height={20}
                            className={cn('opacity-60 transition-all', {
                              'opacity-100 invert-0': isActive
                            })}
                          />
                          <p className="text-16">
                            {item.label}
                          </p>
                        </Link>
                      </SheetClose>
                    )
                  })}
                </nav>
              </SheetClose>
            </div>

            <Footer user={user} type="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

export default MobileNav