'use client';

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import CustomInput from './CustomInput';
import { authFormSchema } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/actions/user.actions';

const AuthForm = ({ type }: { type: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formSchema = authFormSchema(type);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ''
    },
  })

  // 2. Define a submit handler.
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError('');

    try {
      if (type === 'sign-up') {
        const userData = {
          firstName: data.firstName!,
          lastName: data.lastName!,
          email: data.email,
          password: data.password
        }

        const newUser = await signUp(userData);
        if (newUser) {
          router.push('/');
        } else {
          setError('Sign up failed. Please check your details and try again.');
        }
      }

      if (type === 'sign-in') {
        const response = await signIn({
          email: data.email,
          password: data.password,
        })

        if (response) {
          router.push('/');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      }
    } catch (error) {
      console.log(error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-form">
      <header className='flex flex-col gap-5 md:gap-8'>
        <Link href="/" className="cursor-pointer flex items-center gap-1">
          <Image
            src="/icons/logo.svg"
            width={34}
            height={34}
            alt="El Elyon logo"
          />
          <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">El Elyon</h1>
        </Link>

        <div className="flex flex-col gap-1 md:gap-3">
          <h1 className="text-24 lg:text-36 font-semibold text-gray-900">
            {type === 'sign-in'
              ? 'Sign In'
              : 'Sign Up'
            }
            <p className="text-16 font-normal text-gray-600">
              {'Please enter your details'}
            </p>
          </h1>
        </div>
      </header>
      <>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {type === 'sign-up' && (
              <>
                <div className="flex gap-4">
                  <CustomInput control={form.control} name='firstName' label="First Name" placeholder='Enter your first name' />
                  <CustomInput control={form.control} name='lastName' label="Last Name" placeholder='Enter your last name' />
                </div>
              </>)}

            <CustomInput control={form.control} name='email' label="Email" placeholder='Enter your email' />

            <CustomInput control={form.control} name='password' label="Password" placeholder='Enter your password' />

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-14 font-medium text-red-700">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Button type="submit" disabled={isLoading} className="form-btn">
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> &nbsp;
                    Loading...
                  </>
                ) : type === 'sign-in'
                  ? 'Sign In' : 'Sign Up'}
              </Button>
            </div>
          </form>
        </Form>

        <footer className="flex justify-center gap-1">
          <p className="text-14 font-normal text-gray-600">
            {type === 'sign-in'
              ? "Don't have an account?"
              : "Already have an account?"}
          </p>
          <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
            {type === 'sign-in' ? 'Sign up' : 'Sign in'}
          </Link>
        </footer>
      </>
    </section>
  )
}

export default AuthForm