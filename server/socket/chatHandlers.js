const { roomLogs, activeGames } = require("../services/roomStore");

function registerChatHandlers(io, socket) {
  socket.on("send_message", ({ roomCode, sender, message, channel }) => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    if (channel === "evil") {
      const game = activeGames[roomCode];

      if (game && game.getState().phase !== "PRE_GAME_STRATEGY") {
        return socket.emit(
          "game_error",
          "ACCESS DENIED: Secure comms channel is locked.",
        );
      }

      const formatted = `[${timestamp}] [EVIL] ${sender}: ${message}`;
      io.to(`${roomCode}_EVIL`).emit("receive_message", { text: formatted });

      return;
    }

    const formatted = `[${timestamp}] ${sender}: ${message}`;

    roomLogs[roomCode]?.push(formatted);
    io.to(roomCode).emit("receive_message", { text: formatted });
  });
}

module.exports = {
  registerChatHandlers,
};