'use client';

import React from 'react';
import Link from 'next/link';

interface MovieHeaderProps {
    details: any;
    tmdbData?: any;
    watchStatus: string | null;
    toggleWatchList: (type: string) => Promise<void>;
    theaterMode: boolean;
}

export function MovieHeader({ details, tmdbData, watchStatus, toggleWatchList, theaterMode }: MovieHeaderProps) {
    if (!details) return null;

    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 py-6 border-b border-white/5">
                <div className="min-w-0">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-300 mb-4 transition-colors text-xs font-bold uppercase tracking-widest">
                        <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </Link>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white balance">
                        {tmdbData?.title || details.title}
                    </h1>
                    <p className="text-sm text-gray-500 font-bold mt-2 uppercase tracking-wider">
                        {tmdbData?.year || details.year} • {tmdbData?.originalTitle || details.origTitle}
                    </p>
                </div>

                <div className="flex flex-row gap-3 shrink-0">
                    <button
                        onClick={() => toggleWatchList('plan_to_watch')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border flex gap-2 items-center backdrop-blur-md ${watchStatus === 'plan_to_watch' ? 'bg-white/10 border-white/30 text-white' : 'bg-black/20 border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Plan
                    </button>
                    <button
                        onClick={() => toggleWatchList('watching')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border flex gap-2 items-center backdrop-blur-md ${watchStatus === 'watching' ? 'bg-red-600/20 border-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-black/20 border-white/10 text-gray-500 hover:text-white hover:border-red-500/40'}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Watching
                    </button>
                </div>
            </div>
        </div>
    );
}

