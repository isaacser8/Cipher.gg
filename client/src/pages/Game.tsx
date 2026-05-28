import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useParams, useLocation } from 'react-router-dom';
import { useSocket } from '../context/useSocket';
import TeamSelectionPanel from '../components/TeamSelectionPanel';
import TeamVotingPanel from '../components/TeamVotingPanel';
import QuestExecutionPanel from '../components/QuestExecutionPanel';
import AssassinationPanel from '../components/AssassinationPanel';
import Result from '../components/Result';
import ChatBox from '../components/ChatBox';
import PhaseTimer from '../components/PhaseTimer';

interface Player {
  id: string;
  name: string;
  isLeader?: boolean;
  isOnTeam?: boolean;
  role?: string; 
  team?: string; 
}

interface Intel {
  id: string;
  name: string;
}

interface MyRole {
  role: string;
  team: string;
  specialInfo: Intel[];
}

interface QuestRecord {
  questNumber: number;
  succeeded: boolean;
  failCount: number;
  successCount: number;
  team: string[];
  leader: { id: string; name: string };
  teamVotes?: Record<string, 'approve' | 'reject'>;
}

interface GameState {
  phase: string;
  currentQuest: number;
  votesRejected: number;
  players: Player[];
  winner?: 'good' | 'evil' | null;
  questsWon?: { good: number; evil: number };
  proposedTeam?: string[];
  currentLeader?: { id: string; name: string };
  questHistory?: QuestRecord[];
  teamVotesCast?: string[];
  questVotesCast?: string[];
  gameId?: number;
  winReason?: string;
}

// Quest config
const QUEST_TEAM_SIZES: Record<number, number> = { 1: 2, 2: 3, 3: 2, 4: 3, 5: 3 };

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const myName: string = location.state?.displayName || 'Unknown Agent';
  const { socket } = useSocket();

  const [gameState, setGameState] = useState<GameState>({
    phase: 'LOADING_DIRECTIVES',
    currentQuest: 1,
    votesRejected: 0,
    players: [],
    winner: null,
    questsWon: { good: 0, evil: 0 },
    proposedTeam: [],
  });

  const [myRole, setMyRole] = useState<MyRole>({
    role: 'Awaiting Intel...',
    team: '',
    specialInfo: [],
  });

  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [sniperTarget, setSniperTarget] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  const { phase, players, currentQuest, votesRejected, winner, questsWon, proposedTeam, currentLeader, questHistory, teamVotesCast, questVotesCast, gameId, winReason } = gameState;
  const requiredTeamSize = QUEST_TEAM_SIZES[currentQuest] ?? 2;
  
  const amILeader = players.find(p => p.isLeader)?.name === myName;
  const amIOnTeam = players.find(p => p.name === myName)?.isOnTeam ?? false;
  const myId = players.find(p => p.name === myName)?.id ?? '';
  const hasVoted = teamVotesCast?.includes(myId) ?? false;
  const hasQuestVoted = questVotesCast?.includes(myId) ?? false;


  // Socket setup
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_game_dashboard', { roomCode, name: myName });

    socket.on('role_assigned', (roleData: MyRole) => {
      setMyRole(roleData);
      setShowRoleReveal(true);
    });

    socket.on('game_state_update', (gs: GameState) => {
      setGameState(prev => {
        if (gs.phase !== prev.phase) {
          setSelectedTeam([]);
          setSniperTarget(null);
          setIsPanelMinimized(false);
        }
        return gs;
      });
    });

    return () => {
      socket.off('role_assigned');
      socket.off('game_state_update');
    };
  }, [socket, roomCode, myName]);

  // Actions
  const togglePlayerSelection = useCallback((playerId: string) => {
    setSelectedTeam(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : prev.length < requiredTeamSize ? [...prev, playerId] : prev
    );
  }, [requiredTeamSize]);

  const handleProposeTeam = () => {
    if (!socket || selectedTeam.length !== requiredTeamSize) return;
    socket.emit('propose_team', { roomCode, proposedTeamIds: selectedTeam });
  };

  const handleVote = (vote: 'approve' | 'reject') => {
    if (!socket || hasVoted) return;
    socket.emit('submit_vote', { roomCode, vote });
    sessionStorage.setItem(`teamVote_${gameId}_${currentQuest}_${votesRejected}`, vote);
  };

  const handleQuestVote = (vote: 'success' | 'fail') => {
    if (!socket || hasQuestVoted) return;
    socket.emit('submit_quest_vote', { roomCode, vote });
    sessionStorage.setItem(`questVote_${gameId}_${currentQuest}`, vote);  
  };

  const handleAssassination = () => {
    if (!socket || !sniperTarget) return;
    socket.emit('submit_assassination', { roomCode, targetId: sniperTarget });
  };

  const handleTimerExpire = useCallback(() => {
    if (phase === 'TEAM_VOTING' && !hasVoted) {
      handleVote('reject'); // Default to Reject if they don't vote in time
    } 
    else if (phase === 'QUEST_EXECUTION' && amIOnTeam && !hasQuestVoted) {
      handleQuestVote('success'); // Default to Success if they forget to do the quest
    }
  }, [phase, hasVoted, hasQuestVoted, amIOnTeam]);

  // Full-screen Result page
  if (phase === 'GAME_OVER') {
    return <Result winner={winner} questsWon={questsWon} roomCode={roomCode!} myName={myName} players={players} winReason={winReason} />;
  }

  // Action panel switch 
  const renderActionPanel = () => {
    switch (phase) {
      case 'TEAM_SELECTION':
        return (
          <TeamSelectionPanel
            players={players}
            amILeader={amILeader}
            currentLeader={currentLeader}
            currentQuest={currentQuest}
            requiredTeamSize={requiredTeamSize}
            selectedTeam={selectedTeam}
            togglePlayerSelection={togglePlayerSelection}
            handleProposeTeam={handleProposeTeam}
          />
        );

      case 'TEAM_VOTING':
        const myTeamVote = sessionStorage.getItem(`teamVote_${gameId}_${currentQuest}_${votesRejected}`);
        return (
          <TeamVotingPanel
            players={players}
            proposedTeam={proposedTeam ?? []}
            hasVoted={hasVoted}
            handleVote={handleVote}
            myTeamVote={myTeamVote} 
          />
        );

      case 'QUEST_EXECUTION':
        return (
          <QuestExecutionPanel
            amIOnTeam={amIOnTeam}
            currentQuest={currentQuest}
            hasQuestVoted={hasQuestVoted}
            myRole={myRole}
            handleQuestVote={handleQuestVote}
          />
        );

      case 'ASSASSINATION_PHASE':
        return (
          <AssassinationPanel
            myRole={myRole}
            players={players}
            myName={myName}
            sniperTarget={sniperTarget}
            setSniperTarget={setSniperTarget}
            handleAssassination={handleAssassination}
          />
        );

      case 'VOTE_FAILED':
        return (
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-rose-500/20 shadow-xl flex-grow flex flex-col items-center justify-center text-center gap-2">
            <X className="w-12 h-12 text-rose-500 mb-2" />
            <h3 className="text-xl font-black uppercase tracking-widest text-white">Deployment Rejected</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Leadership passes to the next agent...
            </p>
          </div>
        );
        
      case 'QUEST_RESULT': {
        const lastQuest = questHistory?.slice(-1)[0];
        const isSuccess = lastQuest?.succeeded;
        return (
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col items-center justify-center text-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2">Node {lastQuest?.questNumber} Result</h3>
            {isSuccess ? (
              <div className="text-emerald-400 flex flex-col items-center">
                <Check className="w-12 h-12 mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <p className="text-2xl font-black uppercase tracking-widest">Secured</p>
              </div>
            ) : (
              <div className="text-rose-400 flex flex-col items-center">
                <X className="w-12 h-12 mb-2 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                <p className="text-2xl font-black uppercase tracking-widest">Compromised</p>
              </div>
            )}
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
              {lastQuest?.successCount} Success / {lastQuest?.failCount} Sabotage
            </p>
          </div>
        );
      }

      default:
        return (
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex-grow flex items-center justify-center">
            <p className="text-slate-500 text-sm animate-pulse uppercase tracking-widest">
              {phase.replaceAll('_', ' ')}...
            </p>
          </div>
        );
    }
  };

  // Determine timer duration based on phase rules from GameStateMachine
  const getPhaseDuration = (currentPhase: string) => {
    switch (currentPhase) {
      case 'TEAM_SELECTION': return 120; // 2 minutes
      case 'TEAM_VOTING': return 90;     // 1.5 minutes
      case 'QUEST_EXECUTION': return 120;
      case 'ASSASSINATION_PHASE': return 60;
      default: return 0;
    }
  };

  // Render 
  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-hidden flex flex-col p-4 md:p-8">

      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Role reveal modal */}
      <AnimatePresence>
        {showRoleReveal && myRole.role !== 'Awaiting Intel...' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/95 backdrop-blur-md"
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
                  onClick={() => setShowRoleReveal(false)}
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

      {/* Header */}
      <header className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-3 items-center mb-8 pb-4 border-b border-white/5">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-3 justify-start">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight">cipher<span className="text-cyan-400">.gg</span></h1>
        </div>

        {/* Center: Phase Info */}
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-lg font-black tracking-widest uppercase text-cyan-400 animate-pulse">
            {phase.replaceAll('_', ' ')}
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Node {currentQuest} of 5</p>
        </div>

        {/* Right: Escalating Timer */}
        <div className="flex justify-end items-center">
          <PhaseTimer 
            phase={phase} 
            initialSeconds={getPhaseDuration(phase)} 
            currentQuest={currentQuest} 
            votesRejected={votesRejected} 
            onExpire={handleTimerExpire}
            gameId={gameId}
          />
        </div>

      </header>

      {/* Main grid */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">

        {/* Left: quest tracker + roster + chat */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Quest progress */}
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
                  <div key={q} className="flex flex-col items-center gap-2">
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

          {/* Roster */}
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-4">Agent Roster</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {players.map(p => (
                <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all
                  ${p.isOnTeam ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 relative">
                      {p.isLeader && <span className="absolute -top-2 text-sm">👑</span>}
                      <span className="font-bold text-slate-400 text-sm">{p.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-bold text-sm text-slate-300">{p.name}</span>
                    {p.name === myName && (
                      <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded uppercase tracking-widest border border-cyan-500/20">You</span>
                    )}
                  </div>
                  {p.isOnTeam && (
                    <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded uppercase tracking-widest border border-indigo-500/20">Selected</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: role card + chat */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Role card */}
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
                      {/* info.id stores the player's name (set in RoleAssigner.addSpecialInfo) */}
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

          {/* Chat — always visible so players can discuss */}
          <ChatBox roomCode={roomCode!} myName={myName} />
        </div>
      </div>

      {/* ── FLOATING ACTION COMMAND CENTER ── */}
      <AnimatePresence mode="wait">
        {phase !== 'LOADING_DIRECTIVES' && phase !== 'GAME_OVER' && !showRoleReveal && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
            className={`fixed left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl transition-all duration-500 ease-in-out
              ${isPanelMinimized ? 'bottom-0 translate-y-[calc(100%-8px)]' : 'bottom-6 md:bottom-10'}`}
          >
            <div className="relative">
              {/* Toggle Tab */}
              <button
                onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#11151C]/95 backdrop-blur-md border border-cyan-500/30 border-b-0 text-cyan-400 px-6 py-1.5 rounded-t-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10"
              >
                {isPanelMinimized ? (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Action Required</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-widest">Minimize</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Panel Container */}
              <div className={`shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] transition-opacity duration-300 
                ${isPanelMinimized ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                {renderActionPanel()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}