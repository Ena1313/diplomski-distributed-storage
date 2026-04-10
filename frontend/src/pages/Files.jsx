import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import api, { API_BASE_URL, fetchAllFileDetails, fetchFileDetails } from "../services/api";
import FileDetailsDialog from "../components/FileDetailsDialog";
import { calculateFileHealth, formatBytes } from "../utils/storageMetrics";

const PRIMARY_GREEN = "#495a47";
const LIGHT_GREEN = "#eef3ee";
const BORDER_GREEN = "#cfd8cf";

function HealthChip({ health }) {
  const label = `${health.label} (${health.summary})`;
  const normalized = health.label?.toLowerCase();

  let chipStyles = {
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
  };

  if (normalized?.includes("healthy")) {
    chipStyles = {
      color: "#1f5f3a",
      backgroundColor: "#e7f5ec",
    };
  } else if (normalized?.includes("degraded")) {
    chipStyles = {
      color: "#8a6d1f",
      backgroundColor: "#fff6dd",
    };
  } else if (normalized?.includes("missing")) {
    chipStyles = {
      color: "#7a1f1f",
      backgroundColor: "#fdecec",
    };
  }

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontWeight: 600,
        borderRadius: 2,
        ...chipStyles,
      }}
    />
  );
}

export default function Files() {
  const [fileDetails, setFileDetails] = useState([]);
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const details = await fetchAllFileDetails();
      setFileDetails(details);
    } catch (error) {
      console.error(error);
      alert("Error while fetching file details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/files/${id}`);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error while deleting file");
    }
  };

  const handleOpenDetails = async (id) => {
    try {
      setDetailsLoading(true);
      setDetailsOpen(true);

      const details = await fetchFileDetails(id);
      setSelectedDetails(details);
    } catch (error) {
      console.error(error);
      alert("Error while fetching file details");
      setDetailsOpen(false);
      setSelectedDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredDetails = useMemo(() => {
    return fileDetails.filter((detail) => {
      const health = calculateFileHealth(detail);
      const fileName = detail?.file?.originalName || "";

      const matchesSearch = fileName.toLowerCase().includes(search.toLowerCase());
      const matchesHealth =
        healthFilter === "all" || health.label.toLowerCase() === healthFilter;

      return matchesSearch && matchesHealth;
    });
  }, [fileDetails, search, healthFilter]);

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
              Files
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse stored files, check health status and open file details
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
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <TextField
            label="Search file name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />

          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Health status</InputLabel>
            <Select
              value={healthFilter}
              label="Health status"
              onChange={(e) => setHealthFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="healthy">Healthy</MenuItem>
              <MenuItem value="degraded">Degraded</MenuItem>
              <MenuItem value="missing">Missing</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {loading ? (
          <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 600 }}>
            Loading files...
          </Typography>
        ) : (
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
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Segments</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Replication status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredDetails.map((detail) => {
                  const file = detail.file;
                  const health = calculateFileHealth(detail);

                  return (
                    <TableRow
                      key={file.id}
                      hover
                      sx={{
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        {file.originalName}
                      </TableCell>
                      <TableCell>{formatBytes(file.sizeBytes)}</TableCell>
                      <TableCell>{detail.segments.length}</TableCell>
                      <TableCell>
                        <HealthChip health={health} />
                      </TableCell>
                      <TableCell>{file.createdAt}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Button
                            component="a"
                            href={`${API_BASE_URL}/files/${file.id}/download`}
                            variant="outlined"
                            size="small"
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
                            Download
                          </Button>

                          <Button
                            onClick={() => handleOpenDetails(file.id)}
                            variant="contained"
                            size="small"
                            sx={{
                              textTransform: "none",
                              borderRadius: 2,
                              backgroundColor: PRIMARY_GREEN,
                              "&:hover": {
                                backgroundColor: "#3d4d3b",
                              },
                            }}
                          >
                            Details
                          </Button>

                          <Button
                            color="error"
                            variant="text"
                            size="small"
                            onClick={() => handleDelete(file.id)}
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
                  );
                })}

                {!filteredDetails.length && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No files found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Paper>

      <FileDetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedDetails(null);
        }}
        details={selectedDetails}
        loading={detailsLoading}
      />
    </Stack>
  );
}