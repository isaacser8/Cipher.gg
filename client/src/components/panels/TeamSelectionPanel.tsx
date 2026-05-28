import { motion } from 'framer-motion';
import { Swords, Clock } from 'lucide-react';

interface Props {
  players: any[];
  amILeader: boolean;
  currentLeader: any;
  currentQuest: number;
  requiredTeamSize: number;
  selectedTeam: string[];
  togglePlayerSelection: (id: string) => void;
  handleProposeTeam: () => void;
}

export default function TeamSelectionPanel({ players, amILeader, currentLeader, currentQuest, requiredTeamSize, selectedTeam, togglePlayerSelection, handleProposeTeam }: Props) {
  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-cyan-500/20 shadow-xl flex-grow flex flex-col gap-4">
      <div className="text-center mb-2">
        <p className="text-sm font-bold text-cyan-300">
          {amILeader ? '⚡ You are the Leader' : `${currentLeader?.name ?? '—'} is selecting a team`}
        </p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
          Select {requiredTeamSize} agents for Node {currentQuest}
        </p>
      </div>

      {amILeader ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {players.map(p => {
              const selected = selectedTeam.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayerSelection(p.id)}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <motion.button
            onClick={handleProposeTeam}
            disabled={selectedTeam.length !== requiredTeamSize}
            whileHover={{ scale: selectedTeam.length === requiredTeamSize ? 1.02 : 1 }}
            whileTap={{ scale: selectedTeam.length === requiredTeamSize ? 0.98 : 1 }}
            className={`w-full py-4 border rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-auto
              ${selectedTeam.length !== requiredTeamSize
                ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
              }`}
          >
            <Swords className="w-4 h-4" />
            Deploy Team ({selectedTeam.length}/{requiredTeamSize})
          </motion.button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-grow text-center py-8 gap-3">
          <Clock className="w-10 h-10 text-cyan-500/50 animate-pulse" />
          <p className="text-xs text-slate-500 uppercase tracking-widest max-w-[200px]">
            Awaiting leader's team proposal. Discuss in chat.
          </p>
        </div>
      )}
    </div>
  );
}