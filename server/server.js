const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { connectToDatabase } = require("./config/database");
const { registerSocketHandlers } = require("./socket/registerSocketHandlers");
const profileRoutes = require("./routes/profileRoutes");

// App & server setup
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/profile", profileRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://cipher-gg.vercel.app"],
    methods: ["GET", "POST"],
  },
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 5005;

app.get("/", (_req, res) => {
  res.send("Cipher.gg API is running!");
});

const dbReady = connectToDatabase().then(() => {
  if (require.main === module) {
    server.listen(PORT, () => {
      console.log(`🚀 Server and WebSockets running on port ${PORT}`);
    });
  }
});

module.exports = { 
  testServer: server, 
  dbReady, 
  io,
};
