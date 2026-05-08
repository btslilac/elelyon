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
    <section className="flex-center min-h-screen w-full bg-white px-6">
      <div className="flex w-full max-w-[420px] flex-col justify-center gap-8 py-10">
        <header className='flex flex-col gap-6'>
          <Link href="/" className="cursor-pointer flex items-center gap-2">
            <div className="size-10 rounded-xl bg-primary flex-center shadow-premium">
              <Image src="/icons/logo.svg" width={24} height={24} alt="logo" className="brightness-[10] invert-0" />
            </div>
            <h1 className="text-24 font-black text-gray-900 tracking-tight">El Elyon</h1>
          </Link>

          <div className="flex flex-col gap-1">
            <h1 className="text-30 font-black text-gray-900 tracking-tight">
              {type === 'sign-in' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-16 font-medium text-gray-500">
              {type === 'sign-in' ? 'Enter your credentials to access your account' : 'Start managing your loan portfolio today'}
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

            <CustomInput control={form.control} name='email' label="Email" placeholder='john@example.com' />
            <CustomInput control={form.control} name='password' label="Password" placeholder='••••••••' />

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                <p className="text-14 font-semibold text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-premium transition-all active:scale-[0.98]">
              {isLoading ? (
                <div className="flex-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : type === 'sign-in' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
        </Form>

        <footer className="flex justify-center gap-1 border-t border-gray-100 pt-6">
          <p className="text-14 font-medium text-gray-500">
            {type === 'sign-in' ? "Don't have an account?" : "Already have an account?"}
          </p>
          <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="text-14 font-bold text-primary hover:underline underline-offset-4">
            {type === 'sign-in' ? 'Create one' : 'Sign in'}
          </Link>
        </footer>
      </div>
    </section>
  )
}

export default AuthForm