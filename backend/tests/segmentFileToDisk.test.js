const fs = require("fs");
const os = require("os");
const path = require("path");

const mockDbAll = jest.fn();
const mockDbGet = jest.fn();
const mockDbRun = jest.fn();
const mockStoreSegmentOnNode = jest.fn();
const mockFetchSegmentFromNode = jest.fn();
const mockDeleteSegmentFromNode = jest.fn();

jest.mock("../utils/dbHelpers", () => ({
    dbAll: (...args) => mockDbAll(...args),
    dbGet: (...args) => mockDbGet(...args),
    dbRun: (...args) => mockDbRun(...args),
}));

jest.mock("../services/nodeClient", () => ({
    storeSegmentOnNode: (...args) => mockStoreSegmentOnNode(...args),
    fetchSegmentFromNode: (...args) => mockFetchSegmentFromNode(...args),
    deleteSegmentFromNode: (...args) => mockDeleteSegmentFromNode(...args),
}));

jest.mock("../config/paths", () => {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");

    const root = path.join(os.tmpdir(), "diplomski-segment-tests");
    const segmentsDir = path.join(root, "segments");
    const uploadsDir = path.join(root, "uploads");

    fs.mkdirSync(segmentsDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

    return {
        SEGMENTS_DIR: segmentsDir,
        UPLOADS_DIR: uploadsDir,
    };
});

const { segmentFileToDisk, CHUNK_SIZE_BYTES } = require("../services/storageService");

describe("segmentFileToDisk", () => {
    const tempDir = path.join(os.tmpdir(), "diplomski-segment-inputs");
    const testFilePath = path.join(tempDir, "test-file.bin");

    beforeAll(() => {
        fs.mkdirSync(tempDir, { recursive: true });
    });

    beforeEach(() => {
        jest.clearAllMocks();

        const content = Buffer.concat([
            Buffer.alloc(CHUNK_SIZE_BYTES, "a"),
            Buffer.from("hello-world"),
        ]);

        fs.writeFileSync(testFilePath, content);

        mockDbAll.mockResolvedValue([
            { name: "node-1", baseUrl: "http://node-1:4001" },
            { name: "node-2", baseUrl: "http://node-2:4001" },
            { name: "node-3", baseUrl: "http://node-3:4001" },
        ]);

        let segmentId = 1;
        mockDbRun.mockImplementation(async (sql) => {
            if (sql.includes("INSERT INTO segments")) {
                return { lastID: segmentId++ };
            }

            return {};
        });

        mockStoreSegmentOnNode.mockImplementation(async (baseUrl, fileId, chunkName) => ({
            storedPath: `${baseUrl}/${fileId}/${chunkName}`,
        }));
    });

    afterAll(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch { }
    });

    test("splits file into correct chunk count and stores replicas on selected nodes", async () => {
        const result = await segmentFileToDisk(testFilePath, 1);

        expect(result.segmentsCreated).toBe(2);
        expect(result.targetNodes).toEqual(["node-1", "node-2"]);

        expect(mockStoreSegmentOnNode).toHaveBeenCalledTimes(4);

        const firstChunkPath = path.join(
            require("../config/paths").SEGMENTS_DIR,
            "1",
            "chunk-00000.bin"
        );
        const secondChunkPath = path.join(
            require("../config/paths").SEGMENTS_DIR,
            "1",
            "chunk-00001.bin"
        );

        expect(fs.existsSync(firstChunkPath)).toBe(true);
        expect(fs.existsSync(secondChunkPath)).toBe(true);
    });
});