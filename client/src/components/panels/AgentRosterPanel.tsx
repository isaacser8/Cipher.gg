interface Player {
  id: string;
  name: string;
  isLeader?: boolean;
  isOnTeam?: boolean;
}

interface Props {
  players: Player[];
  myName: string;
}

export default function AgentRosterPanel({ players, myName }: Props) {
  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-4">Agent Roster</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {players.map(p => (
          <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all
            ${p.isOnTeam ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 relative">
                {p.isLeader && <span className="absolute -top-2 text-sm">👑</span>}
                <span className="font-bold text-slate-400 text-sm">{p.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="font-bold text-sm text-slate-300">{p.name}</span>
              {p.name === myName && (
                <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded uppercase tracking-widest border border-cyan-500/20">You</span>
              )}
            </div>
            {p.isOnTeam && (
              <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded uppercase tracking-widest border border-indigo-500/20">Selected</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}