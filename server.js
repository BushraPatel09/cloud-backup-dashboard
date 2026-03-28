import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import cors from "cors";
import session from "express-session";
import jwt from "jsonwebtoken";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import dotenv from "dotenv";

import { getBackupHistoryFromDb, addBackupHistoryToDb } from "./backup/backupHistoryDb.js";
import { readOverviewStats, writeOverviewStats } from "./backup/overviewStatsManager.js";
import { startBackup, requestStopBackup, getStopBackupStatus } from "./services/backupEngine.js";
import restoreHistoryRoutes from "./routes/restoreHistory.js";
import restoreAnalyticsRoutes from "./routes/restoreAnalytics.js";
import restoreDashboardRoutes from "./routes/restoreDashboard.js";
import { uploadFileToDrive } from "./backup/googleDriveUploader.js";
import {
    readBackupHistory,
    addBackupHistoryRecord,
    getFailedFilesByBackupId,
    hasFailedFilesForRetry,
    getRetryableFailedFilesByBackupId
} from "./backup/backupHistoryManager.js";
import { getDriveClient } from "./backup/driveOAuth.js";
import {
    uploadSelectedFolder,
    requestStopFolderBackup,
    getFolderBackupStatus
} from "./backup/uploadSelectedFolderEngine.js";

import {
    restoreBackup,
    requestStopRestore,
    getRestoreStatus
} from "./backup/restore/restoreEngine.js";
import restoreLifetimeStatsRouter from "./routes/restoreLifetimeStats.js";
import { initSocketServer, broadcastBackupUpdate } from "./realtime/socketServer.js";
import { retryFailedFiles } from "./backup/retryFailedFilesEngine.js";
import { startFolderBackup } from "./backup/folderBackupEngine.js";
import folderBackupRoutes from "./routes/folderBackupRoutes.js";
import { DEFAULT_CLOUD_PROVIDER } from "./services/cloudProviders/providerConstants.js";
import {
    getRestoreHistory,
    addRestoreHistoryRecord,
    updateRestoreHistoryRecord
} from "./backup/restoreHistoryManager.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const upload = multer({ storage: multer.memoryStorage() });

// --------------------
// __dirname Fix (Required in ES Modules)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// CONFIG
// --------------------
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;


// --------------------
// MIDDLEWARE
// --------------------
// app.use(cors({
//     origin: "http://127.0.0.1:5500",
//     credentials: true
// }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "backup-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// --------------------
// STATIC FILES
// --------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// ROUTES
// --------------------
app.use("/api/restore", restoreDashboardRoutes);
app.use("/api/restore", restoreAnalyticsRoutes);
//app.use("/api/restore", restoreHistoryRoutes);
app.use("/api/backup", folderBackupRoutes);
app.use(restoreLifetimeStatsRouter);
// --------------------
// AUTH MIDDLEWARE
// --------------------
function requireAuth(req, res, next) {
    if (!req.session.user || !req.session.jwt) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }
    next();
}

// --------------------
// TEST SESSION
// --------------------
app.get("/test-session", (req, res) => {
    if (!req.session.views) {
        req.session.views = 1;
    } else {
        req.session.views++;
    }

    res.json({
        message: "Session working",
        views: req.session.views
    });
});

// --------------------
// GOOGLE LOGIN
// --------------------
app.get("/auth/google", (req, res) => {
    const scope = encodeURIComponent("openid email profile https://www.googleapis.com/auth/drive.file");

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    res.redirect(url);
});

app.get("/auth/dropbox", (req, res) => {
    const url =
        `https://www.dropbox.com/oauth2/authorize` +
        `?client_id=${DROPBOX_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(DROPBOX_REDIRECT_URI)}` +
        `&response_type=code` +
        `&token_access_type=offline`;

    res.redirect(url);
});
// --------------------
// GOOGLE CALLBACK
// --------------------
app.get("/auth/google/callback", async (req, res) => {
    try {
        const code = req.query.code;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            return res.status(400).json({
                error: "Token exchange failed",
                details: tokenData
            });
        }

        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userRes.json();

        req.session.user = userData;
        req.session.googleAccessToken = tokenData.access_token;
        req.session.googleRefreshToken = tokenData.refresh_token || null;

        const jwtPayload = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            provider: "google"
        };

        const token = jwt.sign(jwtPayload, JWT_SECRET, {
            expiresIn: "2h"
        });

        req.session.jwt = token;

        console.log("✅ Google User:", userData.email);
        console.log("🔐 JWT Issued");

        req.session.save((err) => {
    if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({
            error: "Failed to save session"
        });
    }

    res.redirect("/dashboard");
});

    } catch (error) {
        console.error("Google OAuth Error:", error);
        res.status(500).json({
            error: "Google OAuth Failed ❌",
            details: error.message
        });
    }
});

app.get("/auth/dropbox/callback", async (req, res) => {
    try {

        console.log("---- Dropbox Callback Hit ----");
        console.log("Session ID before save:", req.sessionID);
        console.log("Session user before save:", req.session.user?.email || null);
        console.log("Session jwt exists before save:", !!req.session.jwt);

        const code = req.query.code;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Dropbox authorization code missing"
            });
        }

        const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                code,
                client_id: DROPBOX_CLIENT_ID,
                client_secret: DROPBOX_CLIENT_SECRET,
                redirect_uri: DROPBOX_REDIRECT_URI,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            return res.status(400).json({
                success: false,
                message: "Dropbox token exchange failed",
                details: tokenData
            });
        }

        req.session.dropboxAccessToken = tokenData.access_token;
req.session.dropboxRefreshToken = tokenData.refresh_token || null;
req.session.dropboxTokenExpiresIn = tokenData.expires_in || null;

console.log("Dropbox token set:", !!req.session.dropboxAccessToken);
console.log("Session ID after token set:", req.sessionID);
console.log("Session user after token set:", req.session.user?.email || null);
console.log("Session jwt exists after token set:", !!req.session.jwt);

console.log("✅ Dropbox connected");
console.log("🔐 Dropbox token saved in session");
console.log("🔁 Dropbox refresh token saved:", !!req.session.dropboxRefreshToken);
console.log("⏰ Dropbox token expires in:", req.session.dropboxTokenExpiresIn);

       req.session.save((err) => {
    if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save Dropbox session"
        });
    }

    res.redirect("http://localhost:5000/dashboard");
});

    } catch (error) {
        console.error("Dropbox OAuth Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Dropbox OAuth failed",
            error: error.message
        });
    }
});
// --------------------
// DASHBOARD
// --------------------
app.get("/dashboard", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/api/overview-stats", async (req, res) => {
    try {
        const backupHistoryPath = path.join(process.cwd(), "backup", "backupHistory.json");
        const restoreHistoryPath = path.join(process.cwd(), "backup", "restoreHistory.json");

        let backupHistory = [];
        let restoreHistory = [];

        if (fs.existsSync(backupHistoryPath)) {
            const backupRaw = fs.readFileSync(backupHistoryPath, "utf-8");
            backupHistory = backupRaw ? JSON.parse(backupRaw) : [];
        }

        if (fs.existsSync(restoreHistoryPath)) {
            const restoreRaw = fs.readFileSync(restoreHistoryPath, "utf-8");
            restoreHistory = restoreRaw ? JSON.parse(restoreRaw) : [];
        }

        const statsFileData = readOverviewStats();

        const totalBackups = statsFileData.totalBackupJobs;
        const successfulBackups = statsFileData.successfulBackupJobs;
        const failedBackups = statsFileData.failedBackupJobs;

        const totalRestores = restoreHistory.length;
        const successfulRestores = restoreHistory.filter(
        r => r.status === "completed"
        ).length;

        const failedRestores = restoreHistory.filter(
        r => r.status === "failed"
        ).length;

        const restoreSuccessRate =
            totalRestores === 0
                ? 0
                : Math.round((successfulRestores / totalRestores) * 100);

        const totalBackedUpFiles = statsFileData.totalBackedUpFiles;

        res.json({
            success: true,
            stats: {
                totalBackups,
                successfulBackups,
                failedBackups,
                totalRestores,
                successfulRestores,
                failedRestores,
                restoreSuccessRate,
                totalBackedUpFiles
            }
        });
    } catch (error) {
        console.error("Overview stats error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to load overview stats"
        });
    }
});

// --------------------
// API: GET USER
// --------------------
app.get("/api/me", requireAuth, (req, res) => {
    res.json({
        user: req.session.user,
        jwt: req.session.jwt
    });
});

// --------------------
// TEST DRIVE OAUTH
// --------------------
app.get("/api/test-drive-oauth", requireAuth, async (req, res) => {
    try {
        const accessToken = req.session.googleAccessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "No Google access token in session"
            });
        }

        const drive = getDriveClient(accessToken);

        const about = await drive.about.get({
            fields: "user, storageQuota"
        });

        res.json({
            success: true,
            message: "OAuth Drive connected",
            user: about.data.user,
            storage: about.data.storageQuota
        });

    } catch (error) {
        console.error("Drive OAuth Test Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Drive OAuth connection failed",
            error: error.message
        });
    }
});

app.get("/api/test-dropbox-oauth", requireAuth, async (req, res) => {
    try {
        const accessToken = req.session.dropboxAccessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "No Dropbox access token in session"
            });
        }

        const accountRes = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        const accountData = await accountRes.json();

        if (!accountRes.ok) {
            return res.status(400).json({
                success: false,
                message: "Dropbox OAuth connection failed",
                details: accountData
            });
        }

        res.json({
            success: true,
            message: "Dropbox OAuth connected",
            account: accountData
        });
    } catch (error) {
        console.error("Dropbox OAuth Test Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Dropbox OAuth test failed",
            error: error.message
        });
    }
});

app.get("/api/test-backup-history", (req, res) => {
    try {
        const record = {
            fileName: "demo-file.txt",
            relativePath: "demo-folder/demo-file.txt",
            size: 2048, // bytes
            uploadedAt: new Date().toISOString(),
            status: "completed"
        };

        addBackupHistoryRecord(record);

        res.json({
            success: true,
            message: "Test backup history record added",
            record
        });
    } catch (error) {
        console.error("Test history error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.get("/api/backup/history", async (req, res) => {
    try {
        let history = [];

        try {
            history = await getBackupHistoryFromDb();
        } catch (dbError) {
            console.error("DB history read failed, falling back to JSON:", dbError.message);
        }

        if (!history || history.length === 0) {
            history = readBackupHistory();
        }

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error("Read history error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.get("/api/backup/failed/:backupId", (req, res) => {
    try {
        const { backupId } = req.params;

        const failedFiles = getFailedFilesByBackupId(backupId);

        res.json({
            success: true,
            backupId,
            failedCount: failedFiles.length,
            failedFiles
        });
    } catch (error) {
        console.error("Read failed files error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.get("/api/backup/retry-available/:backupId", (req, res) => {
    try {
        const { backupId } = req.params;

        const retryAvailable = hasFailedFilesForRetry(backupId);

        res.json({
            success: true,
            backupId,
            retryAvailable
        });
    } catch (error) {
        console.error("Retry availability check error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.get("/api/backup/retry-files/:backupId", (req, res) => {
    try {
        const { backupId } = req.params;

        const files = getRetryableFailedFilesByBackupId(backupId);

        res.json({
            success: true,
            backupId,
            count: files.length,
            files
        });
    } catch (error) {
        console.error("Retry files fetch error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/api/restore/history", requireAuth, (req, res) => {
    try {
        const history = getRestoreHistory();

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error("Get restore history error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/test-upload-file", requireAuth, async (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: "filePath is required"
            });
        }

        const accessToken = req.session.googleAccessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Google access token not found in session"
            });
        }

        const uploadedFile = await uploadFileToDrive(accessToken, filePath);

        res.json({
            success: true,
            message: "File uploaded successfully",
            file: uploadedFile
        });
    } catch (error) {
        console.error("Test upload error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.post("/api/start-folder-backup", requireAuth, async (req, res) => {
    try {
        const { folderPath } = req.body;

        if (!folderPath) {
            return res.status(400).json({
                success: false,
                message: "folderPath is required"
            });
        }

        const accessToken = req.session.googleAccessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Google access token not found in session"
            });
        }

        const result = await startFolderBackup(accessToken, folderPath);

        res.json({
            success: true,
            message: "Folder backup completed successfully",
            ...result
        });
    } catch (error) {
        console.error("Start folder backup error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.post("/api/start-backup", (req, res) => {

    console.log("🚀 Backup API Called");

    startBackup();

    res.json({
        message: "Backup Started"
    });

});
app.post("/api/stop-backup", (req, res) => {
    const status = getFolderBackupStatus();

    if (!status.isFolderBackupRunning) {
        return res.status(400).json({
            success: false,
            message: "No backup is currently running"
        });
    }

    requestStopFolderBackup();

    res.json({
        success: true,
        message: "Stop request sent successfully"
    });
});

app.post("/api/upload-selected-folder", requireAuth, upload.array("files"), async (req, res) => {
    try {
        console.log("UPLOAD ROUTE HIT");
        console.log("---- Upload Route Session Debug ----");
        console.log("Session user:", req.session.user?.email || null);
        console.log("Has googleAccessToken:", !!req.session.googleAccessToken);
        console.log("googleAccessToken value:", req.session.googleAccessToken || null);
       
        const provider = req.body.provider || DEFAULT_CLOUD_PROVIDER;
        const accessToken = req.session.googleAccessToken;

        console.log("Selected cloud provider:", provider);
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Google access token not found in session"
            });
        }

        const files = req.files;
        const relativePaths = req.body.relativePaths;
        const existingBackupId = req.body.backupId || null;

        // ===== TEMP DEBUG LOGS START =====
        console.log("==== Selected Folder Upload Debug ====");
        console.log("Files count:", files?.length || 0);
        console.log("relativePaths:", relativePaths);

        if (files && files.length > 0) {
            files.forEach((file, index) => {
                const relativePath = Array.isArray(relativePaths)
                    ? relativePaths[index]
                    : relativePaths;

                console.log(`File ${index + 1}:`);
                console.log("originalname:", file.originalname);
                console.log("relativePath:", relativePath);
            });
        }
        // ===== TEMP DEBUG LOGS END =====

        const result = await uploadSelectedFolder(req, files, relativePaths, existingBackupId, provider);

        const userEmail = req.session.user?.email || "unknown";

        if (result?.uploadedFiles && result.uploadedFiles.length > 0) {
            for (const file of result.uploadedFiles) {
                await addBackupHistoryToDb({
                    userEmail,
                    backupId: result.backupId,
                    fileName: file.fileName || file.originalname || "Unknown File",
                    relativePath: file.relativePath || file.storagePath || file.fileName || "Unknown Path",
                    size: file.size || 0,
                    uploadedAt: new Date().toISOString(),
                    status: file.status || "completed"
                });
            }
        }
        // ===== SAVE BACKUP HISTORY START =====
        // ===== SAVE BACKUP HISTORY START =====

// ===== SAVE BACKUP HISTORY END =====
        // ===== SAVE BACKUP HISTORY END =====

        res.json({
        ...result,
        provider,
        message: result.stopped
        ? "Backup stopped by user"
        : result.status === "completed_with_failures"
            ? "Backup completed with some failed files"
            : "Selected folder uploaded successfully"
});
    } catch (error) {
        console.error("Upload selected folder error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.post("/api/backup/retry-failed/:backupId", requireAuth, async (req, res) => {
    try {
        const { backupId } = req.params;
        const accessToken = req.session.googleAccessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Google access token not found in session"
            });
        }

        const result = await retryFailedFiles(accessToken, backupId);

        res.status(result.success ? 200 : 400).json({
    ...result,
    message:
        result.status === "completed"
            ? "All failed files retried successfully"
            : result.status === "completed_with_failures"
                ? "Some failed files were retried successfully"
                : result.status === "no_failed_files"
                    ? "No failed files found for retry"
                    : result.message
});
    } catch (error) {
        console.error("Retry failed files error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
app.post("/api/restore-backup", requireAuth, async (req, res) => {
    try {
        const { backupId, restoreType, filePath } = req.body;

        const restoreId = `restore_${Date.now()}`;

        const restoreRecord = {
    restoreId,
    backupId,
    restoreType,
    filePath: filePath || null,
    filesRestored: 0,
    timestamp: new Date().toISOString(),
    status: "started"
};
        addRestoreHistoryRecord(restoreRecord);

        console.log("🧪 Restore request body:");
        console.log("backupId:", backupId);
        console.log("restoreType:", restoreType);
        console.log("filePath:", filePath);

        if (!backupId) {
            return res.status(400).json({
                success: false,
                message: "backupId is required"
            });
        }

        const accessToken = req.session.googleAccessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Google access token not found in session"
            });
        }

                const result = await restoreBackup(accessToken, backupId, restoreType, filePath);

                updateRestoreHistoryRecord(restoreId, {
            status: result.stopped ? "stopped" : "completed",
            filesRestored: result.filesRestored || 0
        });

                res.json({
                    ...result,
                    message: result.stopped
                        ? "Restore stopped by user"
                        : "Backup restored successfully"
        });
    } catch (error) {
        console.error("Restore backup error:", error.message);

        updateRestoreHistoryRecord(restoreId, {
            status: "failed"
        });

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/stop-restore", requireAuth, (req, res) => {
    const status = getRestoreStatus();

    if (!status.isRestoreRunning) {
        return res.status(400).json({
            success: false,
            message: "No restore is currently running"
        });
    }

    requestStopRestore();

    res.json({
        success: true,
        message: "Restore stop request sent successfully"
    });
});
// --------------------
// LOGOUT
// --------------------
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/public/login.html");
    });
});
app.get("/api/google-user", (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({ error: "Not logged in" });
    }

    res.json(req.session.user);
});
// --------------------
// TEST BACKUP PROGRESS
// --------------------
app.get("/api/test-backup", (req, res) => {

    console.log("📦 Test Backup Started");

    let progress = 0;

    const stages = [
        { stage: "scanning", progress: 10 },
        { stage: "scanning", progress: 25 },
        { stage: "uploading", progress: 45 },
        { stage: "uploading", progress: 70 },
        { stage: "verifying", progress: 90 },
        { stage: "completed", progress: 100 }
    ];

    let step = 0;

    const interval = setInterval(() => {

        if (step >= stages.length) {
            clearInterval(interval);
            return;
        }

        const update = {
            file: "test-file.zip",
            progress: stages[step].progress,
            stage: stages[step].stage,
            status: stages[step].stage === "completed" ? "completed" : "running"
        };

        console.log("Backup Update:", update);

        broadcastBackupUpdate(update);

        step++;

    }, 2000);

    res.json({
        success: true,
        message: "Test backup started"
    });

});
// --------------------
// SERVER + WEBSOCKET
// --------------------

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocketServer(server);
//initRestoreSocketServer(server);

//initBackupSocket(server);

server.listen(PORT, () => {
    console.log(`🚀 Server + WebSocket running on http://localhost:${PORT}`);
    console.log(`⚡ Real-time Restore Monitoring ACTIVE`);
   // startTestBackup();
});
