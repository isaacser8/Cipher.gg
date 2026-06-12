import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

interface MyRole {
  role: string;
  team: string;
  specialInfo?: { id: string; name: string }[]; 
}

interface Props {
  showRoleReveal: boolean;
  setShowRoleReveal: (show: boolean) => void;
  myRole: MyRole;
  socket: any; 
  roomCode: string;
}

export default function RoleRevealModal({ showRoleReveal, setShowRoleReveal, myRole, socket, roomCode }: Props) {
  return (
    <AnimatePresence>
      {showRoleReveal && myRole.role !== 'Awaiting Intel...' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0A0D14]/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className={`max-w-md w-full p-8 rounded-3xl border shadow-2xl text-center relative overflow-hidden
              ${myRole.team === 'good'
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.2)]'
                : 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_80px_rgba(244,63,94,0.2)]'}`}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-[60px] opacity-20 pointer-events-none"
              style={{ backgroundColor: myRole.team === 'good' ? '#10b981' : '#f43f5e' }} />
            <div className="relative z-10">
              <Shield className={`w-16 h-16 mx-auto mb-6 ${myRole.team === 'good' ? 'text-emerald-400' : 'text-rose-400'}`} />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Classified Intel Received</h2>
              <h1 className="text-5xl font-black tracking-widest uppercase text-white mb-2">{myRole.role}</h1>
              <p className={`text-sm font-bold uppercase tracking-widest mb-8 ${myRole.team === 'good' ? 'text-emerald-400' : 'text-rose-400'}`}>
                Alignment: {myRole.team === 'good' ? 'Forces of Arthur' : 'Minions of Mordred'}
              </p>
              <button
                onClick={() => {
                  setShowRoleReveal(false);
                  if (socket) {
                    socket.emit('confirm_role', { roomCode });
                  }
                }}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all
                  ${myRole.team === 'good'
                    ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-500 text-rose-950 hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'}`}
              >
                Acknowledge Directive
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}