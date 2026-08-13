import { useState } from 'react';
import { Flag } from 'lucide-react';
import type { Player } from "../../types/game";

interface Props {
  players: Player[];
  myName: string;
}

export default function AgentRosterPanel({ players, myName }: Props) {
  const [suspects, setSuspects] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('cipher_suspects');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleSuspect = (playerId: string) => {
    setSuspects((prev) => {
      const newSuspects = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId];
      
      sessionStorage.setItem('cipher_suspects', JSON.stringify(newSuspects));
      return newSuspects;
    });
  };

  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-4">Agent Roster</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {players.map(p => {
          const isMe = p.name === myName;
          const isSuspect = suspects.includes(p.id);

          return (
            <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all group
              ${p.isOnTeam ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5'}
              ${isSuspect && !isMe ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5'}`}>
              
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border relative transition-colors
                  ${isSuspect && !isMe ? 'bg-rose-950 border-rose-500/50' : 'bg-slate-800 border-white/10'}`}>
                  {p.isLeader && <span className="absolute -top-2 text-sm">👑</span>}
                  <span className={`font-bold text-sm ${isSuspect && !isMe ? 'text-rose-400' : 'text-slate-400'}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${isSuspect && !isMe ? 'text-rose-300' : 'text-slate-300'}`}>
                    {p.name}
                  </span>
                  {p.isOnTeam && (
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-0.5">
                      Selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMe ? (
                  <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded uppercase tracking-widest border border-cyan-500/20">
                    You
                  </span>
                ) : (
                  <button
                    onClick={() => toggleSuspect(p.id)}
                    className={`p-2 rounded-lg border transition-all ${
                      isSuspect 
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                        : 'bg-black/40 border-white/10 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:border-rose-500/30 focus:opacity-100'
                    }`}
                    title={isSuspect ? "Clear Suspect Flag" : "Mark as Suspect"}
                  >
                    <Flag className={`w-4 h-4 ${isSuspect ? 'fill-rose-400/20' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}