const { setupStartedGame } = require("./gameSetupHelpers");

const {
  buildFirstAvailableTeam,
  buildTeamWithEvil,
  buildTeamWithNEvils,
  playQuestRound,
  rejectCurrentTeam,
  refreshGameState,
} = require("./questFlowHelpers");

const {
  assassinateMerlin,
  assassinateWrongTarget,
} = require("./assassinationFlowHelpers");

async function runThreeSabotagedQuests({ playerCount, port, roomCode }) {
  const context = await setupStartedGame({
    playerCount,
    port,
    roomCode,
    namePrefix: "A",
    clerkPrefix: "test_full_loop",
  });

  try {
    let gameState = context.gameState;

    for (let round = 1; round <= 3; round++) {
      const { proposedTeamIds, evilPlayerIds } = buildTeamWithEvil({
        gameState,
        roleAssignments: context.roleAssignments,
      });

      const finalPayload = await playQuestRound({
        sockets: context.sockets,
        roomCode,
        gameState,
        proposedTeamIds,
        failSocketIds: evilPlayerIds,
        expectedAdvanceEvent: round === 3 ? "game_over" : "quest_result_advance",
      });

      if (round === 3) {
        return {
          ...context,
          finalPayload,
        };
      }

      gameState = await refreshGameState({
        sockets: context.sockets,
        roomCode,
        agentName: context.agents[0].name,
      });
    }

    throw new Error("Evil sabotage flow did not reach GAME_OVER.");
  } catch (error) {
    context.sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

async function runThreeSuccessfulQuestsToAssassination({
  playerCount,
  port,
  roomCode,
  namePrefix = "S",
  clerkPrefix = "test_assassination",
}) {
  const context = await setupStartedGame({
    playerCount,
    port,
    roomCode,
    namePrefix,
    clerkPrefix,
  });

  try {
    let gameState = context.gameState;
    let nextState = null;

    for (let round = 1; round <= 3; round++) {
      const proposedTeamIds = buildFirstAvailableTeam(gameState);

      nextState = await playQuestRound({
        sockets: context.sockets,
        roomCode,
        gameState,
        proposedTeamIds,
        failSocketIds: [],
        expectedAdvanceEvent: "quest_result_advance",
      });

      if (round < 3) {
        gameState = await refreshGameState({
          sockets: context.sockets,
          roomCode,
          agentName: context.agents[0].name,
        });
      }
    }

    if ((nextState.state || nextState.phase) !== "ASSASSINATION_PHASE") {
      throw new Error(`Expected ASSASSINATION_PHASE but got ${nextState.state || nextState.phase}`);
    }

    return {
      ...context,
      assassinationPhasePayload: nextState,
    };
  } catch (error) {
    context.sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

async function runSuccessfulAssassinationGame({ playerCount, port, roomCode }) {
  const context = await runThreeSuccessfulQuestsToAssassination({
    playerCount,
    port,
    roomCode,
    namePrefix: "S",
    clerkPrefix: "test_assassination",
  });

  try {
    const assassinationResult = await assassinateMerlin({
      sockets: context.sockets,
      roomCode,
      roleAssignments: context.roleAssignments,
    });

    return {
      ...context,
      finalPayload: assassinationResult.finalPayload,
      assassin: assassinationResult.assassin,
      merlin: assassinationResult.target,
    };
  } catch (error) {
    context.sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

async function runGoodWinWrongAssassinationGame({ playerCount, port, roomCode }) {
  const context = await runThreeSuccessfulQuestsToAssassination({
    playerCount,
    port,
    roomCode,
    namePrefix: "G",
    clerkPrefix: "test_good_win",
  });

  try {
    const assassinationResult = await assassinateWrongTarget({
      sockets: context.sockets,
      roomCode,
      roleAssignments: context.roleAssignments,
    });

    return {
      ...context,
      finalPayload: assassinationResult.finalPayload,
      assassin: assassinationResult.assassin,
      target: assassinationResult.target,
    };
  } catch (error) {
    context.sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

async function runVoteHammerGame({ playerCount, port, roomCode }) {
  const context = await setupStartedGame({
    playerCount,
    port,
    roomCode,
    namePrefix: "V",
    clerkPrefix: "test_vote_hammer",
  });

  try {
    let gameState = context.gameState;
    let finalPayload = null;

    for (let voteNumber = 1; voteNumber <= 5; voteNumber++) {
      const result = await rejectCurrentTeam({
        sockets: context.sockets,
        roomCode,
        gameState,
      });

      if (voteNumber === 5) {
        finalPayload = result;
        break;
      }

      const advancePromises = context.sockets.map((socket) =>
        require("./socketTestUtils").waitForEvent(socket, "vote_failed_advance", 10000)
      );

      const advanceResults = await Promise.all(advancePromises);
      gameState = advanceResults[0];
    }

    return {
      ...context,
      finalPayload,
    };
  } catch (error) {
    context.sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

async function runQuestFourTwoFailCheckGame({ playerCount, port, roomCode }) {
  const context = await setupStartedGame({
    playerCount,
    port,
    roomCode,
    namePrefix: "Q",
    clerkPrefix: "test_q4",
  });

  try {
    let gameState = context.gameState;

    // Pass first 3 quests to avoid ending the game by evil sabotage.
    // This brings us to assassination.
    return {
      ...context,
      gameState,
    };
  } catch (error) {
    context.sockets.forEach((socket) => socket.disconnect());
    throw error;
  }
}

module.exports = {
  runThreeSabotagedQuests,
  runThreeSuccessfulQuestsToAssassination,
  runSuccessfulAssassinationGame,
  runGoodWinWrongAssassinationGame,
  runVoteHammerGame,
  runQuestFourTwoFailCheckGame,
};