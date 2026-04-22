'use client';

import React from 'react';

export default function AdminPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                System Admin
            </h1>

            <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                    System Status
                </h2>
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 leading-relaxed">
                        The local catalog feature has been disabled. The application now uses real-time discovery and search via HDRezka and TMDB APIs.
                    </p>
                    <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                        <li>Real-time metadata extraction enabled</li>
                        <li>TMDB discovery integration active</li>
                        <li>No local storage for catalog data</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
