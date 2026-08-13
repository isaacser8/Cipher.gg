import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Player, QuestRecord } from '../../types/game';

interface NodeDebriefModalProps {
  selectedNodeHistory: QuestRecord | null;
  setSelectedNodeHistory: (record: QuestRecord | null) => void;
  players: Player[];
}

export default function NodeDebriefModal({ 
  selectedNodeHistory, 
  setSelectedNodeHistory, 
  players 
}: NodeDebriefModalProps) {
  const isPending = selectedNodeHistory?.succeeded === undefined;

  return (
    <AnimatePresence>
      {selectedNodeHistory && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A0D14]/90 backdrop-blur-sm"
          onClick={() => setSelectedNodeHistory(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl relative overflow-hidden backdrop-blur-xl transition-colors
              ${isPending
                ? 'bg-amber-950/30 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]'
                : selectedNodeHistory.succeeded
                  ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)]'
                  : 'bg-rose-950/30 border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)]'
            }`}
            >

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-200">
                Node {selectedNodeHistory.questNumber} Debrief
              </h2>
              <button onClick={() => setSelectedNodeHistory(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Leader & Result */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Mission Leader</p>
                  <p className="font-bold text-cyan-400">👑 {selectedNodeHistory.leader.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Status</p>
                  <p
                    className={`font-black uppercase tracking-widest ${
                      isPending
                        ? 'text-amber-400'
                        : selectedNodeHistory.succeeded
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {isPending ? 'Pending' : selectedNodeHistory.succeeded ? 'Secured' : 'Compromised'}
                  </p>
                </div>
              </div>

              {/* Execution Results */}
              <div className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="flex-1 text-center">
                  <p className="text-3xl font-black text-emerald-400">{selectedNodeHistory.successCount ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Success</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-3xl font-black text-rose-400">{selectedNodeHistory.failCount ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Sabotage</p>
                </div>
              </div>

              {/* Team Votes */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Team Deployment Vote History
                </p>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(selectedNodeHistory.teamVoteHistory || [
                    {
                      attemptNumber: 1,
                      questNumber: selectedNodeHistory.questNumber,
                      leader: selectedNodeHistory.leader,
                      proposedTeam: selectedNodeHistory.team,
                      votes: selectedNodeHistory.teamVotes || {},
                      approvals: Object.values(selectedNodeHistory.teamVotes || {}).filter(
                        (vote) => vote === 'approve',
                      ).length,
                      rejections: Object.values(selectedNodeHistory.teamVotes || {}).filter(
                        (vote) => vote === 'reject',
                      ).length,
                      approved: true,
                      rejected: false,
                    },
                  ]).map((attempt) => (
                    <div
                      key={attempt.attemptNumber}
                      className={`p-3 rounded-xl border ${
                        attempt.approved
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Attempt {attempt.attemptNumber}
                          </p>
                          <p className="text-xs font-bold text-cyan-400">
                            👑 {attempt.leader?.name || 'Unknown'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              attempt.approved ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {attempt.approved ? 'Approved' : 'Rejected'}
                          </p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                            {attempt.approvals ?? 0} Approve / {attempt.rejections ?? 0} Reject
                          </p>
                        </div>
                      </div>

                      <div className="mb-3 p-2 rounded-lg bg-black/30 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                          Proposed Team
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {attempt.proposedTeam
                            .map((playerId) => players.find((p) => p.id === playerId)?.name || 'Unknown')
                            .join(', ')}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(attempt.votes || {}).map(([voterId, vote]) => {
                          const voterName = players.find((p) => p.id === voterId)?.name || 'Unknown';
                          const isOnTeam = attempt.proposedTeam.includes(voterId);

                          return (
                            <div 
                              key={`${attempt.attemptNumber}-${voterId}`}
                              className={`flex justify-between items-center p-2.5 rounded-lg border transition-colors ${
                                vote === 'approve' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                                  : 'bg-rose-500/10 border-rose-500/20'
                              }`}
                            >
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                {voterName} 
                                {isOnTeam && (
                                  <span 
                                    className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" 
                                    title="Proposed on Team" 
                                  />
                                )}
                              </span>

                              <span 
                                className={`text-[10px] font-black uppercase ${
                                  vote === 'approve' ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {vote === 'approve' ? 'Approve' : 'Reject'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}