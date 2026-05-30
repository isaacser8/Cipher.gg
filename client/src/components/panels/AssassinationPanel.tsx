import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  myRole: any;
  players: any[];
  myName: string;
  sniperTarget: string | null;
  setSniperTarget: (id: string) => void;
  handleAssassination: () => void;
}

export default function AssassinationPanel({ myRole, players, myName, sniperTarget, setSniperTarget, handleAssassination }: Props) {
  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)] flex-grow flex flex-col gap-4">
      {myRole.role === 'Assassin' ? (
        <>
          <div className="text-center mb-2">
            <p className="text-lg font-black text-rose-400 uppercase tracking-widest">Execute Target</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Identify and eliminate Merlin</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {players.filter(p => p.name !== myName).map(p => (
              <button
                key={p.id}
                onClick={() => setSniperTarget(p.id)}
                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                  sniperTarget === p.id
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:border-rose-500/30 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <motion.button
            onClick={handleAssassination}
            disabled={!sniperTarget}
            whileHover={{ scale: sniperTarget ? 1.02 : 1 }}
            whileTap={{ scale: sniperTarget ? 0.98 : 1 }}
            className={`w-full py-4 border rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-auto
              ${!sniperTarget
                ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.4)]'}`}
          >
            Confirm Kill
          </motion.button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
          <p className="text-lg font-black text-rose-400 uppercase tracking-widest">Critical Threat</p>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-2 max-w-[250px]">
            The Assassin has breached the firewall and is hunting Merlin. Await the outcome.
          </p>
        </div>
      )}
    </div>
  );
}