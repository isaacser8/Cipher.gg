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
      fsm.proposeTeam(state.currentLeader.id, ['p1', 'p2']);
      mockPlayers.forEach(p => fsm.castVote(p.id, 'approve')); // Approve team
      
      // Quest execution: 1 success, 1 fail (quest fail)
      fsm.submitQuestAction('p1', 'success');
      fsm.submitQuestAction('p2', 'fail'); 
    };

    failQuest(); fsm.advanceAfterQuestResult(); // Quest 1 fails
    failQuest(); fsm.advanceAfterQuestResult(); // Quest 2 fails
    failQuest(); 
    
    // The 3rd failure should immediately trigger GAME_OVER when we try to advance
    const result = fsm.advanceAfterQuestResult();

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe('evil');
    expect(result.winReason).toBe('Evil sabotaged 3 quests.');
  });

  test('Condition 3: Evil wins by Assassinating Merlin', () => {
    // Force 3 successful quests to reach the Assassination Phase
    const passQuest = () => {
      const state = fsm.getState();
      fsm.proposeTeam(state.currentLeader.id, ['p1', 'p2']);
      mockPlayers.forEach(p => fsm.castVote(p.id, 'approve')); 
      fsm.submitQuestAction('p1', 'success');
      fsm.submitQuestAction('p2', 'success'); 
    };

    passQuest(); fsm.advanceAfterQuestResult(); // Quest 1 passes
    passQuest(); fsm.advanceAfterQuestResult(); // Quest 2 passes
    passQuest(); 
    
    // Advancing after 3rd success should enter Assassination Phase
    const setupResult = fsm.advanceAfterQuestResult();
    expect(setupResult.phase).toBe('ASSASSINATION_PHASE');

    // Find the actual Assassin and Merlin from the assignments
    const assassinId = setupResult.assassin;
    let merlinId;
    fsm.roleAssignments.forEach((data, id) => {
      if (data.role === 'Merlin') merlinId = id;
    });

    // Assassin targets Merlin
    const finalState = fsm.resolveAssassination(assassinId, merlinId);

    expect(finalState.phase).toBe('GAME_OVER');
    expect(finalState.winner).toBe('evil');
    expect(finalState.winReason).toBe('Assassin found Merlin.');
  });

  test('Condition 4: Good wins if 3 quests succeed and Merlin survives', () => {
    // Force 3 successful quests
    for (let i = 0; i < 3; i++) {
      const state = fsm.getState();
      fsm.proposeTeam(state.currentLeader.id, ['p1', 'p2']);
      mockPlayers.forEach(p => fsm.castVote(p.id, 'approve')); 
      fsm.submitQuestAction('p1', 'success');
      fsm.submitQuestAction('p2', 'success'); 
      if (i < 2) fsm.advanceAfterQuestResult();
    }
    
    const setupResult = fsm.advanceAfterQuestResult();
    const assassinId = setupResult.assassin;
    
    // Find a Loyal Servant to target incorrectly
    let wrongTargetId;
    fsm.roleAssignments.forEach((data, id) => {
      if (data.role === 'Loyal Servant') wrongTargetId = id;
    });

    // Assassin targets the wrong person
    const finalState = fsm.resolveAssassination(assassinId, wrongTargetId);

    expect(finalState.phase).toBe('GAME_OVER');
    expect(finalState.winner).toBe('good');
    expect(finalState.winReason).toBe('Merlin survived.');
  });
});