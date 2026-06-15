const RoleAssigner = require("./RoleAssigner");
const QuestManager = require("./QuestManager");
const AssassinationManager = require("./AssassinationManager");

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
    this.currentState = "LOBBY";

    this.roleAssignments = null;
    this.questManager = null;
    this.assassinationManager = null;

    this.winner = null;
    this.winReason = null;

    this.confirmedPlayers = new Set();
  }

  // Transition helpers

  _assertState(expected) {
    if (this.currentState !== expected) {
      throw new Error(
        `Invalid action: expected state "${expected}" but current state is "${this.currentState}"`,
      );
    }
  }

  _transition(newState) {
    if (process.env.NODE.ENV !== "production") {
      console.log(`[FSM] ${this.currentState} → ${newState}`);
    }
    this.currentState = newState;
  }

  // Phase transitions

  // LOBBY → ROLE_ACKNOWLEDGEMENT
  startGame() {
    this._assertState("LOBBY");

    this.roleAssignments = RoleAssigner.assignRoles(this.players);
    this.questManager = new QuestManager(this.players);

    this._transition("ROLE_ACKNOWLEDGEMENT");
    return { state: this.currentState };
  }

  // Handle confirmations， trigger the strategy phase
  confirmRole(playerId) {
    this._assertState("ROLE_ACKNOWLEDGEMENT");
    this.confirmedPlayers.add(playerId);

    // If everyone has confirmed, move to strategy phase
    if (this.confirmedPlayers.size === this.players.length) {
      this._transition("PRE_GAME_STRATEGY");
      return { state: this.currentState, readyForStrategy: true };
    }

    return { state: this.currentState, readyForStrategy: false };
  }

  // Called by server when the timer runs out
  endStrategyPhase() {
    this._assertState("PRE_GAME_STRATEGY");
    return this._beginTeamSelection();
  }

  // → TEAM_SELECTION
  _beginTeamSelection() {
    this._transition("TEAM_SELECTION");
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
    this._assertState("TEAM_SELECTION");
    const questState = this.questManager.getGameState();

    if (questState.currentLeader?.id !== leaderId) {
      throw new Error("Only the current leader can propose a team.");
    }

    this.questManager.proposeTeam(leaderId, proposedTeamIds);
    this._transition("TEAM_VOTING");

    return { state: this.currentState, proposedTeam: proposedTeamIds };
  }

  castVote(playerId, vote) {
    this._assertState("TEAM_VOTING");

    const voteStatus = this.questManager.castTeamVote(playerId, vote);
    if (!voteStatus.allVoted)
      return { state: this.currentState, resolved: false };

    const voteResult = this.questManager.resolveTeamVotes();

    if (voteResult.approved) {
      this._transition("QUEST_EXECUTION");
    } else if (voteResult.evilWins) {
      this._transition("GAME_OVER");
      this.winner = "evil";
      this.winReason = "Five consecutive teams rejected.";
      return this.getState();
    } else {
      this._transition("VOTE_FAILED");
    }

    return { state: this.currentState, resolved: true, ...voteResult };
  }

  submitQuestAction(playerId, vote) {
    this._assertState("QUEST_EXECUTION");

    const actionStatus = this.questManager.castQuestVote(playerId, vote);
    if (!actionStatus.allVoted)
      return { state: this.currentState, resolved: false };

    const actionResult = this.questManager.resolveQuestVotes();
    this._transition("QUEST_RESULT");
    return { state: this.currentState, resolved: true, ...actionResult };
  }

  advanceAfterQuestResult() {
    this._assertState("QUEST_RESULT");

    const { questsWon } = this.questManager.getGameState();

    if (questsWon.good >= 3) {
      this._transition("ASSASSINATION_PHASE");
      this.assassinationManager = new AssassinationManager(
        this.players,
        this.roleAssignments,
      );
      return {
        state: this.currentState,
        assassin: this.assassinationManager.getAssassin(),
        targets: this.assassinationManager.getPossibleTargets(),
      };
    }

    if (questsWon.evil >= 3) {
      this._transition("GAME_OVER");
      this.winner = "evil";
      this.winReason = "Evil sabotaged 3 quests.";
      return this.getState();
    }

    this.questManager.nextQuest();

    return this._beginTeamSelection();
  }

  advanceAfterFailedVote() {
    this._assertState("VOTE_FAILED");
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
    this._assertState("ASSASSINATION_PHASE");

    this.assassinationManager.selectTarget(assassinId, targetId);
    const result = this.assassinationManager.resolveAssassination();

    this._transition("GAME_OVER");
    this.winner = result.winner;
    this.winReason = result.reason;

    return this.getState();
  }

  // Serialisation

  getState() {
    const questState = this.questManager?.getGameState() ?? {};
    return {
      phase: this.currentState,
      winner: this.winner,
      winReason: this.winReason,
      ...questState,
    };
  }
}

module.exports = GameStateMachine;
