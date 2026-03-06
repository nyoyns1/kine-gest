import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
