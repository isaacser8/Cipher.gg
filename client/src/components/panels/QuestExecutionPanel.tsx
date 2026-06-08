import { motion } from 'framer-motion';
import { Check, X, Clock } from 'lucide-react';
import type { MyRole } from '../../types/game'; 

interface Props {
  amIOnTeam: boolean;
  currentQuest: number;
  hasQuestVoted: boolean;
  myRole: MyRole;
  handleQuestVote: (vote: 'success' | 'fail') => void;
}

export default function QuestExecutionPanel({ amIOnTeam, currentQuest, hasQuestVoted, myRole, handleQuestVote }: Props) {
  if (amIOnTeam) {
    return (
      <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-indigo-500/30 shadow-xl flex-grow flex flex-col justify-center gap-4">
        <div className="text-center mb-2">
          <p className="text-sm font-bold text-indigo-300">Execute Node {currentQuest}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            Your vote is anonymous
          </p>
        </div>
        <div className="flex gap-4">
          <motion.button
            onClick={() => handleQuestVote('success')}
            disabled={hasQuestVoted}
            whileHover={{ scale: hasQuestVoted ? 1 : 1.02 }}
            whileTap={{ scale: hasQuestVoted ? 1 : 0.98 }}
            className={`flex-1 py-4 border rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
              ${hasQuestVoted
                ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}
          >
            <Check className="w-5 h-5" /> {hasQuestVoted ? 'Submitted' : 'Success'}
          </motion.button>
          
          {myRole.team === 'evil' && (
            <motion.button
              onClick={() => handleQuestVote('fail')}
              disabled={hasQuestVoted}
              whileHover={{ scale: hasQuestVoted ? 1 : 1.02 }}
              whileTap={{ scale: hasQuestVoted ? 1 : 0.98 }}
              className={`flex-1 py-4 border rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                ${hasQuestVoted
                  ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'}`}
            >
              <X className="w-5 h-5" /> Sabotage
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col items-center justify-center gap-3 text-center">
      <Clock className="w-10 h-10 text-indigo-400 animate-pulse" />
      <p className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Mission in Progress</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-[200px]">
        Deployed agents are executing the mission. Await results.
      </p>
    </div>
  );
}
