import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ResultProps {
  winner: 'good' | 'evil' | null | undefined;
  questsWon: { good: number; evil: number } | undefined;
  roomCode: string;
  myName: string;
}

export default function Result({ winner, questsWon, roomCode, myName }: ResultProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-hidden flex items-center justify-center p-4">
      {/* Cinematic Background Glows */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none opacity-20
        ${winner === 'good' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`relative z-10 p-12 md:p-24 rounded-3xl border shadow-2xl flex flex-col justify-center items-center gap-6 text-center max-w-2xl w-full
          ${winner === 'good'
            ? 'bg-[#11151C]/90 border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.2)]'
            : 'bg-[#11151C]/90 border-rose-500/50 shadow-[0_0_80px_rgba(244,63,94,0.2)]'}`}
      >
        <Crown className={`w-24 h-24 mb-4 ${winner === 'good' ? 'text-emerald-400' : 'text-rose-400'}`} />
        
        <h2 className="text-5xl md:text-6xl font-black tracking-widest uppercase text-white drop-shadow-lg">
          {winner === 'good' ? 'Arthur Prevails' : 'Mordred Triumphs'}
        </h2>
        
        <p className={`text-xl font-bold uppercase tracking-widest ${winner === 'good' ? 'text-emerald-400' : 'text-rose-400'}`}>
          Mission Terminated
        </p>

        <div className="flex gap-8 my-8">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-400">{questsWon?.good ?? 0}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Nodes Secured</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-rose-400">{questsWon?.evil ?? 0}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Nodes Compromised</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(`/lobby/${roomCode}`, { state: { displayName: myName, action: 'rejoin' } })}
          className="mt-4 px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-black uppercase tracking-widest transition-colors shadow-xl"
        >
          Return to Lobby
        </motion.button>
      </motion.div>
    </div>
  );
}