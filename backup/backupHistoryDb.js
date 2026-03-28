import pool from "../db.js";

export async function addBackupHistoryToDb(record) {
    const query = `
        INSERT INTO backup_history (
            backup_id,
            file_name,
            relative_path,
            size,
            uploaded_at,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;

    const values = [
        record.backupId || null,
        record.fileName || null,
        record.relativePath || null,
        record.size || 0,
        record.uploadedAt || new Date(),
        record.status || "completed"
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

export async function getBackupHistoryFromDb() {
    const result = await pool.query(`
        SELECT
            backup_id AS "backupId",
            file_name AS "fileName",
            relative_path AS "relativePath",
            size,
            uploaded_at AS "uploadedAt",
            status
        FROM backup_history
        ORDER BY uploaded_at DESC
    `);

    return result.rows;
}