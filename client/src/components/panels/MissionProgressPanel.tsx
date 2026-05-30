import { type QuestRecord } from '../../types/game';

interface Props {
  questsWon?: { good: number; evil: number };
  votesRejected: number;
  currentQuest: number;
  questHistory?: QuestRecord[]; 
  setSelectedNodeHistory: (record: QuestRecord | null) => void; 
}

export default function MissionProgressPanel({ questsWon, votesRejected, currentQuest, questHistory, setSelectedNodeHistory }: Props) {  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mission Progress</h3>
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="text-emerald-400">{questsWon?.good ?? 0} Secured</span>
          <span className="text-rose-400">{questsWon?.evil ?? 0} Compromised</span>
          <span className={`${votesRejected >= 4 ? 'text-red-400' : 'text-amber-400'}`}>
            ⚠ Rejected: {votesRejected}/5
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center px-4">
        {[1, 2, 3, 4, 5].map(q => {
          const pastQuest = questHistory?.find(h => h.questNumber === q);
          const isSuccess = pastQuest?.succeeded;

          return (
            <div 
              key={q} 
              onClick={() => pastQuest && setSelectedNodeHistory(pastQuest)}
              className={`flex flex-col items-center gap-2 ${pastQuest ? 'cursor-pointer hover:scale-110 transition-transform' : currentQuest === q ? '' : 'opacity-50'}`}
            >
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all
                ${currentQuest === q 
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                  : currentQuest > q 
                    ? (isSuccess 
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' 
                        : 'border-rose-500 bg-rose-500/20 text-rose-400')
                    : 'border-slate-800 bg-slate-900 text-slate-600'}`}>
                {q}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Node {q}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}