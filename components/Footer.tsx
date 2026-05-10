import { logoutAccount } from '@/lib/actions/user.actions'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'

const Footer = ({ user, type = 'desktop' }: FooterProps) => {
  const router = useRouter();

  const handleLogOut = async () => {
    const loggedOut = await logoutAccount();
    if (loggedOut) router.push('/sign-in')
  }

  return (
    <footer className="footer">
      <div className={cn(type === 'mobile' ? 'footer_name-mobile' : 'footer_name')}>
        <p className="text-14 font-bold text-gray-900">
          {user?.firstName[0]}
        </p>
      </div>

      <div className={type === 'mobile' ? 'footer_email-mobile' : 'footer_email'}>
        <h1 className="text-14 truncate text-gray-900 font-bold">
          {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-12 truncate font-medium text-gray-500">
          {user?.email}
        </p>
      </div>

      <div className="footer_image" onClick={handleLogOut}>
        <Image src="/icons/logout.svg" width={20} height={20} alt="logout" className="opacity-50" />
      </div>
    </footer>
  )
}

export default Footer