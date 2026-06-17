/**
 * Full Loop: Good Win
 *
 * Purpose:
 * Verifies the full Good victory path through real Socket.IO events.
 * The game reaches ASSASSINATION_PHASE after Good secures 3 quests,
 * then Good wins because the Assassin fail to target Merlin.
 *
 * This covers the opposite assassination outcome from the successful assassination test
 * and confirms that all user stats are saved correctly.
 */
process.env.NODE_ENV = "test";

const Match = require("../../models/Match");
const User = require("../../models/User");

const { disconnectSockets } = require("../../testHelpers/socketTestUtils");
const { runGoodWinWrongAssassinationGame } = require("../../testHelpers/gameFlowHelpers");

const {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
} = require("../../testHelpers/dbTestUtils");

const PORT = 5006;

jest.setTimeout(90000);

describe("Full Loop: Good Win", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test("good wins when Assassin guesses the wrong target", async () => {
    const playerCount = 5;
    const roomCode = `TEST_GOOD_WIN_${playerCount}_${Date.now()}`;

    const { finalPayload, sockets, agents } = await runGoodWinWrongAssassinationGame({
      playerCount,
      port: PORT,
      roomCode,
    });

    try {
      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch).toBeTruthy();
      expect(savedMatch.winner).toBe("good");
      expect(savedMatch.players).toHaveLength(playerCount);
      expect(savedMatch.questHistory).toHaveLength(3);

      expect(finalPayload.phase).toBe("GAME_OVER");
      expect(finalPayload.winner).toBe("good");

      const users = await User.find({
        clerkId: { $in: agents.map((agent) => agent.clerkId) },
      });

      const goodPlayers = savedMatch.players.filter((player) => player.team === "good");
      const goodUserIds = goodPlayers.map((player) => player.userId.toString());

      const goodUsers = users.filter((user) => goodUserIds.includes(user._id.toString()));

      goodUsers.forEach((user) => {
        expect(user.stats.winsAsGood).toBe(1);
      });
    } finally {
      disconnectSockets(sockets);
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
  }, 60000);
});