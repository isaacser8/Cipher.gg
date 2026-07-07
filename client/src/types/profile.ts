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
  _id: string;
  roomCode: string;
  winner: 'good' | 'evil' | 'abandoned';
  winReason?: string;
  createdAt: string;
  questHistory?: {
    questNumber: number;
    succeeded: boolean;
    successCount: number;
    failCount: number;
  }[];
}

export interface UserProfile {
  id: string;
  clerkId: string;
  username: string;
  stats: ProfileStats;
  recentMatches: ProfileMatch[];
}