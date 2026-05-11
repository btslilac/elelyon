import { redirect } from 'next/navigation';

// Sign-up is disabled. New users must be created by the administrator.
export default function SignUp() {
  redirect('/sign-in');
}