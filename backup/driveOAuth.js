// backup/driveOAuth.js
import { google } from "googleapis";

export function getDriveClient(accessToken) {
    const oauth2Client = new google.auth.OAuth2();

    // Set token from Google login
    oauth2Client.setCredentials({
        access_token: accessToken
    });

    const drive = google.drive({
        version: "v3",
        auth: oauth2Client
    });

    return drive;
}