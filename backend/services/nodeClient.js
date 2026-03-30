const axios = require("axios");

async function storeSegmentOnNode(nodeBaseUrl, fileId, chunkName, chunkBuffer) {
    const res = await axios.post(`${nodeBaseUrl}/store-segment`, {
        fileId,
        chunkName,
        contentBase64: chunkBuffer.toString("base64"),
    });

    return res.data;
}

async function fetchSegmentFromNode(nodeBaseUrl, fileId, chunkName) {
    const res = await axios.get(`${nodeBaseUrl}/segment`, {
        params: { fileId, chunkName },
    });

    return Buffer.from(res.data.contentBase64, "base64");
}

async function deleteSegmentFromNode(nodeBaseUrl, fileId, chunkName) {
    const res = await axios.delete(`${nodeBaseUrl}/segment`, {
        params: { fileId, chunkName },
    });

    return res.data;
}

module.exports = {
    storeSegmentOnNode,
    fetchSegmentFromNode,
    deleteSegmentFromNode,
};