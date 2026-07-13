import CipherGuideModal from '../components/guides/CipherGuideModal';
import BeginnerTutorial from '../components/tutorial/BeginnerTutorial';
import { useTutorialFlow } from '../components/tutorial/useTutorialFlow';
import { lobbyTutorialSteps } from '../components/tutorial/tutorialSteps';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/useSocket';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Copy, Share, Send, UserCircle, LogOut, Check } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

interface Player {
  id: string;
  name: string;
  isHost: boolean; 
  isReady: boolean; 
}

export default function Lobby() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { socket } = useSocket(); 
  
  const sanitizeAlias = (value: string) =>
    value.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 15);
  const resolvedName = sanitizeAlias(location.state?.displayName || '');
  const clerkId = location.state?.clerkId || user?.id || null;
  const myName = resolvedName || 'Unknown Agent';
  const action = location.state?.action || 'join';

  const [players, setPlayers] = useState<Player[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [amIHost, setAmIHost] = useState(false);
  const [teamSize, setTeamSize] = useState(10);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const {
    hasCompletedTutorial,
    runTutorial,
    tutorialStep,
    currentStep,
    totalSteps,
    startTutorial,
    handleNextTutorialStep,
    handlePreviousTutorialStep,
    handleSkipTutorial,
  } = useTutorialFlow({
    key: 'lobby',
    steps: lobbyTutorialSteps,
    shouldAutoStart: Boolean(resolvedName),
  });

  const [showCipherGuide, setShowCipherGuide] = useState(false);

  useEffect(() => {
    if (!socket || !isLoaded || !resolvedName) return;

    socket.emit('join_room', {
      roomCode: roomCode,
      displayName: myName,
      action: action,
      clerkId,
    });

    socket.on('room_error', (errorMessage) => {
      alert(errorMessage);
      navigate('/');
    });

    socket.on('settings_update', (settings) => {
      setTeamSize(settings.teamSize);
    });

    socket.on('roster_update', (updatedPlayers: Player[]) => {
      const me = updatedPlayers.find((p) => p.name === myName);
      if (me) {
        setAmIHost(me.isHost);
        setIsReady(me.isReady);
      }
      const others = updatedPlayers.filter((p) => p.name !== myName);
      setPlayers(others);
    });

    socket.on('chat_history', (pastLogs: string[]) => {
      setSystemLogs([...pastLogs, `[SYS]: Agent ${myName} have breached the firewall.`]); 
    });

    socket.on('player_joined', (data) => {
      if (data.user !== myName) {
        setSystemLogs((prev) => [...prev, `[SYS]: Agent ${data.user} has joined.`]);
      }
    });

    socket.on('player_left', (data) => {
      setSystemLogs((prev) => [...prev, `[SYS]: Agent ${data.name} has disconnected.`]);
    });

    socket.on('player_ready_log', (data) => {
      const statusText = data.isReady ? 'is READY.' : 'has returned to standby.';
      setSystemLogs((prev) => [...prev, `[SYS]: Agent ${data.name} ${statusText}`]);
    });

    socket.on('receive_message', (data) => {
      setSystemLogs((prev) => [...prev, data.text]);
    });

    socket.on('disconnect', () => {
      setSystemLogs((prev) => [...prev, `[CRITICAL]: Connection lost. Re-establishing...`]);
    });

    const handleReconnect = () => {
      socket.emit('join_room', {
        roomCode: roomCode,
        displayName: myName,
        action: action,
        clerkId,
      });
      setSystemLogs((prev) => [...prev, `[SYS]: Connection re-established.`]);
    };

    socket.io.on('reconnect', handleReconnect);

    socket.on('game_started', () => {
      navigate(`/game/${roomCode}`, {
        state: { displayName: myName }
      });
    });

    return () => {
      socket.off('room_error');
      socket.off('settings_update');
      socket.off('roster_update');
      socket.off('chat_history');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_ready_log');
      socket.off('receive_message');
      socket.off('disconnect');
      socket.io.off('reconnect', handleReconnect);
      socket.off('game_started');
    };
  }, [socket, isLoaded, resolvedName, myName, navigate, roomCode, action, clerkId]);

  useEffect(() => {
    if (socket) {
      socket.emit('status_update', { roomCode, isReady });
    }
  }, [isReady, socket, roomCode]); 

  useEffect(() => {
    if (!isLoaded) return;
    if (!resolvedName) {
      navigate('/', { state: { redirectedFrom: roomCode } });
    }
  }, [isLoaded, resolvedName, navigate, roomCode]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000); 
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Cipher.gg',
      text: `Join my Cipher.gg lobby! Room Code: ${roomCode}`,
      url: window.location.href, 
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share aborted:', err);
      }
    } else {
      handleCopy(); 
      alert(`Room code ${roomCode} copied to clipboard!`);
    }
  };

  const handleLeaveLobby = () => {
    if (socket) {
      socket.emit('leave_room', { roomCode, name: myName }); 
    }
    navigate('/'); 
  };

  const handleTeamSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    if (socket && amIHost) {
      socket.emit('change_settings', { roomCode, teamSize: newSize });
    }
  };

  const handleSendMessage = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault(); 
    if (chatInput.trim() && socket) {
      socket.emit('send_message', {
        roomCode,
        message: chatInput,
        sender: myName 
      });
      setChatInput(''); 
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full bg-[#0A0D14] flex items-center justify-center">
        <p className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse uppercase">
          Establishing Secure Connection...
        </p>
      </div>
    );
  }

  if (!resolvedName) {
    return (
      <div className="min-h-screen w-full bg-[#0A0D14] flex items-center justify-center">
        <p className="text-purple-400 font-mono text-sm tracking-widest animate-pulse uppercase">
          Rerouting to Firewall...
        </p>
      </div>
    );
  }

  const isEveryoneReady = isReady && players.every(p => p.isReady);
  const isLobbyFull = (players.length + 1) === teamSize;
  const canStartGame = isEveryoneReady && isLobbyFull;

  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-x-hidden flex flex-col p-4 md:p-8">
      <BeginnerTutorial
        isOpen={runTutorial}
        step={tutorialStep}
        totalSteps={totalSteps}
        title={currentStep.title}
        content={currentStep.content}
        targetId={currentStep.targetId}
        onNext={handleNextTutorialStep}
        onBack={handlePreviousTutorialStep}
        onSkip={handleSkipTutorial}
      />

    <CipherGuideModal
      isOpen={showCipherGuide}
      onClose={() => setShowCipherGuide(false)}
    />

      {/* Background Glows */}
      <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* --- Navigation Bar --- */}
      <header className="relative z-10 w-full max-w-[1200px] mx-auto flex items-center justify-between mb-3 pb-4 border-b border-white/5">
        <button 
            onClick={handleLeaveLobby} 
            className="flex items-center gap-3 hover:opacity-75 transition-opacity cursor-pointer focus:outline-none"
        >
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight">cipher<span className="text-cyan-400">.gg</span></h1>
        </button>
        
        <h2 className="text-lg font-bold tracking-widest uppercase text-slate-300 absolute left-1/2 -translate-x-1/2 hidden md:block">
            Game Lobby
        </h2>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-[#11151C] py-2 px-4 rounded-full border border-white/10">
            <UserCircle className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-bold text-white">{myName}</span>
          </div>

          <button 
            onClick={handleLeaveLobby}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full transition-all duration-300 group shadow-lg"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Abort</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto flex justify-end gap-3 mb-6">
        <button
          type="button"
          onClick={startTutorial}
          className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-cyan-300 transition-colors"
        >
          Replay Tutorial
        </button>

        <button
          type="button"
          onClick={() => setShowCipherGuide(true)}
          className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-purple-300 transition-colors"
        >
          How to Play
        </button>
      </div>

      {/* --- MAIN GRID --- */}
      <motion.div 
        data-tutorial="lobby-main"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow"
      >
        
        {/* === Room Info & Roster === */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Room Info Box */}
          <div 
            data-tutorial="lobby-room-code"
            className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl"
          >
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Room Code:</h3>
            <div className="flex items-center justify-between mb-6">
              <span className="text-4xl font-black tracking-widest">{roomCode}</span>
              <div className="flex gap-2">
                <div className="flex gap-2">
                  <button 
                    onClick={handleCopy} 
                    className="bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/10 transition-colors"
                  >
                    {hasCopied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/10 transition-colors"
                  >
                    <Share className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status:</p>
                <p className="text-sm font-bold text-cyan-400 uppercase">Preparing</p>
              </div>
            </div>
          </div>

          {/* People in the Lobby Box */}
          <div 
            data-tutorial="lobby-roster"
            className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col"
          >
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
              <span>Agents</span>
              {amIHost ? (
                <select 
                  value={teamSize}
                  onChange={handleTeamSizeChange}
                  className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-cyan-400 text-[10px] font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {[5, 6, 7, 8, 9, 10].map(size => (
                    <option key={size} value={size}>Max {size} Agents</option>
                  ))}
                </select>
              ) : (
                <span className="text-cyan-400">{players.length + 1} / {teamSize}</span>
              )}
            </h3>

            <ul className="space-y-3 overflow-y-auto flex-grow custom-scrollbar">

              {/* YOU */}
              <li className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-colors ${isReady ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-sm text-white truncate">{myName}</span>
                  {amIHost && <span className="flex-shrink-0 text-[9px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-500/20">Host</span>}
                </div>

                <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${isReady ? 'text-cyan-400 border border-cyan-400/30' : 'text-slate-500 border border-slate-700'}`}>
                  {isReady ? 'Ready' : 'Not Ready'}
                </span>
              </li>

              {/* PLAYERS */}
              <AnimatePresence>
                {players.map((p) => (
                  <motion.li key={p.id} variants={itemVariants} initial="hidden" animate="show" exit="hidden" 
                    className={`bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between transition-colors ${p.isReady ? 'bg-cyan-900/20 border-cyan-500/30' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                          <UserCircle className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="font-bold text-sm text-slate-300">{p.name}</span>
        
                        {/* Adds Host Tag if they are the host */}
                        {p.isHost && <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-500/20">Host</span>}
                      </div>
      
                      {/* Changes styling based on if they are actually ready */}
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${p.isReady ? 'text-cyan-400 border border-cyan-400/30' : 'text-slate-500 border border-slate-700'}`}>
                        {p.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>

        </div>

        {/* === Logs & Action === */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
        {/* Main Log & Chat Window */}
        <div 
          data-tutorial="lobby-chat"
          className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col relative overflow-hidden"
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-4">
            Session Log
          </h3>
            
          {/* System Logs */}
          <div className="flex-grow overflow-y-auto space-y-2 mb-4 custom-scrollbar text-sm font-mono text-slate-300">
            <p className="opacity-50">[{new Date().toLocaleTimeString('en-US', { hour12: false })}] Cipher Firewall established.</p>
            {systemLogs.map((log, i) => (
              <motion.p initial={{opacity: 0, x: -5}} animate={{opacity: 1, x: 0}} key={i}>
                {log}
              </motion.p>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="relative mt-auto">
            <input 
              type="text" 
              placeholder="Comms Input..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end items-center gap-6">
          <div className="text-right">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
              Lobby Capacity ({players.length + 1}/{teamSize})
            </p>
          </div>
             
          {/* THE HOST 'START GAME' BUTTON */}
          {amIHost && (
            <button 
              onClick={() => {
                if (socket) socket.emit('start_game', { roomCode });
              }}
              disabled={!canStartGame}
              className={`px-8 py-4 border rounded-full font-black uppercase tracking-widest transition-all shadow-lg
                ${!canStartGame 
                  ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                }`}
            >
              {!isLobbyFull 
                ? 'Awaiting Agents...' 
                : (!isEveryoneReady ? 'Awaiting Ready...' : 'Start Game')
              }
            </button>
          )}
             
             {/* READY BUTTON */}
          <button 
            data-tutorial="ready-button"
            onClick={() => {
              if (!hasCompletedTutorial) return;
              setIsReady(!isReady);
            }}
            disabled={!hasCompletedTutorial}
            className={`px-12 py-4 rounded-full font-black uppercase tracking-widest shadow-2xl transition-all duration-300 transform ${
              !hasCompletedTutorial
                ? 'bg-slate-800/50 text-slate-600 border border-slate-700 cursor-not-allowed'
                : isReady 
                  ? 'bg-slate-800 text-slate-400 border border-white/10 hover:scale-105 active:scale-95' 
                  : 'bg-gradient-to-r from-[#A855F7] to-[#06B6D4] text-white shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95'
            }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-lg">
                {!hasCompletedTutorial ? 'Skip Tutorial' : isReady ? 'Unready' : 'Ready Up'}
              </span>
            </div>
          </button>
        </div>

        </div>
      </motion.div>
    </div>
  );
}