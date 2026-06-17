/**
 * Full Loop: Evil Win
 *
 * Purpose:
 * Verifies that a complete real time game can run through Socket.IO,
 * end with Evil winning after 3 failed quests, and save the final
 * Match/User data to MongoDB.
 *
 * This is an integration test, not a unit test:
 * it intentionally exercises sockets, game state transitions, and database writes together.
 */

process.env.NODE_ENV = "test";

const Match = require("../../models/Match");
const User = require("../../models/User");

const { disconnectSockets } = require("../../testHelpers/socketTestUtils");
const { runThreeSabotagedQuests } = require("../../testHelpers/gameFlowHelpers");

const {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
} = require("../../testHelpers/dbTestUtils");

const PORT = 5006;

jest.setTimeout(90000);

describe("Full Loop: Evil Win", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test.each([5, 7, 10])(
    "evil wins by sabotaging 3 quests for %i players and persists DB records",
    async (playerCount) => {
      const roomCode = `TEST_EVIL_${playerCount}_${Date.now()}`;

      const { finalPayload, sockets, agents } = await runThreeSabotagedQuests({
        playerCount,
        port: PORT,
        roomCode,
      });

      try {
        const savedMatch = await Match.findOne({ roomCode });

        expect(savedMatch).toBeTruthy();
        expect(savedMatch.winner).toBe("evil");
        expect(savedMatch.players).toHaveLength(playerCount);
        expect(savedMatch.questHistory).toHaveLength(3);

        expect(finalPayload.phase).toBe("GAME_OVER");
        expect(finalPayload.winner).toBe("evil");

        const users = await User.find({
          clerkId: { $in: agents.map((agent) => agent.clerkId) },
        });

        expect(users).toHaveLength(playerCount);

        users.forEach((user) => {
          expect(user.stats.matchesPlayed).toBe(1);
        });

        const evilPlayers = savedMatch.players.filter((player) => player.team === "evil");
        const evilUserIds = evilPlayers.map((player) => player.userId.toString());

        const evilUsers = users.filter((user) => evilUserIds.includes(user._id.toString()));

        evilUsers.forEach((user) => {
          expect(user.stats.winsAsEvil).toBe(1);
        });
      } finally {
        disconnectSockets(sockets);
        await new Promise((resolve) => setTimeout(resolve, 3500));
      }
    },
    60000,
  );
});