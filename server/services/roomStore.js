const rooms = {};
const roomSettings = {};
const roomLogs = {};
const activeGames = {};

function getOrInitRoom(roomCode) {
  if (!rooms[roomCode]) rooms[roomCode] = [];
  if (!roomSettings[roomCode]) roomSettings[roomCode] = { teamSize: 5 };
  if (!roomLogs[roomCode]) roomLogs[roomCode] = [];
}

function deleteRoom(roomCode) {
  delete rooms[roomCode];
  delete roomSettings[roomCode];
  delete roomLogs[roomCode];
  delete activeGames[roomCode];
}

module.exports = {
  rooms,
  roomSettings,
  roomLogs,
  activeGames,
  getOrInitRoom,
  deleteRoom,
};