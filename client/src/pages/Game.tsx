import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, AlertTriangle, Check, X, Eye } from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

export default function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const myName = location.state?.displayName || 'Unknown Agent';
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [currentQuest, setCurrentQuest] = useState(1);
  const [votesRejected, setVotesRejected] = useState(0);
  const [phase, setPhase] = useState('LOADING_DIRECTIVES');
  const [hasVoted, setHasVoted] = useState(false);
  const [winner, setWinner] = useState<'good' | 'evil' | null>(null); 
  const [myRole, setMyRole] = useState({
    role: 'Awaiting Intel...',
    team: 'unknown',
    specialInfo: []
  });

  useEffect(() => {
    const SOCKET_URL = 'https://ciphergg-production.up.railway.app';
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      setSocket(newSocket);
      newSocket.emit('join_game_dashboard', { roomCode, name: myName });
    });

    newSocket.on('receive_role', (roleData) => {
      setMyRole(roleData);
    });

    newSocket.on('game_state_update', (gameState) => {
      setPlayers(gameState.players);
      setCurrentQuest(gameState.currentQuest);
      setVotesRejected(gameState.votesRejected);
      
      if (gameState.phase !== phase) {
        setHasVoted(false);
      }
      setPhase(gameState.phase);
      
      if (gameState.winner) {
        setWinner(gameState.winner);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, myName]);

  const handleVote = (voteType: 'approve' | 'reject') => {
    if (!socket || hasVoted) return;
    socket.emit('submit_vote', { roomCode, myName, vote: voteType });
    setHasVoted(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-hidden flex flex-col p-4 md:p-8">
      
      {/* Background */}
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

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
                {players.map((p: any) => (
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

          {/* Bottom: Action Interface OR Game Over Reveal */}
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