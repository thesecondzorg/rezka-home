'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { allGenres, allTypes, allCountries } from '@/data/genres';

type ToggleState = 'neutral' | 'include' | 'exclude';

export default function DiscoverPage() {
    const [genreStates, setGenreStates] = useState<Record<string, ToggleState>>({});
    const [typeStates, setTypeStates] = useState<Record<string, ToggleState>>({});
    const [countryStates, setCountryStates] = useState<Record<string, ToggleState>>({});
    
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const toggleState = (currentState: ToggleState): ToggleState => {
        if (currentState === 'neutral') return 'include';
        if (currentState === 'include') return 'exclude';
        return 'neutral';
    };

    const handleGenreClick = (value: string) => {
        setGenreStates(prev => ({
            ...prev,
            [value]: toggleState(prev[value] || 'neutral')
        }));
    };

    const handleCountryClick = (value: string) => {
        setCountryStates(prev => ({
            ...prev,
            [value]: toggleState(prev[value] || 'neutral')
        }));
    };

    const handleTypeClick = (value: string) => {
        setTypeStates(prev => ({
            ...prev,
            [value]: prev[value] === 'include' ? 'neutral' : 'include'
        }));
    };

    const fetchResults = async (resetPage = false) => {
        setLoading(true);
        const currentPage = resetPage ? 1 : page;
        
        try {
            const includeGenres = Object.keys(genreStates).filter(k => genreStates[k] === 'include');
            const excludeGenres = Object.keys(genreStates).filter(k => genreStates[k] === 'exclude');
            const includeCountries = Object.keys(countryStates).filter(k => countryStates[k] === 'include');
            const excludeCountries = Object.keys(countryStates).filter(k => countryStates[k] === 'exclude');
            const types = Object.keys(typeStates).filter(k => typeStates[k] === 'include');

            const params = new URLSearchParams();
            if (includeGenres.length) params.append('includeGenres', includeGenres.join(','));
            if (excludeGenres.length) params.append('excludeGenres', excludeGenres.join(','));
            if (includeCountries.length) params.append('includeCountries', includeCountries.join(','));
            if (excludeCountries.length) params.append('excludeCountries', excludeCountries.join(','));
            if (types.length) params.append('types', types.join(','));
            params.append('page', currentPage.toString());

            const res = await fetch(`/api/advanced-browse?${params.toString()}`);
            const data = await res.json();

            setResults(prev => resetPage ? data.results : [...prev, ...data.results]);
            setHasMore(data.hasMore);
            setPage(currentPage + 1);
        } catch (error) {
            console.error('Failed to fetch discovered results', error);
        } finally {
            setLoading(false);
        }
    };

    // Refetch when filters change
    useEffect(() => {
        fetchResults(true);
    }, [genreStates, typeStates, countryStates]);

    const getBtnStyle = (state: ToggleState) => {
        if (state === 'include') return 'bg-green-600/20 text-green-400 border-green-600/50 hover:bg-green-600/30';
        if (state === 'exclude') return 'bg-red-600/20 text-red-500 border-red-600/50 hover:bg-red-600/30';
        return 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white';
    };

    const getBtnIcon = (state: ToggleState) => {
        if (state === 'include') return '✓';
        if (state === 'exclude') return '✕';
        return '+';
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto items-start animate-in fade-in duration-700">
            
            {/* Filter Sidebar */}
            <div className="w-full md:w-80 flex flex-col gap-6 sticky top-24 shrink-0 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-xl">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                        Discover
                    </h2>

                    <div className="mb-6">
                        <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">Content Type</h3>
                        <div className="flex flex-wrap gap-2">
                            {allTypes.map(type => {
                                const state = typeStates[type.value] || 'neutral';
                                return (
                                    <button
                                        key={type.value}
                                        onClick={() => handleTypeClick(type.value)}
                                        className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all ${getBtnStyle(state)}`}
                                    >
                                        {type.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">Countries</h3>
                        <div className="flex flex-wrap gap-2">
                            {allCountries.map(country => {
                                const state = countryStates[country.value] || 'neutral';
                                return (
                                    <button
                                        key={country.value}
                                        onClick={() => handleCountryClick(country.value)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all ${getBtnStyle(state)}`}
                                    >
                                        <span className="text-[10px] opacity-70 w-2 text-center">{getBtnIcon(state)}</span>
                                        {country.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">Genres</h3>
                        <div className="flex flex-wrap gap-2">
                            {allGenres.map(genre => {
                                const state = genreStates[genre.value] || 'neutral';
                                return (
                                    <button
                                        key={genre.value}
                                        onClick={() => handleGenreClick(genre.value)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all ${getBtnStyle(state)}`}
                                    >
                                        <span className="text-[10px] opacity-70 w-2 text-center">{getBtnIcon(state)}</span>
                                        {genre.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 w-full min-w-0">
                {results.length === 0 && !loading ? (
                    <div className="w-full text-center py-32 text-gray-500 bg-gray-900/20 border border-gray-800/50 rounded-3xl backdrop-blur-sm">
                        <h3 className="text-xl font-bold mb-2">No matches found</h3>
                        <p>Try adjusting your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {results.map((result: any, i: number) => (
                            <Link
                                href={`/movie?url=${encodeURIComponent(result.url)}`}
                                key={result.id + i}
                                className="group flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-red-500/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10"
                            >
                                <div className="relative aspect-[2/3] w-full bg-gray-800 overflow-hidden shrink-0">
                                    {result.poster ? (
                                        <img
                                            src={result.poster}
                                            alt={result.title}
                                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                                    {result.year && (
                                        <div className="absolute top-2 right-2">
                                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                                {result.year}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="text-sm font-semibold text-gray-100 group-hover:text-red-400 transition-colors line-clamp-2 mb-1">
                                        {result.title}
                                    </h3>
                                    <div className="flex flex-col gap-1 mt-auto">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                            {result.country || 'Unknown Country'}
                                        </p>
                                        <p className="text-xs text-gray-500 line-clamp-1">
                                            {result.genres || result.type}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="w-full flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                )}

                {hasMore && !loading && results.length > 0 && (
                    <div className="w-full flex justify-center mt-12 mb-8">
                        <button 
                            onClick={() => fetchResults(false)}
                            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-xl transition-all"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
