'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function CatalogPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = use(params);
  const [results, setResults] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reconstruct path from the slug segments
  const path = `/${resolvedParams.slug.join('/')}/`;

  useEffect(() => {
    async function fetchCatalog() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        
        if (!res.ok) {
           throw new Error(data.error || 'Failed to fetch catalog');
        }

        setResults(data.results || []);
        setTitle(data.title || 'Catalog Results');
      } catch (err: any) {
        console.error('Catalog Fetch Error:', err);
        setError(err.message || 'An error occurred while fetching the catalog.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCatalog();
  }, [path]);

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Title Header */}
      <div className="w-full border-b border-gray-800 pb-4 mb-2">
         <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
           {loading ? 'Loading Catalog...' : title}
         </h1>
      </div>

      {error && (
        <div className="w-full text-red-500 bg-red-500/10 px-4 py-4 rounded-xl border border-red-500/20">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="w-full flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="w-full text-center py-20 text-gray-500">
          No results found for this catalog category.
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((result: any, i: number) => (
              <Link
                href={`/movie?url=${encodeURIComponent(result.url)}`}
                key={i}
                className="group flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-red-500/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10"
              >
                <div className="relative aspect-[2/3] w-full bg-gray-800 overflow-hidden">
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
                  <div className="absolute top-2 right-2 flex gap-1 flex-col items-end">
                    <span className="bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase shadow-sm">
                      {result.info.split(',')[0]}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-gray-100 group-hover:text-red-400 transition-colors line-clamp-2 mb-1">
                    {result.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-auto line-clamp-1">
                    {result.info.split(',').slice(1).join(',')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
