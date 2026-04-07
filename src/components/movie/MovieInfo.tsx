'use client';

import React from 'react';

interface MovieInfoProps {
    details: any;
    tmdbData?: any;
}

export function MovieInfo({ details, tmdbData }: MovieInfoProps) {
    if (!details) return null;

    return (
        <div className="flex flex-col gap-8">

            {/* Metadata Grid */}
            <div className="bg-gray-950/40 rounded-[2.5rem] border border-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] -z-10 rounded-full group-hover:bg-red-600/10 transition-colors duration-1000" />
                
                <h2 className="text-3xl font-black text-white mb-10 tracking-tighter flex items-center gap-3">
                    Details
                    <span className="h-px bg-gradient-to-r from-white/10 to-transparent flex-1 ml-4" />
                </h2>
                
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

        </div>
    );
}
