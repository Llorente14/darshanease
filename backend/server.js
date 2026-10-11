require("dotenv").config();

const http = require("http");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const connectDB = require("./config/db");
const { initSocket } = require("./config/socket");
const { globalLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

// Fail fast on missing required env vars
if (!process.env.MONGO_URI) {
  console.error("FATAL: MONGO_URI is missing. Set it in backend/.env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is missing. Set it in backend/.env");
  process.exit(1);
}

const app = express();

// Render sits behind a proxy
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "").split(",").filter(Boolean),
  })
);
app.use(express.json({ limit: "10kb" }));

// Global rate limiter for /api
app.use("/api", globalLimiter);

// Routes
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/temples", require("./routes/templeRoutes"));

app.use("/api/slots", require("./routes/slotRoutes"));

app.use("/api/bookings", require("./routes/bookingRoutes"));

app.use("/api/organizer/temples", require("./routes/organizerTempleRoutes"));

app.use("/api/organizer/slots", require("./routes/organizerSlotRoutes"));

app.use("/api/admin/users", require("./routes/adminUserRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "DarshanEase API is running" });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});
