import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { appConfigs, formEntries, chatMessages, users } from "./src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "./src/db/users.ts";
import { optionalAuth, requireAuth, AuthRequest } from "./src/middleware/auth.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Routes
  app.get("/api/health", async (_req, res) => {
    try {
      res.json({ status: "ok", database: "connected" });
    } catch (e: any) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  // Get App Configuration from Cloud SQL
  app.get("/api/config", async (_req, res) => {
    try {
      const records = await db.select().from(appConfigs).where(eq(appConfigs.configKey, "main_template"));
      if (records.length > 0) {
        res.json(records[0].data);
      } else {
        res.json(null);
      }
    } catch (error: any) {
      console.error("Failed to load app config:", error);
      res.status(500).json({ error: "Failed to load configuration" });
    }
  });

  // Save App Configuration to Cloud SQL
  app.post("/api/config", async (req, res) => {
    try {
      const configData = req.body;
      const result = await db.insert(appConfigs)
        .values({
          configKey: "main_template",
          data: configData,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appConfigs.configKey,
          set: {
            data: configData,
            updatedAt: new Date(),
          },
        })
        .returning();

      res.json({ success: true, config: result[0]?.data });
    } catch (error: any) {
      console.error("Failed to save app config:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // User Sync
  app.post("/api/users/sync", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { uid, email, displayName, photoUrl } = req.body;
      const targetUid = req.user?.uid || uid;
      if (!targetUid) {
        return res.status(400).json({ error: "UID is required" });
      }

      const user = await getOrCreateUser(targetUid, email, displayName, photoUrl);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Failed to sync user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Get Form Entries
  app.get("/api/entries", async (_req, res) => {
    try {
      const entries = await db.select().from(formEntries).orderBy(desc(formEntries.createdAt));
      res.json(entries);
    } catch (error: any) {
      console.error("Failed to fetch entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  // Save Form Entry
  app.post("/api/entries", async (req, res) => {
    try {
      const { uid, writer, entryDate, data } = req.body;
      if (!writer || !data) {
        return res.status(400).json({ error: "Writer and data are required" });
      }

      const newEntry = await db.insert(formEntries)
        .values({
          uid: uid || "anonymous",
          writer,
          entryDate: entryDate || new Date().toLocaleDateString("vi-VN"),
          data,
          createdAt: new Date(),
        })
        .returning();

      res.json({ success: true, entry: newEntry[0] });
    } catch (error: any) {
      console.error("Failed to save entry:", error);
      res.status(500).json({ error: "Failed to save entry" });
    }
  });

  // Delete Form Entry
  app.delete("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      await db.delete(formEntries).where(eq(formEntries.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to delete entry:", error);
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  // Chat Messages
  app.get("/api/chat-messages", async (req, res) => {
    try {
      const uid = (req.query.uid as string) || "anonymous";
      const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.uid, uid))
        .orderBy(chatMessages.createdAt);
      res.json(messages);
    } catch (error: any) {
      console.error("Failed to fetch chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat-messages", async (req, res) => {
    try {
      const { uid, role, content, imageUrl } = req.body;
      if (!content || !role) {
        return res.status(400).json({ error: "Role and content are required" });
      }

      const msg = await db.insert(chatMessages)
        .values({
          uid: uid || "anonymous",
          role,
          content,
          imageUrl: imageUrl || null,
          createdAt: new Date(),
        })
        .returning();

      res.json({ success: true, message: msg[0] });
    } catch (error: any) {
      console.error("Failed to save chat message:", error);
      res.status(500).json({ error: "Failed to save chat message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
