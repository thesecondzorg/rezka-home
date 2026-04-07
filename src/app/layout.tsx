import "@/app/globals.css";
import { Metadata } from "next";
import { GlobalHeaderSearch } from "@/components/layout/GlobalHeaderSearch";
import { SidebarWrapper } from "@/components/layout/SidebarWrapper";
import { ProfileSelector } from "@/components/ProfileSelector";
import { DiscoveryProvider } from "@/context/DiscoveryContext";
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: "RezkaHome",
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
        <Suspense fallback={null}>
          <DiscoveryProvider>
            {/* Top Header - Global for all pages */}
            <header className="sticky top-0 z-[100] w-full border-b border-gray-800/50 bg-gray-950/60 backdrop-blur-3xl">
              <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8 gap-8">
                {/* Left: Logo */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                  <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform">
                    <span className="text-white font-black text-lg italic leading-none">R</span>
                  </div>
                  <span className="text-xl font-bold tracking-tighter text-white hidden sm:block">
                    Rezka<span className="text-red-500">Stream</span>
                  </span>
                </Link>

                {/* Center: Global Search */}
                <div className="flex-1 max-w-2xl hidden md:block">
                  <GlobalHeaderSearch />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <Link href="/watchlist" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  </Link>
                  <ProfileSelector />
                </div>
              </div>
            </header>

            <div className="flex min-h-screen">
              {/* Sidebar: Only show on Home/Explore page */}
              <SidebarWrapper />

              {/* Main Content Area */}
              <main className="flex-1 min-w-0">
                <div className="container mx-auto p-4 md:p-10 max-w-7xl">
                  {children}
                </div>
              </main>
            </div>
          </DiscoveryProvider>
        </Suspense>
      </body>
    </html>
  );
}
