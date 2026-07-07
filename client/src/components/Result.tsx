import { motion } from 'framer-motion';
import { Crown, Skull, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../types/game'; 

interface ResultProps {
  winner: 'good' | 'evil' | 'abandoned'| null | undefined;
  questsWon: { good: number; evil: number } | undefined;
  roomCode: string;
  myName: string;
  players?: Player[];
  winReason?: string;
}

export default function Result({ 
  winner, 
  questsWon, 
  roomCode, 
  myName, 
  players = [], 
  winReason 
}: ResultProps) {
  const navigate = useNavigate();

  const isGoodWin = winner === 'good';
  const isEvilWin = winner === 'evil';
  const isAbandoned = winner === 'abandoned';

  const isAssassination = 
    isEvilWin && 
    (winReason?.toLowerCase().includes('assassin') || 
    winReason?.toLowerCase().includes('merlin'));

  const resultTheme = isAbandoned
    ? {
        glow: 'bg-amber-500',
        border: 'border-amber-500/50',
        shadow: 'shadow-[0_0_80px_rgba(245,158,11,0.2)]',
        icon: 'text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]',
        titleGradient: 'from-amber-300 to-orange-500',
        subtitle: 'text-amber-300/90',
      }
    : isGoodWin
      ? {
          glow: 'bg-emerald-500',
          border: 'border-emerald-500/50',
          shadow: 'shadow-[0_0_80px_rgba(16,185,129,0.2)]',
          icon: 'text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]',
          titleGradient: 'from-emerald-400 to-cyan-400',
          subtitle: 'text-emerald-400/90',
        }
      : {
          glow: 'bg-rose-500',
          border: 'border-rose-500/50',
          shadow: 'shadow-[0_0_80px_rgba(244,63,94,0.2)]',
          icon: 'text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]',
          titleGradient: 'from-rose-500 to-purple-500',
          subtitle: 'text-rose-400/90',
        };

  const resultTitle = isAbandoned
    ? 'Match Abandoned'
    : isGoodWin
      ? 'Resistance Victorious'
      : isAssassination
        ? 'Merlin Assassinated'
        : 'Resistance Compromised';

  const resultSubtitle = isAbandoned
    ? winReason || 'A player disconnected and did not return in time.'
    : isGoodWin
      ? winReason || 'The firewall holds.'
      : winReason || 'The system is compromised.';
  
  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-hidden flex items-center justify-center p-4">
      {/* Cinematic Background Glows */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none opacity-20 ${resultTheme.glow}`} 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`relative z-10 p-8 md:p-16 rounded-3xl border shadow-2xl flex flex-col justify-center items-center text-center max-w-3xl w-full bg-[#11151C]/90 ${resultTheme.border} ${resultTheme.shadow}`}
      >
        
        {/* Dynamic Header */}
        <div className="flex flex-col items-center gap-4 mb-8 text-center">
          {isAbandoned ? (
            <AlertTriangle className={`w-20 h-20 ${resultTheme.icon}`} />
          ) : isGoodWin ? (
            <Crown className={`w-20 h-20 ${resultTheme.icon}`} />
          ) : (
            <Skull className={`w-20 h-20 ${resultTheme.icon}`} />
          )}

          <h1
            className={`text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${resultTheme.titleGradient} uppercase tracking-widest drop-shadow-xl text-center`}
          >
            {resultTitle}
          </h1>

          <p
            className={`${resultTheme.subtitle} font-bold tracking-widest uppercase px-4 text-center max-w-2xl`}
          >
            {resultSubtitle}
          </p>
        </div>

        {/* SCORE BOARD */}
        <div className="flex gap-12 my-8 p-6 rounded-2xl bg-black/40 border border-white/5">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-400">
              {questsWon?.good ?? 0}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              Nodes Secured
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-rose-400">
              {questsWon?.evil ?? 0}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              Nodes Compromised
            </p>
          </div>
        </div>

        {/* DECLASSIFIED ROSTER */}
        <div className="w-full mb-8">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2 text-left">
            Declassified Identities
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
            {players.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  p.team === 'good'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-slate-300 text-sm">{p.name}</p>
                    {p.name === myName && (
                      <span className="text-[8px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                        You
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-[10px] uppercase tracking-widest font-black ${
                      p.team === 'good' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {p.role || 'Unknown'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RETURN BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => 
            navigate(`/lobby/${roomCode}`, { 
              state: { displayName: myName, action: 'rejoin' }, 
            })
          }
          className="w-full md:w-auto px-12 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-black uppercase tracking-widest transition-colors shadow-xl"
        >
          Return to Lobby
        </motion.button>
      </motion.div>
    </div>
  );
}