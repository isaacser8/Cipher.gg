const { getAlignmentConfig } = require('./config/gameConfig');

/*
Dynamic role assignment logic.
Supports 5 to 10 players.

Base roles:
- 1 Merlin
- 1 Assassin

Remaining Good players become Loyal Servants.
Remaining Evil players become Minions of Mordred.
*/

class RoleAssigner {
    /**
     * Assign roles to 5 to 10 players.
     * @param {Array} players - Array of player objects { id, name }
     * @returns {Map} playerId -> { role, team, specialInfo }
     */
   
    static assignRoles(players) {
        const playerCount = players.length;
        const alignmentConfig = getAlignmentConfig(playerCount);

        const roles = this.buildRoles(alignmentConfig);
    
        if (roles.length !== playerCount) {
            throw new Error(
                `Role configuration error: generated ${roles.length} roles for ${playerCount} players.`
            );
        }

        // Shuffle roles 
        const shuffledRoles = this.shuffleArray(roles); 

        // Assign to players 
        const roleAssignments = new Map(); 

        players.forEach((player, index) => {
            roleAssignments.set(player.id, {
                role: shuffledRoles[index].name,
                team: shuffledRoles[index].team,
                specialInfo: [],
            });
        });

        this.addSpecialInfo(players, roleAssignments);

        return roleAssignments;
    }

    /**
     * Build actualt role list from Good/Evil count.
     * 
     * eg. for 7 players:
     * Good: Merlin + 3 Loyal Servants
     * Evil: Assassin + 2 Minions of Modred
     */
    static buildRoles(alignmentConfig) {
        const roles = [
            {name: 'Merlin', team: 'good'},
            {name: 'Assassin', team: 'evil'},
        ];

        const loyalServantCount = alignmentConfig.good - 1;
        const minionCount = alignmentConfig.evil - 1;

        for (let i = 0; i < loyalServantCount; i++) {
            roles.push({name: 'Loyal Servant', team: 'good'});
        }

        for (let i = 0; i < minionCount; i++) {
            roles.push({ name: 'Minion of Mordred', team: 'evil' });
        }


        return roles;
    }

    /**
     * Merlin sees both evil players 
     * Evil players see each other 
     */
    static addSpecialInfo(players, roleAssignments) {

        players.forEach(player => {
            const playerRole = roleAssignments.get(player.id);
            const specialInfo = [];
            
            // MERLIN: Sees both evil players
            if (playerRole.role === 'Merlin') {
                players.forEach(otherPlayer => {
                    const otherRole = roleAssignments.get(otherPlayer.id);
                    if (otherRole.team === 'evil') {
                        specialInfo.push({
                            id: otherPlayer.name, 
                            name: 'Evil'
                        });
                    }
                }); 
            }

            // EVIL: Sees each other
            if (playerRole.team === 'evil') {
                players.forEach(otherPlayer => {
                    const otherRole = roleAssignments.get(otherPlayer.id);
                    if (otherRole.team === 'evil' && otherPlayer.id !== player.id) {
                        specialInfo.push({
                            id: otherPlayer.name, 
                            name: 'Evil'
                        });
                    }
                }); 
            }

            // Update special info
            playerRole.specialInfo = specialInfo;
        }); 
    }

    /**
     * Shuffle array
     */
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled; 
    }
}

module.exports = RoleAssigner;