import { useState, useEffect } from 'react';
import { PenTool } from 'lucide-react';

interface Props {
  gameId?: number;
  myName: string;
}

export default function PrivateNotepad({ gameId, myName }: Props) {
  const storageKey = `cipher_notes_${gameId}_${myName}`;
  
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(storageKey) || '';
  });

  useEffect(() => {
    if (gameId) {
      localStorage.setItem(storageKey, notes);
    }
  }, [notes, gameId, storageKey]);

  return (
    <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col h-[250px]">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
        <PenTool className="w-5 h-5 text-purple-400" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Private Intel Notes</h3>
      </div>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Document your deductions here. These notes are encrypted and only visible to you..."
        className="flex-grow w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none custom-scrollbar"
      />
    </div>
  );
}