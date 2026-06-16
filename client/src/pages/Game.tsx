import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import { useSocket } from "../context/useSocket";

// Actions
import TeamSelectionPanel from "../components/panels/TeamSelectionPanel";
import TeamVotingPanel from "../components/panels/TeamVotingPanel";
import QuestExecutionPanel from "../components/panels/QuestExecutionPanel";
import AssassinationPanel from "../components/panels/AssassinationPanel";
import Result from "../components/Result";

// UI Layout Components
import ChatBox from '../components/layouts/ChatBox';
import PhaseTimer from '../components/layouts/PhaseTimer';
import NodeDebriefModal from '../components/modals/NodeDebriefModal';
import RoleRevealModal from '../components/modals/RoleRevealModal';
import MissionProgressPanel from '../components/panels/MissionProgressPanel';
import AgentRosterPanel from '../components/panels/AgentRosterPanel';
import RoleCardPanel from '../components/panels/RoleCardPanel';
import PrivateNotepad from '../components/panels/PrivateNotepad';

// Interfaces
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
  teamVotes?: Record<string, "approve" | "reject">;
}
interface GameState {
  phase: string;
  currentQuest: number;
  votesRejected: number;
  players: Player[];
  winner?: "good" | "evil" | null;
  questsWon?: { good: number; evil: number };
  proposedTeam?: string[];
  currentLeader?: { id: string; name: string };
  questHistory?: QuestRecord[];
  teamVotesCast?: string[];
  questVotesCast?: string[];
  gameId?: number;
  winReason?: string;
  requiredTeamSize?: number;
  failsRequired?: number;
}

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const myName: string = location.state?.displayName || "Unknown Agent";
  const { socket } = useSocket();

  const [gameState, setGameState] = useState<GameState>({
    phase: "LOADING_DIRECTIVES",
    currentQuest: 1,
    votesRejected: 0,
    players: [],
    winner: null,
    questsWon: { good: 0, evil: 0 },
    proposedTeam: [],
    requiredTeamSize: 2,
    failsRequired: 1,
  });
  const [myRole, setMyRole] = useState<MyRole>({
    role: "Awaiting Intel...",
    team: "",
    specialInfo: [],
  });

  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [sniperTarget, setSniperTarget] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [selectedNodeHistory, setSelectedNodeHistory] =
    useState<QuestRecord | null>(null);

  const {
    phase,
    players,
    currentQuest,
    votesRejected,
    winner,
    questsWon,
    proposedTeam,
    currentLeader,
    questHistory,
    teamVotesCast,
    questVotesCast,
    gameId,
    winReason,
    requiredTeamSize = 2,
    failsRequired = 1,
  } = gameState;

  const amILeader = players.find((p) => p.isLeader)?.name === myName;
  const amIOnTeam = players.find((p) => p.name === myName)?.isOnTeam ?? false;
  const myId = players.find((p) => p.name === myName)?.id ?? "";
  const hasVoted = teamVotesCast?.includes(myId) ?? false;
  const hasQuestVoted = questVotesCast?.includes(myId) ?? false;

  useEffect(() => {
    if (!socket) return;
    socket.emit("join_game_dashboard", { roomCode, name: myName });

    socket.on("role_assigned", (roleData: MyRole) => {
      setMyRole(roleData);
      setShowRoleReveal(true);
    });

    socket.on("game_state_update", (gs: GameState) => {
      setGameState((prev) => {
        if (gs.phase !== prev.phase) {
          setSelectedTeam([]);
          setSniperTarget(null);
          setIsPanelMinimized(false);
        }
        return gs;
      });
    });

    return () => {
      socket.off("role_assigned");
      socket.off("game_state_update");
    };
  }, [socket, roomCode, myName]);

  const togglePlayerSelection = useCallback(
    (playerId: string) => {
      setSelectedTeam((prev) =>
        prev.includes(playerId)
          ? prev.filter((id) => id !== playerId)
          : prev.length < requiredTeamSize
            ? [...prev, playerId]
            : prev,
      );
    },
    [requiredTeamSize],
  );

  const handleProposeTeam = () => {
    if (!socket || selectedTeam.length !== requiredTeamSize) return;
    socket.emit("propose_team", { roomCode, proposedTeamIds: selectedTeam });
  };

  const handleVote = useCallback(
    (vote: "approve" | "reject") => {
      if (!socket || hasVoted) return;

      socket.emit("submit_vote", { roomCode, vote });
      sessionStorage.setItem(
        `teamVote_${gameId}_${currentQuest}_${votesRejected}`,
        vote,
      );
    },
    [socket, hasVoted, roomCode, gameId, currentQuest, votesRejected],
  );

  const handleQuestVote = useCallback(
    (vote: "success" | "fail") => {
      if (!socket || hasQuestVoted) return;

      socket.emit("submit_quest_vote", { roomCode, vote });
      sessionStorage.setItem(`questVote_${gameId}_${currentQuest}`, vote);
    },
    [socket, hasQuestVoted, roomCode, gameId, currentQuest],
  );

  const handleAssassination = () => {
    if (!socket || !sniperTarget) return;
    socket.emit("submit_assassination", { roomCode, targetId: sniperTarget });
  };

  const handleTimerExpire = useCallback(() => {
    if (phase === "TEAM_SELECTION" && amILeader) {
      socket?.emit("timer_expired", { roomCode, phase: "TEAM_SELECTION" });
    } else if (phase === "TEAM_VOTING" && !hasVoted) handleVote("reject");
    else if (phase === "QUEST_EXECUTION" && amIOnTeam && !hasQuestVoted)
      handleQuestVote("success");
  }, [
    phase,
    amILeader,
    hasVoted,
    handleVote,
    amIOnTeam,
    hasQuestVoted,
    handleQuestVote,
    socket,
    roomCode,
  ]);

  if (phase === "GAME_OVER")
    return (
      <Result
        winner={winner}
        questsWon={questsWon}
        roomCode={roomCode!}
        myName={myName}
        players={players}
        winReason={winReason}
      />
    );

  const renderActionPanel = () => {
    switch (phase) {
      case 'ROLE_ACKNOWLEDGEMENT': return (
        <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col items-center justify-center text-center gap-3">
          <Shield className="w-10 h-10 text-purple-500/50 animate-pulse" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Awaiting Acknowledgements</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-[250px]">
            Waiting for all agents to acknowledge their directives before opening comms.
          </p>
        </div>
      );

      case 'PRE_GAME_STRATEGY': return (
        <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col items-center justify-center text-center gap-3">
          <Shield className="w-10 h-10 text-purple-500/50 animate-pulse" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Strategy Phase active</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-[250px]">
            {myRole.team === 'evil' 
              ? 'Coordinate cover identities with your teammates in the Evil channel.' 
              : 'Secure lines open. Awaiting all agents to acknowledge directives...'}
          </p>
        </div>
      );
      
      case 'TEAM_SELECTION': 
        return <TeamSelectionPanel 
          players={players} 
          amILeader={amILeader} 
          currentLeader={currentLeader} 
          currentQuest={currentQuest} 
          requiredTeamSize={requiredTeamSize} 
          failsRequired={failsRequired}
          selectedTeam={selectedTeam} 
          togglePlayerSelection={togglePlayerSelection} 
          handleProposeTeam={handleProposeTeam} 
        />;

      case 'TEAM_VOTING': 
        return <TeamVotingPanel 
          players={players} 
          proposedTeam={proposedTeam ?? []} 
          hasVoted={hasVoted} 
          handleVote={handleVote} 
          myTeamVote={sessionStorage.getItem(`teamVote_${gameId}_${currentQuest}_${votesRejected}`)} 
        />;

      case 'QUEST_EXECUTION': 
        return <QuestExecutionPanel 
          amIOnTeam={amIOnTeam} 
          currentQuest={currentQuest} 
          hasQuestVoted={hasQuestVoted} 
          myRole={myRole} 
          handleQuestVote={handleQuestVote} 
        />;

      case 'ASSASSINATION_PHASE': 
        return <AssassinationPanel 
          myRole={myRole} 
          players={players} 
          myName={myName} 
          sniperTarget={sniperTarget} 
          setSniperTarget={setSniperTarget} 
          handleAssassination={handleAssassination} 
        />;

      case 'VOTE_FAILED': return (
        <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-rose-500/20 shadow-xl flex-grow flex flex-col items-center justify-center text-center gap-2">
          <X className="w-12 h-12 text-rose-500 mb-2" />
          <h3 className="text-xl font-black uppercase tracking-widest text-white">Deployment Rejected</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Leadership passes to the next agent...</p>
        </div>
      );
      case 'QUEST_RESULT': {
        const lastQuest = questHistory?.slice(-1)[0];
        return (
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl flex-grow flex flex-col items-center justify-center text-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2">
              Node {lastQuest?.questNumber} Result
            </h3>
            {lastQuest?.succeeded ? (
              <div className="text-emerald-400 flex flex-col items-center">
                <Check className="w-12 h-12 mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <p className="text-2xl font-black uppercase tracking-widest">
                  Secured
                </p>
              </div>
            ) : (
              <div className="text-rose-400 flex flex-col items-center">
                <X className="w-12 h-12 mb-2 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                <p className="text-2xl font-black uppercase tracking-widest">
                  Compromised
                </p>
              </div>
            )}
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
              {lastQuest?.successCount} Success / {lastQuest?.failCount}{" "}
              Sabotage
            </p>
          </div>
        );
      }
      default:
        return (
          <div className="bg-[#11151C]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex-grow flex items-center justify-center">
            <p className="text-slate-500 text-sm animate-pulse uppercase tracking-widest">
              {phase.replaceAll("_", " ")}...
            </p>
          </div>
        );
    }
  };

  const getPhaseDuration = (currentPhase: string) => {
    switch (currentPhase) { 
      case 'PRE_GAME_STRATEGY': return 30;
      case 'TEAM_SELECTION': return 120; 
      case 'TEAM_VOTING': return 90; 
      case 'QUEST_EXECUTION': return 120; 
      case 'ASSASSINATION_PHASE': return 60; 
      default: return 0; 
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0D14] font-sans text-white relative overflow-hidden flex flex-col p-4 md:p-8">
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

      <RoleRevealModal 
        showRoleReveal={showRoleReveal} 
        setShowRoleReveal={setShowRoleReveal} 
        myRole={myRole} 
        socket={socket}
        roomCode={roomCode!}
      />
      <NodeDebriefModal selectedNodeHistory={selectedNodeHistory} setSelectedNodeHistory={setSelectedNodeHistory} players={players} />

      <header className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-3 items-center mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 justify-start">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight">
            cipher<span className="text-cyan-400">.gg</span>
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-lg font-black tracking-widest uppercase text-cyan-400 animate-pulse">
            {phase.replaceAll("_", " ")}
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Node {currentQuest} of 5 · {requiredTeamSize} Agents · {failsRequired} Fail Required
          </p>
        </div>
        <div className="flex justify-end items-center">
          <PhaseTimer
            key={`${gameId}_${phase}_${currentQuest}_${votesRejected}`}
            phase={phase}
            initialSeconds={getPhaseDuration(phase)}
            currentQuest={currentQuest}
            votesRejected={votesRejected}
            onExpire={handleTimerExpire}
            gameId={gameId}
          />
        </div>
      </header>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <MissionProgressPanel
            questsWon={questsWon}
            votesRejected={votesRejected}
            currentQuest={currentQuest}
            questHistory={questHistory}
            setSelectedNodeHistory={setSelectedNodeHistory}
          />
          <AgentRosterPanel players={players} myName={myName} />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-6">
          <RoleCardPanel myRole={myRole} />
          <ChatBox roomCode={roomCode!} myName={myName} myRole={myRole} phase={phase} />
          <PrivateNotepad gameId={gameId} myName={myName} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase !== "LOADING_DIRECTIVES" &&
          phase !== "GAME_OVER" &&
          !showRoleReveal && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
              className={`fixed left-1/2 -translate-x-1/2 lg:left-[38%] z-50 w-[95%] max-w-2xl transition-all duration-500 ease-in-out ${isPanelMinimized ? "bottom-0 translate-y-[calc(100%-8px)]" : "bottom-6 md:bottom-10"}`}
            >
              <div className="relative">
                <button
                  onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#11151C]/95 backdrop-blur-md border border-cyan-500/30 border-b-0 text-cyan-400 px-6 py-1.5 rounded-t-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10"
                >
                  {isPanelMinimized ? (
                    <>
                      <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Action Required
                      </span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Minimize
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                <div
                  className={`shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${isPanelMinimized ? "opacity-30 pointer-events-none" : "opacity-100"}`}
                >
                  {renderActionPanel()}
                </div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
