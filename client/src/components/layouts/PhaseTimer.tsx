import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

interface PhaseTimerProps {
  phase: string;
  initialSeconds: number;
  currentQuest: number;
  votesRejected: number;
  onExpire?: () => void;
  gameId?: number;
}

function getStorageKey(
  gameId: number | undefined,
  phase: string,
  currentQuest: number,
  votesRejected: number,
) {
  return `timer_${gameId}_${phase}_q${currentQuest}_v${votesRejected}`;
}

function getInitialTimeLeft(
  gameId: number | undefined,
  phase: string,
  currentQuest: number,
  votesRejected: number,
  initialSeconds: number,
) {
  const storageKey = getStorageKey(gameId, phase, currentQuest, votesRejected);
  const savedEndTime = sessionStorage.getItem(storageKey);

  if (savedEndTime) {
    const remaining = Math.floor((parseInt(savedEndTime, 10) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  const endTime = Date.now() + initialSeconds * 1000;
  sessionStorage.setItem(storageKey, endTime.toString());

  return initialSeconds;
}

export default function PhaseTimer({ 
  phase, 
  initialSeconds, 
  currentQuest, 
  votesRejected, 
  onExpire, 
  gameId 
}: PhaseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() =>
    getInitialTimeLeft(gameId, phase, currentQuest, votesRejected, initialSeconds),
  );

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onExpire]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  let colorClass =
    'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]';
  let animationProps = {};

  if (timeLeft <= 10) {
    colorClass =
      'text-rose-500 border-rose-500 bg-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.6)]';
    animationProps = {
      animate: { scale: [1, 1.15, 1, 1.05, 1], x: [-2, 2, -2, 2, 0] },
      transition: { duration: 0.5, repeat: Infinity },
    };
  } else if (timeLeft <= 30) {
    colorClass =
      'text-amber-400 border-amber-500/60 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.4)]';
    animationProps = {
      animate: { opacity: [1, 0.5, 1], scale: [1, 1.02, 1] },
      transition: { duration: 1, repeat: Infinity },
    };
  }

  if (
    phase === 'LOADING_DIRECTIVES' ||
    phase === 'GAME_OVER' ||
    phase === 'QUEST_RESULT' ||
    phase === 'VOTE_FAILED'
  ) {
    return null;
  }

  return (
    <motion.div
      {...animationProps}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 font-mono font-black text-2xl tracking-widest transition-colors duration-500 ${colorClass}`}
    >
      <Timer className={`w-6 h-6 ${timeLeft <= 10 ? 'animate-spin-slow' : ''}`} />
      {formatTime(timeLeft)}
    </motion.div>
  );
}