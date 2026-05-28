const RoleAssigner = require('./RoleAssigner'); 
const QuestManager = require('./QuestManager'); 
const AssassinationManager = require('./AssassinationManager'); 

class GameStateMachine {
    constructor(players) {
        this.players = players; 
        this.currentState = 'LOBBY'; 

        this.roleAssignmets = null; 
        this.questManager = null; 
        this.assassinationManager = null; 

        this.winner = null; 
        this.winReason = null;
    }

    // State: LOBBY -> ROLE_ASSIGNMENT 
    startGame() {
        if (this.currentState !== 'LOBBY') {
            throw new Error('Game already started'); 
        }

        this.roleAssignmets = RoleAssigner.assignRoles(this.players);
        this.questManager = new QuestManager(this.players); 
        this.currentState = 'ROLE_ASSIGNMENT'; 

        return {
            state: this.currentState, 
            roleAssignments: this.roleAssignments
        }
    }

    // State: ROLE_ASSIGNMENT -> QUEST_PHASE 
    beginQuests() {
        if (this.currentState !== 'ROLE_ASSIGNMENT') {
            throw new Error('Invalid state transition'); 
        }

        this.currentState = 'QUEST_PHASE';
        return this.questManager.startQuest(); 
    }

    // Handle quest completion 
    completeQuest(questResult) {
        if (questResult.triggerAssassination) {
            this.currentState = 'ASSASSINATION_PHASE'; 
            this.assassinationManager = new AssassinationManager(
                this.players, 
                this.roleAssignments
            ); 
            return {
                state: this.currentState, 
                assassin: this.assassinationManager.getAssassin(), 
                targets: this.assassinationManager.getPossibleTargets()
            }; 
        }

        if (questResult.gameOver) {
            this.currentState = 'GAME_OVER'; 
            this.winner = questResult.winner; 
            this.winReason = questResult.reason; 
        }

        return { state: this.currentState }; 
    }

    // Handle assassination
    resolveAssassination(assassinId, targetId) {
        if (this.currentState !== 'ASSASSINATION_PHASE') {
            throw new Error('Not in assassination phase');
        }

        this.assassinationManager.selectTarget(assassinId, targetId); 
        const result = this.assassinationManager.resolveAssassination(); 

        this.currentState = 'GAME_OVER'; 
        this.winner = result.winner; 
        this.winReason = result.reason; 

        return result; 
    }

    getState() {
        return {
            currentState: this.currentState, 
            winner: this.winner, 
            winReason: this.winReason
        }; 
    }

}


module.exports = GameStateMachine; 