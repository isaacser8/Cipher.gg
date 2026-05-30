const AssassinationManager = require('../../gameEngine/AssassinationManager');
const RoleAssigner = require('../../gameEngine/RoleAssigner');

describe ('AssassinationManager', () => {
    let players; 
    let roleAssignments; 
    let manager; 

    beforeEach(() => {
        players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' }, 
            { id: 'p3', name: 'Charlie' },
            { id: 'p4', name: 'Diana' },
            { id: 'p5', name: 'Eve' }
        ];

        roleAssignments = RoleAssigner.assignRoles(players);
        manager = new AssassinationManager(players, roleAssignments);
    }); 

    test('should trigger when Good wins 3 quests', () => {
        expect(manager.shouldTrigger(3)).toBe(true); 
        expect(manager.shouldTrigger(2)).toBe(false); 
    });

    test('should identify Assassin and Merlin', () => {
        expect(manager.assassinId).toBeTruthy(); 
        expect(manager.merlinId).toBeTruthy(); 
    }); 

    test('should allow Assassin to select target', () => {
        const result = manager.selectTarget(manager.assassinId, manager.merlinId); 
        expect(result.targetId).toBe(manager.merlinId); 
    }); 

    test('should throw error if non-Assassin tries to select', () => {
        const nonAssassin = players.find(p => p.id !== manager.assassinId).id; 
        expect(() => {
            manager.selectTarget(nonAssassin, manager.merlinId); 
        }).toThrow('Only the Assassin can select a target');
    }); 

    test('Evil wins if Assassin guesses Merlin correctly', () => {
        manager.selectTarget(manager.assassinId, manager.merlinId); 
        const result = manager.resolveAssassination(); 

        expect(result.guessedCorrectly).toBe(true); 
        expect(result.winner).toBe('evil'); 
    }); 

    test('Good wins if Assassin guesses wrong', () => {
        const wrongTarget = players.find(p => {
            const role = roleAssignments.get(p.id); 
            return role.team == 'good' && p.id !== manager.merlinId; 
        }).id; 

        manager.selectTarget(manager.assassinId, wrongTarget); 
        const result = manager.resolveAssassination(); 

        expect(result.guessedCorrectly).toBe(false); 
        expect(result.winner).toBe('good'); 
        
    }); 

    afterAll((done) => {
    // Close the socket connections
      if (clientSocket) {
        clientSocket.disconnect();
      }
    // Close the actual HTTP server
      if (httpServer) {
        httpServer.close(done);
      } else {
        done();
      }
    });

});