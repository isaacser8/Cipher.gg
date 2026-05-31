const { io } = require('socket.io-client');

describe('Cipher.gg Backend Socket Infrastructure', () => {
  let clientSocket;
  const TEST_PORT = 5005; 

  // 1. Connect a ghost client before running the tests
  beforeAll((done) => {
    clientSocket = io(`http://localhost:${TEST_PORT}`);
    clientSocket.on('connect', done);
  });

  // 2. Disconnect the ghost client after tests finish
  afterAll(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  // TESTS

  test('Test 1: Should successfully establish a WebSocket connection', () => {
    expect(clientSocket.connected).toBe(true);
  });

  test('Test 2: Should allow an agent to join a room and receive a roster update', (done) => {
    clientSocket.emit('join_room', {
      roomCode: 'JEST99',
      displayName: 'Ghost Agent',
      action: 'host'
    });

    clientSocket.on('roster_update', (roster) => {
      try {
        expect(roster).toBeDefined();
        expect(roster.length).toBe(1);
        expect(roster[0].name).toBe('Ghost Agent');
        expect(roster[0].isHost).toBe(true);
        done(); 
      } catch (error) {
        done(error);
      }
    });
  });

  test('Test 3: Should successfully broadcast secure comms to the room', (done) => {
    clientSocket.emit('send_message', {
      roomCode: 'JEST99',
      sender: 'Ghost Agent',
      message: 'Breaching the firewall now.'
    });

    clientSocket.on('receive_message', (data) => {
      try {
        expect(data.text).toContain('Ghost Agent');
        expect(data.text).toContain('Breaching the firewall now.');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

});