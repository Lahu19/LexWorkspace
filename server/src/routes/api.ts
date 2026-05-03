import { Router, type Request, type Response } from "express";
import { Matter, Message, LegalDocument } from "../db/models.js";

export const apiRouter = Router();

const USER_ID = "local-dev-user"; // placeholder until Google Auth is wired up

/* ═══════════════════════════════════════════════════════════════
   MATTERS
═══════════════════════════════════════════════════════════════ */

/** GET /api/matters — list all matters, newest first */
apiRouter.get("/matters", async (_req: Request, res: Response) => {
  try {
    const matters = await Matter.find({ user_id: USER_ID })
      .sort({ updated_at: -1 })
      .lean();
    // Rename _id → id for frontend compatibility
    const data = matters.map((m) => ({ ...m, id: m._id, _id: undefined }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matters" });
  }
});

/** POST /api/matters — create a new matter */
apiRouter.post("/matters", async (req: Request, res: Response) => {
  try {
    const { title, client, description } = req.body as {
      title?: string;
      client?: string;
      description?: string;
    };
    if (!title?.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const matter = await Matter.create({
      user_id: USER_ID,
      title: title.trim(),
      client: client?.trim() || null,
      description: description?.trim() || null,
    });
    const obj = matter.toJSON();
    res.status(201).json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create matter" });
  }
});

/** DELETE /api/matters/:id — delete a matter and its messages & documents */
apiRouter.delete("/matters/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Promise.all([
      Matter.deleteOne({ _id: id, user_id: USER_ID }),
      Message.deleteMany({ matter_id: id }),
      LegalDocument.deleteMany({ matter_id: id }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete matter" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   MESSAGES
═══════════════════════════════════════════════════════════════ */

/** GET /api/matters/:id/messages — list messages for a matter */
apiRouter.get("/matters/:id/messages", async (req: Request, res: Response) => {
  try {
    const messages = await Message.find({ matter_id: req.params.id })
      .sort({ created_at: 1 })
      .lean();
    const data = messages.map((m) => ({ ...m, id: m._id, _id: undefined }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** POST /api/messages — save a message */
apiRouter.post("/messages", async (req: Request, res: Response) => {
  try {
    const { matter_id, agent, role, content } = req.body as {
      matter_id?: string;
      agent?: string;
      role?: string;
      content?: string;
    };
    if (!matter_id || !agent || !role || !content) {
      res.status(400).json({ error: "matter_id, agent, role and content are required" });
      return;
    }
    const msg = await Message.create({
      matter_id,
      user_id: USER_ID,
      agent,
      role,
      content,
    });
    res.status(201).json(msg.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   DOCUMENTS
═══════════════════════════════════════════════════════════════ */

/** GET /api/matters/:id/documents — list documents for a matter */
apiRouter.get("/matters/:id/documents", async (req: Request, res: Response) => {
  try {
    const docs = await LegalDocument.find({ matter_id: req.params.id })
      .sort({ updated_at: -1 })
      .lean();
    const data = docs.map((d) => ({ ...d, id: d._id, _id: undefined }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/** POST /api/documents — save a document */
apiRouter.post("/documents", async (req: Request, res: Response) => {
  try {
    const { matter_id, title, doc_type, content } = req.body as {
      matter_id?: string;
      title?: string;
      doc_type?: string;
      content?: string;
    };
    if (!matter_id || !title || !content) {
      res.status(400).json({ error: "matter_id, title and content are required" });
      return;
    }
    const doc = await LegalDocument.create({
      matter_id,
      user_id: USER_ID,
      title,
      doc_type: doc_type ?? "drafting",
      content,
    });
    res.status(201).json(doc.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save document" });
  }
});

/** DELETE /api/documents/:id — delete a document */
apiRouter.delete("/documents/:id", async (req: Request, res: Response) => {
  try {
    await LegalDocument.deleteOne({ _id: req.params.id, user_id: USER_ID });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});
