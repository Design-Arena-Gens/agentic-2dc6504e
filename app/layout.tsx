import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agentic Chess • Play, Train, Analyze',
  description:
    'Agentic Chess is a modern platform for live games, daily correspondence, tactical training, and performance analytics.',
  openGraph: {
    title: 'Agentic Chess',
    description: 'Play live chess, tackle daily challenges, and level up your game with actionable insights.',
    url: 'https://agentic-2dc6504e.vercel.app',
    siteName: 'Agentic Chess',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentic Chess',
    description: 'A modern chess training ground for live and daily games, puzzles, and analytics.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-50">
      <body className={`${inter.className} flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100`}>
        <Navigation />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
