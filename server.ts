import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(process.cwd(), "data.json");

// Mock User Roles
enum UserRole {
  ADMIN = 'Admin',
  THERAPEUTE = 'Thérapeute',
  SECRETAIRE = 'Secrétaire',
  PATIENT = 'Patient'
}

// Middleware to check roles
const checkRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers['x-user-role'] as UserRole;
    if (!userRole) return res.status(401).json({ error: "Non authentifié" });
    if (!allowedRoles.includes(userRole)) return res.status(403).json({ error: "Accès interdit" });
    next();
  };
};

const app = express();
const PORT = 3000;

async function startServer() {
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  app.get("/api/state", async (req, res) => {
    try {
      if (existsSync(DATA_FILE)) {
        const data = await fs.readFile(DATA_FILE, "utf-8");
        if (!data || data.trim() === "") return res.json({});
        try {
          res.json(JSON.parse(data));
        } catch (e) {
          res.json({});
        }
      } else {
        res.json({});
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to read state" });
    }
  });

  app.post("/api/state", async (req, res) => {
    const tempFile = `${DATA_FILE}.tmp`;
    try {
      const content = JSON.stringify(req.body, null, 2);
      await fs.writeFile(tempFile, content, "utf-8");
      await fs.rename(tempFile, DATA_FILE);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Failed to save state:", error);
      // Clean up temp file if it exists
      try { if (existsSync(tempFile)) await fs.unlink(tempFile); } catch (e) {}
      res.status(500).json({ error: "Failed to save state" });
    }
  });

  // Other API routes...
  app.get("/api/appointments", (req, res) => {
    res.json([{ id: 1, date: "2025-05-12", patient: "Alice Dubois" }]);
  });

  // Vite or Static
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.join(__dirname, "dist");

  if (!isProduction && !process.env.VERCEL) {
    console.log("Starting in DEVELOPMENT mode with Vite");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      const indexHtmlPath = path.join(distPath, "index.html");
      if (existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(404).send("Not found");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server error:", err);
  // Fallback to ensure port is bound
  const fallbackApp = express();
  fallbackApp.get("*", (req, res) => res.send("Server is starting or failed to start. Please reload."));
  fallbackApp.listen(PORT, "0.0.0.0");
});

export default app;
