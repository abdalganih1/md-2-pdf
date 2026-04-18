import db from "./database.js";

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      guest_session_id TEXT,
      title TEXT,
      filename TEXT NOT NULL,
      markdown_content TEXT NOT NULL,
      markdown_size INTEGER NOT NULL,
      pdf_size INTEGER,
      pdf_generated BOOLEAN DEFAULT 0,
      theme TEXT DEFAULT 'blue',
      page_size TEXT DEFAULT 'A4',
      orientation TEXT DEFAULT 'portrait',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_sessions (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      documents_count INTEGER DEFAULT 0
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_guest ON documents(guest_session_id);
    CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
  `);

  console.log("[md-2-pdf] Database initialized successfully");
}
