import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import { sequelize, connectDB } from "./config/DB.js";
import { initWebSocketServer } from "./websocket/wsServer.js";
import "./model/index.js";

// Import MQTT client — connection is established as a side-effect.
// If TTN credentials are not set, this logs a warning and does nothing.
import "./config/mqttClient.js";

import pcbRoutes       from "./routes/pcbRoutes.js";
import vehicleRoutes   from "./routes/vehicleRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import testRoutes      from "./routes/testRoutes.js";

const app    = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Swagger ───────────────────────────────────────────────────────────────────
try {
  const swaggerDocument = YAML.load("./swagger.yaml");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch {
  console.warn("[Swagger] swagger.yaml not found — /api-docs disabled.");
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "AL Tracker API running" }));
app.use("/VT/api", pcbRoutes);
app.use("/VT/api", vehicleRoutes);
app.use("/VT/api", analyticsRoutes);
app.use("/VT/api", testRoutes);  // ← remove in production

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await connectDB();
    await sequelize.sync();

    // Attach WebSocket server to the same HTTP port as Express
    initWebSocketServer(server);

    server.listen(PORT, () => {
      console.log(`[Server] Running at http://localhost:${PORT}`);
      console.log(`[Server] API docs at  http://localhost:${PORT}/api-docs`);
    });
  } catch (e) {
    console.error("[Server] Startup error:", e);
    process.exit(1);
  }
})();
