const { scanDirectory } = require("./engine/scanner");

(async () => {
    const data = await scanDirectory("./testFolder");
    console.log(data);
})();