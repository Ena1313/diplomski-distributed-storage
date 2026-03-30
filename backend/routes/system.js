const express = require('express');
const { dbAll, dbGet } = require('../utils/dbHelpers');

const router = express.Router();

router.get('/system/overview', async (req, res) => {
    try {
        const totalFilesRow = await dbGet('SELECT COUNT(*) AS count FROM files;');
        const totalSegmentsRow = await dbGet('SELECT COUNT(*) AS count FROM segments;');
        const totalReplicasRow = await dbGet('SELECT COUNT(*) AS count FROM segment_replicas;');
        const activeNodesRow = await dbGet('SELECT COUNT(*) AS count FROM nodes WHERE isActive = 1;');
        const inactiveNodesRow = await dbGet('SELECT COUNT(*) AS count FROM nodes WHERE isActive = 0;');

        const files = await dbAll('SELECT id FROM files ORDER BY id ASC;');

        let degradedFilesCount = 0;
        let missingFilesCount = 0;

        for (const file of files) {
            const segments = await dbAll(
                'SELECT id FROM segments WHERE fileId = ? ORDER BY segmentIndex ASC;',
                [file.id]
            );

            let fileMissing = false;
            let fileDegraded = false;

            for (const segment of segments) {
                const replicas = await dbAll(
                    'SELECT id FROM segment_replicas WHERE segmentId = ?;',
                    [segment.id]
                );

                const replicaCount = replicas.length;

                if (replicaCount === 0) {
                    fileMissing = true;
                } else if (replicaCount < 2) {
                    fileDegraded = true;
                }
            }

            if (fileMissing) {
                missingFilesCount += 1;
            } else if (fileDegraded) {
                degradedFilesCount += 1;
            }
        }

        return res.json({
            totalFiles: totalFilesRow.count,
            totalSegments: totalSegmentsRow.count,
            totalReplicas: totalReplicasRow.count,
            activeNodes: activeNodesRow.count,
            inactiveNodes: inactiveNodesRow.count,
            degradedFilesCount,
            missingFilesCount,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || String(error) });
    }
});

module.exports = router;