import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import api, { fetchAllFileDetails, fetchNodesOverview, fetchSystemOverview, } from "../services/api";
import { calculateFileHealth } from "../utils/storageMetrics";

const PRIMARY_GREEN = "#495a47";
const LIGHT_GREEN = "#eef3ee";
const BORDER_GREEN = "#cfd8cf";

function StatCard({ title, value, subtitle }) {
  return (
    <Paper
      sx={{
        p: 3,
        height: "100%",
        borderRadius: 3,
        border: `1px solid ${BORDER_GREEN}`,
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        background: "linear-gradient(180deg, #ffffff 0%, #f7faf7 100%)",
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", fontWeight: 500 }}
      >
        {title}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          mt: 1.5,
          mb: 0.75,
          fontWeight: 700,
          color: PRIMARY_GREEN,
        }}
      >
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [nodeOverview, setNodeOverview] = useState([]);
  const [fileHealthSummary, setFileHealthSummary] = useState([]);
  const [rebalanceResult, setRebalanceResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [systemOverview, nodesOverview, allDetails] = await Promise.all([
        fetchSystemOverview(),
        fetchNodesOverview(),
        fetchAllFileDetails(),
      ]);

      const summary = allDetails.map((detail) => {
        const health = calculateFileHealth(detail);

        return {
          fileId: detail.file.id,
          originalName: detail.file.originalName,
          label: health.label,
          severity: health.severity,
          summary: health.summary,
          segmentCount: detail.segments.length,
        };
      });

      setOverview(systemOverview);
      setNodeOverview(nodesOverview);
      setFileHealthSummary(summary);
    } catch (error) {
      console.error(error);
      alert("Error while fetching dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRebalance = async () => {
    try {
      const res = await api.post("/rebalance");
      setRebalanceResult(res.data);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Action rebalance error");
    }
  };

  if (loading || !overview) {
    return (
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          border: `1px solid ${BORDER_GREEN}`,
        }}
      >
        <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 600 }}>
          Loading dashboard...
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={4}>
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${BORDER_GREEN}`,
          background: "linear-gradient(180deg, #ffffff 0%, #f5f8f5 100%)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: PRIMARY_GREEN, mb: 0.5 }}
            >
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overview of files, replicas, nodes and cluster health
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                borderColor: PRIMARY_GREEN,
                color: PRIMARY_GREEN,
                "&:hover": {
                  borderColor: PRIMARY_GREEN,
                  backgroundColor: LIGHT_GREEN,
                },
              }}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              onClick={handleRebalance}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                backgroundColor: PRIMARY_GREEN,
                "&:hover": {
                  backgroundColor: "#3d4d3b",
                },
              }}
            >
              Rebalance cluster
            </Button>
          </Box>
        </Box>
      </Paper>

      {rebalanceResult && (
        <Alert
          severity="success"
          sx={{
            borderRadius: 3,
            border: `1px solid ${BORDER_GREEN}`,
          }}
        >
          Rebalance finished. Files processed:{" "}
          {rebalanceResult.filesProcessed ?? rebalanceResult.results?.length ?? 0}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "1fr 1fr 1fr",
          },
          gap: 2.5,
        }}
      >
        <StatCard
          title="Total files"
          value={overview.totalFiles}
          subtitle="Files stored in the system"
        />

        <StatCard
          title="Total segments"
          value={overview.totalSegments}
          subtitle="Logical chunks across all files"
        />

        <StatCard
          title="Total replicas"
          value={overview.totalReplicas}
          subtitle="Physical replica copies on nodes"
        />

        <StatCard
          title="Active nodes"
          value={overview.activeNodes}
          subtitle="Currently available nodes"
        />

        <StatCard
          title="Inactive nodes"
          value={overview.inactiveNodes}
          subtitle="Disabled nodes"
        />

        <StatCard
          title="Degraded files"
          value={overview.degradedFilesCount + overview.missingFilesCount}
          subtitle="Files needing attention"
        />
      </Box>

      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} xl={6}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${BORDER_GREEN}`,
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
              overflow: "hidden",
              marginTop: 6
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 700, color: PRIMARY_GREEN }}
            >
              Node load overview
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: LIGHT_GREEN }}>
                  <TableCell sx={{ fontWeight: 700 }}>Node</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Replicas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Segments</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Files</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {nodeOverview.map((node) => {
                  const isActive = Number(node.isActive) === 1;

                  return (
                    <TableRow
                      key={node.id}
                      hover
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
                    >
                      <TableCell>{node.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={isActive ? "Active" : "Inactive"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            color: isActive ? "#1f5f3a" : "#7a1f1f",
                            backgroundColor: isActive ? "#e7f5ec" : "#fdecec",
                          }}
                        />
                      </TableCell>
                      <TableCell>{node.replicaCount}</TableCell>
                      <TableCell>{node.uniqueSegmentCount}</TableCell>
                      <TableCell>{node.uniqueFileCount}</TableCell>
                    </TableRow>
                  );
                })}

                {!nodeOverview.length && (
                  <TableRow>
                    <TableCell colSpan={5}>No nodes available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={6}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${BORDER_GREEN}`,
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
              overflow: "hidden",
              marginTop: 6,

            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 700, color: PRIMARY_GREEN }}
            >
              File health summary
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: LIGHT_GREEN }}>
                  <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {fileHealthSummary.map((item) => {
                  const chipStyles =
                    item.severity === "success"
                      ? {
                        color: "#1f5f3a",
                        backgroundColor: "#e7f5ec",
                      }
                      : item.severity === "warning"
                        ? {
                          color: "#8a6d1f",
                          backgroundColor: "#fff6dd",
                        }
                        : {
                          color: "#7a1f1f",
                          backgroundColor: "#fdecec",
                        };

                  return (
                    <TableRow
                      key={item.fileId}
                      hover
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
                    >
                      <TableCell>{item.originalName}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.label}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            ...chipStyles,
                          }}
                        />
                      </TableCell>
                      <TableCell>{item.summary}</TableCell>
                    </TableRow>
                  );
                })}
                {!fileHealthSummary.length && (
                  <TableRow>
                    <TableCell colSpan={3}>No files yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid >
    </Stack >
  );
}