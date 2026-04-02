'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { navigationData } from '@/data/navigation';
import { useDiscovery } from '@/context/DiscoveryContext';
import { MOVIE_GENRES, TV_GENRES, LANGUAGES, COUNTRIES, SORT_OPTIONS } from '@/lib/tmdb';

export function ModernSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const {
        contentType, setContentType,
        genreStates, setGenreStates, toggleGenre,
        activeLanguage, setActiveLanguage, toggleLanguage,
        activeCountry, setActiveCountry, toggleCountry,
        sortState, setSortState, toggleSort,
        year, setYear,
        discoverySource, setDiscoverySource,
        activeHdRezkaGenre, setActiveHdRezkaGenre,
        isInitialized
    } = useDiscovery();

    const genres = contentType === 'movie' ? MOVIE_GENRES : TV_GENRES;

    const genreBtnStyle = (state: string) => {
        if (state === 'include') return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50';
        if (state === 'exclude') return 'bg-red-600/20 text-red-500 border-red-600/50';
        return 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white';
    };

    return (
        <aside className="w-80 h-full flex flex-col bg-gray-950/20 border-r border-gray-800/50 pb-20">
            <div className="flex flex-col gap-8 p-8">
                {/* Mode Selector */}
                <section>
                    <h3 className="sidebar-label mb-4">Discovery Source</h3>
                    <div className="flex p-1 bg-gray-900/80 rounded-2xl border border-gray-800 ring-1 ring-white/5 shadow-inner">
                        <button
                            onClick={() => setDiscoverySource('tmdb')}
                            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                discoverySource === 'tmdb'
                                    ? 'bg-red-600 text-white shadow-xl shadow-red-600/20'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            TMDB
                        </button>
                        <button
                            onClick={() => setDiscoverySource('hdrezka')}
                            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                discoverySource === 'hdrezka'
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            HDRezka
                        </button>
                    </div>
                </section>

                {/* Content Type / Categories — Always visible as they are core */}
                <section>
                    <h3 className="sidebar-label mb-4">Categories</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'movie', label: 'Movies', icon: '🎬' },
                            { id: 'tv', label: 'Series', icon: '📺' },
                            { id: 'cartoons', label: 'Cartoons', icon: '🐾' },
                            { id: 'anime', label: 'Anime', icon: '🍙' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setContentType(t.id as any)}
                                className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all gap-2 ${
                                    contentType === t.id
                                        ? 'bg-red-600/10 text-red-500 border-red-600/40 shadow-lg shadow-red-600/5'
                                        : 'bg-gray-900/40 text-gray-500 border-gray-800 hover:bg-gray-800/60 hover:text-white'
                                }`}
                            >
                                <span className="text-xl">{t.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* TMDB Specific Filters */}
                {discoverySource === 'tmdb' ? (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="sidebar-label">Advanced Filters</h3>
                            <button 
                                onClick={() => {
                                    setGenreStates({});
                                    setActiveLanguage(null);
                                    setActiveCountry(null);
                                    setYear('0');
                                    setSortState({ key: 'popularity', dir: 'desc' });
                                }}
                                className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Reset
                            </button>
                        </div>

                        <section>
                            <h4 className="sidebar-label-sub mb-3">Sort Results</h4>
                            <div className="flex flex-wrap gap-2">
                                {SORT_OPTIONS.map(opt => {
                                    const isActive = sortState.key === opt.key && sortState.dir !== 'neutral';
                                    const isDesc = sortState.dir === 'desc';
                                    return (
                                        <button
                                            key={opt.key}
                                            onClick={() => toggleSort(opt.key)}
                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                                                isActive
                                                    ? 'bg-blue-600/20 text-blue-400 border-blue-600/50'
                                                    : 'bg-gray-900/40 text-gray-500 border-gray-800 hover:bg-gray-800'
                                            }`}
                                        >
                                            {opt.label} {isActive ? (isDesc ? '↓' : '↑') : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h4 className="sidebar-label-sub mb-3">Release Year</h4>
                            <select 
                                className="w-full bg-gray-900 border border-gray-800 text-sm font-bold rounded-xl px-4 py-2.5 text-white outline-none focus:border-red-500 transition-all cursor-pointer appearance-none shadow-inner"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                            >
                                <option value="0">All Time</option>
                                {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2015, 2010, 2005, 2000].map(y => (
                                    <option key={y} value={y.toString()}>{y}</option>
                                ))}
                            </select>
                        </section>

                        <section>
                            <h4 className="sidebar-label-sub mb-3">Genres</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {genres.map(genre => {
                                    const state = genreStates[genre.id] || 'neutral';
                                    return (
                                        <button
                                            key={genre.id}
                                            onClick={() => toggleGenre(genre.id)}
                                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${genreBtnStyle(state)}`}
                                        >
                                            {genre.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h4 className="sidebar-label-sub mb-3">Original Language</h4>
                            <div className="grid grid-cols-3 gap-1.5">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => toggleLanguage(lang.code)}
                                        className={`py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-xl border transition-all ${
                                            activeLanguage === lang.code
                                                ? 'bg-purple-600/20 text-purple-400 border-purple-600/50'
                                                : 'bg-gray-900/40 text-gray-500 border-gray-800'
                                        }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                ) : (
                    /* HDRezka Specific Content */
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="p-6 bg-blue-600/10 rounded-3xl border border-blue-600/20 text-center">
                            <span className="text-3xl mb-3 block">🔍</span>
                            <h3 className="text-sm font-bold text-blue-400 mb-2">Live HDRezka Searching</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                In this mode, we query HDRezka's catalog directly. Use the top search bar or browse by subcategory below.
                            </p>
                        </div>
                        
                        <section>
                            <h3 className="sidebar-label mb-3">Subcategories</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {(() => {
                                    const typeMap: Record<string, string> = {
                                        'movie': 'Movies',
                                        'tv': 'Series',
                                        'cartoons': 'Cartoons',
                                        'anime': 'Anime'
                                    };
                                    const targetTitle = typeMap[contentType];
                                    const hdData = navigationData.find(item => item.title === targetTitle);
                                    return hdData?.genres?.map(genre => (
                                        <button
                                            key={`${genre.value}-${genre.label}`}
                                            onClick={() => setActiveHdRezkaGenre(activeHdRezkaGenre === genre.value ? null : genre.value)}
                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                                                activeHdRezkaGenre === genre.value
                                                    ? 'bg-blue-600/20 text-blue-400 border-blue-600/50 shadow-lg shadow-blue-600/5'
                                                    : 'bg-gray-900/40 text-gray-500 border-gray-800 hover:bg-gray-800 hover:text-white'
                                            }`}
                                        >
                                            {genre.label}
                                        </button>
                                    ));
                                })()}
                            </div>
                        </section>

                        <section>
                            <h3 className="sidebar-label mb-3">Popular Years</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {[2026, 2025, 2024, 2023, 2022, 2021].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setYear(y.toString())}
                                        className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                                            year === y.toString()
                                                ? 'bg-blue-600/20 text-blue-400 border-blue-600/50'
                                                : 'bg-gray-900/40 text-gray-500 border-gray-800 hover:bg-gray-800'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>

            <style jsx>{`
                .sidebar-label {
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.15rem;
                    font-weight: 900;
                    color: rgb(156 163 175);
                }
                .sidebar-label-sub {
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1rem;
                    font-weight: 800;
                    color: rgb(75 85 99);
                }
            `}</style>
        </aside>
    );
}
