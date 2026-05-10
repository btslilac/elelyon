

import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "El Elyon ",
  description: "Next-generation Loan Management System for modern lenders.",
  icons: {
    icon: '/icons/logo.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${inter.variable} ${ibmPlexSerif.variable} min-h-screen bg-[#FAFAFA] text-gray-900 selection:bg-accent/20 selection:text-accent`}>
        {children}
      </body>
    </html>
  );
}