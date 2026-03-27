import { GoogleDriveProvider } from "./googleDriveProvider.js";
import { DropboxProvider } from "./dropboxProvider.js";
import { S3Provider } from "./s3Provider.js";


export const SUPPORTED_PROVIDERS = ["google", "dropbox", "s3"];
export const DEFAULT_PROVIDER = "google";

export function normalizeProviderName(provider) {
    return `${provider || DEFAULT_PROVIDER}`.trim().toLowerCase();
}

export function createStorageProvider(providerName, options = {}) {
    const normalizedProvider = normalizeProviderName(providerName);

    switch (normalizedProvider) {
    case "google":
        return new GoogleDriveProvider(options);
    case "dropbox":
        return new DropboxProvider(options);
    case "s3":
        return new S3Provider(options);
    default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
}

export function getProviderOptionsFromRequest(req, providerName) {
    const normalizedProvider = normalizeProviderName(providerName);

    if (normalizedProvider === "google") {
        return {
            accessToken: req?.session?.googleAccessToken || ""
        };
    }

    if (normalizedProvider === "dropbox") {
        return {
            accessToken: req?.session?.dropboxAccessToken || ""
        };
    }

    return {};
}
