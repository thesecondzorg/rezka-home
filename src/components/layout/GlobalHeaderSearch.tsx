'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDiscovery } from '@/context/DiscoveryContext';

export function GlobalHeaderSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const { searchQuery, setSearchQuery } = useDiscovery();
    const [localQuery, setLocalQuery] = useState(searchQuery);

    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(localQuery);
        if (pathname !== '/') {
            router.push(`/?q=${encodeURIComponent(localQuery)}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative group w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-500 group-focus-within:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                type="text"
                value={localQuery}
                onChange={e => setLocalQuery(e.target.value)}
                placeholder="Search movies, series, anime..."
                className="w-full pl-12 pr-4 py-2.5 text-sm bg-gray-900/50 border border-gray-800 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all backdrop-blur-xl"
            />
            {localQuery && (
                <button
                    type="button"
                    onClick={() => { setLocalQuery(''); setSearchQuery(''); }}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </form>
    );
}
