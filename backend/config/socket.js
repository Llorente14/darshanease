const { Server } = require("socket.io");
const { getSlotStatus } = require("../utils/dateTime");

let io = null;

// Same origin list as the Express CORS config in server.js (CLIENT_URL, comma separated)
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CLIENT_URL || "").split(",").filter(Boolean),
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io is not initialized. Call initSocket(server) first.");
  return io;
};

// Broadcast to every connected client. Payload is the minimum the UI needs to update one slot.
const emitSlotUpdated = (slot) => {
  getIO().emit("slot:updated", {
    slotId: String(slot._id),
    availableSeats: slot.availableSeats,
    status: getSlotStatus(slot),
  });
};

module.exports = { initSocket, getIO, emitSlotUpdated };
