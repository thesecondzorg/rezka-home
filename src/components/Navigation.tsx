'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { navigationData } from '@/data/navigation';

// Subcomponent to manage dropdown state independently for each top-level nav item
function NavDropdownContent({ navItem }: { navItem: any }) {
  const router = useRouter();
  const [isBest, setIsBest] = useState(true);
  const [year, setYear] = useState('0');

  const handleSearch = () => {
    // Acts like "Any genre" when Let's go is clicked
    let path = navItem.basePath; 
    if (isBest) {
      path = `${navItem.basePath}best/`;
      if (year !== '0') {
        path = `${path}${year}/`;
      }
    }
    router.push(path);
  };

  return (
    <div className="absolute left-0 top-full mt-2 w-[640px] origin-top-left invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-50">
      <div className="p-6 bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] shadow-red-500/5 ring-1 ring-white/10 flex flex-col gap-6">
        
        <div className="flex gap-6">
          {/* Left Column: Genres */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Genres</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {navItem.genres.map((genre: any) => {
                let href = genre.value;
                if (!isBest) {
                  href = href.replace('/best/', '/');
                } else if (year !== '0') {
                  href = `${href.replace(/\/$/, '')}/${year}/`;
                }

                return (
                  <Link 
                    key={`${genre.label}-${genre.value}`} 
                    href={href}
                    className="text-sm text-gray-300 hover:text-red-400 hover:translate-x-1 transition-all"
                  >
                    {genre.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Column: Quick Links */}
          <div className="w-1/4 border-l border-gray-800/50 pl-6 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Collections</h3>
              <div className="flex flex-col gap-3">
                {navItem.quickLinks.map((link: any) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className="text-sm font-medium text-white hover:text-red-500 hover:underline decoration-red-500/30 underline-offset-4 transition-all line-clamp-2"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Browse Controls */}
        <div className="mt-2 pt-5 border-t border-gray-800/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-white hover:text-red-400 transition-colors">
              <input 
                type="checkbox" 
                checked={isBest} 
                onChange={e => setIsBest(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-gray-900 border-gray-700 rounded focus:ring-red-500 focus:ring-2 cursor-pointer transition-all"
              />
              Best
            </label>
            
            {isBest && (
              <select 
                className="w-28 bg-gray-900/80 border border-gray-800 text-sm rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all cursor-pointer"
                value={year}
                onChange={e => setYear(e.target.value)}
              >
                {navItem.years.map((y: number) => (
                  <option key={y} value={y.toString()}>{y === 0 ? 'All time' : y}</option>
                ))}
              </select>
            )}
          </div>
          
          <button 
            onClick={handleSearch}
            className="px-5 py-2 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-red-600/20 active:scale-95 transition-all w-max"
          >
            Let's go!
          </button>
        </div>
      </div>
    </div>
  );
}

function NavigationContent() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-1 md:space-x-4">
      {navigationData.map((navItem) => {
        const isActive = pathname.startsWith(navItem.basePath);
        return (
          <div key={navItem.title} className="group relative">
            <Link
              href={navItem.basePath}
              className={`flex items-center gap-1 px-4 py-3 text-sm font-semibold transition-all duration-300 rounded-xl hover:bg-gray-800/80 hover:text-red-500
                ${paramsCurrent(isActive)}`}
            >
              {navItem.title}
              <svg 
                className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-180 opacity-60 ${isActive ? 'text-red-500' : 'text-gray-400'}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>

            <NavDropdownContent navItem={navItem} />
          </div>
        );
      })}
    </nav>
  );
}

export function Navigation() {
  return (
    <Suspense fallback={<div className="h-12 w-32 bg-gray-900 rounded-lg animate-pulse" />}>
      <NavigationContent />
    </Suspense>
  );
}

function paramsCurrent(isActive: boolean) {
  return isActive ? 'text-red-500 bg-red-500/10' : 'text-gray-200';
}
