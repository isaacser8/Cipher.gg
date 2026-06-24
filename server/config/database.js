const mongoose = require("mongoose");

function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    return Promise.reject(
      new Error("MONGO_URI is missing. Check server/.env or test environment setup."),
    );
  }

  return mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("✅ Successfully connected to MongoDB Atlas (CipherGG-DB)");
    })
    .catch((error) => {
      console.error("❌ Error connecting to MongoDB:", error.message);
      throw error;
    });
}

module.exports = {
  connectToDatabase,
};