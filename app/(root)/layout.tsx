import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  if(!loggedIn) redirect('/sign-in')

  return (
    <main className="flex h-screen w-full bg-gray-50 font-inter text-gray-900">
      <Sidebar user={loggedIn} />

      <div className="flex w-full flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-8 md:hidden">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          <MobileNav user={loggedIn} />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </main>
  );
}
