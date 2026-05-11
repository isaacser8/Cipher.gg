import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, User as UserIcon, Lock } from 'lucide-react';
import { useUser, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export default function Home() {
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    if (isSignedIn && user) {
      setDisplayName(user.firstName || user.username || "Verified Agent");
    }
  }, [isSignedIn, user]);

  const handleJoin = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!displayName || !roomCode) return;
    navigate(`/lobby/${roomCode.toUpperCase()}`, { state: { displayName } });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#05070A] font-sans text-white relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none select-none" />
      <div className="absolute top-1/3 left-10 text-[400px] font-black text-white/[0.02] rotate-12 pointer-events-none select-none">X</div>
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/4 -right-10 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[550px] px-6">
        
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold tracking-tighter">cipher<span className="text-cyan-400">.gg</span></h1>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative">
          
          {/* --- CLERK: SIGNED IN VIEW --- */}
          <SignedIn>
            <div className="mb-8 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10' } }} />
                <div>
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Agent Verified</p>
                  <p className="text-sm font-bold text-white">{user?.firstName || 'Unknown'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Link</p>
                <p className="text-[10px] text-emerald-400 font-mono animate-pulse">● SYNCHRONIZED</p>
              </div>
            </div>
          </SignedIn>

          {/* --- CLERK: GUEST VIEW --- */}
          <SignedOut>
            <div className="mb-8">
              <SignInButton mode="modal">
                <button className="w-full bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 py-3 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all text-slate-400 hover:text-white mb-4">
                  LINK IDENTITY TO SAVE PROGRESS
                </button>
              </SignInButton>
              <div className="flex items-center gap-4 px-2">
                <div className="h-[1px] bg-white/5 flex-grow" />
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Or Continue as Guest</span>
                <div className="h-[1px] bg-white/5 flex-grow" />
              </div>
            </div>
          </SignedOut>

          {/* --- Details Form --- */}
          <form onSubmit={handleJoin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">{isSignedIn ? 'Current Alias' : 'Guest Alias'}</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">room code</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="enter 6-digit code"
                  value={roomCode}
                  maxLength={6}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 uppercase tracking-widest..."
                />
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(6, 182, 212, 0.4)" }} whileTap={{ scale: 0.98 }} className="w-full mt-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all">
              JOIN <ArrowRight className="w-5 h-5" />
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}