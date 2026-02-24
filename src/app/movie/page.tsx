'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';


export default function MoviePage() {
    const searchParams = useSearchParams();
    const url = searchParams.get('url');

    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [streamUrl, setStreamUrl] = useState('');
    const [streams, setStreams] = useState<any[]>([]);
    const [currentQuality, setCurrentQuality] = useState<string>('');
    const [streamLoading, setStreamLoading] = useState(false);
    const [showQualities, setShowQualities] = useState(false);
    const [selectedTranslatorId, setSelectedTranslatorId] = useState<string>('');
    const [selectedSeason, setSelectedSeason] = useState<string>('');
    const [selectedEpisode, setSelectedEpisode] = useState<string>('');
    const [showNextEpisodeBtn, setShowNextEpisodeBtn] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (url) {
            fetchDetails(url);
        }
    }, [url]);

    useEffect(() => {
        if (details && details.translations && !streamLoading && !streamUrl) { // Only auto-set if we haven't already
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
    }, [details]);

    // Handle restoring video time after stream loads
    useEffect(() => {
        if (streamUrl && videoRef.current && details?.movieId) {
            const savedStateStr = localStorage.getItem(`hdrezka_state_${details.movieId}`);
            if (savedStateStr) {
                try {
                    const savedState = JSON.parse(savedStateStr);
                    // Only restore time if it's for the currently selected season/episode (or movie)
                    const isSameContext = details.isSeries
                        ? (savedState.seasonId === selectedSeason && savedState.episodeId === selectedEpisode)
                        : true;

                    if (isSameContext && savedState.currentTime > 0) {
                        videoRef.current.currentTime = savedState.currentTime;
                    }
                } catch (e) { }
            }
        }
    }, [streamUrl]);

    const saveStateToStorage = (updates: any) => {
        if (!details?.movieId) return;
        const key = `hdrezka_state_${details.movieId}`;
        const existingStr = localStorage.getItem(key);
        let existing = {};
        try { if (existingStr) existing = JSON.parse(existingStr); } catch (e) { }

        localStorage.setItem(key, JSON.stringify({ ...existing, ...updates }));
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

    const fetchStream = async (specificMovieId: string, translatorId: string, season?: string, episode?: string) => {
        setStreamLoading(true);
        try {
            let urlToFetch = `/api/stream?id=${specificMovieId}&translator_id=${translatorId}`;
            if (season && episode) {
                urlToFetch += `&season=${season}&episode=${episode}`;
            }
            const res = await fetch(urlToFetch);
            if (!res.ok) throw new Error('Stream fetch failed');
            const data = await res.json();

            if (data.streams && data.streams.length > 0) {
                // Get preferred quality from local storage for this movie series
                const savedStateStr = localStorage.getItem(`hdrezka_state_${specificMovieId}`);
                let preferredQuality = '';
                try { if (savedStateStr) preferredQuality = JSON.parse(savedStateStr).preferredQuality; } catch (e) { }

                // Find user's preferred, then 1080p, then 720p, or fallback to first
                const idealStream =
                    (preferredQuality && data.streams.find((s: any) => s.quality === preferredQuality)) ||
                    data.streams.find((s: any) => s.quality === '1080p') ||
                    data.streams.find((s: any) => s.quality === '720p') ||
                    data.streams.find((s: any) => s.quality === '480p') ||
                    data.streams[0];

                setStreams(data.streams);
                setStreamUrl(idealStream.url.trim());
                setCurrentQuality(idealStream.quality);

                // Scroll to video if possible after setting URL
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 500);
            } else {
                alert('No compatible streams found.');
                setStreams([]);
                setStreamUrl('');
                setCurrentQuality('');
            }

        } catch (err) {
            console.error(err);
            setError('An error occurred while fetching the stream.');
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
        saveStateToStorage({ translatorId: tId, currentTime });

        fetchStream(mId, tId, selectedSeason, selectedEpisode);
        setShowQualities(false);
    };

    const handleSeasonChange = (seasonId: string) => {
        setSelectedSeason(seasonId);
        const firstEp = details.episodes?.[seasonId]?.[0]?.id || '';
        setSelectedEpisode(firstEp);
        saveStateToStorage({ seasonId, episodeId: firstEp, currentTime: 0 });
        fetchStream(details.movieId, selectedTranslatorId, seasonId, firstEp);
        setShowQualities(false);
    };

    const handleEpisodeChange = (episodeId: string) => {
        setSelectedEpisode(episodeId);
        saveStateToStorage({ episodeId, currentTime: 0 });
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

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const currentTime = video.currentTime;
        const duration = video.duration;

        // Save time to localstorage periodically
        saveStateToStorage({
            currentTime,
            seasonId: selectedSeason,
            episodeId: selectedEpisode,
            translatorId: selectedTranslatorId
        });

        if (!details?.isSeries) return;

        const timeLeft = duration - currentTime;

        // Show button if within last 30 seconds and not already showing
        if (timeLeft <= 30 && timeLeft > 0) {
            if (!showNextEpisodeBtn) setShowNextEpisodeBtn(true);
        } else {
            if (showNextEpisodeBtn) setShowNextEpisodeBtn(false);
        }
    };

    const handleQualityChange = (stream: any) => {
        const currentTime = videoRef.current?.currentTime || 0;
        const isPaused = videoRef.current?.paused;

        setStreamUrl(stream.url.trim());
        setCurrentQuality(stream.quality);
        setShowQualities(false);
        saveStateToStorage({ preferredQuality: stream.quality });

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

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Search
            </Link>

            <div className="mb-12">
                <div className="w-full flex flex-col">
                    <div className="mb-6">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">{details.title}</h1>
                        {details.origTitle && <p className="text-xl text-gray-400 font-medium">{details.origTitle}</p>}
                    </div>

                    {/* Translations */}
                    {details.translations && details.translations.length > 0 && (
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                                {details.translations.map((t: any, i: number) => (
                                    <button
                                        key={i}
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

                            {/* Episodes */}
                            {selectedSeason && details.episodes?.[selectedSeason] && (
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-900/50 rounded-lg border border-gray-800/50">
                                    {details.episodes[selectedSeason].map((e: any) => (
                                        <button
                                            key={e.id}
                                            onClick={() => handleEpisodeChange(e.id)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${selectedEpisode === e.id
                                                ? 'bg-red-600 text-white border-red-500'
                                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                                                }`}
                                        >
                                            {e.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Player Container */}
                    <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 relative aspect-video flex items-center justify-center group">
                        {streamLoading ? (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-400 animate-pulse">Loading Stream...</p>
                            </div>
                        ) : streamUrl ? (
                            <>
                                <video
                                    ref={videoRef}
                                    controls
                                    autoPlay
                                    onEnded={handleVideoEnded}
                                    onTimeUpdate={handleTimeUpdate}
                                    className="w-full h-full outline-none"
                                    src={streamUrl}
                                    controlsList="nodownload"
                                    poster={details.poster}
                                >
                                    Your browser does not support the video tag.
                                </video>

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
                            </>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {details.poster && (
                                    <img src={details.poster} alt="Poster fallback" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                                )}
                                <div className="text-gray-300 flex flex-col items-center relative z-10 bg-black/50 p-6 rounded-xl backdrop-blur-sm">
                                    <svg className="w-16 h-16 mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                    <p className="font-semibold text-lg">Select a translation to watch</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Movie details */}
            <div className="bg-gray-900/30 rounded-2xl border border-gray-800 p-6 md:p-8">
                <div className="prose prose-invert prose-p:text-gray-300 max-w-none mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">About this title</h2>
                    <p className="text-lg leading-relaxed">{details.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-800">
                    {Object.entries(details.info || {}).slice(0, 8).map(([key, value]) => (
                        <div key={key} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800/50">
                            <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">{key}</span>
                            <span className="text-sm text-gray-200">{value as string}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
