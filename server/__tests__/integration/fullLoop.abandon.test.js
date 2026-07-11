/**
 * Full Loop: Abandoned Match
 *
 * Verifies that when a player disconnects mid-game and never reconnects
 * within the grace period, the match ends immediately as "abandoned"
 */

process.env.NODE_ENV = "test";

const { io } = require("../../server");

const Match = require("../../models/Match");
const User = require("../../models/User");

const {
  disconnectSockets,
  waitForEvent,
  forceReconnect,
} = require("../../testHelpers/socketTestUtils");

const { setupStartedGame } = require("../../testHelpers/gameSetupHelpers");

const {
  buildFirstAvailableTeam,
  approveCurrentTeam,
} = require("../../testHelpers/questFlowHelpers");

const {
  runThreeSuccessfulQuestsToAssassination,
  runVoteHammerGame,
} = require("../../testHelpers/gameFlowHelpers");

const {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
} = require("../../testHelpers/dbTestUtils");

const { activeGames } = require("../../services/roomStore");

const PORT = 5006;

jest.setTimeout(30000);

describe("Full Loop: Abandoned Match", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test("a player who never reconnects ends the match as abandoned, mid-quest-execution", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "AB",
      clerkPrefix: "test_abandon_quest",
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
      const remainingSockets = sockets.filter((s) => s !== teamMemberSocket);
      const departedName = teamMemberSocket.agent.name;

      const gameOverPromises = remainingSockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );

      // Manual disconnect
      teamMemberSocket.disconnect();

      const results = await Promise.all(gameOverPromises);

      expect(results[0].phase).toBe("GAME_OVER");
      expect(results[0].winner).toBe("abandoned");
      expect(results[0].winReason).toContain(departedName);

      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch).toBeTruthy();
      expect(savedMatch.winner).toBe("abandoned");
      expect(savedMatch.players).toHaveLength(playerCount);

      const departedUser = await User.findOne({
        clerkId: teamMemberSocket.agent.clerkId,
      });
      const remainingUser = await User.findOne({
        clerkId: remainingSockets[0].agent.clerkId,
      });

      expect(departedUser.stats.matchesPlayed).toBe(0);
      expect(remainingUser.stats.matchesPlayed).toBe(0);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("two players disconnecting around the same time only abandon the match once", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_CONCURRENT_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "ABC",
      clerkPrefix: "test_abandon_concurrent",
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

      const [firstToLeave, secondToLeave, ...remainingSockets] = sockets;

      const gameOverPromises = remainingSockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );

      // Both disconnect close together, so their grace-period timers expire
      // around the same time.
      firstToLeave.disconnect();
      secondToLeave.disconnect();

      const results = await Promise.all(gameOverPromises);

      expect(results[0].phase).toBe("GAME_OVER");
      expect(results[0].winner).toBe("abandoned");

      const matches = await Match.find({ roomCode });

      expect(matches).toHaveLength(1);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("a player who never reconnects ends the match as abandoned, during ASSASSINATION_PHASE", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_ASSASSINATION_${Date.now()}`;

    const context = await runThreeSuccessfulQuestsToAssassination({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "ABA",
      clerkPrefix: "test_abandon_assassination",
    });

    try {
      const { sockets } = context;
      const [departingSocket, ...remainingSockets] = sockets;
      const departedName = departingSocket.agent.name;

      const gameOverPromises = remainingSockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );

      departingSocket.disconnect();

      const results = await Promise.all(gameOverPromises);

      expect(results[0].phase).toBe("GAME_OVER");
      expect(results[0].winner).toBe("abandoned");
      expect(results[0].winReason).toContain(departedName);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("a non-team-member's disconnect during QUEST_EXECUTION also abandons the match", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_BYSTANDER_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "ABB",
      clerkPrefix: "test_abandon_bystander",
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

      const bystanderSocket = sockets.find(
        (s) => !proposedTeamIds.includes(s.id),
      );
      const remainingSockets = sockets.filter((s) => s !== bystanderSocket);
      const departedName = bystanderSocket.agent.name;

      const gameOverPromises = remainingSockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );

      bystanderSocket.disconnect();

      const results = await Promise.all(gameOverPromises);

      expect(results[0].phase).toBe("GAME_OVER");
      expect(results[0].winner).toBe("abandoned");
      expect(results[0].winReason).toContain(departedName);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("a player who reconnects once and then truly leaves still abandons the match under their current id", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_AFTER_RECONNECT_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "ABR",
      clerkPrefix: "test_abandon_after_reconnect",
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

      const targetSocket = sockets[1];
      const remainingSockets = sockets.filter((s) => s !== targetSocket);
      const departedName = targetSocket.agent.name;

      // Recover once first - a real network blip, not the final departure.
      await forceReconnect({
        io,
        socket: targetSocket,
        roomCode,
        displayName: targetSocket.agent.name,
        clerkId: targetSocket.agent.clerkId,
      });

      const gameOverPromises = remainingSockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );

      // Now genuinely gone, under their new (post-reconnect) id.
      targetSocket.disconnect();

      const results = await Promise.all(gameOverPromises);

      expect(results[0].phase).toBe("GAME_OVER");
      expect(results[0].winner).toBe("abandoned");
      expect(results[0].winReason).toContain(departedName);

      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch).toBeTruthy();
      expect(savedMatch.winner).toBe("abandoned");
      expect(savedMatch.players).toHaveLength(playerCount);
    } finally {
      disconnectSockets(context.sockets);
    }
  });

  test("a player who disconnects after the game already legitimately ended does not overwrite the result as abandoned", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_AFTER_GAMEOVER_${Date.now()}`;

    const context = await runVoteHammerGame({
      playerCount,
      port: PORT,
      roomCode,
    });

    try {
      const { sockets, finalPayload } = context;

      expect(finalPayload.winner).toBe("evil");

      // The game already legitimately ended (5 rejected teams).
      sockets[0].disconnect();

      // Give the grace-period window (1500ms in test mode) a chance to fire,
      // if it were somehow going to.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch.winner).toBe("evil");

      const matches = await Match.find({ roomCode });

      expect(matches).toHaveLength(1);
    } finally {
      disconnectSockets(context.sockets);
    }
  }, 15000);

  test("reconnecting after the match was already abandoned starts fresh in the lobby, not the old game", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ABANDON_LATE_RECONNECT_${Date.now()}`;

    const context = await setupStartedGame({
      playerCount,
      port: PORT,
      roomCode,
      namePrefix: "ABL",
      clerkPrefix: "test_abandon_late_reconnect",
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

      const targetSocket = sockets[1];
      const remainingSockets = sockets.filter((s) => s !== targetSocket);

      const gameOverPromises = remainingSockets.map((s) =>
        waitForEvent(s, "game_over", 10000),
      );

      targetSocket.disconnect();

      await Promise.all(gameOverPromises);

      // The match is already fully abandoned by this point. Now the
      // departed player tries to come back, too late to rejoin the game
      const rosterPromise = waitForEvent(
        remainingSockets[0],
        "roster_update",
        10000,
      );

      targetSocket.connect();
      await waitForEvent(targetSocket, "connect", 10000);
      targetSocket.emit("join_room", {
        roomCode,
        displayName: targetSocket.agent.name,
        action: "join",
        clerkId: targetSocket.agent.clerkId,
      });

      const roster = await rosterPromise;

      // Rejoining after the match ended lands them in a freshly reset
      // lobby, not back inside the finished game.
      expect(roster.every((p) => p.isReady === false)).toBe(true);
      expect(activeGames[roomCode]).toBeUndefined();
    } finally {
      disconnectSockets(context.sockets);
    }
  }, 15000);
});
