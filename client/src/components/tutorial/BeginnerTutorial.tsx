import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BeginnerTutorialProps {
  isOpen: boolean;
  step: number;
  totalSteps: number;
  title: string;
  content: string;
  targetId?: string;
  onNext: () => void;
  onBack?: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function BeginnerTutorial({
  isOpen,
  step,
  totalSteps,
  title,
  content,
  targetId,
  onNext,
  onBack,
}: BeginnerTutorialProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    const updateTarget = () => {
      if (!isOpen || !targetId) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(`[data-tutorial="${targetId}"]`);

      if (!element) {
        setTargetRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();

      setTargetRect({
        top: rect.top,
        left: Math.max(rect.left, 8),
        width: Math.min(rect.width, window.innerWidth - 16),
        height: rect.height,
      });

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      window.scrollTo(0, window.scrollY);
    };

    const frameId = window.requestAnimationFrame(updateTarget);

    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, targetId, step]);

  if (!isOpen) return null;

  const isLastStep = step === totalSteps - 1;

  const cardPositionClass =
    targetRect && targetRect.top < window.innerHeight / 2
      ? 'items-end pb-10'
      : 'items-start pt-10';

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      <div className="absolute inset-0 bg-black/50" />

      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-3xl border-2 border-cyan-300 shadow-[0_0_45px_rgba(34,211,238,0.85)]"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      <div className={`relative z-10 h-full flex justify-center px-6 ${cardPositionClass}`}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pointer-events-auto w-full max-w-md bg-[#11151C] border border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
        >
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.3em] mb-3">
            Beginner Tutorial {step + 1}/{totalSteps}
          </p>

          <h2 className="text-2xl font-black text-white mb-3">
            {title}
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {content}
          </p>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={step === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                step === 0
                  ? 'bg-white/5 text-slate-700 cursor-not-allowed'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              Back
            </button>

            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === step
                      ? 'w-6 bg-cyan-400'
                      : 'w-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-widest transition-all"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}