import db from "../database.js";

export interface DocumentRecord {
  id: number;
  user_id: number | null;
  guest_session_id: string | null;
  title: string | null;
  filename: string;
  markdown_content: string;
  markdown_size: number;
  pdf_size: number | null;
  pdf_generated: boolean;
  theme: string;
  page_size: string;
  orientation: string;
  created_at: string;
  updated_at: string;
}

export const DocumentModel = {
  create(data: Omit<DocumentRecord, "id" | "created_at" | "updated_at">) {
    const stmt = db.prepare(`
      INSERT INTO documents (user_id, guest_session_id, title, filename,
        markdown_content, markdown_size, pdf_size, pdf_generated, theme,
        page_size, orientation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.user_id,
      data.guest_session_id,
      data.title,
      data.filename,
      data.markdown_content,
      data.markdown_size,
      data.pdf_size,
      data.pdf_generated ? 1 : 0,
      data.theme,
      data.page_size,
      data.orientation
    );
  },

  findByUserId(userId: number, limit = 50, offset = 0) {
    return db
      .prepare(
        `
      SELECT id, title, filename, markdown_size, pdf_size, pdf_generated,
        theme, created_at, updated_at
      FROM documents WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `
      )
      .all(userId, limit, offset);
  },

  findByGuestSession(sessionId: string, limit = 50, offset = 0) {
    return db
      .prepare(
        `
      SELECT id, title, filename, markdown_size, pdf_size, pdf_generated,
        theme, created_at, updated_at
      FROM documents WHERE guest_session_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `
      )
      .all(sessionId, limit, offset);
  },

  findById(id: number) {
    return db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  },

  delete(id: number, userId?: number) {
    if (userId) {
      return db
        .prepare("DELETE FROM documents WHERE id = ? AND user_id = ?")
        .run(id, userId);
    }
    return db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  },

  search(query: string, userId?: number) {
    if (userId) {
      return db
        .prepare(
          `
        SELECT id, title, filename, created_at
        FROM documents WHERE user_id = ? AND (title LIKE ? OR filename LIKE ?)
        ORDER BY created_at DESC LIMIT 20
      `
        )
        .all(userId, `%${query}%`, `%${query}%`);
    }
    return [];
  },

  getStats(userId?: number) {
    if (userId) {
      return db
        .prepare(
          `
        SELECT COUNT(*) as total,
          SUM(CASE WHEN pdf_generated = 1 THEN 1 ELSE 0 END) as pdf_count,
          SUM(markdown_size) as total_md_size,
          SUM(pdf_size) as total_pdf_size
        FROM documents WHERE user_id = ?
      `
        )
        .get(userId);
    }
    return db
      .prepare(
        `
      SELECT COUNT(*) as total,
        SUM(CASE WHEN pdf_generated = 1 THEN 1 ELSE 0 END) as pdf_count
      FROM documents
    `
      )
      .get();
  },
};
