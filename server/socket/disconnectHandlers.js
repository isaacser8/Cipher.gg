const { rooms, activeGames, deleteRoom } = require("../services/roomStore");

function registerDisconnectHandlers(io, socket) {
  socket.on("disconnect", () => {
    console.log(`🔌 Agent Disconnected: ${socket.id}`);

    const { roomCode, displayName } = socket;

    if (!roomCode || !rooms[roomCode]) return;

    const leavingPlayer = rooms[roomCode].find(
      (player) => player.name === displayName,
    );

    // Only mark disconnected if this socket is still the roster's current
    // socket for that player — a belated/out-of-order disconnect from a
    // socket that's already been superseded by a reconnect must not undo it.
    if (leavingPlayer && leavingPlayer.id === socket.id) {
      leavingPlayer.isConnected = false;
    }

    // Mid-game disconnects get a much longer grace period than lobby ones:
    // a real reconnect (phone lock, WiFi drop) realistically takes longer
    // than a few seconds, and evicting mid-game is a one-way door (rejoining
    // an active game is rejected once the player leaves the roster).
    const gracePeriodMs = activeGames[roomCode] ? 45000 : 3000;

    setTimeout(() => {
      if (!rooms[roomCode]) return;

      const player = rooms[roomCode].find(
        (roomPlayer) => roomPlayer.name === displayName,
      );

      if (!player || player.id !== socket.id || player.isConnected) return;

      rooms[roomCode] = rooms[roomCode].filter(
        (roomPlayer) => roomPlayer.name !== displayName,
      );

      io.to(roomCode).emit("player_left", {
        id: socket.id,
        name: displayName,
      });

      if (player.isHost && rooms[roomCode].length > 0) {
        rooms[roomCode][0].isHost = true;
      }

      if (rooms[roomCode].length === 0) {
        deleteRoom(roomCode);
      } else {
        io.to(roomCode).emit("roster_update", rooms[roomCode]);
      }
    }, gracePeriodMs);
  });
}

module.exports = {
  registerDisconnectHandlers,
};