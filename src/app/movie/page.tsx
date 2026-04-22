'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Hls from 'hls.js';
import { MovieInfo } from '@/components/movie/MovieInfo';
import { MovieHeader } from '@/components/movie/MovieHeader';
import { useDiscovery } from '@/context/DiscoveryContext';
import { RelatedContent } from '@/components/movie/RelatedContent';
import { EpisodeSchedule } from '@/components/movie/EpisodeSchedule';


function MoviePageContent() {
    const searchParams = useSearchParams();
    const url = searchParams.get('url');
    const { tmdbAvailable } = useDiscovery();

    const [details, setDetails] = useState<any>(null);
    const [tmdbData, setTmdbData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [streamUrl, setStreamUrl] = useState('');
    const [streamHlsUrl, setStreamHlsUrl] = useState('');
    const [streams, setStreams] = useState<any[]>([]);
    const [currentQuality, setCurrentQuality] = useState<string>('');
    const [streamLoading, setStreamLoading] = useState(false);
    const [streamError, setStreamError] = useState<string>('');
    const [showQualities, setShowQualities] = useState(false);
    const [selectedTranslatorId, setSelectedTranslatorId] = useState<string>('');
    const [selectedSeason, setSelectedSeason] = useState<string>('');
    const [selectedEpisode, setSelectedEpisode] = useState<string>('');
    const [showNextEpisodeBtn, setShowNextEpisodeBtn] = useState(false);
    const [theaterMode, setTheaterMode] = useState(false);
    const [episodePage, setEpisodePage] = useState(0);
    const [reloadReason, setReloadReason] = useState<string | null>(null);

    // Watchlist State
    const [watchStatus, setWatchStatus] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const lowBufferSinceRef = useRef<number | null>(null);
    const dbSyncTimeoutRef = useRef<any>(null);
    // Refs to avoid stale closures in the ABR interval without restarting it
    const currentQualityRef = useRef<string>('');
    const streamsRef = useRef<any[]>([]);
    // Store last stream params so retry can replay them
    const lastStreamParamsRef = useRef<{ movieId: string; translatorId: string; season?: string; episode?: string; action?: string } | null>(null);

    const tmdbId = searchParams.get('tmdbId');
    const tmdbType = searchParams.get('tmdbType') || 'movie';

    useEffect(() => {
        if (url) {
            fetchDetails(url);

            if (tmdbId && tmdbAvailable) {
                fetch(`/api/tmdb-details?id=${tmdbId}&type=${tmdbType}`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data.error) setTmdbData(data);
                    })
                    .catch(e => console.error('TMDB fetch error:', e));
            }

            // Fetch initial Watchlist status
            fetch('/api/watchlist')
                .then(res => res.json())
                .then(data => {
                    const item = data.items?.find((i: any) => i.url === url);
                    if (item) setWatchStatus(item.type);
                });
        }

        return () => {
            if (dbSyncTimeoutRef.current) clearTimeout(dbSyncTimeoutRef.current);
        }
    }, [url, tmdbId, tmdbType]);

    // Exit theater mode on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTheaterMode(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Xbox & Media Session Integration - Enable native system controls and remotes
    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

        // Register action handlers for Next Track (standard skip episode signal)
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('[MediaSession] Next track signal — triggering episode skip');
            handleVideoEnded();
        });

        // Set Metadata for the System Overlay / Media Remote
        if (details) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: details.title,
                artist: details.year || 'HDRezka',
                album: details.isSeries ? (selectedSeason ? `Season ${selectedSeason}` : 'Series') : 'Movie',
                artwork: details.poster ? [{ src: details.poster }] : []
            });
        }

        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('nexttrack', null);
            }
        };
    }, [details, selectedSeason, selectedEpisode]); // Re-attach when content changes

    // Diagnostics / Reload Tracking
    useEffect(() => {
        const reason = sessionStorage.getItem('hdrezka_reload_reason');
        if (reason) {
            setReloadReason(reason);
            sessionStorage.removeItem('hdrezka_reload_reason');
            console.log(`[Diagnostic] React mounted after reload. Reason: ${reason}`);
            setTimeout(() => setReloadReason(null), 12000);
        }

        const handleBeforeUnload = () => {
            // If nothing explicitly set a reason before this unloads, it's a native browser refresh / crash / HMR
            if (!sessionStorage.getItem('hdrezka_reload_reason')) {
                sessionStorage.setItem('hdrezka_reload_reason', 'Native Browser Event (User F5, Background Tab Killed, or Next.js HMR)');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Auto-jump episode page when selected episode changes (e.g. restore from saved state)
    useEffect(() => {
        if (!selectedSeason || !details?.episodes?.[selectedSeason] || !selectedEpisode) return;
        const allEps: any[] = details.episodes[selectedSeason];
        const idx = allEps.findIndex((e: any) => e.id === selectedEpisode);
        if (idx >= 0) setEpisodePage(Math.floor(idx / 10));
    }, [selectedEpisode, selectedSeason]);

    // Prevent multiple parallel initial fetch attempts
    const initialFetchAttemptedRef = useRef(false);

    useEffect(() => {
        if (details && details.translations && !streamLoading && !streamUrl && !initialFetchAttemptedRef.current) {
            initialFetchAttemptedRef.current = true;

            const savedStateStr = localStorage.getItem(`hdrezka_state_${details.movieId}`);
            let savedState: any = null;
            try { if (savedStateStr) savedState = JSON.parse(savedStateStr); } catch (e) { }

            const defaultTranslator = savedState?.translatorId || details.translations[0]?.id || '';
            const defaultMovieId = details.translations[0]?.movieId || details.movieId;

            let defaultSeason = '';
            let defaultEpisode = '';

            if (details.isSeries && details.seasons?.length > 0) {
                defaultSeason = savedState?.seasonId || details.seasons[0].id;

                // Ensure season exists, else fallback to first
                if (!details.episodes[defaultSeason]) {
                    defaultSeason = details.seasons[0].id;
                }

                if (details.episodes && details.episodes[defaultSeason]?.length > 0) {
                    defaultEpisode = savedState?.episodeId || details.episodes[defaultSeason][0].id;

                    // Ensure episode exists in this season
                    if (!details.episodes[defaultSeason].find((e: any) => e.id === defaultEpisode)) {
                        defaultEpisode = details.episodes[defaultSeason][0].id;
                    }
                }
            }

            if (defaultMovieId) {
                setSelectedTranslatorId(defaultTranslator);
                if (defaultSeason) setSelectedSeason(defaultSeason);
                if (defaultEpisode) setSelectedEpisode(defaultEpisode);

                fetchStream(defaultMovieId, defaultTranslator, defaultSeason, defaultEpisode);
            }
        }
    }, [details, streamUrl, streamLoading]);

    // Handle restoring video time after stream loads
    useEffect(() => {
        if ((streamUrl || streamHlsUrl) && videoRef.current && details?.movieId) {
            const savedStateStr = localStorage.getItem(`hdrezka_state_${details.movieId}`);
            if (savedStateStr) {
                try {
                    const savedState = JSON.parse(savedStateStr);
                    let targetTime = 0;

                    if (details.isSeries) {
                        const epKey = `${selectedSeason}_${selectedEpisode}`;
                        if (savedState.episodesTime && savedState.episodesTime[epKey] !== undefined) {
                            targetTime = savedState.episodesTime[epKey];
                        } else if (savedState.seasonId === selectedSeason && savedState.episodeId === selectedEpisode) {
                            // Fallback for older states without episodesTime
                            targetTime = savedState.currentTime;
                        }
                    } else {
                        targetTime = savedState.currentTime;
                    }

                    if (targetTime > 0) {
                        const restoreTime = () => {
                            if (videoRef.current && Math.abs(videoRef.current.currentTime - targetTime) > 2) {
                                videoRef.current.currentTime = targetTime;
                            }
                        };

                        // Wait for metadata to load before setting time
                        videoRef.current.addEventListener('loadedmetadata', restoreTime, { once: true });
                        // Also try immediately in case it's already loaded or restoring from memory cache
                        restoreTime();
                    }
                } catch (e) { }
            }
        }
    }, [streamUrl, streamHlsUrl, selectedSeason, selectedEpisode]);

    // HLS Binding Logic
    useEffect(() => {
        if (!videoRef.current || !streamHlsUrl) return;

        const video = videoRef.current;

        // Use HLS.js specifically if supported and not running native
        if (Hls.isSupported()) {
            // Clean up existing instance before recreating
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }

            const hls = new Hls({
                maxBufferLength: 15,
                maxMaxBufferLength: 30,
                maxBufferSize: 30 * 1000 * 1000, // 30MB max memory limit to prevent OOM
                startLevel: -1 // Auto by default
            });
            hlsRef.current = hls;

            hls.loadSource(streamHlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    console.error("HLS Fatal Error:", data.type, data.details);
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log("Fatal network error encountered, trying to recover...");
                            sessionStorage.setItem('hdrezka_reload_reason', `Network Error: ${data.details || 'HLS timeout/stall'}`);
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log("Fatal media error encountered, trying to recover...");
                            sessionStorage.setItem('hdrezka_reload_reason', `Media Decode Error: ${data.details || 'Hardware/Decoder Drop'}`);
                            hls.recoverMediaError();
                            break;
                        default:
                            console.log("Unrecoverable error, destroying player.");
                            sessionStorage.setItem('hdrezka_reload_reason', `Unrecoverable HLS Error: ${data.details || data.type}`);
                            hls.destroy();
                            break;
                    }
                }
            });

            // Update UI qualities if the manifest loaded internal variants
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                if (data.levels.length > 1) {
                    // Reverse map bandwidth to a display name to match UI expectations
                    const levelMap = data.levels.map((lvl, index) => {
                        return {
                            quality: lvl.name || `${lvl.height}p`,
                            levelIndex: index,
                            isInternalHls: true,
                            hlsUrl: streamHlsUrl // Keep reference so fallback ui doesn't crash
                        };
                    });

                    // Prepend the Auto mode at the top so users can turn ABR back on
                    const builtStreams = [
                        { quality: 'Auto (ABR)', levelIndex: -1, isInternalHls: true, hlsUrl: streamHlsUrl },
                        ...levelMap.reverse()
                    ];

                    setStreams(builtStreams);

                    // Check if the user had a preferred quality saved from earlier and apply it natively
                    // (we couldn't do this during fetchStream because HLS variants hadn't loaded yet)
                    const detailsStr = localStorage.getItem(`hdrezka_state_${video.getAttribute('data-movie-id')}`);
                    if (detailsStr) {
                        try {
                            const saved = JSON.parse(detailsStr);
                            if (saved.preferredQuality && saved.preferredQuality !== 'Auto (ABR)') {
                                const matchedLvl = builtStreams.find(s => s.quality === saved.preferredQuality);
                                if (matchedLvl && matchedLvl.levelIndex >= 0) {
                                    hls.startLevel = matchedLvl.levelIndex; // Force initial load buffer to this level
                                    hls.nextLevel = matchedLvl.levelIndex;
                                    setCurrentQuality(matchedLvl.quality);
                                }
                            }
                        } catch (e) { }
                    }
                }
            });

            // Fallback for native HLS (e.g. Safari on iOS)
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamHlsUrl;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [streamHlsUrl]);

    const saveStateToStorage = (updates: any) => {
        if (!details?.movieId) return;
        const key = `hdrezka_state_${details.movieId}`;
        const existingStr = localStorage.getItem(key);
        let existing = {};
        try { if (existingStr) existing = JSON.parse(existingStr); } catch (e) { }

        const newValues = typeof updates === 'function' ? updates(existing) : updates;
        localStorage.setItem(key, JSON.stringify({ ...existing, ...newValues }));
    };

    const fetchDetails = async (movieUrl: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/details?url=${encodeURIComponent(movieUrl)}`);
            if (!res.ok) throw new Error('Failed to fetch details');
            const data = await res.json();
            setDetails(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load movie details.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStream = async (specificMovieId: string, translatorId: string, season?: string, episode?: string, action?: string) => {
        setStreamLoading(true);
        setStreamError('');
        // Persist params so the retry button can replay this exact call
        lastStreamParamsRef.current = { movieId: specificMovieId, translatorId, season, episode, action };
        try {
            let urlToFetch = `/api/stream?id=${specificMovieId}&translator_id=${translatorId}`;
            if (season && episode) {
                urlToFetch += `&season=${season}&episode=${episode}`;
            }
            if (action) {
                urlToFetch += `&action=${action}`;
            }
            if (url) {
                urlToFetch += `&referer_url=${encodeURIComponent(url)}`;
            }
            urlToFetch += `&_t=${Date.now()}`; // Cache buster
            const res = await fetch(urlToFetch);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();

            if (data.streams && data.streams.length > 0) {
                // Get preferred quality from local storage for this movie series
                const savedStateStr = localStorage.getItem(`hdrezka_state_${specificMovieId}`);
                let preferredQuality = '';
                try { if (savedStateStr) preferredQuality = JSON.parse(savedStateStr).preferredQuality; } catch (e) { }

                if (data.abrUrl) {
                    // 1. ABR IS AVAILABLE (Primary Strategy)
                    // We only load the Auto manifest initially. HLS.js will parse it and populate the UI dropdown naturally.
                    const initialStreams = [
                        { quality: 'Auto (ABR)', url: '', hlsUrl: data.abrUrl, isInternalHls: false }
                    ];

                    setStreams(initialStreams);
                    setStreamUrl('');
                    setStreamHlsUrl(data.abrUrl);
                    setCurrentQuality('Auto (ABR)');

                    // Note: We don't apply preferredQuality immediately here because HLS.js needs to download 
                    // the manifest first to know what internal variant IDs exist. It will be handled organically.

                } else {
                    // 2. NO ABR MANIFEST (Legacy MP4 Fallback)
                    // Find user's preferred, then 1080p, then 720p, or fallback to first
                    const idealStream =
                        (preferredQuality && data.streams.find((s: any) => s.quality === preferredQuality)) ||
                        data.streams.find((s: any) => s.quality === '1080p') ||
                        data.streams.find((s: any) => s.quality === '720p') ||
                        data.streams.find((s: any) => s.quality === '480p') ||
                        data.streams[0];

                    setStreams(data.streams);
                    setStreamUrl(idealStream.url?.trim() || '');
                    setStreamHlsUrl(idealStream.hlsUrl?.trim() || '');
                    setCurrentQuality(idealStream.quality);
                }

                // Update seasons/episodes if the stream response includes translator-specific data
                // We only update if the data is actually different or if we don't have seasons yet to avoid loops
                if (data.seasons && data.seasons.length > 0 && (!details.seasons || details.seasons.length === 0)) {
                    console.log('[Episodes] Updating from stream response:', data.seasons.length, 'seasons,', Object.keys(data.episodes || {}).length, 'episode groups');
                    setDetails((prev: any) => ({
                        ...prev,
                        seasons: data.seasons,
                        episodes: data.episodes || {},
                        isSeries: true,
                    }));

                    // Validate current season/episode still exist in the new list
                    const seasonExists = data.seasons.some((s: any) => s.id === season);
                    if (!seasonExists && data.seasons.length > 0) {
                        const firstSeason = data.seasons[0].id;
                        setSelectedSeason(firstSeason);
                        const firstEp = data.episodes?.[firstSeason]?.[0]?.id || '';
                        setSelectedEpisode(firstEp);
                        console.log('[Episodes] Season reset to:', firstSeason, 'ep:', firstEp);
                    } else if (season && data.episodes?.[season]) {
                        const episodeExists = data.episodes[season].some((e: any) => e.id === episode);
                        if (!episodeExists && data.episodes[season].length > 0) {
                            setSelectedEpisode(data.episodes[season][0].id);
                            console.log('[Episodes] Episode reset to:', data.episodes[season][0].id);
                        }
                    }
                } else {
                    console.log('[Episodes] No seasons data in response');
                }

                // Scroll to video if possible after setting URL
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 500);
            } else {
                setStreamError('No compatible streams found for this title.');
                setStreams([]);
                setStreamUrl('');
                setCurrentQuality('');
            }

        } catch (err: any) {
            console.error('[Stream] Fetch error:', err);
            setStreamError(err?.message || 'Failed to load stream. Please try again.');
        } finally {
            setStreamLoading(false);
        }
    };

    const handleTranslatorChange = (translator: any) => {
        const tId = translator.id || '';
        const mId = translator.movieId || details.movieId;
        setSelectedTranslatorId(tId);

        // Save current time before switching so we can resume from here
        const currentTime = videoRef.current?.currentTime || 0;
        saveStateToStorage((existing: any) => {
            const episodesTime = existing.episodesTime || {};
            if (details?.isSeries && selectedSeason && selectedEpisode) {
                episodesTime[`${selectedSeason}_${selectedEpisode}`] = currentTime;
            }
            return {
                translatorId: tId,
                currentTime,
                episodesTime
            };
        });

        // For series: use get_episodes to fetch translator-specific episode list
        // For movies: use get_movie — get_episodes will return nothing for plain movies
        if (details?.isSeries) {
            fetchStream(mId, tId, selectedSeason || undefined, selectedEpisode || undefined, 'get_episodes');
        } else {
            fetchStream(mId, tId, undefined, undefined, 'get_movie');
        }
        setShowQualities(false);
    };

    const handleSeasonChange = (seasonId: string) => {
        setSelectedSeason(seasonId);
        setEpisodePage(0);
        const firstEp = details.episodes?.[seasonId]?.[0]?.id || '';
        setSelectedEpisode(firstEp);
        saveStateToStorage((existing: any) => {
            const episodesTime = existing.episodesTime || {};
            if (firstEp) {
                episodesTime[`${seasonId}_${firstEp}`] = 0;
            }
            return { seasonId, episodeId: firstEp, episodesTime, currentTime: 0 };
        });
        fetchStream(details.movieId, selectedTranslatorId, seasonId, firstEp);
        setShowQualities(false);
    };

    const handleEpisodeChange = (episodeId: string) => {
        setSelectedEpisode(episodeId);
        saveStateToStorage((existing: any) => {
            const episodesTime = existing.episodesTime || {};
            if (selectedSeason) {
                episodesTime[`${selectedSeason}_${episodeId}`] = 0;
            }
            return { episodeId, episodesTime, currentTime: 0 };
        });
        fetchStream(details.movieId, selectedTranslatorId, selectedSeason, episodeId);
        setShowQualities(false);
    };

    const handleVideoEnded = () => {
        if (!details || !details.isSeries || !details.seasons || !details.episodes) return;

        const currentSeasonIndex = details.seasons.findIndex((s: any) => s.id === selectedSeason);
        if (currentSeasonIndex === -1) return;

        const episodesList = details.episodes[selectedSeason] || [];
        const currentEpisodeIndex = episodesList.findIndex((e: any) => e.id === selectedEpisode);
        if (currentEpisodeIndex === -1) return;

        // Has next episode in current season?
        if (currentEpisodeIndex + 1 < episodesList.length) {
            const nextEp = episodesList[currentEpisodeIndex + 1];
            handleEpisodeChange(nextEp.id);
        } else {
            // Check next season
            if (currentSeasonIndex + 1 < details.seasons.length) {
                const nextSeason = details.seasons[currentSeasonIndex + 1];
                handleSeasonChange(nextSeason.id);
            }
        }
        setShowNextEpisodeBtn(false);
    };

    // Keep refs in sync so the ABR interval always reads latest values without restarting
    useEffect(() => { currentQualityRef.current = currentQuality; }, [currentQuality]);
    useEffect(() => { streamsRef.current = streams; }, [streams]);

    // === Independent buffer health monitor (runs even when video is stalled) ===
    // Deps are ONLY the stream URLs — quality/streams changes are handled via refs above
    useEffect(() => {
        if (!streamUrl && !streamHlsUrl) return;

        // Reset counters when stream source changes
        lowBufferSinceRef.current = null;
        // Track whether we've seen a healthy buffer yet (avoids false positives right after stream load)
        let hasSeenHealthyBuffer = false;

        console.log(`[ABR] Monitor started — streamUrl: ${!!streamUrl}, hlsUrl: ${!!streamHlsUrl}`);

        const interval = setInterval(() => {
            const quality = currentQualityRef.current;
            const streamsList = streamsRef.current;

            if (quality === 'Auto (ABR)') return; // Let hls.js handle this natively

            const video = videoRef.current;
            if (!video) return;
            if (video.paused) return;
            if (!video.duration) return;
            if (video.currentTime < 3) return; // Give player time to fill buffer initially
            if (streamsList.length <= 1) return;

            // Calculate how many seconds of video are buffered ahead
            let bufferAhead = 0;
            for (let i = 0; i < video.buffered.length; i++) {
                if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) > video.currentTime) {
                    bufferAhead = video.buffered.end(i) - video.currentTime;
                }
            }

            // Don't start degradation logic until we've seen a healthy buffer at least once
            // This prevents downgrading immediately after stream load when buffer is still filling
            if (bufferAhead >= 5) {
                hasSeenHealthyBuffer = true;
            }

            if (!hasSeenHealthyBuffer) return;

            // If buffer is dangerously low (< 2 seconds ahead)
            if (bufferAhead < 2) {
                if (lowBufferSinceRef.current === null) {
                    console.log('[ABR] ⚠️ Buffer dropped below 2s — starting countdown');
                    lowBufferSinceRef.current = Date.now();
                } else if (Date.now() - lowBufferSinceRef.current > 8000) {
                    console.log(`[ABR] 🔻 Buffer critically low for 8s+, DOWNGRADING from ${quality}`);
                    lowBufferSinceRef.current = null;
                    hasSeenHealthyBuffer = false; // require re-stabilization after downgrade
                    downgradeQuality();
                }
            } else {
                lowBufferSinceRef.current = null;
            }
        }, 2000);

        return () => {
            console.log('[ABR] Monitor cleaned up');
            clearInterval(interval);
        };
    }, [streamUrl, streamHlsUrl]);

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        if (streamLoading) return; // Do not save old time while transitioning streams

        const video = videoRef.current;
        const currentTime = video.currentTime;
        const duration = video.duration;

        // Save time to localstorage periodically
        saveStateToStorage((existing: any) => {
            const episodesTime = existing.episodesTime || {};
            if (details?.isSeries && selectedSeason && selectedEpisode) {
                episodesTime[`${selectedSeason}_${selectedEpisode}`] = currentTime;
            }
            return {
                currentTime,
                episodesTime,
                seasonId: selectedSeason,
                episodeId: selectedEpisode,
                translatorId: selectedTranslatorId
            };
        });

        // Sync to SQLite Profile Server-side (throttled to once every 5 seconds)
        // if (!dbSyncTimeoutRef.current && details) {
        //     dbSyncTimeoutRef.current = setTimeout(() => {
        //         fetch('/api/watchlist', {
        //             method: 'POST',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 url,
        //                 title: details.title,
        //                 poster: details.poster,
        //                 type: 'watching', // automatically upgrade
        //                 status: {
        //                     seasonId: selectedSeason || undefined,
        //                     episodeId: selectedEpisode || undefined,
        //                     currentTime,
        //                     duration
        //                 }
        //             })
        //         });
        //         if (watchStatus !== 'watching') setWatchStatus('watching');
        //         dbSyncTimeoutRef.current = null;
        //     }, 5000);
        // }

        if (!details?.isSeries) return;

        const timeLeft = duration - currentTime;

        // Show button if within last 30 seconds and not already showing
        if (timeLeft <= 30 && timeLeft > 0) {
            if (!showNextEpisodeBtn) setShowNextEpisodeBtn(true);
        } else {
            if (showNextEpisodeBtn) setShowNextEpisodeBtn(false);
        }
    };

    const handleQualityChange = (stream: any, isAutomatic = false) => {
        setShowQualities(false);

        // If the selected stream item is an internal HLS segment configuration from the manifest
        if (stream.isInternalHls && hlsRef.current) {
            hlsRef.current.nextLevel = stream.levelIndex; // Gracefully switch segments without unloading the video
            setCurrentQuality(stream.quality);

            if (!isAutomatic) {
                saveStateToStorage({ preferredQuality: stream.quality });
            }
            return;
        }

        // Hard stream switch fallback (e.g. falling entirely out of ABR back to an MP4 url)
        const currentTime = videoRef.current?.currentTime || 0;
        const isPaused = videoRef.current?.paused;

        setStreamUrl(stream.url?.trim() || '');
        setStreamHlsUrl(stream.hlsUrl?.trim() || '');
        setCurrentQuality(stream.quality);

        if (!isAutomatic) {
            saveStateToStorage({ preferredQuality: stream.quality });
        }

        // Restore playback state after a short delay to allow video src to update
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.currentTime = currentTime;
                if (!isPaused) {
                    videoRef.current.play().catch(e => console.log('Resume prevented', e));
                }
            }
        }, 100);
    };

    const downgradeQuality = () => {
        if (streams.length <= 1) return;

        const currentResMatch = currentQuality.match(/(\d+)p/);
        if (!currentResMatch) return;
        const currentRes = parseInt(currentResMatch[1]);

        // Find the highest resolution that is strictly lower than currentRes
        let targetStream = null;
        let targetRes = -1;

        for (const s of streams) {
            const resMatch = s.quality.match(/(\d+)p/);
            if (resMatch) {
                const res = parseInt(resMatch[1]);
                if (res < currentRes && res > targetRes) {
                    targetRes = res;
                    targetStream = s;
                }
            }
        }

        if (targetStream) {
            handleQualityChange(targetStream, true);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="text-center py-20">
                <div className="text-red-500 bg-red-500/10 px-6 py-4 rounded-xl inline-block mb-4">
                    {error || 'Invalid URL'}
                </div>
                <div>
                    <Link href="/" className="text-gray-400 hover:text-white underline">
                        Back to Search
                    </Link>
                </div>
            </div>
        );
    }

    const toggleWatchList = async (type: string) => {
        if (!details || !url) return;
        const newType = watchStatus === type ? 'remove' : type;
        setWatchStatus(newType === 'remove' ? null : newType);

        await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                title: details.title,
                poster: details.poster,
                type: newType
            })
        });
    };

    return (
        <div className={`animate-in fade-in duration-500 ${theaterMode ? 'max-w-none' : 'max-w-6xl mx-auto px-4 md:px-0'}`}>
            <MovieHeader
                details={details}
                tmdbData={tmdbData}
                watchStatus={watchStatus}
                toggleWatchList={toggleWatchList}
                theaterMode={theaterMode}
            />

            <div className="mt-12 mb-8">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                    Watch Player
                </h2>
            </div>
            {details.translations && details.translations.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        {details.translations.map((t: any, i: number) => (
                            <button
                                key={i}
                                id={`translator-${t.id}`}
                                onClick={() => handleTranslatorChange(t)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border flex items-center justify-center gap-2 ${selectedTranslatorId === t.id
                                    ? 'bg-red-600 text-white border-red-500'
                                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                                    }`}
                            >
                                {t.name}
                                {t.flag && <img src={t.flag} alt={t.name} className="w-5 h-5 object-contain inline-block rounded-sm" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* TV Series Selection */}
            {details.isSeries && details.seasons && details.seasons.length > 0 && (
                <div className="mb-6 space-y-4">
                    {/* Seasons */}
                    <div className="flex flex-wrap gap-2">
                        {details.seasons.map((s: any) => (
                            <button
                                key={s.id}
                                onClick={() => handleSeasonChange(s.id)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${selectedSeason === s.id
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                                    }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>

                    {/* Episodes — paginated strip */}
                    {selectedSeason && details.episodes?.[selectedSeason] && (() => {
                        const PAGE_SIZE = 10;
                        const allEps: any[] = details.episodes[selectedSeason];
                        const totalPages = Math.ceil(allEps.length / PAGE_SIZE);
                        const page = Math.min(episodePage, totalPages - 1);
                        const pageEps = allEps.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
                        return (
                            <div className="flex items-center gap-2">
                                {/* Prev page button */}
                                <button
                                    onClick={() => setEpisodePage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {/* Episode buttons for this page */}
                                <div className="flex gap-1.5 overflow-hidden">
                                    {pageEps.map((e: any) => (
                                        <button
                                            key={e.id}
                                            onClick={() => { handleEpisodeChange(e.id); }}
                                            className={`shrink-0 w-20 h-10 text-xs font-medium rounded-lg transition-colors border flex items-center justify-center ${selectedEpisode === e.id
                                                ? 'bg-red-600 text-white border-red-500'
                                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                                                }`}
                                        >
                                            {e.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Next page button */}
                                <button
                                    onClick={() => setEpisodePage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                {/* Page indicator */}
                                {totalPages > 1 && (
                                    <span className="text-xs text-gray-500 shrink-0 pl-1">
                                        {page + 1} / {totalPages}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Player Container */}
            <div className={`mb-8 bg-black relative flex items-center justify-center group transition-all duration-300
                        ${theaterMode
                    ? 'fixed top-16 left-0 right-0 bottom-0 z-40 rounded-none border-0 shadow-none'
                    : 'w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-800 aspect-video'
                }`}>
                {/* Video element is ALWAYS mounted to preserve fullscreen, but hidden until source exists */}
                <video
                    ref={videoRef}
                    controls
                    autoPlay={!!(streamUrl || streamHlsUrl)}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleTimeUpdate}
                    className={`w-full h-full outline-none transition-opacity duration-500 ${(streamUrl || streamHlsUrl) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    src={!streamHlsUrl ? (streamUrl || undefined) : undefined}
                    controlsList="nodownload"
                    poster={details.poster}
                    data-movie-id={details.movieId}
                >
                    Your browser does not support the video tag.
                </video>

                {/* Loading Overlay (shown on top of video) */}
                {streamLoading && (
                    <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 animate-pulse">Loading Stream...</p>
                    </div>
                )}

                {/* Poster Fallback Overlay (when no stream loaded and no error) */}
                {!streamUrl && !streamHlsUrl && !streamLoading && !streamError && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        {details.poster && (
                            <img src={details.poster} alt="Poster fallback" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                        )}
                        <div className="text-gray-300 flex flex-col items-center relative z-10 bg-black/50 p-6 rounded-xl backdrop-blur-sm">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            <p>Select a translation to start watching</p>
                        </div>
                    </div>
                )}

                {/* Stream Error Retry Overlay */}
                {streamError && !streamLoading && (
                    <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center gap-5 animate-in fade-in duration-300">
                        {details.poster && (
                            <img src={details.poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />
                        )}
                        <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-semibold text-base mb-1">Stream unavailable</p>
                                <p className="text-gray-400 text-sm max-w-xs">{streamError}</p>
                            </div>
                            <button
                                onClick={() => {
                                    const p = lastStreamParamsRef.current;
                                    if (p) fetchStream(p.movieId, p.translatorId, p.season, p.episode, p.action);
                                }}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-100 active:scale-95 text-black text-sm font-bold rounded-xl transition-all shadow-lg"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Next Episode Overlay Button */}
                {showNextEpisodeBtn && details?.isSeries && (
                    <button
                        onClick={handleVideoEnded}
                        className="absolute bottom-20 right-8 z-30 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2 group animate-in slide-in-from-right-8 fade-in duration-300"
                    >
                        Next Episode
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>
                )}

                {/* Quality Selector Overlay */}
                {streams.length > 1 && (
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end">
                        <button
                            onClick={() => setShowQualities(!showQualities)}
                            className="bg-black/70 hover:bg-black/90 text-white backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-semibold border border-white/10 transition-all shadow-lg flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {currentQuality}
                        </button>

                        {showQualities && (
                            <div className="mt-2 bg-black/90 backdrop-blur-xl border border-gray-700/50 rounded-lg overflow-hidden flex flex-col w-32 shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200">
                                {streams.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleQualityChange(s)}
                                        className={`px-4 py-2 text-sm text-left transition-colors ${currentQuality === s.quality
                                            ? 'bg-red-600/20 text-red-400 font-bold border-l-2 border-red-500'
                                            : 'text-gray-300 hover:bg-gray-800 border-l-2 border-transparent hover:border-gray-500'
                                            }`}
                                    >
                                        {s.quality}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Theater Mode Toggle */}
                <button
                    onClick={() => setTheaterMode(t => !t)}
                    title={theaterMode ? 'Exit theater mode (Esc)' : 'Theater mode'}
                    className="absolute top-4 left-4 z-20 bg-black/70 hover:bg-black/90 text-white backdrop-blur-md p-1.5 rounded-lg border border-white/10 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                >
                    {theaterMode ? (
                        // Compress icon
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                        </svg>
                    ) : (
                        // Expand icon
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Spacer to push content below the fixed theater-mode player */}
            {theaterMode && <div style={{ height: 'calc(100vh - 4rem)' }} />}

            <MovieInfo
                details={details}
                tmdbData={tmdbData}
                schedule={details.schedule}
                tmdbNextEpisode={tmdbData?.nextEpisode}
                hdrezkaRelated={details.related}
                hdrezkaRecs={details.recommendations}
                tmdbRecs={tmdbData?.recommendations}
            />
        </div>
    );
}

export default function MoviePage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin"></div>
            </div>
        }>
            <MoviePageContent />
        </Suspense>
    );
}
