import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "data.json");

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
    // In a real app, you would get the user from the session or JWT
    // For demo, we'll look for a header 'x-user-role'
    const userRole = req.headers['x-user-role'] as UserRole;

    if (!userRole) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Accès interdit : permissions insuffisantes" });
    }

    next();
  };
};

const app = express();

async function configureServer() {
  app.use(express.json({ limit: '50mb' }));

  // API Routes for State Persistence
  app.get("/api/state", async (req, res) => {
    try {
      if (existsSync(DATA_FILE)) {
        const data = await fs.readFile(DATA_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({}); // Return empty if no data yet
      }
    } catch (error) {
      console.error("Error reading state:", error);
      res.status(500).json({ error: "Failed to read state" });
    }
  });

  app.post("/api/state", async (req, res) => {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Error saving state:", error);
      res.status(500).json({ error: "Failed to save state" });
    }
  });

  // API Routes with Role protection
  app.get("/api/admin/stats", checkRole([UserRole.ADMIN]), (req, res) => {
    res.json({ 
      revenue: 125000, 
      activeUsers: 12,
      systemHealth: "OK"
    });
  });

  app.get("/api/medical-records/:id", checkRole([UserRole.ADMIN, UserRole.THERAPEUTE]), (req, res) => {
    res.json({ 
      id: req.params.id,
      notes: "Notes médicales confidentielles...",
      diagnosis: "Pathologie complexe"
    });
  });

  app.get("/api/appointments", checkRole([UserRole.ADMIN, UserRole.THERAPEUTE, UserRole.SECRETAIRE, UserRole.PATIENT]), (req, res) => {
    res.json([
      { id: 1, date: "2025-05-12", patient: "Alice Dubois" }
    ]);
  });

  // Vite middleware for development (only if not on Vercel)
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    // Note: Vercel routes handle the SPA fallback via vercel.json
    // but we keep this for other production environments
    app.get("*", (req, res) => {
      const indexHtmlPath = path.join(distPath, "index.html");
      if (existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(404).send("Not found");
      }
    });
  }
}

// Export for Vercel
export default app;

// Local startup
if (!process.env.VERCEL) {
  configureServer().then(() => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to start server:", err);
  });
} else {
  // On Vercel, we need to ensure routes are configured
  configureServer();
}
