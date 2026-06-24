/**
 * Shared setup/teardown for integration tests.
 *
 * Starts the HTTP/Socket.IO server once, waits for MongoDB readiness,
 * and removes only test-generated records.
 */

const mongoose = require("mongoose");
const Match = require("../models/Match");
const User = require("../models/User");
const { testServer, dbReady, io } = require("../server");

async function startIntegrationServer(port) {
  await dbReady;

  if (!testServer.listening) {
    await new Promise((resolve) => {
      testServer.listen(port, resolve);
    });
  }
}

async function cleanupIntegrationData() {
  await Match.deleteMany({ roomCode: { $regex: "^TEST_" } });

  await User.deleteMany({ clerkId: { $regex: "^test_full_loop_" } });
  await User.deleteMany({ clerkId: { $regex: "^test_assassination_" } });
  await User.deleteMany({ clerkId: { $regex: "^test_good_win_" } });
  await User.deleteMany({ clerkId: { $regex: "^test_vote_hammer_" } });
  await User.deleteMany({ clerkId: { $regex: "^test_persistence_" } });
  await User.deleteMany({ clerkId: { $regex: "^test_q4_" } });
}

async function stopIntegrationServer() {
  io.close();

  if (testServer.listening) {
    await new Promise((resolve) => testServer.close(resolve));
  }

  await mongoose.disconnect();
}

module.exports = {
  startIntegrationServer,
  cleanupIntegrationData,
  stopIntegrationServer,
};