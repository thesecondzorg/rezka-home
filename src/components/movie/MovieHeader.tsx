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
        <>
            {/* Backdrop Section (only if TMDB data available) */}
            {tmdbData?.backdropPath && !theaterMode && (
                <div className="absolute inset-x-0 top-0 h-[70vh] -z-10 overflow-hidden">
                    <img
                        src={tmdbData.backdropPath}
                        alt="backdrop"
                        className="w-full h-full object-cover opacity-30 blur-sm scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>
            )}

            <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mt-8 mb-8 transition-colors">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Search
            </Link>

            <div className="mb-12">
                <div className="w-full flex flex-col md:flex-row gap-8 items-start">
                    {/* Left Side: Poster (TMDB or HDRezka) */}
                    <div className="w-full md:w-80 shrink-0">
                        <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-2xl shadow-black/50 group bg-gray-900">
                            <img
                                src={tmdbData?.posterPath || details.poster}
                                alt={tmdbData?.title || details.title}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* TMDB Specific Stats */}
                        {tmdbData && (
                            <div className="mt-4 flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                {tmdbData.rating && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">TMDB Rating</span>
                                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                            {tmdbData.rating}
                                        </span>
                                    </div>
                                )}
                                {tmdbData.genres && tmdbData.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {tmdbData.genres.slice(0, 3).map((g: string) => (
                                            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/5">
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Meta Data */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-2 balance">
                                    {tmdbData?.title || details.title}
                                </h1>
                                <p className="text-xl md:text-2xl text-gray-400 font-medium italic opacity-80">
                                    {tmdbData?.year || details.year} • {tmdbData?.originalTitle || details.origTitle}
                                </p>
                            </div>

                            <div className="flex flex-row gap-2 shrink-0">
                                <button
                                    onClick={() => toggleWatchList('plan_to_watch')}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border flex gap-2 items-center backdrop-blur-md ${watchStatus === 'plan_to_watch' ? 'bg-white/10 border-white/30 text-white shadow-xl' : 'bg-black/20 border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    Plan to Watch
                                </button>
                                <button
                                    onClick={() => toggleWatchList('watching')}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border flex gap-2 items-center backdrop-blur-md ${watchStatus === 'watching' ? 'bg-red-600/20 border-red-500 text-white shadow-xl shadow-red-500/10' : 'bg-black/20 border-white/10 text-gray-400 hover:text-white hover:border-red-500/40'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Watching
                                </button>
                            </div>
                        </div>

                        {/* Main Overview Section */}
                        {(tmdbData?.overview || details.description) && (
                            <div className="mt-8 p-6 md:p-8 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-xl group transition-all duration-500 hover:bg-white/[0.08] hover:border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] group-hover:scale-y-110 transition-transform" />
                                    <h3 className="text-sm text-gray-400 uppercase font-black tracking-[0.2em]">The Story</h3>
                                </div>
                                <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-4xl font-medium tracking-tight">
                                    {tmdbData?.overview || details.description}
                                </p>
                            </div>
                        )}

                        {/* If there's a specific long description/about section separate from overview */}
                        {details.description && tmdbData?.overview && details.description !== tmdbData.overview && (
                            <div className="mt-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5 backdrop-blur-sm">
                                <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Original Synopsis</h4>
                                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-500 cursor-default">
                                    {details.description}
                                </p>
                            </div>
                        )}
                    </div> {/* End Right Side */}
                </div> {/* End Main Row */}
            </div>
        </>
    );
}
