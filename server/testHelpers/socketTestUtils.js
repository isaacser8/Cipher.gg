const { io } = require('socket.io-client');

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

module.exports = {
  waitForEvent,
  createTestSockets,
  disconnectSockets,
  collectRoleAssignments,
  findRoleAssignment,
  findTeamAssignment,
};