const RoleAssigner = require('../../gameEngine/RoleAssigner');

describe('RoleAssigner', () => {

    // Test data = 5 players 
    const mockPlayers = [
        { id: 'player0', name: 'Alice' },   
        { id: 'player1', name: 'Bob' },
        { id: 'player2', name: 'Charlie' },
        { id: 'player3', name: 'Diana' },
        { id: 'player4', name: 'Eve' },
    ]; 

    // Validation test 
    test('should reject wrong number of players', () => {

        const tooFew = mockPlayers.slice(-1, 4); // Only 4 players
        const tooMany = [...mockPlayers, { id: 'player5', name: 'Frank' }]; // 6 players

        expect(() => RoleAssigner.assignRoles(tooFew))
            .toThrow('This game requires EXACTLY 5 players');

        expect(() => RoleAssigner.assignRoles(tooMany))
            .toThrow('This game requires EXACTLY 5 players');
    });

    // Team distribution test
    test('should assign 2 good and 2 evil players', () => {
        const roleMap = RoleAssigner.assignRoles(mockPlayers);

        let goodCount = 0;
        let evilCount = 0;

        roleMap.forEach(asg => {
            if (asg.team === 'good') goodCount++;
            if (asg.team === 'evil') evilCount++;
        }); 

        expect(goodCount).toBe(3);
        expect(evilCount).toBe(2);
    });

    // Role distribution test 
    test('should assign 1 Merlin, 1 Assassin, 1 Minion, and 2 Loyal Servants', () => {  
        const roleMap = RoleAssigner.assignRoles(mockPlayers);

        const roles = Array.from(roleMap.values()).map(asg => asg.role);

        const merlinCount = roles.filter(r => r === 'Merlin').length;
        const assassinCount = roles.filter(r => r === 'Assassin').length;
        const minionCount = roles.filter(r => r === 'Minion of Mordred').length;
        const loyalCount = roles.filter(r => r === 'Loyal Servant').length;

        expect(merlinCount).toBe(1);
        expect(assassinCount).toBe(1);
        expect(minionCount).toBe(1);
        expect(loyalCount).toBe(2);
    });

    // Merlin's special info test
    test('Merlin should see the evil players', () => {
        const roleMap = RoleAssigner.assignRoles(mockPlayers);

        // Find Merlin and evil players 
        let merlinId = null;
        const evilIds = [];

        roleMap.forEach((asg, playerId) => {
            if(asg.role === 'Merlin') merlinId = playerId;
            if(asg.team === 'evil') evilIds.push(playerId);
        });

        // Get Merlin's special info 
        const merlinInfo = roleMap.get(merlinId); 

        // Merlin should see exactly 2evil players 
        expect(merlinInfo.specialInfo.length).toBe(2);

        // Check Merlin sees the correct evil players 
        const seenIds = merlinInfo.specialInfo.map(info => info.id);
        expect(seenIds.sort()).toEqual(evilIds.sort());
    });

    // Evil players' special info test 
    test('Evil players should see each other', () => {
        const roleMap = RoleAssigner.assignRoles(mockPlayers);

        // Find evil players
        const evilPlayers = [];
        roleMap.forEach((asg, playerId) => {
            if(asg.team === 'evil') evilPlayers.push({ id: playerId, asg }); 
        }); 

        // Should have exactly 2 evil players
        expect(evilPlayers.length).toBe(2);

        // Each evil player should see the other 
        evilPlayers.forEach(evilPlayer => {
            const { id, asg } = evilPlayer; 
            const otherEvilId = evilPlayers.find(p => p.id !== id).id;

            expect(otherEvilId).toBeDefined();

            expect(asg.specialInfo.length).toBe(1); 
            expect(asg.specialInfo[0].id).toBe(otherEvilId);
        });
    }); 
});



