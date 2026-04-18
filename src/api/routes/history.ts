import { Router } from "express";
import { DocumentModel } from "../../db/models/document.js";

const router = Router();

router.get("/", (req, res) => {
  const userId = (req as any).userId;
  const guestId = (req as any).guestSessionId;
  const { limit = 50, offset = 0, search } = req.query;

  let documents;

  if (userId) {
    documents = search
      ? DocumentModel.search(search as string, userId)
      : DocumentModel.findByUserId(userId, +limit, +offset);
  } else if (guestId) {
    documents = DocumentModel.findByGuestSession(guestId, +limit, +offset);
  } else {
    res.json({ success: true, documents: [], message: "لا توجد جلسة" });
    return;
  }

  res.json({ success: true, documents });
});

router.get("/stats/summary", (req, res) => {
  const userId = (req as any).userId;
  const stats = DocumentModel.getStats(userId || undefined);
  res.json({ success: true, stats });
});

router.get("/:id", (req, res) => {
  const doc = DocumentModel.findById(+req.params.id);
  if (!doc) {
    res
      .status(404)
      .json({ success: false, error: "لم يتم العثور على المستند" });
    return;
  }
  res.json({ success: true, document: doc });
});

router.delete("/:id", (req, res) => {
  const userId = (req as any).userId;
  const result = DocumentModel.delete(+req.params.id, userId);
  res.json({ success: true, deleted: result.changes > 0 });
});

export default router;
