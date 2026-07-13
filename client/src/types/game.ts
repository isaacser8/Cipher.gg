export interface Player { 
  id: string; 
  name: string; 
  isLeader?: boolean; 
  isOnTeam?: boolean; 
  role?: string; 
  team?: string; 
}

export interface Intel {
  id: string; 
  name: string; 
}

export interface MyRole {
  role: string; 
  team: string; 
  specialInfo: Intel[]; 
}
export interface TeamVoteAttempt {
  attemptNumber: number;
  questNumber: number;
  leader: {
    id: string;
    name: string;
  };
  proposedTeam: string[];
  votes: Record<string, 'approve' | 'reject'>;
  approvals?: number;
  rejections?: number;
  approved: boolean;
  rejected?: boolean;
}

export interface QuestRecord {
  questNumber: number;
  succeeded?: boolean;
  failCount?: number;
  successCount?: number;
  team: string[];
  leader: { 
    id: string; 
    name: string 
  };
  teamVotes?: Record<string, 'approve' | 'reject'>;
  teamVoteHistory?: TeamVoteAttempt[];
  endedByFiveRejections?: boolean;
}