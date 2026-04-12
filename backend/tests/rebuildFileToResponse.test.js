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

const crypto = require("crypto");
const { rebuildFileToResponse } = require("../services/storageService");

describe("rebuildFileToResponse", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("uses failover when first replica fails and second replica succeeds", async () => {
        const goodBuffer = Buffer.from("hello world");
        const checksum = crypto.createHash("sha256").update(goodBuffer).digest("hex");

        mockDbGet.mockImplementation(async (sql, params) => {
            if (sql.includes("SELECT * FROM files WHERE id = ?")) {
                return {
                    id: 1,
                    originalName: "test.txt",
                };
            }

            if (sql.includes("SELECT name, baseUrl, isActive FROM nodes WHERE name = ?")) {
                const nodeName = params[0];

                if (nodeName === "node-1") {
                    return {
                        name: "node-1",
                        baseUrl: "http://node-1:4001",
                        isActive: 1,
                    };
                }

                if (nodeName === "node-2") {
                    return {
                        name: "node-2",
                        baseUrl: "http://node-2:4001",
                        isActive: 1,
                    };
                }
            }

            return null;
        });

        mockDbAll.mockImplementation(async (sql, params) => {
            if (sql.includes("SELECT * FROM segments WHERE fileId = ?")) {
                return [
                    {
                        id: 10,
                        fileId: 1,
                        segmentIndex: 0,
                        checksum,
                    },
                ];
            }

            if (sql.includes("FROM segment_replicas sr")) {
                return [
                    {
                        nodeName: "node-1",
                        storedPath: "/fake/node-1/chunk-00000.bin",
                        checksum,
                    },
                    {
                        nodeName: "node-2",
                        storedPath: "/fake/node-2/chunk-00000.bin",
                        checksum,
                    },
                ];
            }

            return [];
        });

        mockFetchSegmentFromNode
            .mockRejectedValueOnce(new Error("connect ECONNREFUSED"))
            .mockResolvedValueOnce(goodBuffer);

        const res = {
            headers: {},
            chunks: [],
            ended: false,
            setHeader(name, value) {
                this.headers[name] = value;
            },
            write(chunk) {
                this.chunks.push(chunk);
            },
            end() {
                this.ended = true;
            },
        };

        const result = await rebuildFileToResponse(1, res);

        expect(result.notFound).toBe(false);
        expect(result.fileRow.originalName).toBe("test.txt");

        expect(res.headers["Content-Type"]).toBe("application/octet-stream");
        expect(res.headers["Content-Disposition"]).toBe(
            'attachment; filename="test.txt"'
        );

        expect(mockFetchSegmentFromNode).toHaveBeenCalledTimes(2);
        expect(mockFetchSegmentFromNode.mock.calls[0][0]).toBe("http://node-1:4001");
        expect(mockFetchSegmentFromNode.mock.calls[1][0]).toBe("http://node-2:4001");

        expect(res.chunks).toHaveLength(1);
        expect(res.chunks[0].equals(goodBuffer)).toBe(true);
        expect(res.ended).toBe(true);
    });
});