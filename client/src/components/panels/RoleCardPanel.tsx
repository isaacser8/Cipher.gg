import { Eye } from 'lucide-react';
import type { MyRole } from "../../types/game";

interface Props {
  myRole: MyRole;
}

export default function RoleCardPanel({ myRole }: Props) {
  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.05)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px]" />
      <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Classified Identity</h3>
      <h2 className="text-3xl font-black tracking-wider uppercase text-white mb-2">{myRole.role}</h2>
      <span className={`inline-block text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest mb-4 border
        ${myRole.team === 'good' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : myRole.team === 'evil' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
        Alignment: {myRole.team || 'Unknown'}
      </span>

      {myRole.specialInfo.length > 0 && (
        <div className="bg-black/40 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Intel Acquired</span>
          </div>
          <ul className="space-y-2">
            {myRole.specialInfo.map((info, i) => (
              <li key={i} className="text-sm font-medium bg-white/5 px-3 py-2 rounded border border-rose-500/20 text-rose-200 flex justify-between items-center">
                <span>Agent {info.id}</span>
                <span className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                  {info.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}