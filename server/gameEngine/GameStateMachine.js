const RoleAssigner = require('./RoleAssigner');
const QuestManager = require('./QuestManager');
const AssassinationManager = require('./AssassinationManager');

/**
 * GameStateMachine
 * Orchestrates all game phases and enforces valid state transitions.
 * server.js delegates all game logic here, it only handles socket I/O
 * and calls into this class.
 *
 * States:
 *   LOBBY
 *   → ROLE_ASSIGNMENT
 *   → TEAM_SELECTION      (leader proposes team with 2 min timer)
 *   → TEAM_VOTING         (all players vote with 90 sec timer)
 *   → VOTE_FAILED         (3s pause before rotating leader)
 *   → QUEST_EXECUTION     (team members submit pass/fail, 2 min timer)
 *   → QUEST_RESULT        (4s reveal pause)
 *   → ASSASSINATION_PHASE (good won 3 quests then assassin picks target)
 *   → GAME_OVER
 */
class GameStateMachine {
  constructor(players) {
    this.players = players;
    this.currentState = 'LOBBY';

    this.roleAssignments = null;
    this.questManager = null;
    this.assassinationManager = null;

    this.winner = null;
    this.winReason = null;
  }

  // Transition helpers 

  _assertState(expected) {
    if (this.currentState !== expected) {
      throw new Error(
        `Invalid action: expected state "${expected}" but current state is "${this.currentState}"`
      );
    }
  }

  _transition(newState) {
    console.log(`[FSM] ${this.currentState} → ${newState}`);
    this.currentState = newState;
  }

  // Phase transitions 

  // LOBBY → ROLE_ASSIGNMENT → TEAM_SELECTION
  startGame() {
    this._assertState('LOBBY');

    this.roleAssignments = RoleAssigner.assignRoles(this.players);
    this.questManager = new QuestManager(this.players);

    this._transition('ROLE_ASSIGNMENT');

    // Move straight to the first quest.
    return this._beginTeamSelection();
  }

  // → TEAM_SELECTION 
  _beginTeamSelection() {
    this._transition('TEAM_SELECTION');
    const questState = this.questManager.getGameState();
    return {
      state: this.currentState,
      ...questState,
    };
  }

  /**
   * Leader submits their proposed team.
   * TEAM_SELECTION → TEAM_VOTING
   *
   * @param {string}   leaderId
   * @param {string[]} proposedTeamIds
   */
  proposeTeam(leaderId, proposedTeamIds) {
    this._assertState('TEAM_SELECTION');

    const questState = this.questManager.getGameState();

    if (questState.currentLeader?.id !== leaderId) {
      throw new Error('Only the current leader can propose a team.');
    }

    this.questManager.proposeTeam(proposedTeamIds);
    this._transition('TEAM_VOTING');

    return { state: this.currentState, proposedTeam: proposedTeamIds };
  }

  /**
   * Record a single player's vote. Transitions once all votes are in.
   * TEAM_VOTING → QUEST_EXECUTION  (majority approve)
   * TEAM_VOTING → VOTE_FAILED      (majority reject)
   *
   * @param {string}  playerId
   * @param {boolean} approve
   * @returns {{ state, resolved, approveCount, rejectCount, approved? }}
   */
  castVote(playerId, approve) {
    this._assertState('TEAM_VOTING');

    const voteResult = this.questManager.castVote(playerId, approve);

    if (!voteResult.resolved) {
      // Still waiting for more votes.
      return { state: this.currentState, resolved: false };
    }

    if (voteResult.approved) {
      this._transition('QUEST_EXECUTION');
    } else {
      this._transition('VOTE_FAILED');
    }

    return { state: this.currentState, resolved: true, ...voteResult };
  }

  /**
   * Called after the 3 sec VOTE_FAILED pause expires.
   * VOTE_FAILED → TEAM_SELECTION (next leader)
   */
  advanceAfterFailedVote() {
    this._assertState('VOTE_FAILED');
    this.questManager.rotateLeader();
    return this._beginTeamSelection();
  }

  /**
   * Record a team member's pass/fail action. Transitions once all votes are in.
   * QUEST_EXECUTION → QUEST_RESULT
   *
   * @param {string}  playerId
   * @param {boolean} pass
   */
  submitQuestAction(playerId, pass) {
    this._assertState('QUEST_EXECUTION');

    const actionResult = this.questManager.submitQuestAction(playerId, pass);

    if (!actionResult.resolved) {
      return { state: this.currentState, resolved: false };
    }

    this._transition('QUEST_RESULT');
    return { state: this.currentState, resolved: true, ...actionResult };
  }

  /**
   * Called after the 4 sec QUEST_RESULT reveal pause expires.
   * Determines the next state based on overall quest scores.
   *
   * QUEST_RESULT → ASSASSINATION_PHASE  (good wins 3)
   * QUEST_RESULT → GAME_OVER            (evil wins 3)
   * QUEST_RESULT → TEAM_SELECTION       (neither, next quest)
   */
  advanceAfterQuestResult() {
    this._assertState('QUEST_RESULT');

    const { goodWins, evilWins } = this.questManager.getScore();

    if (goodWins >= 3) {
      this._transition('ASSASSINATION_PHASE');
      this.assassinationManager = new AssassinationManager(
        this.players,
        this.roleAssignments
      );
      return {
        state: this.currentState,
        assassin: this.assassinationManager.getAssassin(),
        targets: this.assassinationManager.getPossibleTargets(),
      };
    }

    if (evilWins >= 3) {
      this._transition('GAME_OVER');
      this.winner = 'EVIL';
      this.winReason = 'Evil sabotaged 3 quests.';
      return this.getState();
    }

    return this._beginTeamSelection();
  }

  /**
   * Assassin picks their target.
   * ASSASSINATION_PHASE → GAME_OVER
   *
   * @param {string} assassinId
   * @param {string} targetId
   */
  resolveAssassination(assassinId, targetId) {
    this._assertState('ASSASSINATION_PHASE');

    this.assassinationManager.selectTarget(assassinId, targetId);
    const result = this.assassinationManager.resolveAssassination();

    this._transition('GAME_OVER');
    this.winner = result.winner;
    this.winReason = result.reason;

    return this.getState();
  }

  // Serialisation

  getState() {
    const questState = this.questManager?.getGameState() ?? {};
    return {
      currentState: this.currentState,
      winner: this.winner,
      winReason: this.winReason,
      ...questState,
    };
  }
}

module.exports = GameStateMachine;