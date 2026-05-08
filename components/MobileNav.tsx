'use client'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
            className="cursor-pointer"
          />
        </SheetTrigger>
        <SheetContent side="left" className="border-none bg-white p-0">
          <div className="flex flex-col h-full p-6">
            <Link href="/" className="cursor-pointer flex items-center gap-3 px-2 mb-10">
              <div className="size-10 rounded-xl bg-primary flex-center shadow-premium">
                <Image src="/icons/logo.svg" width={24} height={24} alt="logo" className="brightness-[10] invert-0" />
              </div>
              <h1 className="text-24 font-black text-gray-900 tracking-tight">El Elyon</h1>
            </Link>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              <SheetClose asChild>
                <nav className="flex flex-col gap-2">
                  {sidebarLinks.map((item) => {
                    const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

                    return (
                      <SheetClose asChild key={item.route}>
                        <Link href={item.route}
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
                          <p className="text-16 font-medium">
                            {item.label}
                          </p>
                        </Link>
                      </SheetClose>
                    )
                  })}
                </nav>
              </SheetClose>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <Footer user={user} type="mobile" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

export default MobileNav