import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Crown,
  Skull,
  Crosshair,
  Trophy,
  History,
  ArrowLeft,
} from 'lucide-react';
import FriendsPanel from '../components/profile/FriendsPanel';
import type { UserProfile } from '../types/profile';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5005';

type ProfileTab = 'overview' | 'history' | 'friends';

export default function Profile() {

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;

    const clerkUserId = user?.id;

    if (!isSignedIn || !clerkUserId) {
      navigate('/');
      return;
    }

    async function fetchProfile() {
      try {
        setIsLoading(true);
        setError('');

        const token = await getToken();

        const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load profile.');
        }

        const data = await response.json();

        setProfile({
          ...data.user,
          recentMatches: data.recentMatches ?? [],
        });
      } catch (err) {
        console.error(err);
        setError('Unable to load profile dashboard.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [isLoaded, isSignedIn, user?.id, getToken, navigate]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <p className="text-cyan-400 font-black uppercase tracking-widest animate-pulse">
          Loading Agent Profile...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-rose-400 font-bold">{error || 'Profile not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 font-bold uppercase tracking-widest text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const stats = profile.stats;

  const statCards = [
    {
      label: 'Matches Played',
      value: stats.matchesPlayed,
      icon: Shield,
      accent: 'text-cyan-400',
    },
    {
      label: 'Total Wins',
      value: stats.totalWins,
      icon: Trophy,
      accent: 'text-amber-400',
    },
    {
      label: 'Wins as Good',
      value: stats.winsAsGood,
      icon: Crown,
      accent: 'text-emerald-400',
    },
    {
      label: 'Wins as Evil',
      value: stats.winsAsEvil,
      icon: Skull,
      accent: 'text-rose-400',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate}%`,
      icon: Trophy,
      accent: 'text-purple-400',
    },
    {
      label: 'Assassination Rate',
      value: `${stats.assassinationRate}%`,
      icon: Crosshair,
      accent: 'text-orange-400',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0A0D14] text-white font-sans relative overflow-hidden p-4 md:p-8">
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <header className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Return home"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>

            <div>
              <p className="text-xs text-cyan-400 font-black uppercase tracking-widest mb-1">
                Agent Profile
              </p>
              <h1 className="text-3xl md:text-5xl font-black tracking-widest uppercase">
                {profile.username}
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-slate-300">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </header>

        <div className="flex gap-3 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === 'history'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            Match History
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`px-5 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === 'friends'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            Friends
          </button>
        </div>

        {activeTab === 'overview' && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {statCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="p-6 rounded-2xl bg-[#11151C]/90 border border-white/10 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                        {card.label}
                      </p>
                      <Icon className={`w-6 h-6 ${card.accent}`} />
                    </div>

                    <p className={`text-4xl font-black ${card.accent}`}>
                      {card.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="p-6 rounded-2xl bg-[#11151C]/90 border border-white/10 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <History className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-black uppercase tracking-widest">
                Recent Matches
              </h2>
            </div>

            {profile.recentMatches.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No match history yet. Completed matches will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {profile.recentMatches.map((match) => {
                  const resultLabel =
                    match.winner === 'abandoned'
                      ? 'Aborted'
                      : match.didWin
                        ? 'Victory'
                        : 'Defeat';

                  const resultColor =
                    match.winner === 'abandoned'
                      ? 'text-amber-400'
                      : match.didWin
                        ? 'text-emerald-400'
                        : 'text-rose-400';
                  
                  return (
                    <div
                      key={match.id}
                      className="p-4 rounded-xl bg-black/30 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest text-slate-200">
                          Room {match.roomCode}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(match.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left md:text-right">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            Result
                          </p>
                          <p className={`text-sm font-black uppercase tracking-widest ${resultColor}`}>
                            {resultLabel}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            Role
                          </p>
                          <p className="text-sm font-bold text-slate-300">
                            {match.myRole}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            Team
                          </p>
                          <p
                            className={`text-sm font-bold uppercase ${
                              match.myTeam === 'good'
                                ? 'text-emerald-400'
                                : match.myTeam === 'evil'
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {match.myTeam}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            Score
                          </p>
                          <p className="text-sm font-bold text-slate-300">
                            {match.winner === 'abandoned'
                              ? '-'
                              : `${match.questSummary.good} - ${match.questSummary.evil}`}
                          </p>
                        </div>
                      </div>

                      {match.winReason && (
                        <p className="text-xs text-slate-500 md:max-w-xs md:text-right">
                          {match.winReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'friends' && <FriendsPanel />}
      </div>
    </div>
  );
}