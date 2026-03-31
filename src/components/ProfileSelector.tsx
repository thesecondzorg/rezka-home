'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export function ProfileSelector() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('😎');

  const ICONS = ['😎', '🦸‍♀️', '🥷', '🧑‍🚀', '🧛‍♂️', '🧜‍♀️', '🧙‍♂️'];

  useEffect(() => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        if(data.profiles) {
          setProfiles(data.profiles);
          const currentCookie = Cookies.get('active_profile_id');
          if (currentCookie) {
             setActiveProfileId(currentCookie);
          } else if (data.profiles.length > 0) {
             // Default to first profile if none selected
             setActiveProfileId(data.profiles[0].id);
             Cookies.set('active_profile_id', data.profiles[0].id, { expires: 365 });
          }
        }
      });
  }, []);

  const selectProfile = (id: string) => {
    Cookies.set('active_profile_id', id, { expires: 365 });
    setActiveProfileId(id);
    setIsOpen(false);
    // Refresh to update server-side fetches (like My List)
    router.refresh();
  };

  const createProfile = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, icon: newIcon })
    });
    const data = await res.json();
    if (data.success) {
       setProfiles([...profiles, data.profile]);
       selectProfile(data.profile.id);
       setIsCreating(false);
       setNewName('');
    }
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  if (!activeProfile) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-gray-800/80 px-2 sm:px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-gray-700 focus:outline-none"
      >
        <span className="text-xl bg-gray-800 w-8 h-8 rounded-full flex items-center justify-center border border-gray-700 shadow-sm">{activeProfile.icon}</span>
        <span className="text-sm font-semibold hidden sm:block truncate max-w-[100px]">{activeProfile.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] shadow-red-500/5 ring-1 ring-white/10 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Switch Profile</div>
          
          <div className="flex flex-col gap-2 mb-4 max-h-48 overflow-y-auto pr-1">
            {profiles.map(p => (
              <button 
                key={p.id}
                onClick={() => selectProfile(p.id)}
                className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors ${activeProfileId === p.id ? 'bg-red-600/10 border-red-500/50 border text-white' : 'hover:bg-gray-800 text-gray-300 border border-transparent'}`}
              >
                <span className="text-xl w-8 h-8 flex items-center justify-center bg-gray-800 shadow-inner border border-gray-700 rounded-full">{p.icon}</span>
                <span className="font-medium flex-1 truncate">{p.name}</span>
                {activeProfileId === p.id && (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </button>
            ))}
          </div>

          {!isCreating ? (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full py-2 border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-900 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Add Profile
            </button>
          ) : (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <input 
                type="text" 
                placeholder="Name" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                className="bg-gray-950 border border-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500 text-white w-full"
              />
              <div className="flex gap-2 flex-wrap justify-between">
                {ICONS.slice(0, 5).map(icon => (
                   <button 
                     key={icon} 
                     onClick={() => setNewIcon(icon)}
                     className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all ${newIcon === icon ? 'bg-gray-800 border-2 border-red-500 shadow-sm' : 'hover:bg-gray-800 border-2 border-transparent'}`}
                   >
                     {icon}
                   </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={createProfile} className="flex-1 bg-white text-black text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors shadow-sm">Save</button>
                <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
