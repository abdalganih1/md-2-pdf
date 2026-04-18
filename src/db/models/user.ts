import db from "../database.js";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export const UserModel = {
  async create(
    username: string,
    email: string,
    password: string,
    displayName?: string
  ) {
    const hash = await bcrypt.hash(password, 12);
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(username, email, hash, displayName || username);
  },

  findByEmail(email: string): User | undefined {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
      | User
      | undefined;
  },

  findById(id: number): User | undefined {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | User
      | undefined;
  },

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  },

  updateLastLogin(id: number) {
    db.prepare(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(id);
  },
};
