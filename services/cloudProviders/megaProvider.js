import pkg from "megajs";

const { Storage } = pkg;

// ⚠️ Replace with your MEGA account credentials
const MEGA_EMAIL = "your-email@example.com";
const MEGA_PASSWORD = "your-password";

let storage = null;

async function getMegaStorage() {
    if (storage) return storage;

    storage = new Storage({
        email: MEGA_EMAIL,
        password: MEGA_PASSWORD
    });

    return new Promise((resolve, reject) => {
        storage.on("ready", () => {
            console.log("✅ MEGA Connected");
            resolve(storage);
        });

        storage.on("error", (err) => {
            console.error("❌ MEGA Login Failed:", err);
            reject(err);
        });
    });
}

const megaProvider = {
    name: "mega",

    async uploadFile(fileData) {
        throw new Error("megaProvider.uploadFile not implemented yet");
    },

    getMegaStorage
};

export default megaProvider;