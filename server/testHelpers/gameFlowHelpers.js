const {
  waitForEvent,
  createTestSockets,
  collectRoleAssignments,
  findRoleAssignment,
  findTeamAssignment,
} = require('./socketTestUtils');

async function runEvilSabotageGame({ playerCount, port, roomCode }) {
  const runId = Date.now().toString().slice(-6);

  const agents = Array.from({ length: playerCount }, (_, i) => ({
    name: `A${i + 1}_${runId}`,
    clerkId: `test_full_loop_${runId}_${i + 1}`,
  }));

  const sockets = await createTestSockets({ agents, port });

  try {
    // Host joins
    sockets[0].emit("join_room", {
      roomCode,
      displayName: agents[0].name,
      action: "host",
      clerkId: agents[0].clerkId,
    });
    await waitForEvent(sockets[0], "roster_update", 10000);

    // Set lobby size for 6–10 player tests
    if (playerCount !== 5) {
      sockets[0].emit("change_settings", {
        roomCode,
        teamSize: playerCount,
      });

      await waitForEvent(sockets[0], "settings_update");
    }

    // Guests join
    for (let i = 1; i < playerCount; i++) {
      sockets[i].emit("join_room", {
        roomCode,
        displayName: agents[i].name,
        action: "join",
        clerkId: agents[i].clerkId,
      });

      await waitForEvent(sockets[i], "roster_update");
    }

    // Ready up
    sockets.forEach((socket) => {
      socket.emit("status_update", {
        roomCode,
        isReady: true,
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start game
    const roleAssignmentPromise = collectRoleAssignments(sockets);
    const startPromises = sockets.map((s) => waitForEvent(s, "game_started"));
    const stateUpdatePromises = sockets.map((s) => waitForEvent(s, "game_state_update"));

    sockets[0].emit("start_game", { roomCode });

    await Promise.all(startPromises);
    const roleAssignments = await roleAssignmentPromise;
    let gameState = (await Promise.all(stateUpdatePromises))[0];

    // Acknowledge roles
    sockets.forEach((s) => s.emit("confirm_role", { roomCode }));

    await new Promise((resolve) => setTimeout(resolve, 500));

    sockets[0].emit("join_game_dashboard", {
      roomCode,
      name: agents[0].name,
    });

    gameState = await waitForEvent(sockets[0], "game_state_update");

    if (gameState.phase !== "TEAM_SELECTION") {
      throw new Error(`Expected TEAM_SELECTION but got ${gameState.phase}`);
    }

    // Force 3 sabotaged quests so Evil wins
    for (let round = 1; round <= 3; round++) {
      const leaderSocket = sockets.find((s) => s.id === gameState.currentLeader.id);
      const requiredSize = gameState.requiredTeamSize;
      const evilAssignment = findTeamAssignment(roleAssignments, 'evil');
      const evilPlayerId = evilAssignment.socketId;
      const proposedTeamIds = [evilPlayerId];

      gameState.players.forEach((player) => {
        if (proposedTeamIds.length < requiredSize && player.id !== evilPlayerId) {
          proposedTeamIds.push(player.id);
        }
      });

      const proposalPromises = sockets.map((s) => waitForEvent(s, "team_proposed"));
      leaderSocket.emit("propose_team", { roomCode, proposedTeamIds });
      await Promise.all(proposalPromises);

      const voteResolvedPromises = sockets.map((s) => waitForEvent(s, "vote_resolved"));
      const postVoteStatePromises = sockets.map((s) => waitForEvent(s, "game_state_update"));

      sockets.forEach((s) => s.emit("submit_vote", { roomCode, vote: "approve" }));

      await Promise.all(voteResolvedPromises);
      gameState = (await Promise.all(postVoteStatePromises))[0];

      const teamSockets = sockets.filter((s) => proposedTeamIds.includes(s.id));
      const advanceEvent = round === 3 ? "game_over" : "quest_result_advance";
      const advancePromises = sockets.map((s) => waitForEvent(s, advanceEvent, 8000));

      // For Quest 4 in 7+ players, 2 fails are needed.
      // This test only plays quests 1–3, so one fail per quest is enough.
      const evilSocket = sockets.find((socket) => socket.id === evilPlayerId);
      evilSocket.emit('submit_quest_vote', { roomCode, vote: 'fail' });

      teamSockets.forEach((socket) => {
        if (socket.id !== evilPlayerId) {
          socket.emit('submit_quest_vote', { roomCode, vote: 'success' });
        }
      });

      const advanceResults = await Promise.all(advancePromises);

      if (round === 3) {
        return {
          finalPayload: advanceResults[0],
          sockets,
          agents,
          roleAssignments,
        };
      }

      sockets[0].emit("join_game_dashboard", {
        roomCode,
        name: agents[0].name,
      });

      gameState = await waitForEvent(sockets[0], "game_state_update");
    }
  } catch (error) {
    sockets.forEach((s) => s.disconnect());
    throw error;
  }
}

async function runGoodWinThenSuccessfulAssassinationGame({ playerCount, port, roomCode }) {
  const runId = Date.now().toString().slice(-6);

  const agents = Array.from({ length: playerCount }, (_, i) => ({
    name: `S${i + 1}_${runId}`,
    clerkId: `test_assassination_${runId}_${i + 1}`,
  }));

  const sockets = await createTestSockets({ agents, port });

  try {
    // Host joins
    sockets[0].emit('join_room', {
      roomCode,
      displayName: agents[0].name,
      action: 'host',
      clerkId: agents[0].clerkId,
    });

    await waitForEvent(sockets[0], 'roster_update', 10000);

    // Set lobby size for dynamic player counts
    if (playerCount !== 5) {
      sockets[0].emit('change_settings', {
        roomCode,
        teamSize: playerCount,
      });

      await waitForEvent(sockets[0], 'settings_update');
    }

    // Guests join
    for (let i = 1; i < playerCount; i++) {
      sockets[i].emit('join_room', {
        roomCode,
        displayName: agents[i].name,
        action: 'join',
        clerkId: agents[i].clerkId,
      });

      await waitForEvent(sockets[i], 'roster_update');
    }

    // Ready up
    sockets.forEach((socket) => {
      socket.emit('status_update', {
        roomCode,
        isReady: true,
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start game and collect private role assignments
    const roleAssignmentPromise = collectRoleAssignments(sockets);

    const startPromises = sockets.map((socket) => waitForEvent(socket, 'game_started'));
    const stateUpdatePromises = sockets.map((socket) => waitForEvent(socket, 'game_state_update'));

    sockets[0].emit('start_game', { roomCode });

    await Promise.all(startPromises);

    const roleAssignments = await roleAssignmentPromise;
    let gameState = (await Promise.all(stateUpdatePromises))[0];

    // Acknowledge roles
    sockets.forEach((socket) => {
      socket.emit('confirm_role', { roomCode });
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    sockets[0].emit('join_game_dashboard', {
      roomCode,
      name: agents[0].name,
    });

    gameState = await waitForEvent(sockets[0], 'game_state_update', 8000);

    if (gameState.phase !== 'TEAM_SELECTION') {
      throw new Error(`Expected TEAM_SELECTION but got ${gameState.phase}`);
    }

    // Complete 3 successful quests to trigger assassination phase
    for (let round = 1; round <= 3; round++) {
      const leaderSocket = sockets.find((socket) => socket.id === gameState.currentLeader.id);
      const requiredSize = gameState.requiredTeamSize;

      const proposedTeamIds = gameState.players
        .slice(0, requiredSize)
        .map((player) => player.id);

      const proposalPromises = sockets.map((socket) => waitForEvent(socket, 'team_proposed'));

      leaderSocket.emit('propose_team', {
        roomCode,
        proposedTeamIds,
      });

      await Promise.all(proposalPromises);

      const voteResolvedPromises = sockets.map((socket) => waitForEvent(socket, 'vote_resolved'));
      const postVoteStatePromises = sockets.map((socket) => waitForEvent(socket, 'game_state_update'));

      sockets.forEach((socket) => {
        socket.emit('submit_vote', {
          roomCode,
          vote: 'approve',
        });
      });

      await Promise.all(voteResolvedPromises);
      gameState = (await Promise.all(postVoteStatePromises))[0];

      const teamSockets = sockets.filter((socket) => proposedTeamIds.includes(socket.id));

      const advancePromises = sockets.map((socket) =>
        waitForEvent(socket, 'quest_result_advance', 8000)
      );

      teamSockets.forEach((socket) => {
        socket.emit('submit_quest_vote', {
          roomCode,
          vote: 'success',
        });
      });

      const advanceResults = await Promise.all(advancePromises);
      const nextState = advanceResults[0];

      if (round === 3) {
        expect(nextState.state || nextState.phase).toBe('ASSASSINATION_PHASE');

        const assassin = findRoleAssignment(roleAssignments, 'Assassin');
        const merlin = findRoleAssignment(roleAssignments, 'Merlin');

        const gameOverPromises = sockets.map((socket) => waitForEvent(socket, 'game_over', 8000));

        assassin.socket.emit('submit_assassination', {
          roomCode,
          targetId: merlin.socketId,
        });

        const gameOverResults = await Promise.all(gameOverPromises);

        return {
          finalPayload: gameOverResults[0],
          sockets,
          agents,
          roleAssignments,
          assassin,
          merlin,
        };
      }

      sockets[0].emit('join_game_dashboard', {
        roomCode,
        name: agents[0].name,
      });

      gameState = await waitForEvent(sockets[0], 'game_state_update', 8000);
    }

    throw new Error('Good-win assassination flow did not reach assassination phase.');
  } catch (error) {
    sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

module.exports = {
  runEvilSabotageGame,
  runGoodWinThenSuccessfulAssassinationGame,
};