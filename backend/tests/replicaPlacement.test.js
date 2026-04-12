const { pickRoundRobinNodes } = require("../services/storageService");

describe("pickRoundRobinNodes", () => {
    const nodes = [
        { name: "node-1" },
        { name: "node-2" },
        { name: "node-3" },
    ];

    test("fileId 1 -> node-1, node-2", () => {
        const result = pickRoundRobinNodes(nodes, 2, 1);
        expect(result.map((node) => node.name)).toEqual(["node-1", "node-2"]);
    });

    test("fileId 2 -> node-2, node-3", () => {
        const result = pickRoundRobinNodes(nodes, 2, 2);
        expect(result.map((node) => node.name)).toEqual(["node-2", "node-3"]);
    });

    test("fileId 3 -> node-3, node-1", () => {
        const result = pickRoundRobinNodes(nodes, 2, 3);
        expect(result.map((node) => node.name)).toEqual(["node-3", "node-1"]);
    });

    test("fileId 4 wraps back to node-1, node-2", () => {
        const result = pickRoundRobinNodes(nodes, 2, 4);
        expect(result.map((node) => node.name)).toEqual(["node-1", "node-2"]);
    });
});