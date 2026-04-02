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
