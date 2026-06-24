/**
 * Full Loop: Vote Hammer
 *
 * Purpose:
 * Verifies that Evil wins when 5 consecutive team proposals are rejected.
 *
 * This test exercises the full Socket.IO voting flow, which is 
 * leader proposes team → all players reject → server advances failed vote count.
 *
 * It also confirms that the final GAME_OVER state and Match saving happen
 * through server handlers, not GameStateMachine calls.
 */

process.env.NODE_ENV = "test";

const Match = require("../../models/Match");

const { disconnectSockets } = require("../../testHelpers/socketTestUtils");
const { runVoteHammerGame } = require("../../testHelpers/gameFlowHelpers");

const {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
} = require("../../testHelpers/dbTestUtils");

const PORT = 5006;

jest.setTimeout(90000);

describe("Full Loop: Vote Hammer", () => {
  beforeAll(async () => {
    await startIntegrationServer(PORT);
  }, 30000);

  afterAll(async () => {
    await cleanupIntegrationData();
    await stopIntegrationServer();
  });

  test("evil wins after 5 consecutive rejected teams and persists match", async () => {
    const playerCount = 5;
    const roomCode = `TEST_VOTE_HAMMER_${playerCount}_${Date.now()}`;

    const { finalPayload, sockets } = await runVoteHammerGame({
      playerCount,
      port: PORT,
      roomCode,
    });

    try {
      expect(finalPayload.phase).toBe("GAME_OVER");
      expect(finalPayload.winner).toBe("evil");
      expect(finalPayload.winReason).toContain("Five consecutive teams rejected");

      const savedMatch = await Match.findOne({ roomCode });

      expect(savedMatch).toBeTruthy();
      expect(savedMatch.winner).toBe("evil");
      expect(savedMatch.winReason).toContain("Five consecutive teams rejected");
    } finally {
      disconnectSockets(sockets);
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
  }, 60000);
});