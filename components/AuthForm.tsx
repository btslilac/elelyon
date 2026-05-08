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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ''
    },
  })

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
    <section className="flex min-h-screen w-full items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-card border border-gray-200 p-8 sm:p-10 mx-4">
        <header className='flex flex-col gap-6 mb-8 text-center'>
          <Link href="/" className="cursor-pointer flex items-center justify-center gap-2">
            <Image
              src="/icons/logo.svg"
              width={40}
              height={40}
              alt="El Elyon logo"
              className="size-10"
            />
            <h1 className="text-24 font-bold text-gray-900 tracking-tight">El Elyon</h1>
          </Link>

          <div className="flex flex-col gap-2">
            <h2 className="text-24 font-bold text-gray-900 tracking-tight">
              {type === 'sign-in' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-15 font-medium text-gray-500">
              {type === 'sign-in' ? 'Enter your details to sign in.' : 'Enter your details to get started.'}
            </p>
          </div>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {type === 'sign-up' && (
              <div className="flex gap-4">
                <CustomInput control={form.control} name='firstName' label="First Name" placeholder='John' />
                <CustomInput control={form.control} name='lastName' label="Last Name" placeholder='Doe' />
              </div>
            )}

            <CustomInput control={form.control} name='email' label="Email" placeholder='you@example.com' />
            <CustomInput control={form.control} name='password' label="Password" placeholder='••••••••' />

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-13 font-medium text-red-700">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 rounded-xl shadow-sm transition-all">
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> &nbsp; Loading...
                </>
              ) : type === 'sign-in' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
        </Form>

        <footer className="mt-8 text-center">
          <p className="text-14 font-medium text-gray-500">
            {type === 'sign-in' ? "Don't have an account? " : "Already have an account? "}
            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="text-indigo-600 hover:text-indigo-700 hover:underline">
              {type === 'sign-in' ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </footer>
      </div>
    </section>
  )
}

export default AuthForm