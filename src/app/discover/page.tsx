'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MOVIE_GENRES, TV_GENRES, LANGUAGES, COUNTRIES, SORT_OPTIONS } from '@/lib/tmdb';
import type { TmdbResult, SortState, SortDir } from '@/lib/tmdb';

type ToggleState = 'neutral' | 'include' | 'exclude';

const STAR_ICON = (
    <svg viewBox="0 0 20 20" fill="currentColor" className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export default function DiscoverPage() {
    const router = useRouter();

    // — Filters —
    const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
    const [genreStates, setGenreStates] = useState<Record<number, ToggleState>>({});
    const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
    const [activeCountry, setActiveCountry] = useState<string | null>(null);
    const [sortState, setSortState] = useState<SortState>({ key: 'popularity', dir: 'desc' });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // — Results —
    const [results, setResults] = useState<TmdbResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [noApiKey, setNoApiKey] = useState(false);

    // — Linking —
    const [linkingId, setLinkingId] = useState<number | null>(null);

    const genres = contentType === 'movie' ? MOVIE_GENRES : TV_GENRES;

    // Debounce search query
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    const getSortValue = useCallback((): string => {
        const opt = SORT_OPTIONS.find(o => o.key === sortState.key);
        if (!opt || sortState.dir === 'neutral') return 'popularity.desc';
        return sortState.dir === 'desc' ? opt.desc : opt.asc;
    }, [sortState]);

    const doFetch = useCallback(async (pageNum: number, reset: boolean) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('type', contentType);
            params.set('page', String(pageNum));

            if (debouncedQuery.trim()) {
                params.set('query', debouncedQuery.trim());
            } else {
                const inc = Object.entries(genreStates).filter(([, s]) => s === 'include').map(([id]) => id);
                const exc = Object.entries(genreStates).filter(([, s]) => s === 'exclude').map(([id]) => id);
                if (inc.length) params.set('includeGenres', inc.join(','));
                if (exc.length) params.set('excludeGenres', exc.join(','));
                if (activeLanguage) params.set('languages', activeLanguage);
                if (activeCountry) params.set('country', activeCountry);
                params.set('sortBy', getSortValue());
            }

            const res = await fetch(`/api/tmdb-discover?${params.toString()}`);
            const data = await res.json();

            if (data.error === 'TMDB_API_KEY is not configured') {
                setNoApiKey(true);
                return;
            }

            setResults(prev => reset ? (data.results || []) : [...prev, ...(data.results || [])]);
            setHasMore(!!data.hasMore);
            setPage(pageNum + 1);
        } catch (err) {
            console.error('Discover fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [contentType, genreStates, activeLanguage, sortState, debouncedQuery, getSortValue]);

    // Re-fetch from page 1 when any filter changes
    useEffect(() => {
        setResults([]);
        setPage(1);
        setHasMore(true);
        doFetch(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentType, genreStates, activeLanguage, activeCountry, sortState, debouncedQuery]);

    // Reset genre states when content type changes
    useEffect(() => {
        setGenreStates({});
    }, [contentType]);

    // — Interactions —
    const toggleGenre = (id: number) => {
        setGenreStates(prev => {
            const cur = prev[id] || 'neutral';
            const next: ToggleState = cur === 'neutral' ? 'include' : cur === 'include' ? 'exclude' : 'neutral';
            return { ...prev, [id]: next };
        });
    };

    const toggleSort = (key: string) => {
        setSortState(prev => {
            if (prev.key !== key) return { key, dir: 'desc' };
            const nextDir: SortDir = prev.dir === 'neutral' ? 'desc' : prev.dir === 'desc' ? 'asc' : 'neutral';
            return { key, dir: nextDir };
        });
    };

    const toggleLanguage = (code: string) => {
        setActiveLanguage(prev => (prev === code ? null : code));
    };

    const toggleCountry = (code: string) => {
        setActiveCountry(prev => (prev === code ? null : code));
    };

    const handleCardClick = async (result: TmdbResult) => {
        if (linkingId) return; // already linking another
        setLinkingId(result.tmdbId);
        
        try {
            // 1. Get precise metadata including IMDb ID from TMDB
            const detailRes = await fetch(`/api/tmdb-details?id=${result.tmdbId}&type=${result.type}`);
            const detail = await detailRes.json();
            
            if (detail.error) throw new Error(detail.error);

            const { imdbId, title, originalTitle, year } = detail;

            // 2. Try searching by IMDb ID (highest confidence if site supports it)
            if (imdbId) {
                const searchRes = await fetch(`/api/search?q=${encodeURIComponent(imdbId)}`);
                const searchData = await searchRes.json();
                const match = (searchData.results || [])[0];
                if (match?.url) {
                    router.push(`/movie?url=${encodeURIComponent(match.url)}&tmdbId=${result.tmdbId}&tmdbType=${result.type}`);
                    return;
                }
            }

            // 3. Search by Original Title + Year (often most accurate for HDRezka)
            if (originalTitle) {
                // We add the year for precision if it exists
                const query = `${originalTitle} ${year || ''}`.trim();
                const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const searchData = await searchRes.json();
                
                // If we find a result, cross-check title or just pick first
                const match = (searchData.results || [])[0];
                if (match?.url) {
                    router.push(`/movie?url=${encodeURIComponent(match.url)}&tmdbId=${result.tmdbId}&tmdbType=${result.type}`);
                    return;
                }
            }

            // 4. Try searching by Russian Title
            if (title && title !== originalTitle) {
                const searchRes = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
                const searchData = await searchRes.json();
                const match = (searchData.results || [])[0];
                if (match?.url) {
                    router.push(`/movie?url=${encodeURIComponent(match.url)}&tmdbId=${result.tmdbId}&tmdbType=${result.type}`);
                    return;
                }
            }

        } catch (err) {
            console.error('Auto-linking error:', err);
        }

        // Final Fallback: send user to the global search page with the title
        router.push(`/?q=${encodeURIComponent(result.title)}`);
        setLinkingId(null);
    };

    // — Style helpers —
    const genreBtnStyle = (state: ToggleState) => {
        if (state === 'include') return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50';
        if (state === 'exclude') return 'bg-red-600/20 text-red-500 border-red-600/50';
        return 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white';
    };
    const genreBtnIcon = (state: ToggleState) => {
        if (state === 'include') return '✓';
        if (state === 'exclude') return '✕';
        return null;
    };

    const sortBtnStyle = (key: string) => {
        if (sortState.key !== key || sortState.dir === 'neutral') {
            return 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white';
        }
        if (sortState.dir === 'desc') return 'bg-blue-600/20 text-blue-400 border-blue-600/50';
        return 'bg-violet-600/20 text-violet-400 border-violet-600/50';
    };
    const sortBtnArrow = (key: string) => {
        if (sortState.key !== key || sortState.dir === 'neutral') return '';
        return sortState.dir === 'desc' ? ' ↓' : ' ↑';
    };

    const ratingColor = (r: number) => {
        if (r >= 7.5) return 'text-emerald-400';
        if (r >= 6)   return 'text-yellow-400';
        return 'text-gray-400';
    };

    const isFiltering = debouncedQuery.trim() !== '';

    if (noApiKey) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="text-5xl">🔑</div>
                <h2 className="text-2xl font-bold text-white">TMDB API Key Missing</h2>
                <p className="text-gray-400 max-w-md">
                    Add <code className="bg-gray-800 text-red-400 px-2 py-0.5 rounded text-sm">TMDB_API_KEY</code> to your{' '}
                    <code className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-sm">.env.local</code> file and restart the server.
                </p>
                <a
                    href="https://www.themoviedb.org/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    Get a free TMDB API key →
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto items-start">

            {/* ── Sidebar ── */}
            <aside className="w-full md:w-72 shrink-0 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-6 bg-red-600 rounded-full shrink-0" />
                        <h2 className="text-lg font-bold tracking-tight">Discover</h2>
                        <span className="ml-auto text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-800 px-2 py-0.5 rounded-full">TMDB</span>
                    </div>

                    {/* Content Type */}
                    <section>
                        <h3 className="sidebar-label mb-2.5">Content Type</h3>
                        <div className="flex gap-2">
                            {(['movie', 'tv'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setContentType(t)}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${
                                        contentType === t
                                            ? 'bg-red-600/20 text-red-400 border-red-600/50'
                                            : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Sort By — 3-state toggle (neutral / desc / asc), TMDB-native */}
                    <section>
                        <h3 className="sidebar-label mb-2.5">Sort By</h3>
                        <div className="flex flex-wrap gap-2">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => toggleSort(opt.key)}
                                    disabled={isFiltering}
                                    title={isFiltering ? 'Sorting is disabled during title search' : undefined}
                                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${sortBtnStyle(opt.key)}`}
                                >
                                    {opt.label}{sortBtnArrow(opt.key)}
                                </button>
                            ))}
                        </div>
                        {isFiltering && (
                            <p className="text-[10px] text-gray-600 mt-1.5">Sorting unavailable during title search</p>
                        )}
                    </section>

                    {/* Language — single-select */}
                    <section>
                        <h3 className="sidebar-label mb-2.5">Language</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => toggleLanguage(lang.code)}
                                    disabled={isFiltering}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        activeLanguage === lang.code
                                            ? 'bg-blue-600/20 text-blue-400 border-blue-600/50'
                                            : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Country — single-select */}
                    <section>
                        <h3 className="sidebar-label mb-2.5">Country</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {COUNTRIES.map(ctry => (
                                <button
                                    key={ctry.code}
                                    onClick={() => toggleCountry(ctry.code)}
                                    disabled={isFiltering}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        activeCountry === ctry.code
                                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50'
                                            : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {ctry.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Genres — 3-state: neutral / include (✓) / exclude (✕) */}
                    <section>
                        <h3 className="sidebar-label mb-2.5">Genres</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {genres.map(genre => {
                                const state = genreStates[genre.id] || 'neutral';
                                const icon  = genreBtnIcon(state);
                                return (
                                    <button
                                        key={genre.id}
                                        onClick={() => toggleGenre(genre.id)}
                                        disabled={isFiltering}
                                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${genreBtnStyle(state)}`}
                                    >
                                        {icon && <span className="text-[9px] font-bold">{icon}</span>}
                                        {genre.label}
                                    </button>
                                );
                            })}
                        </div>
                        {isFiltering && (
                            <p className="text-[10px] text-gray-600 mt-1.5">Genre filters unavailable during title search</p>
                        )}
                    </section>

                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-500 group-focus-within:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by title…"
                        className="w-full pl-12 pr-10 py-3 text-sm bg-gray-900/70 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all backdrop-blur-md"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Status bar */}
                {isFiltering && (
                    <p className="text-xs text-gray-500 -mt-1">
                        Showing TMDB search results for <span className="text-gray-300 font-semibold">"{debouncedQuery}"</span>
                    </p>
                )}

                {/* Results Grid */}
                {!loading && results.length === 0 ? (
                    <div className="w-full text-center py-32 text-gray-600 bg-gray-900/20 border border-gray-800/50 rounded-2xl">
                        <p className="text-4xl mb-4">🎬</p>
                        <h3 className="text-lg font-bold text-gray-400 mb-1">No results found</h3>
                        <p className="text-sm">Try adjusting your filters or search query</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {results.map((result, i) => (
                            <button
                                key={`${result.tmdbId}-${i}`}
                                onClick={() => handleCardClick(result)}
                                disabled={linkingId === result.tmdbId}
                                className="group relative flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 text-left disabled:opacity-70 disabled:cursor-wait"
                            >
                                {/* Poster */}
                                <div className="relative aspect-[2/3] w-full bg-gray-800 overflow-hidden shrink-0">
                                    {result.poster ? (
                                        <img
                                            src={result.poster}
                                            alt={result.title}
                                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl font-black">
                                            {result.title.charAt(0)}
                                        </div>
                                    )}

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-70" />

                                    {/* Hover overview overlay */}
                                    {result.overview && (
                                        <div className="absolute inset-0 bg-gray-950/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex items-end">
                                            <p className="text-[11px] text-gray-200 line-clamp-6 leading-relaxed">
                                                {result.overview}
                                            </p>
                                        </div>
                                    )}

                                    {/* Year badge */}
                                    {result.year && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className="bg-gray-950/80 text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                                                {result.year}
                                            </span>
                                        </div>
                                    )}

                                    {/* Rating badge */}
                                    {result.rating != null && result.rating > 0 && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <span className={`flex items-center bg-gray-950/80 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm ${ratingColor(result.rating)}`}>
                                                {STAR_ICON}
                                                {result.rating.toFixed(1)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Linking spinner */}
                                    {linkingId === result.tmdbId && (
                                        <div className="absolute inset-0 bg-gray-950/70 flex items-center justify-center z-20">
                                            <div className="w-8 h-8 border-2 border-gray-600 border-t-red-500 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Card footer */}
                                <div className="p-3 flex flex-col gap-0.5">
                                    <h3 className="text-xs font-semibold text-gray-100 group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                                        {result.title}
                                    </h3>
                                    {result.originalTitle && result.originalTitle !== result.title && (
                                        <p className="text-[10px] text-gray-600 line-clamp-1">{result.originalTitle}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && results.length === 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 animate-pulse">
                                <div className="aspect-[2/3] bg-gray-800" />
                                <div className="p-3 flex flex-col gap-2">
                                    <div className="h-3 bg-gray-800 rounded w-3/4" />
                                    <div className="h-2 bg-gray-800 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Loading more spinner */}
                {loading && results.length > 0 && (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Load More */}
                {hasMore && !loading && results.length > 0 && (
                    <div className="flex justify-center mt-4 mb-8">
                        <button
                            onClick={() => doFetch(page, false)}
                            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white text-sm font-semibold rounded-xl transition-all"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .sidebar-label {
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 700;
                    color: rgb(107 114 128);
                }
            `}</style>
        </div>
    );
}
