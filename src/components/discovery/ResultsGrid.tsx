'use client';

import React from 'react';
import type { UnifiedResult } from './types';

interface ResultsGridProps {
    results: UnifiedResult[];
    loading: boolean;
    onCardClick: (result: UnifiedResult) => void;
    linkingId: string | number | null;
}

const STAR_ICON = (
    <svg viewBox="0 0 20 20" fill="currentColor" className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export function ResultsGrid({ results, loading, onCardClick, linkingId }: ResultsGridProps) {
    const ratingColor = (r: number) => {
        if (r >= 7.5) return 'text-emerald-400';
        if (r >= 6)   return 'text-yellow-400';
        return 'text-gray-400';
    };

    if (!loading && results.length === 0) {
        return (
            <div className="w-full text-center py-32 text-gray-600 bg-gray-900/20 border border-gray-800/50 rounded-2xl">
                <p className="text-4xl mb-4">🎬</p>
                <h3 className="text-lg font-bold text-gray-400 mb-1">No results found</h3>
                <p className="text-sm">Try adjusting your filters or search query</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((result, i) => (
                <button
                    key={`${result.id}-${i}`}
                    onClick={() => onCardClick(result)}
                    disabled={linkingId === result.id}
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
                        {linkingId === result.id && (
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
                        {!result.originalTitle && result.info && (
                            <p className="text-[10px] text-gray-600 line-clamp-1">{result.info}</p>
                        )}
                    </div>
                </button>
            ))}

            {/* Loading skeleton */}
            {loading && results.length === 0 && (
                Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 animate-pulse">
                        <div className="aspect-[2/3] bg-gray-800" />
                        <div className="p-3 flex flex-col gap-2">
                            <div className="h-3 bg-gray-800 rounded w-3/4" />
                            <div className="h-2 bg-gray-800 rounded w-1/2" />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
