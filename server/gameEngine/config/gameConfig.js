const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;

const PLAYER_ALIGNMENT_CONFIG = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

const QUEST_CONFIG = {
  5: {
    1: { teamSize: 2, failsRequired: 1 },
    2: { teamSize: 3, failsRequired: 1 },
    3: { teamSize: 2, failsRequired: 1 },
    4: { teamSize: 3, failsRequired: 1 },
    5: { teamSize: 3, failsRequired: 1 },
  },
  6: {
    1: { teamSize: 2, failsRequired: 1 },
    2: { teamSize: 3, failsRequired: 1 },
    3: { teamSize: 4, failsRequired: 1 },
    4: { teamSize: 3, failsRequired: 1 },
    5: { teamSize: 4, failsRequired: 1 },
  },
  7: {
    1: { teamSize: 2, failsRequired: 1 },
    2: { teamSize: 3, failsRequired: 1 },
    3: { teamSize: 3, failsRequired: 1 },
    4: { teamSize: 4, failsRequired: 2 },
    5: { teamSize: 4, failsRequired: 1 },
  },
  8: {
    1: { teamSize: 3, failsRequired: 1 },
    2: { teamSize: 4, failsRequired: 1 },
    3: { teamSize: 4, failsRequired: 1 },
    4: { teamSize: 5, failsRequired: 2 },
    5: { teamSize: 5, failsRequired: 1 },
  },
  9: {
    1: { teamSize: 3, failsRequired: 1 },
    2: { teamSize: 4, failsRequired: 1 },
    3: { teamSize: 4, failsRequired: 1 },
    4: { teamSize: 5, failsRequired: 2 },
    5: { teamSize: 5, failsRequired: 1 },
  },
  10: {
    1: { teamSize: 3, failsRequired: 1 },
    2: { teamSize: 4, failsRequired: 1 },
    3: { teamSize: 4, failsRequired: 1 },
    4: { teamSize: 5, failsRequired: 2 },
    5: { teamSize: 5, failsRequired: 1 },
  },
};

function isSupportedPlayerCount(playerCount) {
  return (
    Number.isInteger(playerCount) &&
    playerCount >= MIN_PLAYERS &&
    playerCount <= MAX_PLAYERS
  );
}

function getAlignmentConfig(playerCount) {
  const config = PLAYER_ALIGNMENT_CONFIG[playerCount];

  if (!config) {
    throw new Error(
      `Unsupported player count: ${playerCount}. This game supports 5 to 10 players.`,
    );
  }

  return config;
}

function getQuestConfig(playerCount) {
  const config = QUEST_CONFIG[playerCount];

  if (!config) {
    throw new Error(
      `Unsupported player count: ${playerCount}. This game supports 5 to 10 players.`,
    );
  }

  return config;
}

module.exports = {
  MIN_PLAYERS,
  MAX_PLAYERS,
  PLAYER_ALIGNMENT_CONFIG,
  QUEST_CONFIG,
  isSupportedPlayerCount,
  getAlignmentConfig,
  getQuestConfig,
};
