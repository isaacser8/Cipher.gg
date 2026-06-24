const { waitForEvent, findRoleAssignment } = require("./socketTestUtils");

function findGoodNonMerlin(roleAssignments) {
  const assignment = roleAssignments.find(
    (entry) => entry.team === "good" && entry.role !== "Merlin"
  );

  if (!assignment) {
    throw new Error("Could not find a Good non-Merlin target.");
  }

  return assignment;
}

async function submitAssassination({ sockets, roomCode, roleAssignments, target }) {
  const assassin = findRoleAssignment(roleAssignments, "Assassin");

  const gameOverPromises = sockets.map((socket) =>
    waitForEvent(socket, "game_over", 10000)
  );

  assassin.socket.emit("submit_assassination", {
    roomCode,
    targetId: target.socketId,
  });

  const gameOverResults = await Promise.all(gameOverPromises);

  return {
    finalPayload: gameOverResults[0],
    assassin,
    target,
  };
}

async function assassinateMerlin({ sockets, roomCode, roleAssignments }) {
  const merlin = findRoleAssignment(roleAssignments, "Merlin");

  return submitAssassination({
    sockets,
    roomCode,
    roleAssignments,
    target: merlin,
  });
}

async function assassinateWrongTarget({ sockets, roomCode, roleAssignments }) {
  const wrongTarget = findGoodNonMerlin(roleAssignments);

  return submitAssassination({
    sockets,
    roomCode,
    roleAssignments,
    target: wrongTarget,
  });
}

module.exports = {
  findGoodNonMerlin,
  submitAssassination,
  assassinateMerlin,
  assassinateWrongTarget,
};