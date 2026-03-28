import pool from "../db.js";

export async function addBackupHistoryToDb(record) {
    const query = `
        INSERT INTO backup_history (
            user_email,
            backup_id,
            file_name,
            relative_path,
            size,
            uploaded_at,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    const values = [
        record.userEmail || null,
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

export async function getBackupHistoryFromDb(userEmail) {
    const query = `
        SELECT
            user_email AS "userEmail",
            backup_id AS "backupId",
            file_name AS "fileName",
            relative_path AS "relativePath",
            size,
            uploaded_at AS "uploadedAt",
            status
        FROM backup_history
        WHERE user_email = $1
        ORDER BY uploaded_at DESC;
    `;

    const result = await pool.query(query, [userEmail]);
    return result.rows;
}