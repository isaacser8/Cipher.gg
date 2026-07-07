import BeginnerTutorial from '../components/tutorial/BeginnerTutorial';
import { useTutorialFlow } from '../components/tutorial/useTutorialFlow';
import { homeTutorialSteps } from '../components/tutorial/tutorialSteps';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, User as UserIcon, Lock, Plus, LogIn, HelpCircle } from 'lucide-react';
import { useUser, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useSocket } from '../context/useSocket';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSignedIn } = useUser();
  const { socket } = useSocket();
  const hasAutoFilledAlias = useRef(false);

  const [mode, setMode] = useState<'join' | 'host'>('join');
  const [roomCode, setRoomCode] = useState(
    location.state?.redirectedFrom || sessionStorage.getItem('pendingRoomCode') || ''
  );

  const sanitizeAlias = (value: string) =>
    value.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 15);

  const clerkName = sanitizeAlias(
    (isSignedIn && user
      ? user.firstName || user.fullName || user.primaryEmailAddress?.emailAddress || ''
      : '') ?? '',
  );

  const [displayName, setDisplayName] = useState(clerkName);

  const {
    runTutorial,
    tutorialStep,
    currentStep,
    totalSteps,
    startTutorial,
    handleNextTutorialStep,
    handlePreviousTutorialStep,
  } = useTutorialFlow({
    key: 'home',
    steps: homeTutorialSteps,
    shouldAutoStart: isSignedIn,
  });

  useEffect(() => {
    if (location.state?.redirectedFrom) {
      sessionStorage.setItem('pendingRoomCode', location.state.redirectedFrom);
    }
  }, [location.state]);

  useEffect(() => {
    if (socket) {
      socket.emit('return_to_base');
    }
  }, [socket]);

  useEffect(() => {
    if (!hasAutoFilledAlias.current && clerkName) {
      setDisplayName(clerkName);
      hasAutoFilledAlias.current = true;
    }
  }, [clerkName]);

  const generateSecureCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const randomArray = new Uint8Array(6);
    crypto.getRandomValues(randomArray);
    for (let i = 0; i < 6; i++) {
      result += chars[randomArray[i] % chars.length];
    }
    return result;
  };

  const handleAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!displayName) return;

    if (mode === 'host') {
      const newRoomCode = generateSecureCode();
      navigate(`/lobby/${newRoomCode}`, {
        state: { displayName, action: 'host', clerkId: user?.id  },
      });
    } else {
      if (!roomCode) return;
      navigate(`/lobby/${roomCode}`, {
        state: { displayName, action: 'join', clerkId: user?.id  },
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#05070A] font-sans text-white relative overflow-x-hidden">
      <BeginnerTutorial
        isOpen={runTutorial}
        step={tutorialStep}
        totalSteps={totalSteps}
        title={currentStep.title}
        content={currentStep.content}
        targetId={currentStep.targetId}
        onNext={handleNextTutorialStep}
        onBack={handlePreviousTutorialStep}
      />

      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/4 -right-10 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[550px] px-6">

        <div className="text-center mb-10">
          <h1 style={{ fontFamily: 'Orbitron, sans-serif' }} className="uppercase text-4xl sm:text-6xl font-bold tracking-widest">
            cipher<span className="text-cyan-400">.gg</span>
          </h1>
        </div>

        <div 
          data-tutorial="home-card"
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative"
        >

          {/* --- CLERK AUTHENTICATION --- */}
          <SignedIn>
            <div className="mb-8 space-y-3">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-between">
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

              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 py-3 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all text-cyan-300 hover:text-white"
              >
                VIEW AGENT PROFILE
              </button>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="mb-8">
              <SignInButton mode="modal">
                <button className="w-full bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-white/10 border border-white/10 py-3 rounded-xl text-[10px] font-bold tracking-[0.2em] transition-all text-slate-400 hover:text-white mb-4">
                  LINK ACCOUNT TO SAVE PROGRESS
                </button>
              </SignInButton>
            </div>
          </SignedOut>

          {/* --- MODE TOGGLE TABS --- */}
          <div 
            data-tutorial="mode-tabs"
            className="flex bg-black/40 rounded-2xl p-1 mb-8 border border-white/10"
          >
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'join' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LogIn className="w-4 h-4" /> Join Session
            </button>
            <button
              type="button"
              onClick={() => setMode('host')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'host' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Plus className="w-4 h-4" /> Host New
            </button>
          </div>

          {/* --- CORE FORM --- */}
          <form onSubmit={handleAction} className="space-y-6 relative z-10">

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1">{isSignedIn ? 'Current Alias' : 'Display Name'}</label>
              <div className="space-y-2">
                <div 
                  data-tutorial="alias-input"
                  className="h-16 flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl px-4 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all group"
                >
                  <UserIcon className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors flex-shrink-0" />

                  <input
                    type="text"
                    placeholder="ENTER YOUR NAME"
                    value={displayName}
                    maxLength={15}
                    onChange={(e) => {
                      setDisplayName(sanitizeAlias(e.target.value));
                    }}
                    className="flex-1 bg-transparent outline-none tracking-widest text-white text-lg leading-none"
                  />
                </div>

                <p className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                  {displayName.length}/15 characters
                </p>
              </div>
            </div>

            {/* Room Code */}
            {mode === 'join' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
                <label className="text-sm font-medium text-slate-400 ml-1">Room Code</label>
                <div data-tutorial="room-code-input" className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="enter 6-digit code"
                    value={roomCode}
                    maxLength={6}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all uppercase tracking-widest text-white"
                  />
                </div>
              </motion.div>
            )}

            <motion.button
              data-tutorial="start-session-button"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`tracking-widest w-full mt-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all ${mode === 'host' ? 'bg-gradient-to-r from-emerald-600 to-cyan-500' : 'bg-gradient-to-r from-purple-600 to-blue-600'}`}
            >
              {mode === 'host' ? 'START SESSION' : 'JOIN SESSION'} <ArrowRight className="w-5 h-5" />
            </motion.button>
          </form>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={startTutorial}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 hover:text-cyan-300 transition-colors flex items-center gap-2"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Replay Tutorial
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
