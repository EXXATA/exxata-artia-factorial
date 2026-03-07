import mysql from 'mysql2/promise';

class ArtiaDBConnection {
  constructor() {
    this.pool = null;
  }

  async connect() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = mysql.createPool({
      host: process.env.ARTIA_DB_HOST,
      port: process.env.ARTIA_DB_PORT || 3306,
      user: process.env.ARTIA_DB_USER,
      password: process.env.ARTIA_DB_PASSWORD,
      database: process.env.ARTIA_DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    return this.pool;
  }

  async query(sql, params = []) {
    const pool = await this.connect();
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const artiaDB = new ArtiaDBConnection();
