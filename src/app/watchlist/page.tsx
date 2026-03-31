import db from '@/lib/db';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const revalidate = 0; // Opt out of static caching for full dynamic DB reads

export default async function WatchlistPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('active_profile_id')?.value || 'default-zorg';

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <span className="text-6xl">🤔</span>
              <h1 className="text-2xl font-bold">Profile Not Found</h1>
              <p className="text-gray-400">Please select an active profile from the top right menu.</p>
          </div>
      );
  }

  const items = db.prepare('SELECT * FROM watchlist WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[];
  
  const parseStatus = (statusStr: string) => {
      try { return JSON.parse(statusStr); } catch { return null; }
  }

  const watching = items.filter(i => i.type === 'watching').map(i => ({...i, statusObj: parseStatus(i.status)}));
  const planToWatch = items.filter(i => i.type === 'plan_to_watch').map(i => ({...i, statusObj: parseStatus(i.status)}));

  const renderGrid = (list: any[], emptyMessage: string) => {
    if (list.length === 0) {
      return <div className="text-center py-16 text-gray-600 border border-dashed border-gray-800 rounded-2xl">{emptyMessage}</div>;
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {list.map(item => (
          <Link 
            href={`/movie?url=${encodeURIComponent(item.url)}`} 
            key={item.id}
            className="group flex flex-col bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800 hover:border-red-500/50 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-500/10"
          >
            <div className="relative aspect-[2/3] w-full bg-gray-800">
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" loading="lazy" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                    <span>No Image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent opacity-90 group-hover:opacity-60 transition-opacity" />
              
              {item.statusObj && (
                  <div className="absolute bottom-3 left-3 right-3">
                      {item.statusObj.seasonId && item.statusObj.episodeId ? (
                          <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Up Next</span>
                              <span className="bg-red-600/90 text-white text-xs font-bold px-2 py-1.5 rounded-lg backdrop-blur shadow inline-flex w-fit">
                                  {item.statusObj.seasonId.replace('season', 'S')}{item.statusObj.episodeId.replace('episode', 'E')}
                              </span>
                          </div>
                      ) : item.statusObj.currentTime ? (
                          <div className="w-full bg-gray-800/80 h-1.5 rounded-full mt-2 overflow-hidden shadow-sm backdrop-blur">
                              {/* Simple visual proxy for progress without complex durations */}
                              <div className="bg-red-500 h-full w-1/2"></div>
                          </div>
                      ) : null}
                  </div>
              )}
            </div>
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-100 group-hover:text-red-400 transition-colors line-clamp-2">
                {item.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700 flex flex-col gap-12 pb-20">
      
      {/* Header */}
      <div className="flex items-end justify-between border-b border-gray-800 pb-6 pt-4">
         <div className="flex items-center gap-4">
             <div className="text-4xl bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-700 shadow-xl">{user.icon}</div>
             <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-tight">
                {user.name}'s List
                </h1>
                <p className="text-sm text-gray-500 mt-1">{items.length} titles saved</p>
             </div>
         </div>
      </div>

      {/* Sections */}
      <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h2 className="text-2xl font-bold tracking-tight">Currently Watching</h2>
          </div>
          {renderGrid(watching, "You aren't currently tracking any series or movies.")}
      </section>

      <section className="flex flex-col gap-6 mt-8">
          <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              <h2 className="text-2xl font-bold tracking-tight">Plan to Watch</h2>
          </div>
          {renderGrid(planToWatch, "Your watchlist is empty. Find something to watch in the catalog!")}
      </section>

    </div>
  );
}
