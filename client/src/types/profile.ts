export interface ProfileStats {
  matchesPlayed: number;
  winsAsGood: number;
  winsAsEvil: number;
  totalWins: number;
  successfulAssassinations: number;
  winRate: number;
  assassinationRate: number;
}

export interface ProfileMatch {
  id: string;
  roomCode: string;
  winner: 'good' | 'evil' | 'abandoned';
  winReason?: string;
  createdAt: string;
  myRole: string;
  myTeam: 'good' | 'evil' | 'unknown';
  didWin: boolean;
  questSummary: {
    good: number;
    evil: number;
  };
}

export interface UserProfile {
  id: string;
  clerkId: string;
  username: string;
  stats: ProfileStats;
  recentMatches: ProfileMatch[];
}