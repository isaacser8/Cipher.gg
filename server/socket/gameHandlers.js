const GameStateMachine = require("../gameEngine/GameStateMachine");

const {
  MIN_PLAYERS,
  MAX_PLAYERS,
  isSupportedPlayerCount,
} = require("../gameEngine/config/gameConfig");

const {
  rooms,
  roomSettings,
  activeGames,
  getOrInitRoom,
} = require("../services/roomStore");

const {
  buildClientGameState,
  broadcastGameState,
} = require("../services/gameStatePresenter");

const { saveMatchRecord } = require("../services/matchService");

function registerGameHandlers(io, socket) {
  socket.on("start_game", ({ roomCode }) => {
    getOrInitRoom(roomCode);

    const players = rooms[roomCode];
    const configuredTeamSize = roomSettings[roomCode]?.teamSize ?? MIN_PLAYERS;

    if (!players || !isSupportedPlayerCount(players.length)) {
      return socket.emit(
        "game_error",
        `Needs between ${MIN_PLAYERS} and ${MAX_PLAYERS} players to start.`,
      );
    }

    if (players.length !== configuredTeamSize) {
      return socket.emit(
        "game_error",
        `Needs exactly ${configuredTeamSize} players to start this lobby.`,
      );
    }

    const requester = players.find((player) => player.id === socket.id);

    if (!requester?.isHost) {
      return socket.emit("game_error", "Only the host can start the game.");
    }

    const allReady = players.every((player) => player.isReady);

    if (!allReady) {
      return socket.emit("game_error", "All agents must be ready before starting.");
    }

    const fsm = new GameStateMachine(players);
    fsm.gameId = Date.now();

    activeGames[roomCode] = fsm;

    fsm.startGame();

    const roleAssignments = fsm.roleAssignments;

    players.forEach((player) => {
      const roleData = roleAssignments.get(player.id);

      io.to(player.id).emit("role_assigned", {
        role: roleData.role,
        team: roleData.team,
        specialInfo: roleData.specialInfo,
      });

      if (roleData.team === "evil") {
        const playerSocket = io.sockets.sockets.get(player.id);

        if (playerSocket) {
          playerSocket.join(`${roomCode}_EVIL`);
        }
      }
    });

    io.to(roomCode).emit("game_started");
    broadcastGameState(io, roomCode);

    console.log(`🎮 Game started in room ${roomCode}. Waiting for acknowledgements.`);
  });

  socket.on("confirm_role", ({ roomCode }) => {
    const game = activeGames[roomCode];

    if (!game) return;

    try {
      const result = game.confirmRole(socket.id);

      if (result.readyForStrategy) {
        console.log(`⏱️ All agents acknowledged in ${roomCode}. Starting strategy timer.`);

        const timerDuration = process.env.NODE_ENV === "test" ? 100 : 30000;
        game.phaseEndsAt = Date.now() + timerDuration;

        setTimeout(() => {
          const activeFsm = activeGames[roomCode];

          if (activeFsm && activeFsm.getState().phase === "PRE_GAME_STRATEGY") {
            activeFsm.endStrategyPhase();
            activeFsm.phaseEndsAt = null;

            io.to(`${roomCode}_EVIL`).emit("receive_message", {
              text: "[SYS] The strategy window has closed. Secure channel disconnected.",
              channel: "evil",
            });

            broadcastGameState(io, roomCode);
          }
        }, timerDuration);
      }

      broadcastGameState(io, roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("join_game_dashboard", ({ roomCode, name }) => {
    const game = activeGames[roomCode];

    if (!game) return;

    const roomPlayers = rooms[roomCode] || [];
    const player = roomPlayers.find((roomPlayer) => roomPlayer.name === name);

    if (player && game.roleAssignments) {
      const roleData = game.roleAssignments.get(player.id);

      if (roleData) {
        socket.emit("role_assigned", {
          role: roleData.role,
          team: roleData.team,
          specialInfo: roleData.specialInfo,
        });
      }
    }

    socket.emit("game_state_update", buildClientGameState(roomCode));
  });

  socket.on("propose_team", ({ roomCode, proposedTeamIds }) => {
    const game = activeGames[roomCode];

    if (!game) return;

    try {
      const result = game.proposeTeam(socket.id, proposedTeamIds);

      io.to(roomCode).emit("team_proposed", result);
      broadcastGameState(io, roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("submit_vote", async ({ roomCode, vote }) => {
    const game = activeGames[roomCode];

    if (!game) return;

    try {
      const result = game.castVote(socket.id, vote);

      if (result.resolved) {
        io.to(roomCode).emit("vote_resolved", result);

        if (result.state === "VOTE_FAILED") {
          setTimeout(() => {
            const activeGame = activeGames[roomCode];

            if (
              activeGame !== game ||
              game.getState().phase !== "VOTE_FAILED"
            ) {
              return;
            }

            try {
              const next = game.advanceAfterFailedVote();

              io.to(roomCode).emit("vote_failed_advance", next);
              broadcastGameState(io, roomCode);
            } catch (err) {
              console.error(
                `Failed to advance rejected vote in room ${roomCode}:`,
                err,
              );
            }
          }, 3000);
        } else if (result.phase === "GAME_OVER") {
          await saveMatchRecord({
            roomCode,
            gameResult: result,
            game,
            roomPlayers: rooms[roomCode] || [],
          });

          io.to(roomCode).emit("game_over", result);
        }
      }

      broadcastGameState(io, roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("submit_quest_vote", ({ roomCode, vote }) => {
    const game = activeGames[roomCode];

    if (!game) return;

    try {
      const result = game.submitQuestAction(socket.id, vote);

      if (result.resolved) {
        io.to(roomCode).emit("quest_result", result);

        setTimeout(async () => {
          const activeGame = activeGames[roomCode];

          if (
            activeGame !== game ||
            game.getState().phase !== "QUEST_RESULT"
          ) {
            return;
          }
          try {
            const next = game.advanceAfterQuestResult();

            if (next.phase === "GAME_OVER") {
              await saveMatchRecord({
                roomCode,
                gameResult: next,
                game,
                roomPlayers: rooms[roomCode] || [],
              });

              io.to(roomCode).emit("game_over", next);
            } else {
              io.to(roomCode).emit("quest_result_advance", next);
            }

            broadcastGameState(io, roomCode);
          } catch (err) {
            console.error(
            `Failed to advance quest result in room ${roomCode}:`,
              err,
            );
          }
        }, 4000);
      }

      broadcastGameState(io, roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("timer_expired", ({ roomCode, phase }) => {
    const game = activeGames[roomCode];

    if (!game) return;
    if (game.getState().phase !== phase) return;

    try {
      if (phase === "TEAM_SELECTION") {
        const { currentLeader, currentQuest } = game.getState();

        if (socket.id !== currentLeader.id) return;

        const requiredSize = game.questManager.questConfig[currentQuest].teamSize;
        const players = rooms[roomCode];
        const forcedTeam = players.slice(0, requiredSize).map((player) => player.id);

        const result = game.proposeTeam(socket.id, forcedTeam);

        io.to(roomCode).emit("team_proposed", result);
        broadcastGameState(io, roomCode);
      }
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("submit_assassination", async ({ roomCode, targetId }) => {
    const game = activeGames[roomCode];

    if (!game) return;

    try {
      const result = game.resolveAssassination(socket.id, targetId);

      await saveMatchRecord({
        roomCode,
        gameResult: result,
        game,
        roomPlayers: rooms[roomCode] || [],
      });

      io.to(roomCode).emit("game_over", result);
      broadcastGameState(io, roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });
}

module.exports = {
  registerGameHandlers,
};