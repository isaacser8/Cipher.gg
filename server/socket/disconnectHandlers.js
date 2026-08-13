const { rooms, activeGames, deleteRoom } = require("../services/roomStore");
const { saveMatchRecord } = require("../services/matchService");
const { broadcastGameState } = require("../services/gameStatePresenter");

const isTestEnv = process.env.NODE_ENV === "test";
const LOBBY_GRACE_MS = isTestEnv ? 1500 : 3000;
const GAME_GRACE_MS = isTestEnv ? 1500 : 45000;

function registerDisconnectHandlers(io, socket) {
  socket.on("disconnect", () => {
    if (!isTestEnv) {
      console.log(`🔌 Agent Disconnected: ${socket.id}`);
    }

    const { roomCode, displayName } = socket;

    if (!roomCode || !rooms[roomCode]) return;

    const leavingPlayer = rooms[roomCode].find(
      (player) => player.name === displayName,
    );

    // Only mark disconnected if this socket is still the roster's current
    // socket for that player
    if (leavingPlayer && leavingPlayer.id === socket.id) {
      leavingPlayer.isConnected = false;
    }

    // Mid-game disconnects get a much longer grace period than lobby ones:
    const hasActiveGame =
      activeGames[roomCode] &&
      activeGames[roomCode].getState().phase !== "GAME_OVER";

    const gracePeriodMs = hasActiveGame ? GAME_GRACE_MS : LOBBY_GRACE_MS;

    setTimeout(async () => {
      if (!rooms[roomCode]) return;

      const player = rooms[roomCode].find(
        (roomPlayer) => roomPlayer.name === displayName,
      );

      if (!player || player.id !== socket.id || player.isConnected) return;

      const game = activeGames[roomCode];
      let abandonResult = null;
      // End and save the match before publishing the completion event.
      // The original roster is still intact here, so all players are persisted.
      if (game && game.getState().phase !== "GAME_OVER") {
        abandonResult = game.forceAbandon(
          `Agent ${displayName} disconnected and did not reconnect in time.`,
        );

        try {
          await saveMatchRecord({
            roomCode,
            gameResult: abandonResult,
            game,
            roomPlayers: rooms[roomCode],
          });
        } catch (err) {
          console.error(
            `❌ Failed to save abandoned match for room ${roomCode}:`,
            err,
          );

            if (isTestEnv) {
              throw err;
            }
        }
      }

      rooms[roomCode] = rooms[roomCode].filter(
        (roomPlayer) => roomPlayer.name !== displayName,
      );

      if (player.isHost && rooms[roomCode].length > 0) {
        rooms[roomCode][0].isHost = true;
      }

      io.to(roomCode).emit("player_left", {
        id: socket.id,
        name: displayName,
      });

      if (rooms[roomCode].length === 0) {
        deleteRoom(roomCode);
      } else {
        io.to(roomCode).emit("roster_update", rooms[roomCode]);
      }

      // Publish game_over only after persistence and roster cleanup finish.
      if (abandonResult) {
        io.to(roomCode).emit("game_over", abandonResult);
        broadcastGameState(io, roomCode);
      }
    }, gracePeriodMs);
  });
}

module.exports = {
  registerDisconnectHandlers,
};
