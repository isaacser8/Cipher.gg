const { rooms, roomLogs, activeGames } = require("../services/roomStore");

const MAX_MESSAGE_LENGTH = 500;

function getSocketPlayer(socket) {
  const roomCode = socket.roomCode;
  const displayName = socket.displayName;

  if (!roomCode || !displayName || !rooms[roomCode]) {
    return { roomCode: null, player: null };
  }

  const player = rooms[roomCode].find(
    (roomPlayer) =>
      roomPlayer.id === socket.id && roomPlayer.name === displayName,
  );

  return { roomCode, player };
}

function getPlayerRoleData(roomCode, player) {
  const game = activeGames[roomCode];

  if (!game || !game.roleAssignments || !player) {
    return null;
  }

  return game.roleAssignments.get(player.id) || null;
}

function sanitizeMessage(value) {
  return String(value || "").trim().slice(0, MAX_MESSAGE_LENGTH);
}

function getTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function registerChatHandlers(io, socket) {
  socket.on("send_message", ({ message, channel = "global" }) => {
    const { roomCode, player } = getSocketPlayer(socket);

    if (!roomCode || !player) {
      return socket.emit(
        "game_error",
        "ACCESS DENIED: You are not connected to a valid room.",
      );
    }

    const cleanMessage = sanitizeMessage(message);

    if (!cleanMessage) return;

    const safeChannel = channel === "evil" ? "evil" : "global";
    const timestamp = getTimestamp();

    if (safeChannel === "evil") {
      const game = activeGames[roomCode];
      const roleData = getPlayerRoleData(roomCode, player);

      if (!game || game.getState().phase !== "PRE_GAME_STRATEGY") {
        return socket.emit(
          "game_error",
          "ACCESS DENIED: Secure comms channel is locked.",
        );
      }

      if (roleData?.team !== "evil") {
        return socket.emit(
          "game_error",
          "ACCESS DENIED: Evil comms are restricted to evil agents.",
        );
      }

      const formatted = `[${timestamp}] [EVIL] ${player.name}: ${cleanMessage}`;

      io.to(`${roomCode}_EVIL`).emit("receive_message", { 
        text: formatted,
        channel: "evil",
      });

      return;
    }

    const formatted = `[${timestamp}] ${player.name}: ${cleanMessage}`;

    roomLogs[roomCode]?.push(formatted);

    io.to(roomCode).emit("receive_message", { 
      text: formatted,
      channel: "global",
    });
  });
}

module.exports = {
  registerChatHandlers,
};