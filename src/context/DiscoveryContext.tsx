'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { SortState, SortDir } from '@/lib/tmdb';

export type ContentType = 'movie' | 'tv' | 'cartoons' | 'anime';
export type ToggleState = 'neutral' | 'include' | 'exclude';

interface DiscoveryContextType {
    contentType: ContentType;
    setContentType: (type: ContentType) => void;
    genreStates: Record<string | number, ToggleState>;
    setGenreStates: React.Dispatch<React.SetStateAction<Record<string | number, ToggleState>>>;
    toggleGenre: (id: string | number) => void;
    activeLanguage: string | null;
    setActiveLanguage: (lang: string | null) => void;
    toggleLanguage: (lang: string) => void;
    activeCountry: string | null;
    setActiveCountry: (country: string | null) => void;
    toggleCountry: (country: string) => void;
    sortState: SortState;
    setSortState: React.Dispatch<React.SetStateAction<SortState>>;
    toggleSort: (key: string) => void;
    year: string;
    setYear: (year: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeHdRezkaGenre: string | null;
    setActiveHdRezkaGenre: (genre: string | null) => void;
    discoverySource: 'tmdb' | 'hdrezka';
    setDiscoverySource: (source: 'tmdb' | 'hdrezka') => void;
    isInitialized: boolean;
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

export function DiscoveryProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // — State —
    const [contentType, setContentType] = useState<ContentType>('movie');
    const [genreStates, setGenreStates] = useState<Record<string | number, ToggleState>>({});
    const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
    const [activeCountry, setActiveCountry] = useState<string | null>(null);
    const [sortState, setSortState] = useState<SortState>({ key: 'popularity', dir: 'desc' });
    const [year, setYear] = useState('0');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeHdRezkaGenre, setActiveHdRezkaGenre] = useState<string | null>(null);
    const [discoverySource, setDiscoverySource] = useState<'tmdb' | 'hdrezka'>('tmdb');
    const [isInitialized, setIsInitialized] = useState(false);

    // — Exclusivity Wrappers —
    const updateSearchQuery = useCallback((q: string) => {
        setSearchQuery(q);
        if (q.trim() && activeHdRezkaGenre) {
            setActiveHdRezkaGenre(null);
        }
    }, [activeHdRezkaGenre]);

    const updateHdRezkaGenre = useCallback((g: string | null) => {
        setActiveHdRezkaGenre(g);
        if (g && searchQuery) {
            setSearchQuery('');
        }
    }, [searchQuery]);

    // — Sync URL -> State (Initial Load) —
    useEffect(() => {
        if (isInitialized) return;

        const type = searchParams.get('type') as ContentType;
        if (type) setContentType(type);

        const source = searchParams.get('source') as 'tmdb' | 'hdrezka';
        if (source) setDiscoverySource(source);

        const inc = searchParams.get('inc')?.split(',').filter(Boolean) || [];
        const exc = searchParams.get('exc')?.split(',').filter(Boolean) || [];
        const newGenres: Record<string | number, ToggleState> = {};
        inc.forEach(id => newGenres[id] = 'include');
        exc.forEach(id => newGenres[id] = 'exclude');
        if (Object.keys(newGenres).length) setGenreStates(newGenres);

        const lang = searchParams.get('lang');
        if (lang) setActiveLanguage(lang);

        const ctry = searchParams.get('ctry');
        if (ctry) setActiveCountry(ctry);

        const y = searchParams.get('year');
        if (y) setYear(y);

        const q = searchParams.get('q');
        if (q) setSearchQuery(q);

        const g = searchParams.get('genre');
        if (g) setActiveHdRezkaGenre(g);

        const sortK = searchParams.get('sortK');
        const sortD = searchParams.get('sortD') as SortDir;
        if (sortK && sortD) setSortState({ key: sortK, dir: sortD });

        setIsInitialized(true);
    }, [searchParams, isInitialized]);

    // — Sync State -> URL —
    useEffect(() => {
        if (!isInitialized) return;
        
        const isBrowsing = pathname === '/' || pathname === '/discover' || pathname.startsWith('/films') || pathname.startsWith('/series') || pathname.startsWith('/cartoons') || pathname.startsWith('/anime');
        if (!isBrowsing) return;

        const params = new URLSearchParams();
        params.set('type', contentType);
        params.set('source', discoverySource);
        
        const inc = Object.entries(genreStates).filter(([, s]) => s === 'include').map(([id]) => id);
        const exc = Object.entries(genreStates).filter(([, s]) => s === 'exclude').map(([id]) => id);
        if (inc.length) params.set('inc', inc.join(','));
        if (exc.length) params.set('exc', exc.join(','));
        
        if (activeLanguage) params.set('lang', activeLanguage);
        if (activeCountry) params.set('ctry', activeCountry);
        if (year !== '0') params.set('year', year);
        if (searchQuery) params.set('q', searchQuery);
        if (activeHdRezkaGenre) params.set('genre', activeHdRezkaGenre);
        if (sortState.dir !== 'neutral') {
            params.set('sortK', sortState.key);
            params.set('sortD', sortState.dir);
        }

        const newSearch = params.toString();
        const currentSearch = searchParams.toString();
        if (newSearch !== currentSearch) {
            router.replace(`${pathname}?${newSearch}`, { scroll: false });
        }
    }, [contentType, genreStates, activeLanguage, activeCountry, sortState, year, searchQuery, activeHdRezkaGenre, discoverySource, pathname, isInitialized, searchParams, router]);

    // — Helpers —
    const toggleGenre = (id: string | number) => {
        setGenreStates(prev => {
            const cur = prev[id] || 'neutral';
            const next: ToggleState = cur === 'neutral' ? 'include' : cur === 'include' ? 'exclude' : 'neutral';
            return { ...prev, [id]: next };
        });
    };

    const toggleSort = (key: string) => {
        setSortState(prev => {
            if (prev.key !== key) return { key, dir: 'desc' };
            const nextDir: SortDir = prev.dir === 'neutral' ? 'desc' : prev.dir === 'desc' ? 'asc' : 'neutral';
            return { key, dir: nextDir };
        });
    };

    const toggleLanguage = (code: string) => {
        setActiveLanguage(prev => (prev === code ? null : code));
    };

    const toggleCountry = (code: string) => {
        setActiveCountry(prev => (prev === code ? null : code));
    };

    const value = {
        contentType, setContentType,
        genreStates, setGenreStates, toggleGenre,
        activeLanguage, setActiveLanguage, toggleLanguage,
        activeCountry, setActiveCountry, toggleCountry,
        sortState, setSortState, toggleSort,
        year, setYear,
        searchQuery, setSearchQuery: updateSearchQuery,
        activeHdRezkaGenre, setActiveHdRezkaGenre: updateHdRezkaGenre,
        discoverySource, setDiscoverySource,
        isInitialized
    };

    return (
        <DiscoveryContext.Provider value={value}>
            {children}
        </DiscoveryContext.Provider>
    );
}

export function useDiscovery() {
    const context = useContext(DiscoveryContext);
    if (context === undefined) {
        throw new Error('useDiscovery must be used within a DiscoveryProvider');
    }
    return context;
}
