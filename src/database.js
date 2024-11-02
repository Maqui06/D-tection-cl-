import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    this.db = await open({
      filename: 'keys.db',
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        descriptors BLOB,
        metadata TEXT,
        image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async addKey(name, descriptors, metadata, imagePath) {
    return this.db.run(
      'INSERT INTO keys (name, descriptors, metadata, image_path) VALUES (?, ?, ?, ?)',
      [name, descriptors, JSON.stringify(metadata), imagePath]
    );
  }

  async getAllKeys() {
    return this.db.all('SELECT * FROM keys ORDER BY created_at DESC');
  }

  async getKeyById(id) {
    return this.db.get('SELECT * FROM keys WHERE id = ?', [id]);
  }

  async updateKey(id, name, metadata) {
    return this.db.run(
      'UPDATE keys SET name = ?, metadata = ? WHERE id = ?',
      [name, JSON.stringify(metadata), id]
    );
  }

  async deleteKey(id) {
    return this.db.run('DELETE FROM keys WHERE id = ?', [id]);
  }
}

export const db = new Database();