const Match = require("../models/Match");
const User = require("../models/User");

async function updateUserStatsAfterMatch({
  roomPlayers,
  roleAssignments,
  winner,
  assassinationState,
}) {
  const operations = [];

  for (const player of roomPlayers) {
    if (!player.dbId) continue;

    const roleData = roleAssignments.get(player.id);
    if (!roleData) continue;

    const statIncrement = {
      "stats.matchesPlayed": 1,
    };

    if (winner === "good" && roleData.team === "good") {
      statIncrement["stats.winsAsGood"] = 1;
    }

    if (winner === "evil" && roleData.team === "evil") {
      statIncrement["stats.winsAsEvil"] = 1;
    }

    const wasSuccessfulAssassin =
      assassinationState?.guessedCorrectly &&
      assassinationState?.assassinId === player.id &&
      roleData.role === "Assassin";

    if (wasSuccessfulAssassin) {
      statIncrement["stats.successfulAssassinations"] = 1;
    }

    operations.push({
      updateOne: {
        filter: { _id: player.dbId },
        update: { $inc: statIncrement },
      },
    });
  }

  if (operations.length > 0) {
    await User.bulkWrite(operations);
  }
}

async function saveMatchRecord({ roomCode, gameResult, game, roomPlayers }) {
  if (!game || !game.roleAssignments) return;

  const formattedPlayers = roomPlayers.map((player) => {
    const roleData = game.roleAssignments.get(player.id);

    if (!roleData) {
      throw new Error(`Missing role assignment for player ${player.name} (${player.id})`);
    }

    return {
      userId: player.dbId || null,
      guestName: player.dbId ? null : player.name,
      role: roleData.role,
      team: roleData.team,
    };
  });

  const newMatch = new Match({
    roomCode,
    winner: gameResult.winner,
    winReason: gameResult.winReason,
    questHistory: gameResult.questHistory || [],
    players: formattedPlayers,
  });

  await newMatch.save();

  const assassinationState = game.assassinationManager?.getState?.();

  await updateUserStatsAfterMatch({
    roomPlayers,
    roleAssignments: game.roleAssignments,
    winner: gameResult.winner,
    assassinationState,
  });

  console.log(`💾 Match record and player stats saved for room ${roomCode}`);
}

module.exports = {
  saveMatchRecord,
  updateUserStatsAfterMatch,
};