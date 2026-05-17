/**
 * Quest Manager - Handles team selection, voting question execution
 * For 5 players only 
 */

class QuestManager {

    constructor(players) {
        this.players = players;

        // Quest configuration for 5 players
        this.questConfig = {
            1: { teamSize: 2, failsRequired: 1 },
            2: { teamSize: 3, failsRequired: 1 },
            3: { teamSize: 2, failsRequired: 1 },
            4: { teamSize: 3, failsRequired: 1 },
            5: { teamSize: 3, failsRequired: 1 }
        }; 

        // Game state 
        this.currentQuest = 1;
        this.currentLeaderIndex = 0;
        this.votesRejected = 0;
        this.questsWon = { good: 0, evil: 0 };

        // Current quest data 
        this.proposedTeam = [];
        this.teamVotes = new Map(); // playerId -> 'approve' | 'reject'
        this.questVotes = new Map(); // playerId -> 'success' | 'fail'

        this.questHistory = []; 
    }

    /**
     * Start a new quest
     */
    startQuest() {
        if (this.currentQuest > 5) {
            throw new Error('All quests completed'); 
        }

        const config = this.questConfig[this.currentQuest];
        const leader = this.players[this.currentLeaderIndex];

        return {
            questNumber: this.currentQuest,
            leader: leader, 
            teamSize: config.teamSize,
            failsRequired: config.failsRequired
        };
    }
    
    /**
     * Leader proposes a team 
     * @param {string} leaderId - Must match current leader
     * @param {Array} playerIds - Array of player IDs
     */
    proposeTeam(leaderId, playerIds) {
        const currentLeader = this.players[this.currentLeaderIndex]; 

        if (leaderId !== currentLeader.id) {
            throw new Error('Only the current leader can propose a team');
        }

        const requiredSize = this.questConfig[this.currentQuest].teamSize;

        if (playerIds.length !== requiredSize) {
            throw new Error(`Team must have exactly ${requiredSize} players`);
        }

        // Validate all player IDs exist 
        const validIds = this.players.map(p => p.id);
        const allValid = playerIds.every(id => validIds.includes(id));

        if(!allValid) {
            throw new Error('Invalid player ID in team');
        }

        this.proposedTeam = playerIds; 
        this.teamVotes.clear(); 

        return {
            proposedTeam: this.proposedTeam, 
            leader: currentLeader
        };
    }

    /**
     * Player casts a vote on the proposed team 
     * @param {string} playerId
     * @param {string} vote - 'approve' or 'reject'
     */
    castTeamVote(playerId, vote) {
        if (!['approve', 'reject'].includes(vote)) {
            throw new Error("Vote must be 'approve' or 'reject'");
        }

        if (this.proposedTeam.length === 0) {
            throw new Error('No team has been proposed yet');
        }

        this.teamVotes.set(playerId, vote);

        // Check if all players have voted 
        const allVoted = this.teamVotes.size === this.players.length; 

        return {
            allVoted, 
            voteCount: this.teamVotes.size, 
            totalPlayers: this.players.length
        };
    }

    /**
     * Resolve team votes 
     */
    resolveTeamVotes() {
        if (this.teamVotes.size !== this.players.length) {
            throw new Error('Not all players have voted');
        }

        const votes = Array.from(this.teamVotes.values());
        const approves = votes.filter(v => v === 'approve').length;
        const rejects = votes.filter(v => v === 'reject').length;

        const approved = approvals > rejections; 

        const result = {
            approved, 
            approvals, 
            rejections, 
            votes: Object.fromEntries(this.teamVotes)
        };

        if(!approved) {
            this.votesRejected += 1;

            if (this.votesRejected >= 5) {
                return {
                    ...result,
                    evilWins: true, 
                    reason: 'Five consecutive rejected votes'
                };
            }

            // Rotate leader 
            this.currentLeaderIndex = (this.currentLeaderIndex + 1) % this.players.length;  
        } else {
            this.votesRejected = 0; // reset counter on successful vote
        }

        return result; 
    }
    
    /** 
     * Team member casts a quest vote (Success or Fail) 
     * @param {string} playerId - Must be on the proposed team
     * @param {string} vote - 'success' or 'fail' 
     */
    castQuestVote(playerId, vote) {
        if (!['success', 'fail'].includes(vote)) {
            throw new Error("Vote must be 'success' or 'fail'");
        }     

        if (!this.proposedTeam.includes(playerId)) {
            throw new Error('Only team members can vote on the quest');
        }   

        if (this.questVotes.has(playerId)) {
            throw new Error('Player has already voted on this quest');
        }

        this.questVotes.set(playerId, vote);

        // Check if all team members have voted
        const allVoted = this.questVotes.size === this.proposedTeam.length;

        return {
            allVoted, 
            voteCount: this.questVotes.size, 
            totalTeamMembers: this.proposedTeam.length
        };
    }

    /**
     * Resolve the quest votes and determine success/failure 
     */
    resolveQuestVotes() {
        if (this.questVotes.size !== this.proposedTeam.length) {
            throw new Error('Not all team members have voted');
        }

        const config = this.questConfig[this.currentQuest];
        const votes = Array.from(this.questVotes.values());
        const failCount = votes.filter(v => v === 'fail').length;
        const successCount = votes.filter(v => v === 'success').length;

        const questSucceeded = failCount < config.failsRequired;

        // Update quest win counter 
        if (questSucceeded) {
            this.questsWon.good += 1;
        } else {
            this.questsWon.evil += 1;
        }

        // Store in history 
        this.questHistory.push({
            questNumber: this.currentQuest,
            team: [...this.proposeTeam], 
            leader: this.players[this.currentLeaderIndex],
            succeeded: questSucceeded, 
            failCount, 
            successCount
        });

        const result = {
            questNumber: this.currentQuest,
            succeeded: questSucceeded,
            failCount,
            successCount,
            questsWon: { ...this.questsWon }    
        }; 

        // Check win conditions 
        if (this.questsWon.good >= 3) {
            return {
                ...result,
                gameOver: true, 
                winner: 'good', 
                reason: 'Good team won 3 quests'
            };  
        }

        if (this.questsWon.evil >= 3) {
            return {
                ...result,
                gameOver: true, 
                winner: 'evil', 
                reason: 'Evil team won 3 quests'
            };  

        }

        return result; 
            
    }

    /**
     * Advance to the next quest 
     */
    nextQuest() {
        if (this.currentQuest >= 5) {
            throw new Error(' All quests completed');
        }

        // Clear quest data 
        this.questVotes.clear();
        this.proposedTeam = []; 
        this.teamVotes.clear(); 
        this.votesRejected = 0;

        // Move to next quest 
        this.currentQuest += 1;

        // Rotate leader
        this.currentLeaderIndex = (this.currentLeaderIndex + 1) % this.players.length;

        return {
            questNumber: this.currentQuest
            newLeader: this.players[this.currentLeaderIndex]
        };

    }

    /**
     * Get current game state 
     */
    getGameState() {
        return {
            currentQuest: this.currentQuest, 
            currentLeader: this.players[this.currentLeaderIndex],
            votesRejected: this.votesRejected,
            questsWon: { ...this.questsWon },
            proposedTeam: [...this.proposedTeam],
            questHistory: [...this.questHistory]
        }; 

    }

}

module.exports = QuestManager;