import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import api, { fetchNodesOverview } from "../services/api";

const PRIMARY_GREEN = "#495a47";
const LIGHT_GREEN = "#eef3ee";
const BORDER_GREEN = "#cfd8cf";

function StatusChip({ isActive }) {
  const active = Number(isActive) === 1;

  return (
    <Chip
      label={active ? "Active" : "Inactive"}
      size="small"
      sx={{
        fontWeight: 600,
        borderRadius: 2,
        color: active ? "#1f5f3a" : "#7a1f1f",
        backgroundColor: active ? "#e7f5ec" : "#fdecec",
      }}
    />
  );
}

function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rebalanceResult, setRebalanceResult] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const nodesData = await fetchNodesOverview();
      setNodes(nodesData);
    } catch (error) {
      console.error("Error fetching nodes overview:", error);
      alert("Failed to load node overview data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleNode = async (node) => {
    try {
      await api.patch(`/nodes/${node.id}`, {
        isActive: Number(node.isActive) === 1 ? 0 : 1,
      });
      await loadData();
    } catch (error) {
      console.error("Error updating node:", error);
      alert("Failed to update node.");
    }
  };

  const handleDeleteNode = async (id) => {
    try {
      await api.delete(`/nodes/${id}`);
      await loadData();
    } catch (error) {
      console.error("Error deleting node:", error);
      alert("Failed to delete node.");
    }
  };

  const handleRebalance = async () => {
    try {
      const res = await api.post("/rebalance");
      setRebalanceResult(res.data);
      alert("Rebalance completed.");
      await loadData();
    } catch (error) {
      console.error("Error rebalancing cluster:", error);
      alert("Failed to rebalance cluster.");
    }
  };

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return Number(node.isActive) === 1;
      if (statusFilter === "inactive") return Number(node.isActive) === 0;
      return true;
    });
  }, [nodes, statusFilter]);

  if (loading) {
    return (
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          border: `1px solid ${BORDER_GREEN}`,
        }}
      >
        <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 600 }}>
          Loading nodes...
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
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: PRIMARY_GREEN, mb: 0.5 }}
            >
              Nodes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage prepared storage nodes, filter by status and rebalance the cluster
            </Typography>
          </Box>

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
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${BORDER_GREEN}`,
          boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 3 }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status filter"
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={handleRebalance}
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
            Rebalance cluster
          </Button>
        </Stack>

        {rebalanceResult && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              borderRadius: 3,
              border: `1px solid ${BORDER_GREEN}`,
            }}
          >
            Rebalance finished. Files processed:{" "}
            {rebalanceResult.filesProcessed ?? rebalanceResult.results?.length ?? 0}
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{
            overflow: "hidden",
            borderRadius: 3,
            borderColor: BORDER_GREEN,
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: LIGHT_GREEN }}>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Base URL</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Replicas</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Unique segments</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Files covered</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredNodes.map((node) => (
                <TableRow
                  key={node.id}
                  hover
                  sx={{
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  <TableCell>{node.id}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{node.name}</TableCell>
                  <TableCell>{node.baseUrl}</TableCell>
                  <TableCell>
                    <StatusChip isActive={node.isActive} />
                  </TableCell>
                  <TableCell>{node.replicaCount}</TableCell>
                  <TableCell>{node.uniqueSegmentCount}</TableCell>
                  <TableCell>{node.uniqueFileCount}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleToggleNode(node)}
                        sx={{
                          textTransform: "none",
                          borderRadius: 2,
                          backgroundColor: PRIMARY_GREEN,
                          "&:hover": {
                            backgroundColor: "#3d4d3b",
                          },
                        }}
                      >
                        {Number(node.isActive) === 1 ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteNode(node.id)}
                        sx={{
                          textTransform: "none",
                          borderRadius: 2,
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {!filteredNodes.length && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No nodes found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Paper>
    </Stack>
  );
}

export default Nodes;