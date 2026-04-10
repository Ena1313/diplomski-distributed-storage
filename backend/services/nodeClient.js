const axios = require("axios");

const axiosInstance = axios.create({
    timeout: 3000,
});

async function storeSegmentOnNode(nodeBaseUrl, fileId, chunkName, chunkBuffer) {
    const res = await axiosInstance.post(`${nodeBaseUrl}/store-segment`, {
        fileId,
        chunkName,
        contentBase64: chunkBuffer.toString("base64"),
    });

    return res.data;
}

async function fetchSegmentFromNode(nodeBaseUrl, fileId, chunkName) {
    const res = await axiosInstance.get(`${nodeBaseUrl}/segment`, {
        params: { fileId, chunkName },
    });

    return Buffer.from(res.data.contentBase64, "base64");
}

async function deleteSegmentFromNode(nodeBaseUrl, fileId, chunkName) {
    const res = await axiosInstance.delete(`${nodeBaseUrl}/segment`, {
        params: { fileId, chunkName },
    });

    return res.data;
}

module.exports = {
    storeSegmentOnNode,
    fetchSegmentFromNode,
    deleteSegmentFromNode,
};