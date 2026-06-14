/* 
Simple role assignment logic 
Fixed: Exactly 5 players 
Roles: 3 Good (Merlin + 2 Loyal) vs 2 Evil (Assassin + 1 Minion)
*/

class RoleAssigner {
  /**
   * single source of truth for role to team mapping
   * add new roles here when expanding the game
   */
  static ROLE_TEAMS = {
    Merlin: "good",
    "Loyal Servant": "good",
    Assassin: "evil",
    "Minion of Mordred": "evil",
  };

  /**
   * Assign roles to exactly 5 players
   * @param {Array<Object>} players - Array of player objects { id, name }
   * @returns {Map} playerId -> { role, team, specialInfo}
   */
  static assignRoles(players) {
    if (players.length !== 5) {
      throw new Error("This game requires EXACTLY 5 players");
    }

    const roles = [
      "Merlin",
      "Loyal Servant",
      "Loyal Servant",
      "Assassin",
      "Minion of Mordred",
    ];

    // Shuffle roles
    const shuffledRoles = this.shuffleArray(roles);

    // Assign to players
    const roleAssignments = new Map();

    players.forEach((player, index) => {
      roleAssignments.set(player.id, {
        role: shuffledRoles[index],
      });
    });

    this.fillDetails(players, roleAssignments);
    return roleAssignments;
  }

  /**
   * Fills in team and specialinfo for each players
   * Called by both assignRoles and assignfixedRoles
   * @param {Array<Object>} players
   * @param {Map} roleAssignments
   */

  static fillDetails(players, roleAssignments) {
    // Set teams
    players.forEach((player) => {
      const assignment = roleAssignments.get(player.id);
      assignment.team - this.ROLE_TEAMS[assignment.role];
      assignment.specialInfo = [];
    });

    // Set specialInfo
    players.forEach((player) => {
      const playerRole = roleAssignments.get(player.id);
      const specialInfo = [];

      // MERLIN: Sees both evil players
      if (playerRole.role === "Merlin") {
        players.forEach((otherPlayer) => {
          const otherRole = roleAssignments.get(otherPlayer.id);
          if (otherRole.team === "evil") {
            specialInfo.push({
              id: otherPlayer.name,
              name: "Evil",
            });
          }
        });
      }

      // EVIL: Sees each other
      if (playerRole.team === "evil") {
        players.forEach((otherPlayer) => {
          const otherRole = roleAssignments.get(otherPlayer.id);
          if (otherRole.team === "evil" && otherPlayer.id !== player.id) {
            specialInfo.push({
              id: otherPlayer.name,
              name: "Evil",
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
