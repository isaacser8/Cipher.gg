process.env.NODE_ENV = 'test'; 
require("dotenv").config(); 

const mongoose = require('mongoose');
const Match = require('../../models/Match'); 
const User = require('../../models/User');
const { testServer, dbReady, io } = require('../../server'); 

const {
  disconnectSockets,
} = require('../../testHelpers/socketTestUtils');

const {
  runEvilSabotageGame,
  runGoodWinThenSuccessfulAssassinationGame,
} = require('../../testHelpers/gameFlowHelpers');

const PORT = 5006; 

// In case MongoDB is slow to connect
jest.setTimeout(90000);

describe('Full Game Loop Integration & Database Verification', () => {
  beforeAll(async () => {
    await dbReady;

    if (!testServer.listening) {
      await new Promise((resolve) => {
        testServer.listen(PORT, resolve);
      });
    }
  }, 30000);

  afterAll(async () => {
    await Match.deleteMany({ roomCode: { $regex: '^TEST_LOOP_' } });
    await Match.deleteMany({ roomCode: { $regex: '^TEST_ASSASSINATION_' } });

    await User.deleteMany({ clerkId: { $regex: '^test_full_loop_' } });
    await User.deleteMany({ clerkId: { $regex: '^test_assassination_' } });

    io.close();

    if (testServer.listening) {
      await new Promise((resolve) => testServer.close(resolve));
    }
    
    await mongoose.disconnect();
  });

  test.each([5, 7, 10])(
    'completes evil-win full loop and persists Match/User stats for %i players',
    async (playerCount) => {
      const roomCode = `TEST_LOOP_${playerCount}_${Date.now()}`;

      await Match.deleteMany({ roomCode });
      await User.deleteMany({
        clerkId: { $regex: `^test_full_loop_${playerCount}_` },
      });

      const { finalPayload, sockets, agents } = await runEvilSabotageGame({
        playerCount,
        port: PORT,
        roomCode,
      });

      try {
        const savedMatch = await Match.findOne({ roomCode });

        expect(savedMatch).toBeTruthy();
        expect(savedMatch.winner).toBe('evil');
        expect(savedMatch.players).toHaveLength(playerCount);
        expect(savedMatch.questHistory).toHaveLength(3);

        expect(finalPayload.phase).toBe('GAME_OVER');
        expect(finalPayload.winner).toBe('evil');
        expect(finalPayload.questHistory).toHaveLength(3);
        expect(finalPayload.winReason).toBeTruthy();

        const users = await User.find({
          clerkId: { $in: agents.map((agent) => agent.clerkId) },
        });

        savedMatch.players.forEach((player) => {
          expect(player.role).toBeTruthy();
          expect(player.team).toMatch(/good|evil/);
        });

        expect(users).toHaveLength(playerCount);

        users.forEach((user) => {
          expect(user.stats.matchesPlayed).toBe(1);
        });

        const evilPlayers = savedMatch.players.filter((player) => player.team === 'evil');
        const evilUserIds = evilPlayers
          .filter((player) => player.userId)
          .map((player) => player.userId.toString());

        const evilUsers = users.filter((user) => evilUserIds.includes(user._id.toString()));

        evilUsers.forEach((user) => {
          expect(user.stats.winsAsEvil).toBe(1);
        });

        const goodPlayers = savedMatch.players.filter((player) => player.team === 'good');
        const goodUserIds = goodPlayers
          .filter((player) => player.userId)
          .map((player) => player.userId.toString());

        const goodUsers = users.filter((user) => goodUserIds.includes(user._id.toString()));

        goodUsers.forEach((user) => {
          expect(user.stats.winsAsEvil).toBe(0);
        });

      } finally {
        disconnectSockets(sockets);
        await new Promise((resolve) => setTimeout(resolve, 3500));
      }
    },
    60000,
  );

  test(
    'completes Good-win path, resolves successful assassination, and persists Assassin stats',
    async () => {
      const playerCount = 5;
      const roomCode = `TEST_ASSASSINATION_${playerCount}_${Date.now()}`;

      await Match.deleteMany({ roomCode });
      await User.deleteMany({
        clerkId: { $regex: '^test_assassination_' },
      });

      const { finalPayload, sockets, agents, assassin } =
        await runGoodWinThenSuccessfulAssassinationGame({
          playerCount,
          port: PORT,
          roomCode,
        });

      try {
        const savedMatch = await Match.findOne({ roomCode });

        expect(savedMatch).toBeTruthy();
        expect(savedMatch.winner).toBe('evil');
        expect(savedMatch.winReason).toContain('Merlin has fallen');
        expect(savedMatch.players).toHaveLength(playerCount);
        expect(savedMatch.questHistory).toHaveLength(3);

        expect(finalPayload.phase).toBe('GAME_OVER');
        expect(finalPayload.winner).toBe('evil');
        expect(finalPayload.winReason).toContain('Merlin has fallen');

        savedMatch.players.forEach((player) => {
          expect(player.role).toBeTruthy();
          expect(player.team).toMatch(/good|evil/);
        });

        const users = await User.find({
          clerkId: { $in: agents.map((agent) => agent.clerkId) },
        });

        expect(users).toHaveLength(playerCount);

        users.forEach((user) => {
          expect(user.stats.matchesPlayed).toBe(1);
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
    },
    60000,
  );
});