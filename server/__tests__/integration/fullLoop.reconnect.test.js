/**
 * Full Loop: Reconnection
 *
 * Verifies that a player who disconnects and reconnects mid-game (getting a
 * brand-new socket.id from Socket.IO) doesn't lose their place in the game:
 * their votes, team membership, role, and (if evil) secure channel access
 * all need to be re-keyed from their old socket.id to their new one.
 *
 */

process.env.NODE_ENV = "test";

const { io } = require("../../server");

const {
  disconnectSockets,
  waitForEvent,
  createTestSockets,
  findRoleAssignment,
  findTeamAssignment,
  forceReconnect,
} = require("../../testHelpers/socketTestUtils");

const { setupStartedGame } = require("../../testHelpers/gameSetupHelpers");

const {
  buildFirstAvailableTeam,
  approveCurrentTeam,
} = require("../../testHelpers/questFlowHelpers");

const {
  runThreeSuccessfulQuestsToAssassination,
} = require("../../testHelpers/gameFlowHelpers");

const {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
} = require("../../testHelpers/dbTestUtils");

const PORT = 5006;

jest.setTimeout(60000);

describe("Full Loop: Reconnection", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test("reconnect mid-TEAM_VOTING: a re-cast vote after reconnect doesn't inflate the vote count", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_VOTE_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RV",
      clerkPrefix: "test_reconnect_vote",
    });

    try {
      const { sockets, gameState } = context;
      const proposedTeamIds = buildFirstAvailableTeam(gameState);
      const leaderSocket = sockets.find(
        (s) => s.id === gameState.currentLeader.id,
      );

      const proposalPromises = sockets.map((s) =>
        waitForEvent(s, "team_proposed", 10000),
      );
      leaderSocket.emit("propose_team", { roomCode, proposedTeamIds });
      await Promise.all(proposalPromises);

      const reconnectingSocket = sockets.find(
        (s) => s.id !== gameState.currentLeader.id,
      );

      // Cast this player's vote BEFORE reconnecting, under their old id.
      reconnectingSocket.emit("submit_vote", { roomCode, vote: "approve" });
      await new Promise((resolve) => setTimeout(resolve, 200));

      await forceReconnect({
        io,
        socket: reconnectingSocket,
        roomCode,
        displayName: reconnectingSocket.agent.name,
        clerkId: reconnectingSocket.agent.clerkId,
      });

      // Simulate the reconnected client re-submitting its vote, as it would if
      // teamVotesCast still listed the old id and `hasVoted` read false.
      reconnectingSocket.emit("submit_vote", { roomCode, vote: "approve" });

      const remainingSockets = sockets.filter((s) => s !== reconnectingSocket);
      const voteResolvedPromises = sockets.map((s) =>
        waitForEvent(s, "vote_resolved", 10000),
      );

      remainingSockets.forEach((s) => {
        s.emit("submit_vote", { roomCode, vote: "approve" });
      });

      const voteResults = await Promise.all(voteResolvedPromises);

      expect(voteResults[0].resolved).toBe(true);
      expect(voteResults[0].approved).toBe(true);
      expect(voteResults[0].approvals).toBe(playerCount);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("reconnect mid-QUEST_EXECUTION: reconnected team member can still submit their quest vote", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_QUEST_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RQ",
      clerkPrefix: "test_reconnect_quest",
    });

    try {
      const { sockets, gameState } = context;
      const proposedTeamIds = buildFirstAvailableTeam(gameState);

      await approveCurrentTeam({
        sockets,
        roomCode,
        gameState,
        proposedTeamIds,
      });

      const teamMemberSocket = sockets.find((s) =>
        proposedTeamIds.includes(s.id),
      );

      const { newId } = await forceReconnect({
        io,
        socket: teamMemberSocket,
        roomCode,
        displayName: teamMemberSocket.agent.name,
        clerkId: teamMemberSocket.agent.clerkId,
      });

      expect(proposedTeamIds).not.toContain(newId);

      const teamSockets = sockets.filter(
        (s) => proposedTeamIds.includes(s.id) || s === teamMemberSocket,
      );

      const advancePromises = sockets.map((s) =>
        waitForEvent(s, "quest_result_advance", 10000),
      );

      teamSockets.forEach((s) => {
        s.emit("submit_quest_vote", { roomCode, vote: "success" });
      });

      const results = await Promise.all(advancePromises);

      expect(results[0]).toBeTruthy();
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("reconnect during ROLE_ACKNOWLEDGEMENT: only the reconnected player's real re-confirmation advances the phase", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_CONFIRM_${Date.now()}`;
    const runId = Date.now().toString().slice(-6);

    const agents = Array.from({ length: playerCount }, (_, i) => ({
      name: `RC${i + 1}_${runId}`,
      clerkId: `test_reconnect_confirm_${runId}_${i + 1}`,
    }));

    const sockets = await createTestSockets({ agents, port: PORT });

    try {
      sockets[0].emit("join_room", {
        roomCode,
        displayName: agents[0].name,
        action: "host",
        clerkId: agents[0].clerkId,
      });
      await waitForEvent(sockets[0], "roster_update", 10000);

      for (let i = 1; i < playerCount; i++) {
        sockets[i].emit("join_room", {
          roomCode,
          displayName: agents[i].name,
          action: "join",
          clerkId: agents[i].clerkId,
        });
        await waitForEvent(sockets[i], "roster_update", 10000);
      }

      sockets.forEach((s) =>
        s.emit("status_update", { roomCode, isReady: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      const startPromises = sockets.map((s) =>
        waitForEvent(s, "game_started", 10000),
      );
      sockets[0].emit("start_game", { roomCode });
      await Promise.all(startPromises);

      // Reconnect one player before anyone confirms their role.
      const reconnectingSocket = sockets[1];

      await forceReconnect({
        io,
        socket: reconnectingSocket,
        roomCode,
        displayName: reconnectingSocket.agent.name,
        clerkId: reconnectingSocket.agent.clerkId,
      });

      const others = sockets.filter((s) => s !== reconnectingSocket);
      others.forEach((s) => s.emit("confirm_role", { roomCode }));

      await new Promise((resolve) => setTimeout(resolve, 500));

      sockets[0].emit("join_game_dashboard", {
        roomCode,
        name: agents[0].name,
      });
      const midState = await waitForEvent(
        sockets[0],
        "game_state_update",
        10000,
      );

      expect(midState.phase).toBe("ROLE_ACKNOWLEDGEMENT");

      const strategyPromises = sockets.map((s) =>
        waitForEvent(s, "game_state_update", 10000),
      );
      reconnectingSocket.emit("confirm_role", { roomCode });

      const finalStates = await Promise.all(strategyPromises);

      expect(finalStates[0].phase).toBe("PRE_GAME_STRATEGY");
    } finally {
      disconnectSockets(sockets);
    }
  });

  test("reconnect: evil player's new socket rejoins the secure _EVIL room", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_EVIL_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RE",
      clerkPrefix: "test_reconnect_evil",
    });

    try {
      const { roleAssignments } = context;
      const evilAssignment = findTeamAssignment(roleAssignments, "evil");
      const evilSocket = evilAssignment.socket;

      const { newId } = await forceReconnect({
        io,
        socket: evilSocket,
        roomCode,
        displayName: evilSocket.agent.name,
        clerkId: evilSocket.agent.clerkId,
      });

      const serverSocket = io.sockets.sockets.get(newId);

      expect(serverSocket?.rooms.has(`${roomCode}_EVIL`)).toBe(true);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("reconnect during ASSASSINATION_PHASE: reconnected Assassin can still submit their target", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_ASSASSIN_${Date.now()}`;

    const context = await runThreeSuccessfulQuestsToAssassination({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RA",
      clerkPrefix: "test_reconnect_assassin",
    });

    try {
      const { sockets, roleAssignments } = context;
      const assassin = findRoleAssignment(roleAssignments, "Assassin");
      const merlin = findRoleAssignment(roleAssignments, "Merlin");

      const { newId } = await forceReconnect({
        io,
        socket: assassin.socket,
        roomCode,
        displayName: assassin.socket.agent.name,
        clerkId: assassin.socket.agent.clerkId,
      });

      expect(newId).not.toBe(assassin.socketId);

      const gameOverPromises = sockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );
      assassin.socket.emit("submit_assassination", {
        roomCode,
        targetId: merlin.socketId,
      });

      const results = await Promise.all(gameOverPromises);

      expect(results[0].winner).toBe("evil");
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("reconnect: the host retains their host status", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_HOST_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RH",
      clerkPrefix: "test_reconnect_host",
    });

    try {
      const { sockets } = context;
      const hostSocket = sockets[0];

      const rosterPromise = waitForEvent(hostSocket, "roster_update", 10000);

      const { newId } = await forceReconnect({
        io,
        socket: hostSocket,
        roomCode,
        displayName: hostSocket.agent.name,
        clerkId: hostSocket.agent.clerkId,
      });

      const roster = await rosterPromise;
      const me = roster.find((p) => p.name === hostSocket.agent.name);

      expect(me).toBeTruthy();
      expect(me.id).toBe(newId);
      expect(me.isHost).toBe(true);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("reconnect while still in the lobby: player is not evicted and the lobby remains joinable", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_LOBBY_${Date.now()}`;
    const runId = Date.now().toString().slice(-6);

    const agents = Array.from({ length: playerCount }, (_, i) => ({
      name: `RL${i + 1}_${runId}`,
      clerkId: `test_reconnect_lobby_${runId}_${i + 1}`,
    }));

    const sockets = await createTestSockets({ agents, port: PORT });

    try {
      sockets[0].emit("join_room", {
        roomCode,
        displayName: agents[0].name,
        action: "host",
        clerkId: agents[0].clerkId,
      });
      await waitForEvent(sockets[0], "roster_update", 10000);

      for (let i = 1; i < playerCount; i++) {
        sockets[i].emit("join_room", {
          roomCode,
          displayName: agents[i].name,
          action: "join",
          clerkId: agents[i].clerkId,
        });
        await waitForEvent(sockets[i], "roster_update", 10000);
      }

      const targetSocket = sockets[2];

      const rosterPromise = waitForEvent(sockets[0], "roster_update", 10000);

      const { newId } = await forceReconnect({
        io,
        socket: targetSocket,
        roomCode,
        displayName: targetSocket.agent.name,
        clerkId: targetSocket.agent.clerkId,
      });

      const roster = await rosterPromise;
      const me = roster.find((p) => p.name === targetSocket.agent.name);

      expect(me).toBeTruthy();
      expect(me.id).toBe(newId);
      expect(me.isConnected).toBe(true);

      // Confirm the lobby is still fully functional afterward: everyone can
      // ready up and the host can still start the game normally.
      sockets.forEach((s) =>
        s.emit("status_update", { roomCode, isReady: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      const startPromises = sockets.map((s) =>
        waitForEvent(s, "game_started", 10000),
      );
      sockets[0].emit("start_game", { roomCode });

      await Promise.all(startPromises);
    } finally {
      disconnectSockets(sockets);
    }
  });

  test("reconnect: two players reconnecting around the same time are both remapped correctly", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_CONCURRENT_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RCC",
      clerkPrefix: "test_reconnect_concurrent",
    });

    try {
      const { sockets, gameState } = context;
      const proposedTeamIds = buildFirstAvailableTeam(gameState);
      const leaderSocket = sockets.find(
        (s) => s.id === gameState.currentLeader.id,
      );

      const [socketA, socketB] = sockets.filter(
        (s) => s.id !== gameState.currentLeader.id,
      );
      const oldIdA = socketA.id;
      const oldIdB = socketB.id;

      const [{ newId: newIdA }, { newId: newIdB }] = await Promise.all([
        forceReconnect({
          io,
          socket: socketA,
          roomCode,
          displayName: socketA.agent.name,
          clerkId: socketA.agent.clerkId,
        }),
        forceReconnect({
          io,
          socket: socketB,
          roomCode,
          displayName: socketB.agent.name,
          clerkId: socketB.agent.clerkId,
        }),
      ]);

      expect(newIdA).not.toBe(oldIdA);
      expect(newIdB).not.toBe(oldIdB);
      expect(newIdA).not.toBe(newIdB);

      // Confirm the game is still fully playable: propose and approve a team
      // using everyone's current ids, remapping the two reconnected players'
      // ids in the originally-computed team if they happened to be on it.
      const remapId = (id) => {
        if (id === oldIdA) return newIdA;
        if (id === oldIdB) return newIdB;
        return id;
      };
      const currentProposedTeamIds = proposedTeamIds.map(remapId);

      const proposalPromises = sockets.map((s) =>
        waitForEvent(s, "team_proposed", 10000),
      );
      leaderSocket.emit("propose_team", {
        roomCode,
        proposedTeamIds: currentProposedTeamIds,
      });
      await Promise.all(proposalPromises);

      const voteResolvedPromises = sockets.map((s) =>
        waitForEvent(s, "vote_resolved", 10000),
      );
      sockets.forEach((s) => {
        s.emit("submit_vote", { roomCode, vote: "approve" });
      });

      const voteResults = await Promise.all(voteResolvedPromises);

      expect(voteResults[0].resolved).toBe(true);
      expect(voteResults[0].approved).toBe(true);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("disconnect grace period: a reconnect during an active game is not evicted", async () => {
    const playerCount = 5;
    const roomCode = `TEST_RECONNECT_GRACE_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "RG",
      clerkPrefix: "test_reconnect_grace",
    });

    try {
      const { sockets } = context;
      const targetSocket = sockets[1];

      const watcherPromise = waitForEvent(sockets[0], "player_left", 4000);

      await forceReconnect({
        io,
        socket: targetSocket,
        roomCode,
        displayName: targetSocket.agent.name,
        clerkId: targetSocket.agent.clerkId,
      });

      await expect(watcherPromise).rejects.toThrow(/Timeout/);
    } finally {
      disconnectSockets(context.sockets);
    }
  }, 15000);
});
