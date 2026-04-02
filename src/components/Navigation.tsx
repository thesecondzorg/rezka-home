'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { navigationData } from '@/data/navigation';

function NavItem({ navItem, isActive }: { navItem: any; isActive: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isBest, setIsBest] = useState(true);
  const [year, setYear] = useState('0');

  const handleSearch = () => {
    let path = navItem.basePath;
    if (isBest) {
      path = `${navItem.basePath}best/`;
      if (year !== '0') path = `${path}${year}/`;
    }
    setOpen(false);
    router.push(path);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={navItem.basePath}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-1 px-4 py-3 text-sm font-semibold transition-all duration-300 rounded-xl hover:bg-gray-800/80 hover:text-red-500 ${paramsCurrent(isActive)}`}
      >
        {navItem.title}
        <svg
          className={`w-4 h-4 transition-transform duration-300 opacity-60 ${open ? 'rotate-180' : ''} ${isActive ? 'text-red-500' : 'text-gray-400'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-[620px] z-[200] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-6 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl ring-1 ring-white/5 flex flex-col gap-6">
            <div className="flex gap-6">
              {/* Genres */}
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Genres</h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
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
                        onClick={() => setOpen(false)}
                        className="text-sm text-gray-300 hover:text-red-400 hover:translate-x-0.5 transition-all"
                      >
                        {genre.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Collections */}
              <div className="w-[160px] border-l border-gray-800 pl-6 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Collections</h3>
                {navItem.quickLinks.map((link: any) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-white hover:text-red-400 transition-colors line-clamp-2"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Browse Controls */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-white hover:text-red-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={isBest}
                    onChange={e => setIsBest(e.target.checked)}
                    className="w-4 h-4 accent-red-500 cursor-pointer"
                  />
                  Best of
                </label>
                {isBest && (
                  <select
                    className="w-28 bg-gray-900 border border-gray-700 text-sm rounded-lg px-3 py-1.5 text-white outline-none focus:border-red-500 cursor-pointer"
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
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-red-600/20 active:scale-95 transition-all"
              >
                Let's go!
              </button>
            </div>
          </div>
        </div>
      )}
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
          <NavItem key={navItem.title} navItem={navItem} isActive={isActive} />
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
