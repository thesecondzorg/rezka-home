'use client';

import React, { use, useEffect } from 'react';
import { DiscoveryContainer } from '@/components/discovery/DiscoveryContainer';
import { useDiscovery } from '@/context/DiscoveryContext';
import { MOVIE_GENRES, TV_GENRES } from '@/lib/tmdb';

export default function CatalogPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = use(params);
    const slug = resolvedParams.slug;
    const { setContentType, setGenreStates, isInitialized } = useDiscovery();

    useEffect(() => {
        if (!isInitialized) return;

        // Default filters
        let contentType: 'movie' | 'tv' | 'cartoons' | 'anime' = 'movie';
        const genreStates: Record<string | number, 'include' | 'exclude' | 'neutral'> = {};

        // 1. Determine Content Type
        if (slug.includes('series')) {
            contentType = 'tv';
        } else if (slug.includes('films')) {
            contentType = 'movie';
        } else if (slug.includes('cartoons')) {
            contentType = 'cartoons';
        } else if (slug.includes('anime')) {
            contentType = 'anime';
        }

        // 2. Map Special Categories
        if (slug.includes('cartoons') || slug.includes('animation') || slug.includes('anime')) {
            genreStates[16] = 'include'; // Animation ID
        }

        // 3. Map Genres from segments
        const genresList = (contentType === 'movie' || contentType === 'cartoons' || contentType === 'anime') ? MOVIE_GENRES : TV_GENRES;
        for (const segment of slug) {
            const s = segment.toLowerCase();
            const match = genresList.find(g => 
                g.label.toLowerCase().includes(s) || s.includes(g.label.toLowerCase())
            );
            if (match) {
                genreStates[match.id] = 'include';
            }
        }

        setContentType(contentType);
        setGenreStates(genreStates);
    }, [slug, isInitialized, setContentType, setGenreStates]);

    return (
        <DiscoveryContainer />
    );
}
