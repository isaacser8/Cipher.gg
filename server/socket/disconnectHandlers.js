const { rooms, deleteRoom } = require("../services/roomStore");

function registerDisconnectHandlers(io, socket) {
  socket.on("disconnect", () => {
    console.log(`🔌 Agent Disconnected: ${socket.id}`);

    const { roomCode, displayName } = socket;

    if (!roomCode || !rooms[roomCode]) return;

    const leavingPlayer = rooms[roomCode].find(
      (player) => player.name === displayName,
    );

    if (leavingPlayer) {
      leavingPlayer.isConnected = false;
    }

    setTimeout(() => {
      if (!rooms[roomCode]) return;

      const player = rooms[roomCode].find(
        (roomPlayer) => roomPlayer.name === displayName,
      );

      if (!player || player.isConnected) return;

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
    }, 3000);
  });
}

module.exports = {
  registerDisconnectHandlers,
};