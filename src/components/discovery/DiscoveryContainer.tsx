'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDiscovery } from '@/context/DiscoveryContext';
import { ResultsGrid } from './ResultsGrid';
import { LinkingChoiceModal } from './LinkingChoiceModal';
import type { UnifiedResult } from './types';

interface HdRezkaResult {
    title: string;
    url: string;
    poster?: string;
    info?: string;
    category?: string;
}

interface LinkingCandidates {
    tmdbData: {
        title: string;
        poster?: string;
        year?: string;
        type: string;
        tmdbId: string | number;
    };
    results: HdRezkaResult[];
}

interface DiscoveryContainerProps {
    hideSourceToggle?: boolean;
}

export function DiscoveryContainer({
    hideSourceToggle = false
}: DiscoveryContainerProps) {
    const router = useRouter();
    const {
        contentType,
        genreStates,
        activeLanguage,
        activeCountry,
        sortState,
        year,
        searchQuery,
        setSearchQuery,
        activeHdRezkaGenre,
        discoverySource,
        isInitialized
    } = useDiscovery();

    // — Local Results State —
    const [results, setResults] = useState<UnifiedResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [noApiKey, setNoApiKey] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    const [linkingCandidates, setLinkingCandidates] = useState<LinkingCandidates | null>(null);

    // — Linking —
    const [linkingId, setLinkingId] = useState<string | number | null>(null);

    // Debounce search query
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    const getSortValue = useCallback((): string => {
        const SORT_MAP: Record<string, { desc: string, asc: string }> = {
            'popularity': { desc: 'popularity.desc', asc: 'popularity.asc' },
            'release_date': { desc: 'release_date.desc', asc: 'release_date.asc' },
            'vote_average': { desc: 'vote_average.desc', asc: 'vote_average.asc' }
        };
        const opt = SORT_MAP[sortState.key];
        if (!opt || sortState.dir === 'neutral') return 'popularity.desc';
        let val = sortState.dir === 'desc' ? opt.desc : opt.asc;
        if (contentType === 'tv') val = val.replace('release_date', 'first_air_date');
        return val;
    }, [sortState, contentType]);

    const doFetchTmdb = async (pageNum: number, reset: boolean) => {
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
            if (year !== '0') params.set('year', year);
            params.set('sortBy', getSortValue());
        }

        const res = await fetch(`/api/tmdb-discover?${params.toString()}`);
        const data = await res.json();

        if (data.error === 'TMDB_API_KEY is not configured') {
            setNoApiKey(true);
            return;
        }

        const unified: UnifiedResult[] = (data.results || []).map((r: any) => ({
            id: r.tmdbId,
            title: r.title,
            originalTitle: r.originalTitle,
            poster: r.poster,
            year: r.year,
            rating: r.rating,
            overview: r.overview,
            type: r.type,
            genreIds: r.genreIds
        }));

        setResults(prev => reset ? unified : [...prev, ...unified]);
        setHasMore(!!data.hasMore);
        setPage(pageNum + 1);
    };

    const doFetchHdrezka = async (reset: boolean) => {
        let fetchUrl = '';
        
        if (activeHdRezkaGenre) {
            // Priority 1: Browsing specific subcategory/genre
            let path = activeHdRezkaGenre;
            if (year !== '0') path += `${year}/`;
            fetchUrl = `/api/hdrezka-catalog?path=${encodeURIComponent(path)}`;
        } else {
            // Priority 2: Searching or Year filtering (Global rezka logic)
            if (!debouncedQuery.trim() && year === '0') {
                 setResults([]);
                 setHasMore(false);
                 return;
            }
            const query = debouncedQuery.trim() || year;
            fetchUrl = `/api/search?q=${encodeURIComponent(query)}`;
        }

        const res = await fetch(fetchUrl);
        const data = await res.json();

        let finalResults = data.results || [];
        
        // Filter by contentType (Mapping "Series" to "Сериал" etc)
        const singularMap: Record<string, string> = {
            'movie': 'Фильм',
            'tv': 'Сериал',
            'cartoons': 'Мультфильм',
            'anime': 'Аниме'
        };
        const searchKeyword = singularMap[contentType];
        
        const isSearching = !!debouncedQuery.trim();

        // Skip post-fetch category filtering if searching by title, as requested.
        // Otherwise, filter results by the mapped category keyword (e.g. "Сериал").
        if (searchKeyword && !activeHdRezkaGenre && !isSearching) {
            finalResults = finalResults.filter((r: any) => {
                const cat = (r.category || r.info || '').toLowerCase();
                return cat.includes(searchKeyword.toLowerCase());
            });
        }

        const unified: UnifiedResult[] = finalResults.map((r: any) => ({
            id: r.url, // Use URL as unique ID for HDRezka source
            title: r.title,
            poster: r.poster,
            info: r.info,
            type: contentType,
            url: r.url
        }));

        setResults(unified);
        setHasMore(false); // Search/Catalog API usually isn't paginated the same way in this context
    };

    const doFetch = useCallback(async (pageNum: number, reset: boolean) => {
        if (!isInitialized) return;
        setLoading(true);
        try {
            if (discoverySource === 'tmdb') {
                await doFetchTmdb(pageNum, reset);
            } else {
                await doFetchHdrezka(reset);
            }
        } catch (err) {
            console.error('Discover fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [contentType, genreStates, activeLanguage, activeCountry, sortState, year, debouncedQuery, discoverySource, activeHdRezkaGenre, getSortValue, isInitialized]);

    // Re-fetch from page 1 when any filter changes
    useEffect(() => {
        if (!isInitialized) return;
        setResults([]);
        setPage(1);
        setHasMore(true);
        doFetch(1, true);
    }, [contentType, genreStates, activeLanguage, activeCountry, sortState, year, debouncedQuery, discoverySource, activeHdRezkaGenre, isInitialized]);

    const handleCardClick = async (result: UnifiedResult) => {
        if (linkingId) return; 

        // If from HDRezka mode, we already have the URL!
        if (discoverySource === 'hdrezka') {
            router.push(`/movie?url=${encodeURIComponent(result.id)}`);
            return;
        }

        setLinkingId(result.id);
        
        try {
            const detailRes = await fetch(`/api/tmdb-details?id=${result.id}&type=${result.type}`);
            const detail = await detailRes.json();
            
            if (detail.error) {
                console.warn('TMDB linking failed for this item:', detail.error);
                setLinkingCandidates({ 
                    tmdbData: { title: result.title, type: result.type, tmdbId: result.id, poster: result.poster || undefined }, 
                    results: [] 
                });
                return;
            }

            const { imdbId, title, originalTitle, year: mYear, posterPath } = detail;
            const tmdbData = { title, poster: posterPath, year: mYear, type: result.type, tmdbId: result.id, imdbId };

            let hdResults: HdRezkaResult[] = [];

            // 1. Try IMDB ID match first (most accurate)
            if (imdbId) {
                const res = await fetch(`/api/search?q=${encodeURIComponent(imdbId)}`);
                const data = await res.json();
                hdResults = data.results || [];
            }

            // 2. Try Title + Year (Standard English Title)
            if (hdResults.length === 0 && title) {
                const query = `${title} ${mYear || ''}`.trim();
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                hdResults = data.results || [];
            }

            // 3. Try Original Title + Year (Fallback for non-English results)
            if (hdResults.length === 0 && originalTitle && originalTitle !== title) {
                const query = `${originalTitle} ${mYear || ''}`.trim();
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                hdResults = data.results || [];
            }

            // 4. Try Main Title part only (if title contains colons)
            if (hdResults.length === 0 && title?.includes(':')) {
                const mainTitle = title.split(':')[0].trim();
                const res = await fetch(`/api/search?q=${encodeURIComponent(mainTitle)}`);
                const data = await res.json();
                hdResults = data.results || [];
            }

            // --- Scoring and Selection Logic ---
            const scoredResults = hdResults.map(res => {
                let score = 0;
                const lowTitle = res.title.toLowerCase();
                const lowTarget = (title || '').toLowerCase();
                const lowOrigTarget = (originalTitle || '').toLowerCase();
                const resInfo = (res.info || '').toLowerCase();

                // 1. Title Match (Exact or Substring)
                if (lowTitle === lowTarget || lowTitle === lowOrigTarget) score += 15;
                else if (lowTitle.includes(lowTarget) || lowTarget.includes(lowTitle)) score += 8;

                // 2. Year Match (Check if year exists in HDRezka info string)
                if (mYear && resInfo.includes(mYear)) score += 10;

                // 3. Category Match (Mapping TMDB types to Russian categories)
                const isTv = result.type === 'tv' || result.type === 'anime'; // Anime logic often series
                const resIsSeries = resInfo.includes('сериал') || resInfo.includes('аниме') || resInfo.includes('мультсериал');
                
                if (isTv && resIsSeries) score += 5;
                else if (!isTv && !resIsSeries) score += 5;

                return { ...res, score };
            }).sort((a, b) => b.score - a.score);

            // Auto-select if we have a clear winner with high confidence
            const topResult = scoredResults[0];
            const secondResult = scoredResults[1];

            // Threshold: Score > 20 (Target Match + Year/Category) AND significantly better than second choice
            const isConfidenceHigh = topResult && topResult.score >= 20 && (!secondResult || topResult.score > secondResult.score + 5);

            if (isConfidenceHigh) {
                // Auto-navigate
                router.push(`/movie?url=${encodeURIComponent(topResult.url)}&tmdbId=${result.id}&tmdbType=${result.type}`);
            } else if (hdResults.length > 0) {
                // Multiple or Ambiguous matches: Show Modal
                setLinkingCandidates({ tmdbData, results: hdResults });
            } else {
                // Zero matches
                setLinkingCandidates({ tmdbData, results: [] });
            }

        } catch (err) {
            console.error('Linking error:', err);
            // On hard error, we show the selection modal with 0 results to notify user
            setLinkingCandidates({ 
                tmdbData: { title: result.title, type: result.type, tmdbId: result.id, poster: result.poster || undefined }, 
                results: [] 
            });
        } finally {
            setLinkingId(null);
        }
    };

    const handleCandidateSelect = (entry: HdRezkaResult) => {
        if (!linkingCandidates) return;
        const { tmdbData } = linkingCandidates;
        router.push(`/movie?url=${encodeURIComponent(entry.url)}&tmdbId=${tmdbData.tmdbId}&tmdbType=${tmdbData.type}`);
        setLinkingCandidates(null);
    };

    if (noApiKey) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="text-5xl">🔑</div>
                <h2 className="text-2xl font-bold text-white">TMDB API Key Missing</h2>
                <p className="text-gray-400 max-w-md">Add a TMDB API key to your configuration to enable discovery.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col gap-5">
                {/* Search Bar / Header */}
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                        {contentType === 'movie' ? 'Movies' : contentType === 'tv' ? 'Series' : contentType === 'cartoons' ? 'Cartoons' : 'Anime'}
                    </h1>
                </div>

                <ResultsGrid
                    results={results}
                    loading={loading}
                    onCardClick={handleCardClick}
                    linkingId={linkingId}
                />

                {loading && results.length > 0 && (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
                    </div>
                )}

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

            {/* Selection Modal Overlay */}
            {linkingCandidates && (
                <LinkingChoiceModal 
                    tmdbData={linkingCandidates.tmdbData}
                    results={linkingCandidates.results}
                    onSelect={handleCandidateSelect}
                    onClose={() => setLinkingCandidates(null)}
                />
            )}
        </div>
    );
}
