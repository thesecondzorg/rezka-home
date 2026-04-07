'use client';

import React from 'react';
import Image from 'next/image';

interface HdRezkaResult {
    title: string;
    url: string;
    poster?: string;
    info?: string;
}

interface LinkingChoiceModalProps {
    tmdbData: {
        title: string;
        poster?: string;
        year?: string;
        type: string;
        tmdbId: string | number;
    };
    results: HdRezkaResult[];
    onSelect: (result: HdRezkaResult) => void;
    onClose: () => void;
}

export function LinkingChoiceModal({ tmdbData, results, onSelect, onClose }: LinkingChoiceModalProps) {
    const isNotFound = results.length === 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-gray-950/60 backdrop-blur-2xl" 
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-gray-950/40 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 flex flex-col md:flex-row max-h-[90vh]">
                
                {/* Left side: TMDB Context (Target Card) */}
                <div className="w-full md:w-80 bg-gradient-to-b from-gray-900/80 to-black/80 p-10 flex flex-col items-center text-center gap-6 border-b md:border-b-0 md:border-r border-white/5 relative group">
                    <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl pointer-events-none" />
                    
                    <div className="relative">
                        {tmdbData.poster ? (
                            <img 
                                src={tmdbData.poster} 
                                alt={tmdbData.title}
                                className="w-48 h-72 object-cover rounded-[2rem] shadow-[0_20px_50px_rgba(220,38,38,0.15)] border border-white/10 relative z-10"
                            />
                        ) : (
                            <div className="w-48 h-72 bg-gray-900 rounded-[2rem] flex items-center justify-center border border-white/10 relative z-10">
                                <span className="text-gray-600 text-5xl">🎬</span>
                            </div>
                        )}
                        <div className="absolute -inset-4 bg-red-600/20 blur-2xl rounded-full opacity-30 animate-pulse pointer-events-none" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-2">
                        <h2 className="text-2xl font-black tracking-tighter text-white leading-tight">
                            {tmdbData.title}
                        </h2>
                        <div className="flex flex-wrap justify-center gap-2 mt-1">
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {tmdbData.type}
                            </span>
                            <span className="px-3 py-1 bg-red-950/30 border border-red-500/20 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest">
                                {tmdbData.year || 'Unknown Year'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto relative z-10 opacity-40 text-[10px] uppercase font-black tracking-[0.2rem] text-gray-500">
                        Target Metadata
                    </div>
                </div>

                {/* Right side: Results List/Grid */}
                <div className="flex-1 flex flex-col p-10 overflow-hidden bg-black/20">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-black uppercase tracking-[0.3rem] text-gray-500 mb-1">
                                {isNotFound ? 'Zero Matches' : 'Multiple Matches Found'}
                            </h3>
                            <p className="text-xs text-gray-600 font-bold">
                                {isNotFound ? 'Try a manual search or refine title' : `Select the most accurate version for ${tmdbData.title}`}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-500 hover:text-white transition-all transform hover:rotate-90 duration-300"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        {isNotFound ? (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-10">
                                <div className="w-24 h-24 bg-red-600/5 rounded-[2.5rem] flex items-center justify-center transform rotate-12">
                                    <svg className="w-10 h-10 text-red-600/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div className="max-w-xs">
                                    <h4 className="text-white font-bold mb-2">No direct link found</h4>
                                    <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                        We searched multiple patterns but couldn't find this exact title on HDRezka.
                                    </p>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                                {results.map((res, i) => (
                                    <button
                                        key={res.url}
                                        onClick={() => onSelect(res)}
                                        className="flex items-start gap-5 p-5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/20 rounded-[2rem] group transition-all duration-500 text-left relative overflow-hidden"
                                        style={{ animationDelay: `${i * 70}ms` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        
                                        <div className="w-16 h-24 rounded-2xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/10 relative z-10 shadow-2xl">
                                            {res.poster ? (
                                                <img src={res.poster} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-2 min-w-0 relative z-10 py-1">
                                            <span className="text-sm font-black text-gray-200 group-hover:text-white transition-colors leading-tight">
                                                {res.title}
                                            </span>
                                            {res.info && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                                                        {res.info.split('(').shift()?.trim()}
                                                    </span>
                                                    {res.info.includes('(') && (
                                                        <span className="text-[9px] text-red-500/60 font-black uppercase tracking-widest">
                                                            ({res.info.split('(').pop()?.replace(')', '')})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="self-center p-3 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-500 relative z-10 border border-white/10">
                                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 99px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 99px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
