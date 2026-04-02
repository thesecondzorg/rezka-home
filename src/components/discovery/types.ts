import type { SortState, TmdbResult } from '@/lib/tmdb';

export type ToggleState = 'neutral' | 'include' | 'exclude';

export interface UnifiedResult {
    id: string | number;
    title: string;
    originalTitle?: string;
    poster: string | null;
    year?: string | number;
    rating?: number | null;
    overview?: string;
    type: 'movie' | 'tv' | 'series' | string;
    url?: string; // For potential direct links if we ever scrape again
    genreIds?: number[];
}

export interface DiscoveryFilters {
    contentType: 'movie' | 'tv';
    genreStates: Record<string | number, ToggleState>;
    activeLanguage: string | null;
    activeCountry: string | null;
    sortState: SortState;
    searchQuery: string;
}
