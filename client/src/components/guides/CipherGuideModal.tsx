import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  Crown,
  Skull,
  Users,
  Vote,
  Target,
  Trophy,
  Lightbulb,
  Crosshair,
  Eye,
} from 'lucide-react';

interface CipherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'brief' | 'roles' | 'flow' | 'winning' | 'tips';

const guideTabs: { id: GuideTab; label: string }[] = [
  { id: 'brief', label: 'Mission Brief' },
  { id: 'roles', label: 'Agent Roles' },
  { id: 'flow', label: 'Operation Flow' },
  { id: 'winning', label: 'Win Conditions' },
  { id: 'tips', label: 'Field Tips' },
];

export default function CipherGuideModal({
  isOpen,
  onClose,
}: CipherGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('brief');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70"
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-hidden bg-[#11151C] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white"
        >
          <div className="flex items-center justify-between gap-4 p-6 border-b border-white/10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">
                Cipher.gg Reference
              </p>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest">
                Quick Guide
              </h2>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">
                Learn mission flow, agent roles, voting, sabotage, and win conditions.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Close guide"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          <div className="flex gap-2 p-4 border-b border-white/10 overflow-x-auto">
            {guideTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto max-h-[58vh] custom-scrollbar">
            {activeTab === 'brief' && <MissionBriefSection />}
            {activeTab === 'roles' && <RolesSection />}
            {activeTab === 'flow' && <OperationFlowSection />}
            {activeTab === 'winning' && <WinningSection />}
            {activeTab === 'tips' && <TipsSection />}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function GuideCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 rounded-2xl bg-black/30 border border-white/10">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          {title}
        </h3>
      </div>
      <div className="text-sm text-slate-300 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function MissionBriefSection() {
  return (
    <div className="space-y-4">
      <GuideCard
        icon={<Shield className="w-5 h-5 text-cyan-400" />}
        title="Mission Brief"
      >
        <p>
          Cipher.gg is a hidden-role social deduction game. The good team is trying
          to complete missions, while the evil team secretly tries to sabotage the
          operation.
        </p>
        <p>
          The game is about trust, deception, voting patterns, mission results,
          and reading how other agents behave under pressure.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Users className="w-5 h-5 text-purple-400" />}
        title="Core Objective"
      >
        <p>
          Each round, agents discuss, vote, and decide who should be trusted with
          the next operation. Security wants clean teams. Rogue Agents want to
          infiltrate those teams without exposing themselves.
        </p>
      </GuideCard>
    </div>
  );
}

function RolesSection() {
  return (
    <div className="space-y-4">
      <GuideCard
        icon={<Crown className="w-5 h-5 text-emerald-400" />}
        title="Loyal Servant"
      >
        <p>
          <span className="font-bold text-emerald-300">Team:</span> Good
        </p>
        <p>
          <span className="font-bold text-slate-200">Role:</span> A normal good
          player with no special information.
        </p>
        <p>
          <span className="font-bold text-slate-200">Goal:</span> Find trusted
          players, approve safe teams, and help complete three successful missions.
        </p>
        <p>
          <span className="font-bold text-slate-200">Avoid:</span> Random voting,
          blindly trusting others, or revealing too much confusion to evil players.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Eye className="w-5 h-5 text-cyan-400" />}
        title="Merlin"
      >
        <p>
          <span className="font-bold text-emerald-300">Team:</span> Good
        </p>
        <p>
          <span className="font-bold text-slate-200">Role:</span> Merlin knows
          who most of the evil players are.
        </p>
        <p>
          <span className="font-bold text-slate-200">Goal:</span> Quietly guide
          the good team toward safe missions without revealing that you are Merlin.
        </p>
        <p>
          <span className="font-bold text-slate-200">Avoid:</span> Being too
          obvious. If evil identifies Merlin at the end, good can still lose.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Skull className="w-5 h-5 text-rose-400" />}
        title="Minion of Mordred"
      >
        <p>
          <span className="font-bold text-rose-300">Team:</span> Evil
        </p>
        <p>
          <span className="font-bold text-slate-200">Role:</span> A normal evil
          player who usually knows the other evil players.
        </p>
        <p>
          <span className="font-bold text-slate-200">Goal:</span> Blend in,
          mislead good players, and help fail three missions.
        </p>
        <p>
          <span className="font-bold text-slate-200">Avoid:</span> Looking too
          eager to control every team or sabotage too obviously.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Crosshair className="w-5 h-5 text-orange-400" />}
        title="Assassin"
      >
        <p>
          <span className="font-bold text-rose-300">Team:</span> Evil
        </p>
        <p>
          <span className="font-bold text-slate-200">Role:</span> The evil player
          responsible for identifying Merlin at the end of the game.
        </p>
        <p>
          <span className="font-bold text-slate-200">Goal:</span> Watch who seems
          to know too much and choose the correct Merlin target during assassination.
        </p>
        <p>
          <span className="font-bold text-slate-200">Avoid:</span> Wasting the
          final assassination on a normal good player.
        </p>
      </GuideCard>
    </div>
  );
}

function OperationFlowSection() {
  return (
    <div className="space-y-4">
      <GuideCard
        icon={<Users className="w-5 h-5 text-cyan-400" />}
        title="1. Team Selection"
      >
        <p>
          A leader proposes a team of agents for the current mission node. The
          required team size changes based on the mission number and player count.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Vote className="w-5 h-5 text-purple-400" />}
        title="2. Team Voting"
      >
        <p>
          All agents vote to approve or reject the proposed team. If the team is
          rejected, leadership passes to another agent.
        </p>
        <p>
          Repeated rejected teams create pressure and can eventually hand the
          advantage to the Rogue Agents.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Target className="w-5 h-5 text-amber-400" />}
        title="3. Mission Execution"
      >
        <p>
          If the team is approved, only selected agents submit secret mission
          actions. Security Agents must secure the node. Rogue Agents may choose
          to secure or compromise it.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Shield className="w-5 h-5 text-emerald-400" />}
        title="4. Mission Result"
      >
        <p>
          The node result is revealed, but individual actions remain hidden. Use
          the result to judge whether the selected team was trustworthy.
        </p>
      </GuideCard>
    </div>
  );
}

function WinningSection() {
  return (
    <div className="space-y-4">
      <GuideCard
        icon={<Trophy className="w-5 h-5 text-emerald-400" />}
        title="Security Victory"
      >
        <p>
          Security wins by securing three mission nodes before Rogue Agents can
          compromise three nodes.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Skull className="w-5 h-5 text-rose-400" />}
        title="Rogue Victory"
      >
        <p>
          Rogue Agents win by compromising three mission nodes, forcing repeated
          rejected teams, or successfully eliminating the Merlin if that role is
          active.
        </p>
      </GuideCard>
    </div>
  );
}

function TipsSection() {
  return (
    <div className="space-y-4">
      <GuideCard
        icon={<Lightbulb className="w-5 h-5 text-amber-400" />}
        title="Security Tips"
      >
        <p>
          Explain your votes clearly. Track who approves suspicious teams, who
          avoids responsibility, and whether each mission result matches what
          players claimed.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Skull className="w-5 h-5 text-rose-400" />}
        title="Rogue Tips"
      >
        <p>
          Do not look too eager to control the mission. Blend in, approve some
          reasonable teams, and create doubt around confident Security Agents.
        </p>
      </GuideCard>

      <GuideCard
        icon={<Shield className="w-5 h-5 text-cyan-400" />}
        title="Cipher.gg Tools"
      >
        <p>
          Use the session log, agent roster, private notes, mission history, and
          action panel to track claims and behaviour throughout the operation.
        </p>
      </GuideCard>
    </div>
  );
}