const { rooms, activeGames } = require("./roomStore");

function buildClientGameState(roomCode) {
  const game = activeGames[roomCode];
  if (!game) return null;

  const roomPlayers = rooms[roomCode] ?? [];
  const fsm = game.getState();

  return {
    ...fsm,
    gameId: game.gameId,
    players: roomPlayers.map((player) => {
      const playerData = {
        id: player.id,
        name: player.name,
        isLeader: fsm.currentLeader?.id === player.id,
        isOnTeam: (fsm.proposedTeam ?? []).includes(player.id),
      };

      if (fsm.phase === "GAME_OVER" && game.roleAssignments) {
        const roleInfo = game.roleAssignments.get(player.id);

        if (roleInfo) {
          playerData.role = roleInfo.role;
          playerData.team = roleInfo.team;
        }
      }

      return playerData;
    }),
  };
}

function broadcastGameState(io, roomCode) {
  io.to(roomCode).emit("game_state_update", buildClientGameState(roomCode));
}

module.exports = {
  buildClientGameState,
  broadcastGameState,
};