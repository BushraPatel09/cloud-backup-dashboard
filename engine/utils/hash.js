const fs = require("fs");
const crypto = require("crypto");

/**
 * Generates SHA256 hash of a file
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function generateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);

        stream.on("error", reject);

        stream.on("data", chunk => {
            hash.update(chunk);
        });

        stream.on("end", () => {
            resolve(hash.digest("hex"));
        });
    });
}

module.exports = {
    generateFileHash
};