export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return "-";
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function calculateFileHealth(detail) {
  const segments = detail?.segments || [];
  const replicas = detail?.replicas || [];

  if (!segments.length) {
    return {
      label: "Missing",
      severity: "error",
      summary: "0/0",
      degradedSegments: 0,
      missingSegments: 0,
      segmentCount: 0,
    };
  }

  let degradedSegments = 0;
  let missingSegments = 0;

  for (const segment of segments) {
    const replicaCount = replicas.filter((r) => r.segmentIndex === segment.segmentIndex).length;
    if (replicaCount === 0) {
      missingSegments += 1;
    } else if (replicaCount < 2) {
      degradedSegments += 1;
    }
  }

  if (missingSegments > 0) {
    return {
      label: "Missing",
      severity: "error",
      summary: `${segments.length - missingSegments}/${segments.length}`,
      degradedSegments,
      missingSegments,
      segmentCount: segments.length,
    };
  }

  if (degradedSegments > 0) {
    return {
      label: "Degraded",
      severity: "warning",
      summary: `${segments.length - degradedSegments}/${segments.length}`,
      degradedSegments,
      missingSegments,
      segmentCount: segments.length,
    };
  }

  return {
    label: "Healthy",
    severity: "success",
    summary: `${segments.length}/${segments.length}`,
    degradedSegments,
    missingSegments,
    segmentCount: segments.length,
  };
}

export function buildNodeOverview(nodes = [], allDetails = []) {
  return nodes.map((node) => {
    let replicaCount = 0;
    const segmentIds = new Set();
    const fileIds = new Set();

    for (const detail of allDetails) {
      for (const replica of detail.replicas || []) {
        if (replica.nodeName === node.name) {
          replicaCount += 1;
          segmentIds.add(replica.segmentId);
          fileIds.add(detail.file.id);
        }
      }
    }

    return {
      ...node,
      replicaCount,
      uniqueSegmentCount: segmentIds.size,
      uniqueFileCount: fileIds.size,
    };
  });
}

export function buildSystemOverview(nodes = [], allDetails = []) {
  const totalFiles = allDetails.length;
  const totalSegments = allDetails.reduce((sum, detail) => sum + (detail.segments?.length || 0), 0);
  const totalReplicas = allDetails.reduce((sum, detail) => sum + (detail.replicas?.length || 0), 0);
  const activeNodes = nodes.filter((node) => Number(node.isActive) === 1).length;
  const inactiveNodes = nodes.length - activeNodes;

  let degradedFilesCount = 0;
  let missingFilesCount = 0;

  const fileHealthSummary = allDetails.map((detail) => {
    const health = calculateFileHealth(detail);
    if (health.label === "Missing") missingFilesCount += 1;
    else if (health.label === "Degraded") degradedFilesCount += 1;

    return {
      fileId: detail.file.id,
      originalName: detail.file.originalName,
      ...health,
    };
  });

  return {
    totalFiles,
    totalSegments,
    totalReplicas,
    activeNodes,
    inactiveNodes,
    degradedFilesCount,
    missingFilesCount,
    fileHealthSummary,
  };
}
