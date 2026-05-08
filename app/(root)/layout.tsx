import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  if(!loggedIn) redirect('/sign-in')

  return (
    <main className="flex h-screen w-full font-inter bg-gray-25">
      <Sidebar user={loggedIn} />

      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex-center shadow-premium">
              <Image src="/icons/logo.svg" width={20} height={20} alt="logo" className="brightness-[10] invert-0" />
            </div>
            <h1 className="text-18 font-black text-gray-900 tracking-tight">El Elyon</h1>
          </Link>
          <MobileNav user={loggedIn} />
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </main>
  );
}
