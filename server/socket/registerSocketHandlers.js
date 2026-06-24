const { registerLobbyHandlers } = require("./lobbyHandlers");
const { registerChatHandlers } = require("./chatHandlers");
const { registerGameHandlers } = require("./gameHandlers");
const { registerDisconnectHandlers } = require("./disconnectHandlers");

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`⚡ Agent Connected: ${socket.id}`);

    registerLobbyHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDisconnectHandlers(io, socket);
  });
}

module.exports = {
  registerSocketHandlers,
};