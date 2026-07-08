/**
 * Socket test utilities used by full loop integration tests.
 *
 * These helpers keep Socket.IO timing predictable by waiting for
 * specific server events before the test continues.
 */
const { io } = require('socket.io-client');

/**
 * Waits for a single Socket.IO event and fails the test if it never arrives.
 *
 * The listener should be created before emitting the action that triggers the event.
 * Otherwise, server responses could be missed.
 */
const waitForEvent = (socket, eventName, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onEvent);
    };

    const onEvent = (data) => {
      cleanup();
      resolve(data);
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout: Waited ${timeoutMs}ms for event '${eventName}' but it never fired.`));
    }, timeoutMs);

    socket.once(eventName, onEvent);
  });
};

/**
 * Creates one socket per simulated player.
 *
 * The agent object is attached to each socket so tests can later connect
 * socket identity back to the generated user test data.
 */
const createTestSockets = async ({ agents, port }) => {
  const sockets = agents.map((agent) => {
    const socket = io(`http://localhost:${port}`);
    socket.agent = agent;

    socket.on('game_error', (err) => {
      console.error(`[SERVER ERROR for ${socket.id}]:`, err);
    });

    return socket;
  });

  await Promise.all(
    sockets.map((socket) => new Promise((resolve) => socket.on('connect', resolve)))
  );

  return sockets;
};

const disconnectSockets = (sockets) => {
  sockets.forEach((socket) => socket.disconnect());
};

const collectRoleAssignments = async (sockets) => {
  const rolePromises = sockets.map((socket) =>
    waitForEvent(socket, 'role_assigned', 8000).then((roleData) => ({
      socket,
      socketId: socket.id,
      role: roleData.role,
      team: roleData.team,
      specialInfo: roleData.specialInfo,
    }))
  );

  return Promise.all(rolePromises);
};

const findRoleAssignment = (roleAssignments, roleName) => {
  const assignment = roleAssignments.find((entry) => entry.role === roleName);

  if (!assignment) {
    throw new Error(`Could not find role assignment for ${roleName}`);
  }

  return assignment;
};

const findTeamAssignment = (roleAssignments, teamName) => {
  const assignment = roleAssignments.find((entry) => entry.team === teamName);

  if (!assignment) {
    throw new Error(`Could not find team assignment for ${teamName}`);
  }

  return assignment;
};

/**
 * Simulates a real network-level reconnect for one test socket: force-disconnects
 * it from the server side (not socket.disconnect(), which is a manual disconnect
 * that won't auto-reconnect), waits for the client's Manager to auto-reconnect
 * under a new socket.id, then re-emits join_room the same way Lobby.tsx/Game.tsx
 * do on a real 'reconnect' event.
 */
const forceReconnect = async ({ io, socket, roomCode, displayName, clerkId }) => {
  const oldId = socket.id;

  // Speed up the client's auto-reconnect backoff so tests aren't at the mercy
  // of socket.io-client's default ~1s+ delay between attempts.
  socket.io.reconnectionDelay(10);
  socket.io.reconnectionDelayMax(50);

  const reconnectPromise = new Promise((resolve) => socket.io.once('reconnect', resolve));

  io.sockets.sockets.get(oldId)?.disconnect(true);

  await reconnectPromise;

  const rosterPromise = waitForEvent(socket, 'roster_update', 10000);
  socket.emit('join_room', { roomCode, displayName, action: 'join', clerkId });
  await rosterPromise;

  return { oldId, newId: socket.id };
};

module.exports = {
  waitForEvent,
  createTestSockets,
  disconnectSockets,
  collectRoleAssignments,
  findRoleAssignment,
  findTeamAssignment,
  forceReconnect,
};