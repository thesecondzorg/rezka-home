'use client';

import React, { useState, useEffect } from 'react';

export default function AdminPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/catalog/sync');
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error('Failed to fetch status', e);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (action: 'start' | 'stop') => {
        setLoading(true);
        try {
            await fetch('/api/admin/catalog/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            await fetchStatus();
        } catch (e) {
            console.error('Action failed', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                System Admin
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                        Catalog Synchronization
                    </h2>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                status?.status === 'running' ? 'bg-green-500/20 text-green-400' : 
                                status?.status === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'
                            }`}>
                                {status?.status || 'idle'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Items Indexed</span>
                            <span className="text-white font-mono text-lg">{status?.items_indexed || 0}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Progress</span>
                            <span className="text-white font-mono truncate max-w-[150px]">
                                {status?.current_category || 'N/A'} (p{status?.current_page || 1})
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Errors</span>
                            <span className={`font-mono ${status?.error_count > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {status?.error_count || 0}
                            </span>
                        </div>

                        {status?.last_error && (
                            <div className="mt-4 p-3 bg-red-950/30 border border-red-900/30 rounded-xl">
                                <p className="text-[10px] text-red-400/80 uppercase font-bold mb-1">Last Error</p>
                                <p className="text-xs text-red-200/70 line-clamp-2 italic">"{status.last_error}"</p>
                            </div>
                        )}

                        {status?.last_updated && (
                            <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-gray-400 font-medium">Last Update</span>
                                <span className="text-gray-500">{new Date(status.last_updated).toLocaleTimeString()}</span>
                            </div>
                        )}

                        <div className="pt-6 flex gap-4">
                            {status?.status === 'running' ? (
                                <button
                                    onClick={() => handleAction('stop')}
                                    disabled={loading}
                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
                                >
                                    Stop Syncing
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleAction('start')}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    Start Full Indexing
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-pink-600 rounded-full"></span>
                        Index Statistics
                    </h2>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Indexing the entire catalog (~50k+ items) can take several days depending on the rate limiting.
                            Each item fetch includes translations, seasons, and episode metadata.
                        </p>
                        <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                            <li>Requests are throttled to 1-2 per second</li>
                            <li>Anti-bot protection is handled via randomized delays</li>
                            <li>Search performance will improve as the index grows</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
