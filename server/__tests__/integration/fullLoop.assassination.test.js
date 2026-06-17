/**
 * Full Loop: Successful Assassination
 *
 * Purpose:
 * Verifies the full path for assassination to occur through Socket.IO events.
 * The game first reaches ASSASSINATION_PHASE after Good secures 3 quests,
 * then Evil wins because the Assassin correctly targets Merlin.
 *
 * This test also verifies side effects:
 * - the completed Match is saved to MongoDB
 * - the Assassin user receives winsAsEvil
 * - the Assassin user receives successfulAssassinations
 */

process.env.NODE_ENV = "test";

const Match = require("../../models/Match");
const User = require("../../models/User");

const { disconnectSockets } = require("../../testHelpers/socketTestUtils");
const { runSuccessfulAssassinationGame } = require("../../testHelpers/gameFlowHelpers");

const {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
} = require("../../testHelpers/dbTestUtils");

const PORT = 5006;

jest.setTimeout(90000);

describe("Full Loop: Successful Assassination", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test("evil wins when Assassin correctly targets Merlin after 3 successful quests", async () => {
    const playerCount = 5;
    const roomCode = `TEST_ASSASSINATION_${playerCount}_${Date.now()}`;

    const { finalPayload, sockets, agents, assassin } = await runSuccessfulAssassinationGame({
      playerCount,
      port: PORT,
      roomCode,
    });

    try {
      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch).toBeTruthy();
      expect(savedMatch.winner).toBe("evil");
      expect(savedMatch.winReason).toContain("Merlin has fallen");

      expect(finalPayload.phase).toBe("GAME_OVER");
      expect(finalPayload.winner).toBe("evil");

      const users = await User.find({
        clerkId: { $in: agents.map((agent) => agent.clerkId) },
      });

      const assassinUser = users.find(
        (user) => user.clerkId === assassin.socket.agent.clerkId
      );

      expect(assassinUser).toBeTruthy();
      expect(assassinUser.stats.winsAsEvil).toBe(1);
      expect(assassinUser.stats.successfulAssassinations).toBe(1);
    } finally {
      disconnectSockets(sockets);
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
  }, 60000);
});