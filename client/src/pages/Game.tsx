import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crown, AlertTriangle, Check, X, Eye } from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

interface Player {
  id: string;
  name: string;
  isLeader?: boolean;
  isOnTeam?: boolean;
}

interface Intel {
  id: string;
  name: string;
}

export default function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const myName = location.state?.displayName || 'Unknown Agent';
  const { socket } = useSocket();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuest, setCurrentQuest] = useState(1);
  const [votesRejected, setVotesRejected] = useState(0);
  const [phase, setPhase] = useState('LOADING_DIRECTIVES');
  const [hasVoted, setHasVoted] = useState(false);
  const [sniperTarget, setSniperTarget] = useState<string | null>(null);
  const [winner, setWinner] = useState<'good' | 'evil' | null>(null); 
  const [myRole, setMyRole] = useState({
    role: 'Awaiting Intel...',
    team: 'unknown',
    specialInfo: [] as Intel[] 
  });
  const [showRoleReveal, setShowRoleReveal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_game_dashboard', { roomCode, name: myName });

    socket.on('role_assigned', (roleData) => {
      setMyRole(roleData);
      setShowRoleReveal(true);
    });

    socket.on('game_state_update', (gameState) => {
      setPlayers(gameState.players);
      setCurrentQuest(gameState.currentQuest);
      setVotesRejected(gameState.votesRejected);

      setPhase((prevPhase) => {
        if (gameState.phase !== prevPhase) {
          setHasVoted(false);
        }
        return gameState.phase;
      });

      if (gameState.winner) {
        setWinner(gameState.winner);
      }
    });

    return () => {
      socket.off('role_assigned');
      socket.off('game_state_update');
    };
  }, [socket, roomCode, myName]);

  const handleVote = (voteType: 'approve' | 'reject') => {
    if (!socket || hasVoted) return;
    socket.emit('submit_vote', { roomCode, myName, vote: voteType });
    setHasVoted(true);
  };

   const handleAssassination = () => {
    if (!socket || !sniperTarget) return;
    
    socket.emit('submit_assassination', { roomCode, targetId: sniperTarget });
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-hidden flex flex-col p-4 md:p-8">
      
      {/* Background */}
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* --- CLASSIFIED ROLE REVEAL MODAL (PASTE HERE!) --- */}
      <AnimatePresence>
        {showRoleReveal && myRole.role !== 'Awaiting Intel...' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`max-w-md w-full p-8 rounded-3xl border shadow-2xl text-center relative overflow-hidden
                ${myRole.team === 'good'
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_80px_rgba(244,63,94,0.2)]'
                }`}
            >
              {/* Background glows */}
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
                  onClick={() => setShowRoleReveal(false)}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all
                    ${myRole.team === 'good'
                      ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : 'bg-rose-500 text-rose-950 hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    }`}
                >
                  Acknowledge Directive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Header & Phase Banner --- */}
      <header className="relative z-10 w-full max-w-[1200px] mx-auto flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight">cipher<span className="text-cyan-400">.gg</span></h1>
        </div>
        
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
            <h2 className="text-lg font-black tracking-widest uppercase text-cyan-400 animate-pulse">
                {phase.replace('_', ' ')}
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Awaiting Directives</p>
        </div>
      </header>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        
        {/* === LEFT COLUMN: Roster & Quest Tracker === */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top: Quest Status Bar */}
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mission Progress</h3>
                <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${votesRejected >= 4 ? 'text-red-500' : 'text-amber-500'}`} />
                    <span className="text-xs font-bold text-slate-400">Rejected Teams: <span className="text-white">{votesRejected}/5</span></span>
                </div>
            </div>
            
            <div className="flex justify-between items-center px-4">
                {[1, 2, 3, 4, 5].map((quest) => (
                    <div key={quest} className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all
                            ${currentQuest === quest ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 
                              currentQuest > quest ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 
                              'border-slate-800 bg-slate-900 text-slate-600'}`}>
                            {quest}
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Node {quest}</span>
                    </div>
                ))}
            </div>
          </div>

          {/* Bottom: Live Roster */}
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-4">Agent Roster</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((p: Player) => (
                    <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all
                        ${p.isOnTeam ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 relative">
                                {p.isLeader && (
                                    <Crown className="w-4 h-4 text-amber-400 absolute -top-2" />
                                )}
                                <span className="font-bold text-slate-400 text-sm">{p.name.charAt(0)}</span>
                            </div>
                            <span className="font-bold text-sm text-slate-300">{p.name}</span>
                        </div>
                        {p.isOnTeam && (
                            <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded uppercase tracking-widest border border-indigo-500/20">
                                Selected
                            </span>
                        )}
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: Role Card & Actions === */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Top: Classified Role Identity */}
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px]" />
            <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Classified Identity</h3>
            <h2 className="text-3xl font-black tracking-wider uppercase text-white mb-2">{myRole.role}</h2>
            <span className={`inline-block text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest mb-6 border ${myRole.team === 'good' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                Alignment: {myRole.team}
            </span>

            {/* Special Info Box */}
            {myRole.specialInfo && myRole.specialInfo.length > 0 && (
                <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Intel Acquired</span>
                    </div>
                    <ul className="space-y-2">
                        {myRole.specialInfo.map((info, i) => {
                            // Determine threat level for styling
                            const isThreat = info.name === 'Evil' || myRole.team === 'good';
                            const isAlly = myRole.team === 'evil' && info.name !== 'Merlin or Morgana';
                            const isUnknown = info.name === 'Merlin or Morgana';

                            return (
                                <li key={i} className={`text-sm font-medium bg-white/5 px-3 py-2 rounded border flex justify-between items-center
                                    ${isThreat && !isUnknown ? 'border-rose-500/20 text-rose-200' : ''}
                                    ${isAlly ? 'border-indigo-500/20 text-indigo-200' : ''}
                                    ${isUnknown ? 'border-amber-500/20 text-amber-200' : ''}
                                `}>
                                    <span>Agent {info.id} {/* Replace with actual name via a lookup if needed */}</span>
                                    <span className={`uppercase text-[9px] font-black tracking-widest px-2 py-0.5 rounded
                                        ${isThreat && !isUnknown ? 'bg-rose-500/20 text-rose-400' : ''}
                                        ${isAlly ? 'bg-indigo-500/20 text-indigo-400' : ''}
                                        ${isUnknown ? 'bg-amber-500/20 text-amber-400' : ''}
                                    `}>
                                        {info.name}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
          </div>

           {/* Bottom: Dynamic Action Interface */}
          {phase === 'GAME_OVER' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 rounded-2xl border shadow-2xl flex-grow flex flex-col justify-center items-center gap-4 text-center
                    ${winner === 'good' 
                        ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]' 
                        : 'bg-rose-900/20 border-rose-500/50 shadow-[0_0_40px_rgba(244,63,94,0.2)]'}`}
              >
                 <Crown className={`w-12 h-12 mb-2 ${winner === 'good' ? 'text-emerald-400' : 'text-rose-400'}`} />
                 <h2 className="text-3xl font-black tracking-widest uppercase text-white">
                    {winner === 'good' ? 'Arthur Prevails' : 'Mordred Triumphs'}
                 </h2>
                 <p className={`text-sm font-bold uppercase tracking-widest ${winner === 'good' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Mission Terminated
                 </p>
                 <button 
                    onClick={() => navigate('/')} 
                    className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
                 >
                    Return to Firewall
                 </button>
              </motion.div>
          ) : phase === 'ASSASSINATION' ? (
              <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)] flex-grow flex flex-col gap-4">
                  {myRole.role === 'Assassin' ? (
                      <>
                          <div className="text-center mb-2">
                              <p className="text-lg font-black text-rose-400 uppercase tracking-widest">Execute Target</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Identify and eliminate Merlin</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4">
                              {/* Filter out the Assassin so they can't shoot themselves */}
                              {players.filter(p => p.name !== myName).map(p => (
                                  <button
                                      key={p.id}
                                      onClick={() => setSniperTarget(p.id)}
                                      className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                          sniperTarget === p.id 
                                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                                          : 'bg-black/40 border-white/10 text-slate-400 hover:border-rose-500/30 hover:text-white'
                                      }`}
                                  >
                                      {p.name}
                                  </button>
                              ))}
                          </div>

                          <motion.button 
                              onClick={handleAssassination}
                              disabled={!sniperTarget}
                              whileHover={{ scale: sniperTarget ? 1.02 : 1 }} 
                              whileTap={{ scale: sniperTarget ? 0.98 : 1 }} 
                              className={`w-full py-4 border rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                                  ${!sniperTarget 
                                      ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed' 
                                      : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.4)]'}`}
                          >
                              Confirm Kill
                          </motion.button>
                      </>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
                          <p className="text-lg font-black text-rose-400 uppercase tracking-widest">Critical Threat</p>
                          <p className="text-xs text-slate-400 uppercase tracking-widest mt-2 max-w-[250px]">
                              The Assassin has breached the firewall and is hunting Merlin. Await the outcome.
                          </p>
                      </div>
                  )}
              </div>
          ) : (
              <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col justify-center gap-4">
                 <div className="text-center mb-2">
                    <p className="text-sm font-bold text-slate-300">Authorize Deployment?</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Awaiting your vote</p>
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
          )}

        </div>
      </div >
    </div>
  );
}