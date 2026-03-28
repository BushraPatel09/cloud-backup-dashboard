import pool from "./db.js";

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS backup_history (
                id SERIAL PRIMARY KEY,
                backup_id TEXT,
                file_name TEXT,
                relative_path TEXT,
                size BIGINT,
                uploaded_at TIMESTAMP,
                status TEXT
            );
        `);

        console.log("✅ backup_history table ready");
        process.exit(0);
    } catch (err) {
        console.error("❌ DB init error:", err);
        process.exit(1);
    }
}

initDB();