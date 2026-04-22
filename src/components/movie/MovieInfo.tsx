'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface RelatedItem {
    title: string;
    url?: string;
    poster?: string;
    posterPath?: string;
    year?: string;
    rating?: string;
    info?: string;
    tmdbId?: number;
    type?: string;
}

interface ScheduleItem {
    date: string;
    episode: string;
    status: string;
}

interface MovieInfoProps {
    details: any;
    tmdbData?: any;
    schedule?: ScheduleItem[];
    tmdbNextEpisode?: {
        airDate: string;
        episodeNumber: number;
        seasonNumber: number;
        name: string;
    } | null;
    hdrezkaRelated?: RelatedItem[];
    hdrezkaRecs?: RelatedItem[];
    tmdbRecs?: RelatedItem[];
}

export function MovieInfo({
    details,
    tmdbData,
    schedule,
    tmdbNextEpisode,
    hdrezkaRelated,
    hdrezkaRecs,
    tmdbRecs
}: MovieInfoProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'schedule' | 'related'>(
        tmdbNextEpisode || schedule?.length ? 'schedule' :
            hdrezkaRelated?.length ? 'related' : 'details'
    );

    if (!details) return null;

    const hasSchedule = !!(schedule?.length || tmdbNextEpisode);
    const hasRelated = !!(hdrezkaRelated?.length || hdrezkaRecs?.length || tmdbRecs?.length);

    return (
        <div className="flex flex-col gap-10">
            {/* Tab Switcher */}
            <div className="flex items-center gap-6 border-b border-white/5 pb-2">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'details' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Details
                    {activeTab === 'details' && <div className="absolute bottom-0 inset-x-0 h-1 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]" />}
                </button>

                {hasSchedule && (
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`pb-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'schedule' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Schedule
                        {activeTab === 'schedule' && <div className="absolute bottom-0 inset-x-0 h-1 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" />}
                    </button>
                )}

                {hasRelated && (
                    <button
                        onClick={() => setActiveTab('related')}
                        className={`pb-4 text-sm font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'related' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Related
                        {activeTab === 'related' && <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-600 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />}
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="transition-all duration-500">
                {activeTab === 'details' && (
                    <div className="bg-gray-950/40 rounded-[2.5rem] border border-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-inner relative overflow-hidden group animate-in fade-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] -z-10 rounded-full group-hover:bg-red-600/10 transition-colors duration-1000" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-8">
                            {Object.entries(details.info || {}).map(([key, value]) => (
                                <div key={key} className="flex flex-col gap-2 group/item">
                                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] group-hover/item:text-red-500 transition-colors">
                                        {key}
                                    </span>
                                    <span className="text-sm md:text-base text-gray-200 font-bold leading-snug group-hover/item:text-white transition-colors">
                                        {value as string}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="bg-gray-950/40 rounded-[2.5rem] border border-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-inner relative overflow-hidden group animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10 rounded-full group-hover:bg-blue-600/10 transition-colors duration-1000" />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {schedule && schedule.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-3">
                                        {schedule.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold">{item.episode}</span>
                                                    <span className="text-xs text-blue-400 font-medium">{item.status}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gray-300 font-black text-sm">{item.date}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tmdbNextEpisode && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-2">Next to Air (TMDB)</h3>
                                    <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 flex flex-col gap-4 relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full" />

                                        <div className="flex justify-between items-start relative">
                                            <div>
                                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Confirmed</span>
                                                <h4 className="text-xl font-black text-white mt-2 leading-tight">
                                                    S{tmdbNextEpisode.seasonNumber} E{tmdbNextEpisode.episodeNumber}
                                                </h4>
                                                <p className="text-sm text-gray-300 font-bold mt-1 line-clamp-1">{tmdbNextEpisode.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-blue-400 block tracking-tighter">
                                                    {new Date(tmdbNextEpisode.airDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                                    {new Date(tmdbNextEpisode.airDate).toLocaleDateString('en-US', { year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'related' && (
                    <div className="bg-gray-950/40 rounded-[2.5rem] border border-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-inner relative overflow-hidden group animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] -z-10 rounded-full group-hover:bg-emerald-600/10 transition-colors duration-1000" />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                            {/* Franchise / Related Parts */}
                            {hdrezkaRelated && hdrezkaRelated.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest mb-2">Franchise & Sequels</h3>
                                    <div className="space-y-3">
                                        {hdrezkaRelated.map((item, i) => (
                                            <Link
                                                key={i}
                                                href={item.url ? `/movie?url=${encodeURIComponent(item.url)}` : '#'}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all group/item ${(item as any).isCurrent
                                                    ? 'bg-emerald-600/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                    : 'bg-white/5 border-white/5 hover:bg-emerald-600/10 hover:border-emerald-500/20'
                                                    }`}
                                            >
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold truncate transition-colors ${(item as any).isCurrent ? 'text-emerald-400' : 'text-white group-hover/item:text-emerald-400'
                                                            }`}>
                                                            {item.title}
                                                        </span>
                                                        {(item as any).isCurrent && (
                                                            <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Current</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Rezka Part</span>
                                                </div>
                                                <div className="text-right shrink-0 ml-4 flex items-center gap-3">
                                                    {item.rating && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">{item.rating}</span>}
                                                    <span className="text-gray-300 font-black text-sm">{item.year}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations Combined */}
                            {(hdrezkaRecs?.length || tmdbRecs?.length) && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest mb-2">Discovery & Recommendations</h3>
                                    <div className="space-y-3">
                                        {[...(hdrezkaRecs || []), ...(tmdbRecs || [])].slice(0, 15).map((item, i) => (
                                            <Link
                                                key={i}
                                                href={item.url ? `/movie?url=${encodeURIComponent(item.url)}` : `/movie?tmdbId=${item.tmdbId || (item as any).id}&tmdbType=${item.type || 'movie'}`}
                                                className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-blue-600/10 hover:border-blue-500/20 transition-all group/item"
                                            >
                                                {(item.poster || item.posterPath) && (
                                                    <img
                                                        src={item.poster || item.posterPath}
                                                        className="w-10 h-14 object-cover rounded-lg flex-shrink-0 shadow-lg"
                                                        alt=""
                                                    />
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white font-bold truncate group-hover/item:text-blue-400 transition-colors">{item.title}</span>
                                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{item.info || item.year || 'Suggestion'}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


