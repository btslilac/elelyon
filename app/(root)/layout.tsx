import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) redirect('/sign-in')

  return (
    <main className="flex h-screen w-full bg-background antialiased selection:bg-accent/20 selection:text-accent">
      <Sidebar user={loggedIn} />

      {/* Column: mobile header (fixed) + scrollable canvas */}
      <div className="flex size-full flex-col overflow-hidden relative">
        {/* Mobile Header — stays at top */}
        <div className="root-layout">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8">
              <Image
                src="/icons/logo.svg"
                alt="El Elyon Logo"
                width={40}
                height={40}
                style={{ objectFit: 'contain' }}
                priority
                loading="eager"
              />
            </div>
            <h1 className="text-16 font-semibold text-gray-900 tracking-tight">El Elyon</h1>
          </Link>
          <MobileNav user={loggedIn} />
        </div>

        {/* Main App Canvas — scrollable */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {/* Subtle mesh background for premium feel */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-mesh-gradient pointer-events-none opacity-30 z-0"></div>

          <div className="relative z-10 min-h-full">
            {children}
          </div>
        </div>
      </div>
    </main>

  );
}