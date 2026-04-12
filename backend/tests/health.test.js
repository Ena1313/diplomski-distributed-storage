const { calculateFileHealth } = require("../../frontend/src/utils/storageMetrics");

describe("calculateFileHealth", () => {
    test("returns Healthy when every segment has 2 replicas", () => {
        const detail = {
            segments: [
                { segmentIndex: 0 },
                { segmentIndex: 1 },
            ],
            replicas: [
                { segmentIndex: 0 },
                { segmentIndex: 0 },
                { segmentIndex: 1 },
                { segmentIndex: 1 },
            ],
        };

        const result = calculateFileHealth(detail);

        expect(result.label).toBe("Healthy");
        expect(result.summary).toBe("2/2");
        expect(result.degradedSegments).toBe(0);
        expect(result.missingSegments).toBe(0);
    });

    test("returns Degraded when one segment has only 1 replica", () => {
        const detail = {
            segments: [
                { segmentIndex: 0 },
                { segmentIndex: 1 },
            ],
            replicas: [
                { segmentIndex: 0 },
                { segmentIndex: 0 },
                { segmentIndex: 1 },
            ],
        };

        const result = calculateFileHealth(detail);

        expect(result.label).toBe("Degraded");
        expect(result.summary).toBe("1/2");
        expect(result.degradedSegments).toBe(1);
        expect(result.missingSegments).toBe(0);
    });

    test("returns Missing when one segment has no replicas", () => {
        const detail = {
            segments: [
                { segmentIndex: 0 },
                { segmentIndex: 1 },
            ],
            replicas: [
                { segmentIndex: 0 },
                { segmentIndex: 0 },
            ],
        };

        const result = calculateFileHealth(detail);

        expect(result.label).toBe("Missing");
        expect(result.summary).toBe("1/2");
        expect(result.degradedSegments).toBe(0);
        expect(result.missingSegments).toBe(1);
    });
});