const mockDbAll = jest.fn();
const mockDbRun = jest.fn();
const mockGetActiveNodes = jest.fn();
const mockGetNodeByName = jest.fn();
const mockFetchSegmentFromNode = jest.fn();
const mockStoreSegmentOnNode = jest.fn();

jest.mock("../utils/dbHelpers", () => ({
    dbAll: (...args) => mockDbAll(...args),
    dbRun: (...args) => mockDbRun(...args),
}));

jest.mock("../services/storageService", () => ({
    getActiveNodes: (...args) => mockGetActiveNodes(...args),
    getNodeByName: (...args) => mockGetNodeByName(...args),
    TARGET_REPLICA_COUNT: 2,
}));

jest.mock("../services/nodeClient", () => ({
    fetchSegmentFromNode: (...args) => mockFetchSegmentFromNode(...args),
    storeSegmentOnNode: (...args) => mockStoreSegmentOnNode(...args),
}));

const { rebalanceSingleFile } = require("../services/rebalanceService");

describe("rebalanceSingleFile", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("creates a missing replica on another active node", async () => {
        const sourceBuffer = Buffer.from("segment-data");

        mockGetActiveNodes.mockResolvedValue([
            { name: "node-1", baseUrl: "http://node-1:4001" },
            { name: "node-2", baseUrl: "http://node-2:4001" },
            { name: "node-3", baseUrl: "http://node-3:4001" },
        ]);

        mockDbAll.mockImplementation(async (sql, params) => {
            if (sql.includes("SELECT id, segmentIndex FROM segments WHERE fileId = ?")) {
                return [
                    { id: 10, segmentIndex: 0 },
                ];
            }

            if (sql.includes("SELECT id, segmentId, nodeName, storedPath FROM segment_replicas WHERE segmentId = ?")) {
                return [
                    {
                        id: 100,
                        segmentId: 10,
                        nodeName: "node-1",
                        storedPath: "/data/storage/1/chunk-00000.bin",
                    },
                ];
            }

            return [];
        });

        mockFetchSegmentFromNode
            .mockResolvedValueOnce(sourceBuffer)
            .mockResolvedValueOnce(sourceBuffer);

        mockStoreSegmentOnNode.mockResolvedValue({
            storedPath: "/data/storage/1/chunk-00000.bin",
        });

        const result = await rebalanceSingleFile(1);

        expect(mockFetchSegmentFromNode).toHaveBeenCalledWith(
            "http://node-1:4001",
            1,
            "chunk-00000.bin"
        );

        expect(mockStoreSegmentOnNode).toHaveBeenCalledWith(
            "http://node-2:4001",
            1,
            "chunk-00000.bin",
            sourceBuffer
        );

        expect(mockDbRun).toHaveBeenCalledWith(
            "INSERT OR IGNORE INTO segment_replicas (segmentId, nodeName, storedPath) VALUES (?, ?, ?)",
            [10, "node-2", "/data/storage/1/chunk-00000.bin"]
        );

        expect(result.fileId).toBe(1);
        expect(result.targetReplicaCount).toBe(2);

        expect(result.results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    segmentIndex: 0,
                    status: "CREATED",
                    nodeName: "node-2",
                }),
                expect.objectContaining({
                    segmentIndex: 0,
                    status: "OK",
                    replicasOnNodes: expect.arrayContaining(["node-1", "node-2"]),
                }),
            ])
        );
    });
});