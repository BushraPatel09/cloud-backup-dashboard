import googleDriveProvider from "./googleDriveProvider.js";
import dropboxProvider from "./dropboxProvider.js";
import s3Provider from "./s3Provider.js";
import megaProvider from "./megaProvider.js";
import { DEFAULT_CLOUD_PROVIDER } from "./providerConstants.js";

const providers = {
    "google-drive": googleDriveProvider,
    "dropbox": dropboxProvider,
    "aws-s3": s3Provider,
    "mega": megaProvider
};

function validateProvider(provider) {
    if (!provider) {
        throw new Error("Cloud provider is missing");
    }

    if (!provider.name) {
        throw new Error("Cloud provider must have a name");
    }

    if (typeof provider.uploadFile !== "function") {
        throw new Error(`Cloud provider "${provider.name}" must implement uploadFile()`);
    }

    return provider;
}

export function getCloudProvider(providerName) {
    const finalProviderName = providerName || DEFAULT_CLOUD_PROVIDER;

    const provider = providers[finalProviderName];

    if (!provider) {
        throw new Error(`Unsupported cloud provider: ${finalProviderName}`);
    }

    return validateProvider(provider);
}