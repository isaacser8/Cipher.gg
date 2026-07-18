const RoleAssigner = require('../../gameEngine/RoleAssigner');

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `player${i}`,
    name: `Player ${i}`,
  }));
}

describe('RoleAssigner', () => {
    // Zero player test
    test('should reject zero players', () => {
        expect(() => RoleAssigner.assignRoles(makePlayers(0)))
            .toThrow('Unsupported player count');
        });

    // Validation test 
    test('should reject fewer than 5 players and more than 10 players', () => {
        expect(() => RoleAssigner.assignRoles(makePlayers(4)))
        .toThrow('Unsupported player count');

        expect(() => RoleAssigner.assignRoles(makePlayers(11)))
        .toThrow('Unsupported player count');
    });

    // Team distribution test
    test.each([
        [5, 3, 2],
        [6, 4, 2],
        [7, 4, 3],
        [8, 5, 3],
        [9, 6, 3],
        [10, 6, 4],
    ])('should assign correct Good/Evil split for %i players', (count, goodCount, evilCount) => {
        const roleMap = RoleAssigner.assignRoles(makePlayers(count));
        const roles = Array.from(roleMap.values());

        expect(roles.filter((r) => r.team === 'good')).toHaveLength(goodCount);
        expect(roles.filter((r) => r.team === 'evil')).toHaveLength(evilCount);
    });

    // Role distribution test 
    test.each([5, 6, 7, 8, 9, 10])('should always assign exactly 1 Merlin and 1 Assassin for %i players', (count) => {
        const roleMap = RoleAssigner.assignRoles(makePlayers(count));
        const roles = Array.from(roleMap.values()).map((asg) => asg.role);

        expect(roles.filter((r) => r === 'Merlin')).toHaveLength(1);
        expect(roles.filter((r) => r === 'Assassin')).toHaveLength(1);
    });

    // Merlin's special info test
    test('Merlin should see the evil players by name and masked as "Evil"', () => {
        const players = makePlayers(7);
        const roleMap = RoleAssigner.assignRoles(players);

        // Find Merlin and evil players' NAMES
        let merlinId = null;
        const evilNames = []; 

        roleMap.forEach((asg, playerId) => {
            if(asg.role === 'Merlin') merlinId = playerId;
            if(asg.team === 'evil') {
                evilNames.push(players.find((p) => p.id === playerId).name);
            }
        });

        const merlinInfo = roleMap.get(merlinId); 
        const seenNames = merlinInfo.specialInfo.map(info => info.id);

        // Merlin should see evil players 
        expect(merlinInfo.specialInfo).toHaveLength(evilNames.length);

        // Check Merlin sees the correct evil player NAMES
        expect(seenNames.sort()).toEqual(evilNames.sort());
        
        // Check that the specific role is masked as "Evil"
        expect(merlinInfo.specialInfo.every((info) => info.name === 'Evil')).toBe(true);
    });

    // Evil players' special info test 
    test('Evil players should see each other by name and masked as "Evil"', () => {
        const players = makePlayers(10);
        const roleMap = RoleAssigner.assignRoles(players);

        // Find evil players
        const evilPlayers = [];
        roleMap.forEach((asg, playerId) => {
            if(asg.team === 'evil') evilPlayers.push({ id: playerId, asg }); 
        }); 

        // Each evil player should see the other 
        evilPlayers.forEach(({id, asg}) => {
            const otherEvilNames = evilPlayers
                .filter((p) => p.id !== id)
                .map((p) => players.find((player) => player.id === p.id).name)
                .sort();
            
            // Look up the display name of other evil players
            const seenNames = asg.specialInfo.map((info) => info.id).sort();

            expect(seenNames).toEqual(otherEvilNames);
            expect(asg.specialInfo.every((info) => info.name === 'Evil')).toBe(true);      
        });
    });
});