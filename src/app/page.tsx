'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setError('An error occurred while searching.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto space-y-8">
      <div className="w-full max-w-2xl mt-10">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full p-4 pl-12 text-sm text-white bg-gray-900 border border-gray-800 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            placeholder="Search for movies, TV shows, anime..."
            required
          />
          <button
            type="submit"
            className="absolute right-2.5 bottom-2.5 bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-800 font-medium rounded-full text-sm px-5 py-2 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="text-red-500 bg-red-500/10 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            Results for <span className="text-red-500">"{query}"</span>
          </h2>
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
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-4xl">
                      {result.title.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-sm line-clamp-2 text-gray-100 group-hover:text-red-400 transition-colors">
                    {result.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 mt-auto">
                    {result.info}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && results.length === 0 && query && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl">No results found for "{query}"</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
