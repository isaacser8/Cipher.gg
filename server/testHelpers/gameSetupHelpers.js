/**
 * Sets up a complete started game.
 *
 * This includes:
 * - creating simulated player sockets
 * - joining/hosting the lobby
 * - applying dynamic lobby size
 * - readying all players
 * - starting the game
 * - collecting private role assignments
 * - confirming roles
 * - waiting until TEAM_SELECTION phase
 */
const {
  waitForEvent,
  createTestSockets,
  collectRoleAssignments,
} = require("./socketTestUtils");

async function setupStartedGame({
  playerCount,
  port,
  roomCode,
  namePrefix,
  clerkPrefix,
  useLoggedInUsers = true,
}) {
  const runId = Date.now().toString().slice(-6);

  const agents = Array.from({ length: playerCount }, (_, i) => ({
    name: `${namePrefix}${i + 1}_${runId}`,
    clerkId: useLoggedInUsers ? `${clerkPrefix}_${runId}_${i + 1}` : null,
  }));

  const sockets = await createTestSockets({ agents, port });

  sockets[0].emit("join_room", {
    roomCode,
    displayName: agents[0].name,
    action: "host",
    clerkId: agents[0].clerkId,
  });

  await waitForEvent(sockets[0], "roster_update", 10000);

  if (playerCount !== 5) {
    sockets[0].emit("change_settings", {
      roomCode,
      teamSize: playerCount,
    });

    await waitForEvent(sockets[0], "settings_update", 10000);
  }

  for (let i = 1; i < playerCount; i++) {
    sockets[i].emit("join_room", {
      roomCode,
      displayName: agents[i].name,
      action: "join",
      clerkId: agents[i].clerkId,
    });

    await waitForEvent(sockets[i], "roster_update", 10000);
  }

  sockets.forEach((socket) => {
    socket.emit("status_update", {
      roomCode,
      isReady: true,
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const roleAssignmentPromise = collectRoleAssignments(sockets);
  const startPromises = sockets.map((socket) => waitForEvent(socket, "game_started", 10000));
  const stateUpdatePromises = sockets.map((socket) =>
    waitForEvent(socket, "game_state_update", 10000)
  );

  sockets[0].emit("start_game", { roomCode });

  await Promise.all(startPromises);

  const roleAssignments = await roleAssignmentPromise;
  let gameState = (await Promise.all(stateUpdatePromises))[0];

  sockets.forEach((socket) => {
    socket.emit("confirm_role", { roomCode });
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  sockets[0].emit("join_game_dashboard", {
    roomCode,
    name: agents[0].name,
  });

  gameState = await waitForEvent(sockets[0], "game_state_update", 10000);

  if (gameState.phase !== "TEAM_SELECTION") {
    throw new Error(`Expected TEAM_SELECTION but got ${gameState.phase}`);
  }

  return {
    sockets,
    agents,
    roleAssignments,
    gameState,
  };
}

module.exports = {
  setupStartedGame,
};