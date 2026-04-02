// Static TMDB metadata — no API calls needed

export const MOVIE_GENRES = [
  { id: 28,    label: 'Action' },
  { id: 12,    label: 'Adventure' },
  { id: 16,    label: 'Animation' },
  { id: 35,    label: 'Comedy' },
  { id: 80,    label: 'Crime' },
  { id: 99,    label: 'Documentary' },
  { id: 18,    label: 'Drama' },
  { id: 10751, label: 'Family' },
  { id: 14,    label: 'Fantasy' },
  { id: 36,    label: 'History' },
  { id: 27,    label: 'Horror' },
  { id: 10402, label: 'Music' },
  { id: 9648,  label: 'Mystery' },
  { id: 10749, label: 'Romance' },
  { id: 878,   label: 'Sci-Fi' },
  { id: 53,    label: 'Thriller' },
  { id: 10752, label: 'War' },
  { id: 37,    label: 'Western' },
];

export const TV_GENRES = [
  { id: 10759, label: 'Action & Adventure' },
  { id: 16,    label: 'Animation' },
  { id: 35,    label: 'Comedy' },
  { id: 80,    label: 'Crime' },
  { id: 99,    label: 'Documentary' },
  { id: 18,    label: 'Drama' },
  { id: 10751, label: 'Family' },
  { id: 10762, label: 'Kids' },
  { id: 9648,  label: 'Mystery' },
  { id: 10765, label: 'Sci-Fi & Fantasy' },
  { id: 10768, label: 'War & Politics' },
  { id: 37,    label: 'Western' },
];

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'tr', label: 'Turkish' },
  { code: 'hi', label: 'Hindi' },
  { code: 'da', label: 'Danish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'nl', label: 'Dutch' },
];

export const COUNTRIES = [
  { code: 'US', label: 'USA' },
  { code: 'GB', label: 'UK' },
  { code: 'KR', label: 'South Korea' },
  { code: 'JP', label: 'Japan' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'CN', label: 'China' },
  { code: 'IN', label: 'India' },
  { code: 'DK', label: 'Denmark' },
  { code: 'SE', label: 'Sweden' },
  { code: 'RU', label: 'Russia' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
];

// TMDB Discover supports sorting natively — 3 options × 2 directions
export const SORT_OPTIONS = [
  {
    key: 'popularity',
    label: 'Popularity',
    desc: 'popularity.desc',
    asc:  'popularity.asc',
  },
  {
    key: 'rating',
    label: 'Rating',
    desc: 'vote_average.desc',
    asc:  'vote_average.asc',
  },
  {
    // For TV, the route maps release_date → first_air_date automatically
    key: 'date',
    label: 'Date',
    desc: 'release_date.desc',
    asc:  'release_date.asc',
  },
];

export type SortDir = 'neutral' | 'desc' | 'asc';

export interface SortState {
  key: string;
  dir: SortDir;
}

export interface TmdbResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  poster: string | null;
  year: string;
  rating: number | null;
  overview: string;
  genreIds: number[];
  type: 'movie' | 'tv';
}
