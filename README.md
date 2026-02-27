# 🎬 HDRezka Frontend

A clean, ad-free streaming frontend for HDRezka built with Next.js. Search for movies and TV series, browse details with multiple Ukrainian/Russian audio translations, and watch with adaptive quality — all through a modern dark-themed UI.

## Features

- 🔍 **Search** — Find movies and series by title
- 🎭 **Multiple translations** — Switch between voice-over tracks (Ukrainian, Russian, etc.)
- 📺 **Video player** — HLS streaming with adaptive bitrate fallback
- 📋 **Episode navigation** — Season/episode picker with per-translator episode lists
- ⏩ **Seamless playback** — Episode switching without leaving fullscreen
- 💾 **Persistent state** — Playback position, quality, and translator saved between sessions
- 🚫 **No ads** — Clean, distraction-free viewing

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm (comes with Node.js)

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/thesecondzorg/rezka-home
cd rezka-home

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

```bash
# Build for production
npm run build

# Start the production server
npm start
```

## Project Structure

```
rezka-home/
├── src/app/
│   ├── page.tsx              # Home page with search
│   ├── movie/page.tsx        # Movie/series player page
│   ├── layout.tsx            # Root layout (dark theme)
│   ├── globals.css           # Global styles
│   └── api/
│       ├── search/route.ts   # Search proxy → HDRezka search
│       ├── details/route.ts  # Details proxy → scrapes movie page
│       └── stream/route.ts   # Stream proxy → fetches video URLs
├── package.json
└── README.md
```

## How It Works

The app acts as a proxy layer between your browser and HDRezka:

1. **Search** (`/api/search`) — Fetches HDRezka's search page and parses results with Cheerio
2. **Details** (`/api/details`) — Scrapes a movie page for title, poster, translations, seasons, and episodes
3. **Stream** (`/api/stream`) — Makes AJAX requests to HDRezka's CDN endpoint to get video stream URLs (HLS + MP4)

Your browser never contacts HDRezka directly — all requests go through the Next.js server.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| HTML Parsing | Cheerio |
| Video | hls.js, native `<video>` |
| Language | TypeScript |

## License

This project is for personal/educational use only.
