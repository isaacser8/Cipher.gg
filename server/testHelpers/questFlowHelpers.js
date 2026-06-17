/**
 * Helpers for playing quest rounds.
 *
 * These do not directly call GameStateMachine methods.
 * They simulate user behaviour: propose team → vote → submit quest actions.
 */
const { waitForEvent, findTeamAssignment } = require("./socketTestUtils");

function buildFirstAvailableTeam(gameState) {
  return gameState.players
    .slice(0, gameState.requiredTeamSize)
    .map((player) => player.id);
}

function buildTeamWithEvil({ gameState, roleAssignments }) {
  const evilAssignment = findTeamAssignment(roleAssignments, "evil");
  const evilPlayerId = evilAssignment.socketId;

  const proposedTeamIds = [evilPlayerId];

  gameState.players.forEach((player) => {
    if (proposedTeamIds.length < gameState.requiredTeamSize && player.id !== evilPlayerId) {
      proposedTeamIds.push(player.id);
    }
  });

  return {
    proposedTeamIds,
    evilPlayerIds: [evilPlayerId],
  };
}

function buildTeamWithNEvils({ gameState, roleAssignments, evilCount }) {
  const evilAssignments = roleAssignments.filter((entry) => entry.team === "evil");
  const selectedEvils = evilAssignments.slice(0, evilCount).map((entry) => entry.socketId);

  const proposedTeamIds = [...selectedEvils];

  gameState.players.forEach((player) => {
    if (proposedTeamIds.length < gameState.requiredTeamSize && !proposedTeamIds.includes(player.id)) {
      proposedTeamIds.push(player.id);
    }
  });

  return {
    proposedTeamIds,
    evilPlayerIds: selectedEvils,
  };
}

async function approveCurrentTeam({ sockets, roomCode, gameState, proposedTeamIds }) {
  const leaderSocket = sockets.find((socket) => socket.id === gameState.currentLeader.id);

  if (!leaderSocket) {
    throw new Error(`Could not find leader socket ${gameState.currentLeader.id}`);
  }

  const proposalPromises = sockets.map((socket) => waitForEvent(socket, "team_proposed", 10000));

  leaderSocket.emit("propose_team", {
    roomCode,
    proposedTeamIds,
  });

  await Promise.all(proposalPromises);

  const voteResolvedPromises = sockets.map((socket) => waitForEvent(socket, "vote_resolved", 10000));
  const postVoteStatePromises = sockets.map((socket) =>
    waitForEvent(socket, "game_state_update", 10000)
  );

  sockets.forEach((socket) => {
    socket.emit("submit_vote", {
      roomCode,
      vote: "approve",
    });
  });

  await Promise.all(voteResolvedPromises);

  return (await Promise.all(postVoteStatePromises))[0];
}

async function rejectCurrentTeam({ sockets, roomCode, gameState }) {
  const proposedTeamIds = buildFirstAvailableTeam(gameState);
  const leaderSocket = sockets.find((socket) => socket.id === gameState.currentLeader.id);

  if (!leaderSocket) {
    throw new Error(`Could not find leader socket ${gameState.currentLeader.id}`);
  }

  const proposalPromises = sockets.map((socket) => waitForEvent(socket, "team_proposed", 10000));

  leaderSocket.emit("propose_team", {
    roomCode,
    proposedTeamIds,
  });

  await Promise.all(proposalPromises);

  const voteResolvedPromises = sockets.map((socket) => waitForEvent(socket, "vote_resolved", 10000));

  sockets.forEach((socket) => {
    socket.emit("submit_vote", {
      roomCode,
      vote: "reject",
    });
  });

  const voteResults = await Promise.all(voteResolvedPromises);

  return voteResults[0];
}

async function submitQuestActions({
  sockets,
  roomCode,
  proposedTeamIds,
  failSocketIds = [],
  expectedAdvanceEvent,
}) {
  const advancePromises = sockets.map((socket) =>
    waitForEvent(socket, expectedAdvanceEvent, 10000)
  );

  const teamSockets = sockets.filter((socket) => proposedTeamIds.includes(socket.id));

  teamSockets.forEach((socket) => {
    socket.emit("submit_quest_vote", {
      roomCode,
      vote: failSocketIds.includes(socket.id) ? "fail" : "success",
    });
  });

  const advanceResults = await Promise.all(advancePromises);

  return advanceResults[0];
}

async function playQuestRound({
  sockets,
  roomCode,
  gameState,
  proposedTeamIds,
  failSocketIds = [],
  expectedAdvanceEvent,
}) {
  await approveCurrentTeam({
    sockets,
    roomCode,
    gameState,
    proposedTeamIds,
  });

  return submitQuestActions({
    sockets,
    roomCode,
    proposedTeamIds,
    failSocketIds,
    expectedAdvanceEvent,
  });
}

async function refreshGameState({ sockets, roomCode, agentName }) {
  sockets[0].emit("join_game_dashboard", {
    roomCode,
    name: agentName,
  });

  return waitForEvent(sockets[0], "game_state_update", 10000);
}

module.exports = {
  buildFirstAvailableTeam,
  buildTeamWithEvil,
  buildTeamWithNEvils,
  approveCurrentTeam,
  rejectCurrentTeam,
  submitQuestActions,
  playQuestRound,
  refreshGameState,
};