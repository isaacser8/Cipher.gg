/**
 * Full Loop: Persistence
 *
 * Purpose:
 * Verifies the saved MongoDB records after a full game.
 *
 * This test verifies the records contain:
 * - Match.players contains every player
 * - logged-in players are linked through userId
 * - guestName is null for logged-in users
 * - final roles and teams are revealed in the saved Match
 * - matching User documents exist for generated Clerk IDs
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

describe("Full Loop: Persistence", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test("saved Match includes revealed roles and linked logged-in users", async () => {
    const playerCount = 5;
    const roomCode = `TEST_PERSISTENCE_${playerCount}_${Date.now()}`;

    const { sockets, agents } = await runThreeSabotagedQuests({
      playerCount,
      port: PORT,
      roomCode,
    });

    try {
      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch).toBeTruthy();
      expect(savedMatch.players).toHaveLength(playerCount);

      savedMatch.players.forEach((player) => {
        expect(player.userId).toBeTruthy();
        expect(player.guestName).toBeNull();
        expect(player.role).toBeTruthy();
        expect(player.team).toMatch(/good|evil/);
      });

      const users = await User.find({
        clerkId: { $in: agents.map((agent) => agent.clerkId) },
      });

      expect(users).toHaveLength(playerCount);
    } finally {
      disconnectSockets(sockets);
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
  }, 60000);
});