process.env.NODE_ENV = 'test'; 
require("dotenv").config(); 

const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const Match = require('../../models/Match'); 
const { testServer } = require('../../server'); 

const PORT = 5006; 
const ROOM_CODE = 'TEST_LOOP';

// In case MongoDB is slow to connect
jest.setTimeout(40000);

// Helper to wrap socket events in Promises 
const waitForEvent = (socket, eventName, timeoutMs = 6000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: Waited ${timeoutMs}ms for event '${eventName}' but it never fired.`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

describe('Full Game Loop Integration (Lobby to Endgame)', () => {
  let sockets = [];
  const testAgents = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Echo'];
  
  const teamSizes = { 1: 2, 2: 3, 3: 2, 4: 3, 5: 3 };

  beforeAll((done) => {
    testServer.listen(PORT, async () => {
      sockets = testAgents.map(() => io(`http://localhost:${PORT}`));
      
      // Catch server logic errors
      sockets.forEach(s => {
        s.on('game_error', (err) => console.error(`[SERVER ERROR for ${s.id}]:`, err));
      });

      await Promise.all(sockets.map(s => new Promise(res => s.on('connect', res))));
      done();
    });
  }, 15000);

  afterAll(async () => {
    sockets.forEach(s => s.disconnect());
    await new Promise(resolve => setTimeout(resolve, 500));
    await mongoose.disconnect();
    testServer.close()
  });

  test('Should complete a full game loop where Evil wins by sabotaging 3 quests', async () => {
    try {
      
      console.log('📍 PHASE 1: Connecting Host & Guests...');
      sockets[0].emit('join_room', { roomCode: ROOM_CODE, displayName: testAgents[0], action: 'host' });
      await waitForEvent(sockets[0], 'roster_update');

      const guestJoinPromises = sockets.slice(1).map(async (socket, idx) => {
        socket.emit('join_room', { roomCode: ROOM_CODE, displayName: testAgents[idx + 1], action: 'join' });
        return waitForEvent(socket, 'roster_update');
      });
      await Promise.all(guestJoinPromises);

      console.log('📍 PHASE 1.5: Agents Ready Up...');
      sockets.forEach((socket) => {
        socket.emit('status_update', {
          roomCode: ROOM_CODE,
          isReady: true,
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log('📍 PHASE 2: Starting Game...');
      const startPromises = sockets.map(s => waitForEvent(s, 'game_started'));
      const stateUpdatePromises = sockets.map(s => waitForEvent(s, 'game_state_update'));
      
      sockets[0].emit('start_game', { roomCode: ROOM_CODE });
      
      await Promise.all(startPromises);
      let gameState = (await Promise.all(stateUpdatePromises))[0];

      console.log('📍 PHASE 2.5: Agents Acknowledging Roles...');
      // All 5 bots click "Acknowledge"
      sockets.forEach(s => s.emit('confirm_role', { roomCode: ROOM_CODE }));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch the updated state
      sockets[0].emit('join_game_dashboard', { roomCode: ROOM_CODE, name: testAgents[0] });
      gameState = await waitForEvent(sockets[0], 'game_state_update');
      
      if (gameState.phase !== 'TEAM_SELECTION') {
        throw new Error(`CRITICAL FAIL: FSM is stuck in ${gameState.phase}`);
      }

      console.log('📍 PHASE 3: Executing Game Loop (3 Quests)...');
      for (let round = 1; round <= 3; round++) {
        const leaderSocket = sockets.find(s => s.id === gameState.currentLeader.id);
        
        // 1. Propose Team
        const requiredSize = teamSizes[gameState.currentQuest];
        const proposedTeamIds = gameState.players.slice(0, requiredSize).map(p => p.id);
        const proposalPromises = sockets.map(s => waitForEvent(s, 'team_proposed'));
        
        leaderSocket.emit('propose_team', { roomCode: ROOM_CODE, proposedTeamIds });
        await Promise.all(proposalPromises);

        // 2. Vote on Team 
        const voteResolvedPromises = sockets.map(s => waitForEvent(s, 'vote_resolved'));
        const postVoteStatePromises = sockets.map(s => waitForEvent(s, 'game_state_update'));
        
        sockets.forEach(s => s.emit('submit_vote', { roomCode: ROOM_CODE, vote: 'approve' }));
        
        await Promise.all(voteResolvedPromises);
        gameState = (await Promise.all(postVoteStatePromises))[0];

        // 3. Execute Quest 
        const teamSockets = sockets.filter(s => proposedTeamIds.includes(s.id));
        const advanceEvent = round === 3 ? 'game_over' : 'quest_result_advance';
        const advancePromises = sockets.map(s => waitForEvent(s, advanceEvent));
        
        teamSockets[0].emit('submit_quest_vote', { roomCode: ROOM_CODE, vote: 'fail' });
        for (let i = 1; i < teamSockets.length; i++) {
          teamSockets[i].emit('submit_quest_vote', { roomCode: ROOM_CODE, vote: 'success' });
        }

        const advanceResults = await Promise.all(advancePromises);
        
        if (round === 3) {
          console.log('📍 PHASE 4: Validating Endgame & MongoDB Record...');
          const finalPayload = advanceResults[0]; 
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          const savedMatch = await Match.findOne({ roomCode: ROOM_CODE });
          
          expect(savedMatch).toBeTruthy();
          expect(savedMatch.winner).toBe('evil');
          expect(savedMatch.players.length).toBe(5);
          
          expect(finalPayload.phase).toBe('GAME_OVER');
          expect(finalPayload.winner).toBe('evil');
          expect(finalPayload.questHistory.length).toBe(3);
          console.log('✅ TEST PASSED: Full cycle completed and logged to Database.');
        } else {
          sockets[0].emit('join_game_dashboard', { roomCode: ROOM_CODE, name: testAgents[0] });
          gameState = await waitForEvent(sockets[0], 'game_state_update');
        }
      }
    } catch (error) {
      console.error('\n❌ TEST FAILED ❌');
      console.error(error.message);
      throw error; 
    }
  }); 
});