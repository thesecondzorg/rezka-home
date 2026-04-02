import "@/app/globals.css";
import { type Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { ProfileSelector } from "@/components/ProfileSelector";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "RezkaStream",
  description: "A modern wrapper for hdrezka.name",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased text-white selection:bg-red-500/30">
        <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur">
          <div className="container mx-auto flex flex-col md:flex-row h-auto md:h-16 items-center justify-between px-4 py-3 md:py-0 gap-3 md:gap-0">
            {/* Top Bar for Mobile / Left Desktop */}
            <div className="flex items-center justify-between w-full md:w-auto">
              <a href="/" className="flex items-center gap-2 shrink-0">
                <span className="text-xl font-bold tracking-tighter">
                  Rezka<span className="text-red-500">Stream</span>
                </span>
              </a>
              
              <div className="flex md:hidden items-center gap-3">
                <Link href="/watchlist" className="flex text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200 items-center justify-center p-2 bg-gray-900 rounded-xl border border-gray-800">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </Link>
                <ProfileSelector />
              </div>
            </div>
            
            {/* Desktop Center / Mobile Bottom */}
            <div className="flex flex-1 justify-start md:justify-center w-full md:w-auto overflow-x-auto md:overflow-visible pb-2 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Navigation />
            </div>

            {/* Desktop Right */}
            <div className="hidden md:flex items-center gap-4 shrink-0">
              <Link href="/watchlist" className="flex text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200 items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                My List
              </Link>
              <div className="w-px h-6 bg-gray-800 block"></div>
              <Link href="/discover" className="p-2 text-gray-400 hover:text-teal-400 transition-colors duration-200" title="Discover">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Link>
              <Link href="/admin" className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <ProfileSelector />
            </div>
          </div>
        </header>
        <main className="container mx-auto p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
