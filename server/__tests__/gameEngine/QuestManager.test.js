const QuestManager = require('../../gameEngine/QuestManager');

describe('QuestManager', () => {

    // Test data - 5 players 
    const mockPlayers = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Diana' },
        { id: 'p5', name: 'Eve' }
    ]

    let questManager; 

    // Create a fresh QuestManager before each test
    beforeEach(() => {
        questManager = new QuestManager(mockPlayers);
    }); 

    // Quest initialization tests 
    test('should start quest with correct team size', () => {
        const questInfo = questManager.startQuest(); 

        expect(questInfo.questNumber).toBe(1);
        expect(questInfo.leader).toEqual(mockPlayers[0]); 
        expect(questInfo.teamSize).toBe(2); // Quest 1 needs 2 players
    });

    // Team proposal tests 
    test('should allow leader to propose team', () => {
        const leaderId = mockPlayers[0].id;
        const team = ['p1', 'p2']; 

        const result = questManager.proposeTeam(leaderId, team);

        expect(result.proposedTeam).toEqual(team);
        expect(result.leader).toEqual(mockPlayers[0]);  
    });

    // Non-leader cannot propose team test 
    test('should reject proposal from non-leader', () => {
        const nonLeaderId = mockPlayers[1].id;

        const team = ['p1', 'p2'];

        expect(() => questManager.proposeTeam(nonLeaderId, team))
            .toThrow('Only the current leader can propose a team');

    });

    // Team vote approval test 
    test('should approve team with majority votes', () => {
        // Propose team 
        questManager.proposeTeam('p1', ['p1', 'p2']);

        // All players vote (3 approve, 2 reject)
        questManager.castTeamVote('p1', 'approve');
        questManager.castTeamVote('p2', 'approve');
        questManager.castTeamVote('p3', 'approve');
        questManager.castTeamVote('p4', 'reject');
        questManager.castTeamVote('p5', 'reject');

        const result = questManager.resolveTeamVotes(); 

        expect(result.approved).toBe(true); 
        expect(result.approvals).toBe(3); 

    }); 

    // Team vote rejection test
    test('should reject team with majority rejections', () => {
        questManager.proposeTeam('p1', ['p1', 'p2']);

        // 2 approve, 3 reject
        questManager.castTeamVote('p1', 'approve');
        questManager.castTeamVote('p2', 'approve');
        questManager.castTeamVote('p3', 'reject'); 
        questManager.castTeamVote('p4', 'reject');
        questManager.castTeamVote('p5', 'reject');

        const result = questManager.resolveTeamVotes();

        expect(result.approved).toBe(false);

    });

    // Quest Execution - Success test 
    test('should succeed quest when all vote success', () => {
        // Setup: Propose and approve team
        questManager.proposeTeam('p1', ['p1', 'p2']);
        mockPlayers.forEach(p => questManager.castTeamVote(p.id, 'approve'));
        questManager.resolveTeamVotes();

        // Team executes quest
        questManager.castQuestVote('p1', 'success');
        questManager.castQuestVote('p2', 'success');

        const result = questManager.resolveQuestVotes();

        expect(result.succeeded).toBe(true);
        expect(result.failCount).toBe(0);
        expect(result.questsWon.good).toBe(1);
        expect(result.questsWon.evil).toBe(0);
    });

    // Quest Execution - Fail test
    test('should fail quest with one fail vote', () => {
        // Setup: Propose and approve team
        questManager.proposeTeam('p1', ['p1', 'p2']);
        mockPlayers.forEach(p => questManager.castTeamVote(p.id, 'approve'));
        questManager.resolveTeamVotes();

        // Team executes quest (one fail vote)
        questManager.castQuestVote('p1', 'success');
        questManager.castQuestVote('p2', 'fail');

        const result = questManager.resolveQuestVotes();

        expect(result.succeeded).toBe(false);
        expect(result.failCount).toBe(1);
        expect(result.questsWon.good).toBe(0);
        expect(result.questsWon.evil).toBe(1);
    });

    // Good win condition test 
    test('should trigger assassination phase when good wins 3 quests', () => {
        questManager.questsWon.good = 2;

        questManager.proposeTeam('p1', ['p1', 'p2']);
        mockPlayers.forEach(p => questManager.castTeamVote(p.id, 'approve'));
        questManager.resolveTeamVotes();

        questManager.castQuestVote('p1', 'success');
        questManager.castQuestVote('p2', 'success');    

        const result = questManager.resolveQuestVotes();

        expect(result.triggerAssassination).toBe(true); 
        expect(result.reason).toBe('Good team won 3 quests - Assassination phase begins'); 
        expect(result.gameOver).toBeUndefined(); 
        expect(result.winner).toBeUndefined(); 

    });

    // Evil win condition test 
    test('should end game when evil wins 3 quests', () => {
        // Simulate 2 failed quests already
        questManager.questsWon.evil = 2;

        // Setup and execute quest 3
        questManager.proposeTeam('p1', ['p1', 'p2']);
        mockPlayers.forEach(p => questManager.castTeamVote(p.id, 'approve'));
        questManager.resolveTeamVotes();

        questManager.castQuestVote('p1', 'fail');
        questManager.castQuestVote('p2', 'success');

        const result = questManager.resolveQuestVotes();

        expect(result.gameOver).toBe(true);
        expect(result.winner).toBe('evil');
        expect(result.reason).toBe('Evil team won 3 quests');
    });

    afterAll((done) => {
        // Close the socket connections
      if (clientSocket) {
        clientSocket.disconnect();
      }
        // Close the actual HTTP server
      if (httpServer) {
        httpServer.close(done);
      } else {
        done();
      }
    });

});