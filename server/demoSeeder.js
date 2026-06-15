const GameStateMachine = require("./gameEngine/GameStateMachine");
const RoleAssigner = require("./gameEngine/RoleAssigner");
const AssassinationManager = require("./gameEngine/AssassinationManager");

/**
 * Set of all demo room codes
 * Exported so server.js can use it to skip cleanup
 * @type {Set<string>}
 */
const DEMO_ROOM_CODES = new Set([
  "DEMOS1", // TEAM_SELECTION
  "DEMOS2", // TEAM_VOTING
  "DEMOS3", // QUEST_EXECUTION
  "DEMOS4", // ASSASSINATION_PHASE
  "DEMOS5", // GAME_OVER: good wins (assassination fails)
  "DEMOS6", // GAME_OVER: evil wins by 3 failed quests
  "DEMOS7", // GAME_OVER: evil wins by correct assassination
  "DEMOS8", // GAME_OVER: evil wins by 5 rejeted proposal
]);

/**
 * Returns an array of 5 demo players
 * @returns {Array<Object>} Array of 5 players object
 */
function makeDemoPlayers() {
  return [
    {
      id: "demo_1",
      name: "Merlin",
      isHost: true,
      isReady: true,
      isConnected: false,
      dbId: null,
    },
    {
      id: "demo_2",
      name: "Assassin",
      isHost: false,
      isReady: true,
      isConnected: false,
      dbId: null,
    },
    {
      id: "demo_3",
      name: "Minion",
      isHost: false,
      isReady: true,
      isConnected: false,
      dbId: null,
    },
    {
      id: "demo_4",
      name: "Loyal Servant 1",
      isHost: false,
      isReady: true,
      isConnected: false,
      dbId: null,
    },
    {
      id: "demo_5",
      name: "Loyal Servant 2",
      isHost: false,
      isReady: true,
      isConnected: false,
      dbId: null,
    },
  ];
}

/**
 * Forces fixed role assignments for demo rooms
 * @param {GameStateMachine} game
 * @param {Array<Object>} players
 */
function forceDemoRoles(game, players) {
  const roles = [
    "Merlin",
    "Assassin",
    "Minion of Mordred",
    "Loyal Servant",
    "Loyal Servant",
  ];

  const roleAssignments = new Map();

  players.forEach((player, index) => {
    roleAssignments.set(player.id, { role: roles[index] });
  });

  RoleAssigner.fillDetails(players, roleAssignments);

  game.roleAssignments = roleAssignments;
  game.assassinationManager = new AssassinationManager(
    players,
    game.roleAssignments,
  );
}

/**
 * Advance from LOBBY to TEAM_SELECTION
 * @param {GameStateMachine} game
 * @param {Array<Object>} players
 */
function setupDemoGame(game, players) {
  game.startGame();
  forceDemoRoles(game, players);
  players.forEach((p) => game.confirmRole(p.id));
  game.endStrategyPhase();
}

/**
 * runs one full quest where team is approved and all members vote success
 * @param {GameStateMachine} game
 * @param {Array<Object>} players
 * @param {number} teamSize
 */
function runSuccessfulQuest(game, players, teamSize) {
  // @ts-ignore
  const leader = game.getState().currentLeader;
  const teamIds = players.slice(0, teamSize).map((p) => p.id);

  game.proposeTeam(leader.id, teamIds);
  players.forEach((p) => game.castVote(p.id, "approve"));
  teamIds.forEach((id) => game.submitQuestAction(id, "success"));
  game.advanceAfterQuestResult();
}

/**
 * Runs 3 successful quests to reach ASSASSINATION_PHASE
 * @param {GameStateMachine} game
 * @param {Array<Object>} players
 */
function runThreeSuccessfulQuests(game, players) {
  [2, 3, 2].forEach((size) => runSuccessfulQuest(game, players, size));
}

/**
 * Creates and seeds demo rooms at specific game phases
 * @param {string} code
 * @param {Function} advanceFn
 * @param {Object} rooms - In-memory rooms object from server.js
 * @param {Object} roomSettings - In-memory room settings from server.js
 * @param {Object} roomLogs - In-memory room logs from server.js
 * @param {Object} activeGames - In-memory active games from server.js
 */
function createDemoRoom(
  code,
  advanceFn,
  rooms,
  roomSettings,
  roomLogs,
  activeGames,
) {
  try {
    // shared setup - runs for every demo rooms
    const players = makeDemoPlayers();
    const game = new GameStateMachine(players);

    rooms[code] = players;
    roomSettings[code] = { teamSize: 5 };
    roomLogs[code] = [];

    setupDemoGame(game, players);

    advanceFn(game, players); // advance to specific phase

    activeGames[code] = game;
    console.log(`🌱 Seeded ${code} -> ${game.getState().phase}`);
  } catch (err) {
    console.error(`❌ Failed to seed ${code}:`, err.message);
  }
}

function seedDemoRooms(rooms, roomSettings, roomLogs, activeGames) {
  /** @type {[Object, Object, Object, Object]} */
  const args = [rooms, roomSettings, roomLogs, activeGames];

  // DEMOS1: TEAM_SELECTION - leader picks a team
  createDemoRoom("DEMOS1", (game, players) => {}, ...args);

  // DEMOS2: TEAM_VOTING - team proposed, players vote approve/reject
  createDemoRoom(
    "DEMOS2",
    (game, players) => {
      const leader = game.getState().currentLeader;
      game.proposeTeam(leader.id, ["demo_1", "demo_2"]);
    },
    ...args,
  );

  // DEMOS3: QUEST_EXECUTION - team approved, memebers submit success/fail
  createDemoRoom(
    "DEMOS3",
    (game, players) => {
      const leader = game.getState().currentLeader;
      game.proposeTeam(leader.id, ["demo_1", "demo_2"]);
      players.forEach((p) => game.castVote(p.id, "approve"));
    },
    ...args,
  );

  // DEMOS4: ASSASSINATION_PHASE - good won 3 quests, assassin picks Merlin
  createDemoRoom(
    "DEMOS4",
    (game, players) => {
      runThreeSuccessfulQuests(game, players);
    },
    ...args,
  );

  // DEMOS5: GAME_OVER - good wins (assassin picks wrong person)
  createDemoRoom(
    "DEMOS5",
    (game, players) => {
      runThreeSuccessfulQuests(game, players);
      game.resolveAssassination("demo_2", "demo_4");
    },
    ...args,
  );

  // DEMOS6: GAME_OVER - evil wins by failing 3 quests
  createDemoRoom(
    "DEMOS6",
    (game, players) => {
      [2, 3, 2].forEach((teamSize) => {
        const leader = game.getState().currentLeader;
        const teamIds = players.slice(0, teamSize).map((p) => p.id);
        game.proposeTeam(leader.id, teamIds);
        players.forEach((p) => game.castVote(p.id, "approve"));
        // Assassin (demo_2) sabotages
        game.submitQuestAction("demo_2", "fail");
        teamIds
          .filter((id) => id !== "demo_2")
          .forEach((id) => game.submitQuestAction(id, "success"));
        game.advanceAfterQuestResult();
      });
    },
    ...args,
  );

  // DEMOS7: GAME_OVER - evil wins by correctly assassinating Merlin
  createDemoRoom(
    "DEMOS7",
    (game, players) => {
      runThreeSuccessfulQuests(game, players);
      game.resolveAssassination("demo_2", "demo_1");
    },
    ...args,
  );

  // DEMOS8: GAME_OVER - evil wins by 5 consecutive rejected proposals
  createDemoRoom(
    "DEMOS8",
    (game, players) => {
      for (let i = 0; i < 5; i++) {
        const leader = game.getState().currentLeader;
        game.proposeTeam(leader.id, ["demo_1", "demo_2"]);
        players.forEach((p) => game.castVote(p.id, "reject"));
        if (i < 4) game.advanceAfterFailedVote();
      }
    },
    ...args,
  );

  console.log("✅ All demo rooms ready!");
  console.log("   DEMOS1 → TEAM_SELECTION        (join as any demo name)");
  console.log("   DEMOS2 → TEAM_VOTING           (vote approve or reject)");
  console.log(
    '   DEMOS3 → QUEST_EXECUTION       (join as "Merlin" or "Assassin" to be on team)',
  );
  console.log(
    '   DEMOS4 → ASSASSINATION_PHASE   (join as "Assassin" to pick Merlin)',
  );
  console.log("   DEMOS5 → GAME_OVER good wins   (wrong assassination)");
  console.log("   DEMOS6 → GAME_OVER evil wins   (3 failed quests)");
  console.log("   DEMOS7 → GAME_OVER evil wins   (Merlin assassinated)");
  console.log("   DEMOS8 → GAME_OVER evil wins   (5 rejected proposals)");
}

module.exports = { seedDemoRooms, DEMO_ROOM_CODES };
