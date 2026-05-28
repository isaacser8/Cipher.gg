import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface Props {
  players: any[];
  proposedTeam: string[];
  hasVoted: boolean;
  handleVote: (vote: 'approve' | 'reject') => void;
}

export default function TeamVotingPanel({ players, proposedTeam, hasVoted, handleVote }: Props) {
  const proposedNames = players.filter(p => (proposedTeam ?? []).includes(p.id)).map(p => p.name);
  
  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col justify-center gap-4">
      <div className="text-center mb-2">
        <p className="text-sm font-bold text-slate-300">Authorize Deployment?</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Proposed team</p>
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          {proposedNames.map(n => (
            <span key={n} className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded uppercase tracking-widest border border-indigo-500/20">
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <motion.button
          onClick={() => handleVote('reject')}
          disabled={hasVoted}
          whileHover={{ scale: hasVoted ? 1 : 1.02 }}
          whileTap={{ scale: hasVoted ? 1 : 0.98 }}
          className={`flex-1 py-4 border rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
            ${hasVoted
              ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'}`}
        >
          <X className="w-5 h-5" /> {hasVoted ? 'Locked' : 'Reject'}
        </motion.button>
        <motion.button
          onClick={() => handleVote('approve')}
          disabled={hasVoted}
          whileHover={{ scale: hasVoted ? 1 : 1.02 }}
          whileTap={{ scale: hasVoted ? 1 : 0.98 }}
          className={`flex-1 py-4 border rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
            ${hasVoted
              ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}
        >
          <Check className="w-5 h-5" /> {hasVoted ? 'Locked' : 'Approve'}
        </motion.button>
      </div>
    </div>
  );
}