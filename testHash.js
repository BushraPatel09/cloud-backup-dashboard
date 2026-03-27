const { generateFileHash } = require("./engine/utils/hash");

(async () => {
    const hash = await generateFileHash("./testFolder/test-backup.txt");
    console.log("File hash:", hash);
})();