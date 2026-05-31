/**
 * Assasination Manager
 * handle the assassination phase 
 * when good wins, Assassin tries to find out Merlin 
 */

class AssassinationManager {

    constructor(players, roleAssignments) {
        this.players = players; 
        this.roleAssignments = roleAssignments; 

        this.assassinId = null; 
        this.merlinId = null; 
        this.targetId = null; 
        this.guessedCorrectly = false; 

        this._identifyKeyPlayers()
    }

    /**
     * Private method 
     * find who is Assassin and Merlin
     */
    _identifyKeyPlayers() {
        for (const [playerId, roleData] of this.roleAssignments) {
            if (roleData.role === 'Assassin') {
                this.assassinId = playerId;
            }
            if (roleData.role === 'Merlin') {
                this.merlinId = playerId;
            }
        }

        if (!this.assassinId) {
            throw new Error('No Assassin found in game!');
        }

        if (!this.merlinId) {
            throw new Error('No Merlin found in game!'); 
        }
    }

    /**
     * Check if assassination phase should trigger
     * @param {number} goodWins 
     * @returns {boolean}
     */
    shouldTrigger(goodWins) {
        return goodWins >= 3; 
    }

    
    /**
     * Get the Assassin player info 
     */
    getAssassin() {
        const assassin = this.players.find(p => p.id === this.assassinId); 
        return assassin; 
    }

    /** 
     * Get list of possible targets
     */
    getPossibleTargets() {
        const targets = []; 
        for (const player of this.players) {
            const roleData = this.roleAssignments.get(player.id); 
            if (roleData.team === 'good') {
                targets.push({
                    id: player.id, 
                    name: player.name
                }); 
            }
        }

        return targets; 
    }

    /**
     * Assassin selects their target 
     * @param {string} assassinId 
     * @param {string} targetId 
     */
    selectTarget(assassinId, targetId) {
        if (assassinId !== this.assassinId) {
            throw new Error('Only the Assassin can select a target!');
        }

        const targetExists = this.players.some(p => p.id === targetId);
        if (!targetExists) {
            throw new Error('Invalid target player');  
        }

        const targetRole = this.roleAssignments.get(targetId);
        if (targetRole.team !== 'good') {
            throw new Error('Assassin can only target Good team members')
        }

        this.targetId = targetId;

        return {
            assassinId: this.assassinId,
            targetId: this.targetId
        }; 
    }

    /**
     * Resolve the assassination attempt 
     */
    resolveAssassination() {
        if (!this.targetId) {
            throw new Error('No target has been selected'); 
        }

        this.guessedCorrectly = (this.targetId === this.merlinId);

        const result = {
            assassinId: this.assassinId,
            targetId: this.targetId,
            merlinId: this.merlinId,
            guessedCorrectly: this.guessedCorrectly, 
            gameOver: true
        };

        const assassin = this.players.find(p => p.id === this.assassinId);
        const target = this.players.find(p => p.id === this.targetId);

        if (this.guessedCorrectly) {
            return {
                ...result, 
                winner: 'evil', 
                reason: `Agent ${assassin.name} successfully assassinated Agent ${target.name}. Merlin has fallen.`
            }; 
        } else {
            return {
                ...result,
                winner: 'good',
                reason: `Agent ${assassin.name} assassinated Agent ${target.name}, but they were not Merlin! The Resistance survives.`
            };
        }
    }

    /**
     * Get current assassination state 
     */
    getState() {
        return {
            assassinId: this.assassinId,
            merlinId: this.merlinId,
            targetId: this.targetId,
            guessedCorrectly: this.guessedCorrectly
        }
    }

}

module.exports = AssassinationManager;