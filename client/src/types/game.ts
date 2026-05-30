export interface QuestRecord {
  questNumber: number;
  succeeded: boolean;
  failCount: number;
  successCount: number;
  team: string[];
  leader: { id: string; name: string };
  teamVotes?: Record<string, 'approve' | 'reject'>;
}