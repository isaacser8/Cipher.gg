const GameStateMachine = require('../../gameEngine/GameStateMachine');

describe('Win/Loss Condition Detection (GameStateMachine)', () => {
  let fsm;
  const mockPlayers = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' },
    { id: 'p5', name: 'Eve' }
  ];

  const teamSizes = { 1: 2, 2: 3, 3: 2, 4: 3, 5: 3 };

  beforeEach(() => {
    fsm = new GameStateMachine(mockPlayers);
    fsm.startGame();
    // Simulate all players acknowledging their roles to move to TEAM_SELECTION phase
    mockPlayers.forEach(p => fsm.confirmRole(p.id));
    fsm.endStrategyPhase();
  });

  test('Condition 1: Evil wins if 5 consecutive teams are rejected', () => {
    // Force 5 rejected votes in a row
    for (let i = 0; i < 5; i++) {
      const state = fsm.getState();
      fsm.proposeTeam(state.currentLeader.id, ['p1', 'p2']);
      
      // All 5 players vote reject
      mockPlayers.forEach(p => fsm.castVote(p.id, 'reject'));
      
      // We must advance after a failed vote, unless it's the 5th vote (which ends the game)
      if (i < 4) {
        fsm.advanceAfterFailedVote();
      }
    }

    const finalState = fsm.getState();
    expect(finalState.phase).toBe('GAME_OVER');
    expect(finalState.winner).toBe('evil');
    expect(finalState.winReason).toBe('Five consecutive teams rejected.');
  });

  test('Condition 2: Evil wins by sabotaging 3 quests', () => {
    // Helper to push a failing quest through the FSM
    const failQuest = () => {
      const state = fsm.getState();
      const requiredSize = teamSizes[state.currentQuest];

      let evilId;
      fsm.roleAssignments.forEach((data, id) => {
        if (data.team === 'evil') evilId = id;
      });

      // Build a team that includes the Evil player
      const proposedTeamIds = [evilId];
      mockPlayers.forEach(p => {
        if (proposedTeamIds.length < requiredSize && p.id !== evilId) {
          proposedTeamIds.push(p.id);
        }
      });

      fsm.proposeTeam(state.currentLeader.id, proposedTeamIds);
      mockPlayers.forEach(p => fsm.castVote(p.id, 'approve')); 
      
      // Evil sabotages, the rest succeed
      fsm.submitQuestAction(evilId, 'fail');
      proposedTeamIds.forEach(id => {
        if (id !== evilId) fsm.submitQuestAction(id, 'success');
      });
    };

    failQuest(); fsm.advanceAfterQuestResult(); 
    failQuest(); fsm.advanceAfterQuestResult(); 
    failQuest(); 
    
    const result = fsm.advanceAfterQuestResult();
    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe('evil');
  });

  test('Condition 3: Evil wins by Assassinating Merlin', () => {
    // Force 3 successful quests to reach the Assassination Phase
    const passQuest = () => {
      const state = fsm.getState();
      const requiredSize = teamSizes[state.currentQuest];
      const proposedTeamIds = mockPlayers.slice(0, requiredSize).map(p => p.id);
      
      fsm.proposeTeam(state.currentLeader.id, proposedTeamIds);
      mockPlayers.forEach(p => fsm.castVote(p.id, 'approve')); 

      // Everyone votes success
      proposedTeamIds.forEach(id => fsm.submitQuestAction(id, 'success'));
    };

    passQuest(); fsm.advanceAfterQuestResult(); // Quest 1 passes
    passQuest(); fsm.advanceAfterQuestResult(); // Quest 2 passes
    passQuest(); 
    
    // Advancing after 3rd success should enter Assassination Phase
    const setupResult = fsm.advanceAfterQuestResult();
    expect(setupResult.state).toBe('ASSASSINATION_PHASE');

    // Find the actual Assassin and Merlin from the assignments
    let assassinId, merlinId;
    fsm.roleAssignments.forEach((data, id) => {
      if (data.role === 'Assassin') assassinId = id;
      if (data.role === 'Merlin') merlinId = id;
    });

    // Assassin targets Merlin
    const finalState = fsm.resolveAssassination(assassinId, merlinId);

    expect(finalState.phase).toBe('GAME_OVER');
    expect(finalState.winner).toBe('evil');
    expect(finalState.winReason).toContain('Merlin has fallen');
  });

  test('Condition 4: Good wins if 3 quests succeed and Merlin survives', () => {
    // Force 3 successful quests
    const passQuest = () => {
      const state = fsm.getState();
      const requiredSize = teamSizes[state.currentQuest];
      const proposedTeamIds = mockPlayers.slice(0, requiredSize).map(p => p.id);

      fsm.proposeTeam(state.currentLeader.id, proposedTeamIds);
      mockPlayers.forEach(p => fsm.castVote(p.id, 'approve')); 
      
      proposedTeamIds.forEach(id => fsm.submitQuestAction(id, 'success'));
    };

    for (let i = 0; i < 3; i++) {
      passQuest();
      if (i < 2) fsm.advanceAfterQuestResult();
    }
    
    fsm.advanceAfterQuestResult();
    
    // Find a Loyal Servant to target incorrectly
    let assassinId, wrongTargetId;
    fsm.roleAssignments.forEach((data, id) => {
      if (data.role === 'Assassin') assassinId = id;
      if (data.role === 'Loyal Servant') wrongTargetId = id;
    });

    // Assassin targets the wrong person
    const finalState = fsm.resolveAssassination(assassinId, wrongTargetId);

    expect(finalState.phase).toBe('GAME_OVER');
    expect(finalState.winner).toBe('good');
    expect(finalState.winReason).toContain('The Resistance survives');
  });
});