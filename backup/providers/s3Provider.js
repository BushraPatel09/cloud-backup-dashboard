import crypto from "crypto";
import https from "https";
import { URL } from "url";
import { BaseStorageProvider } from "./baseProvider.js";

function sha256Hex(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
    return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    return hmac(kService, "aws4_request");
}

function buildS3Key(backupId, relativePath, originalname) {
    const normalizedPath = (relativePath || originalname || "file").replace(/\\/g, "/");
    return `${backupId}/${normalizedPath}`;
}

function formatAmzDate(date) {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signRequest({ method, url, headers, body, accessKeyId, secretAccessKey, region }) {
    const parsedUrl = new URL(url);
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);
    const canonicalUri = parsedUrl.pathname;
    const canonicalQueryString = parsedUrl.searchParams.toString();

    const allHeaders = {
        ...headers,
        host: parsedUrl.host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate
    };

    const sortedHeaderKeys = Object.keys(allHeaders)
        .map((key) => key.toLowerCase())
        .sort();

    const normalizedHeaders = {};
    for (const key of Object.keys(allHeaders)) {
        normalizedHeaders[key.toLowerCase()] = `${allHeaders[key]}`.trim();
    }

    const canonicalHeaders = sortedHeaderKeys
        .map((key) => `${key}:${normalizedHeaders[key]}\n`)
        .join("");

    const signedHeaders = sortedHeaderKeys.join(";");
    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest)
    ].join("\n");

    const signingKey = getSigningKey(secretAccessKey, dateStamp, region, "s3");
    const signature = hmac(signingKey, stringToSign, "hex");

    normalizedHeaders.authorization =
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return normalizedHeaders;
}

function makeRequest({ method, url, headers, body }) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, { method, headers }, (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
                const responseBody = Buffer.concat(chunks);
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    resolve({ statusCode: response.statusCode, body: responseBody, headers: response.headers });
                    return;
                }

                reject(new Error(`S3 request failed with status ${response.statusCode}: ${responseBody.toString("utf8")}`));
            });
        });

        request.on("error", reject);

        if (body?.length) {
            request.write(body);
        }

        request.end();
    });
}

export class S3Provider extends BaseStorageProvider {
    constructor({ bucket, region, accessKeyId, secretAccessKey }) {
        super("s3");
        this.bucket = bucket || process.env.AWS_S3_BUCKET || "";
        this.region = region || process.env.AWS_REGION || "";
        this.accessKeyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID || "";
        this.secretAccessKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || "";
    }

    validateConfig() {
        if (!this.bucket || !this.region || !this.accessKeyId || !this.secretAccessKey) {
            throw new Error("S3 provider requires AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY");
        }
    }

    async uploadFile({ backupId, file, relativePath }) {
        this.validateConfig();
        const storagePath = buildS3Key(backupId, relativePath, file.originalname);
        const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodeURI(storagePath)}`;
        const body = file.buffer;

        const headers = signRequest({
            method: "PUT",
            url,
            headers: {
                "content-length": body.length,
                "content-type": file.mimetype || "application/octet-stream"
            },
            body,
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
            region: this.region
        });

        await makeRequest({ method: "PUT", url, headers, body });

        return {
            providerFileId: storagePath,
            storagePath
        };
    }

    async downloadFile({ record, destinationPath }) {
        this.validateConfig();
        const storagePath = record.storagePath || record.providerFileId;
        if (!storagePath) {
            throw new Error("S3 storage path missing");
        }

        const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodeURI(storagePath)}`;
        const headers = signRequest({
            method: "GET",
            url,
            headers: {},
            body: Buffer.alloc(0),
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
            region: this.region
        });

        const response = await makeRequest({
            method: "GET",
            url,
            headers,
            body: Buffer.alloc(0)
        });

        const fs = await import("fs");
        fs.writeFileSync(destinationPath, response.body);
    }
}
