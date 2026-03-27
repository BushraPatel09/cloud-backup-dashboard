const dropboxProvider = {
    name: "dropbox",

    async uploadFile(fileData) {
        throw new Error("dropboxProvider.uploadFile not implemented yet");
    }
};

export default dropboxProvider;