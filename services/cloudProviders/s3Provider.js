const s3Provider = {
    name: "aws-s3",

    async uploadFile(fileData) {
        throw new Error("s3Provider.uploadFile not implemented yet");
    }
};

export default s3Provider;