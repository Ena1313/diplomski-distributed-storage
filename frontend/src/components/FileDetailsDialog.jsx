import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { formatBytes } from "../utils/storageMetrics";

export default function FileDetailsDialog({ open, onClose, details, loading }) {
  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const file = details?.file;
  const segments = details?.segments || [];
  const replicas = details?.replicas || [];

  const labelStyle = {
    color: "#495a47",
    fontWeight: 600,
    minWidth: 110,
  };

  const valueStyle = {
    color: "#1f2a24",
    wordBreak: "break-word",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundColor: "#f4f7f5",
          border: "1px solid #d7e3dc",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "1.3rem",
          color: "#1f2a24",
          pb: 1,
        }}
      >
        File details
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "#d7e3dc" }}>
        {loading ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{ py: 6 }}
          >
            <CircularProgress size={30} />
            <Typography color="text.secondary">Loading details...</Typography>
          </Stack>
        ) : !file ? (
          <Box sx={{ py: 4 }}>
            <Typography color="text.secondary">
              No file details available.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                backgroundColor: "#d5e1d9",
                borderColor: "#d7e3dc",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2, fontWeight: 700, color: "#1f2a24"
                }}
              >
                Basic information
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography sx={labelStyle}>ID</Typography>
                  <Typography sx={valueStyle}>{file.id}</Typography>
                </Box>
                <Box>
                  <Typography sx={labelStyle}>Name</Typography>
                  <Typography sx={valueStyle}>{file.originalName}</Typography>
                </Box>
                <Box>
                  <Typography sx={labelStyle}>Size</Typography>
                  <Typography sx={valueStyle}>
                    {formatBytes(file.sizeBytes)} ({file.sizeBytes} bytes)
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={labelStyle}>Chunk size</Typography>
                  <Typography sx={valueStyle}>
                    {formatBytes(file.chunkSizeBytes)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={labelStyle}>Stored as</Typography>
                  <Typography sx={valueStyle}>{file.storedAs}</Typography>
                </Box>
                <Box>
                  <Typography sx={labelStyle}>Created</Typography>
                  <Typography sx={valueStyle}>{file.createdAt}</Typography>
                </Box>
              </Box>
            </Paper>

            <Divider sx={{ borderColor: "#d7e3dc" }} />

            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 1.5, fontWeight: 700, color: "#1f2a24" }}
              >
                Segments
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  borderRadius: 3,
                  backgroundColor: "#f8fbf9",
                  borderColor: "#d7e3dc",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#d5e1d9" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Segment</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Checksum</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {segments.length > 0 ? (
                      segments.map((segment) => (
                        <TableRow
                          key={segment.id}
                          hover
                          sx={{
                            "&:last-child td": { borderBottom: 0 },
                          }}
                        >
                          <TableCell>{segment.segmentIndex}</TableCell>
                          <TableCell>{formatBytes(segment.sizeBytes)}</TableCell>
                          <TableCell
                            sx={{
                              wordBreak: "break-all",
                              maxWidth: 360,
                              fontFamily: "monospace",
                              color: "#355846",
                            }}
                          >
                            {segment.checksum}
                          </TableCell>
                          <TableCell>{segment.createdAt}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary" sx={{ py: 1 }}>
                            No segments available.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Box>

            <Divider sx={{ borderColor: "#d7e3dc" }} />

            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 1.5, fontWeight: 700, color: "#1f2a24" }}
              >
                Replicas
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  borderRadius: 3,
                  backgroundColor: "#f8fbf9",
                  borderColor: "#d7e3dc",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#d5e1d9" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Segment</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Node</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Stored path</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Copy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {replicas.length > 0 ? (
                      replicas.map((replica) => (
                        <TableRow
                          key={replica.id}
                          hover
                          sx={{
                            "&:last-child td": { borderBottom: 0 },
                          }}
                        >
                          <TableCell>{replica.segmentIndex}</TableCell>
                          <TableCell>{replica.nodeName}</TableCell>
                          <TableCell
                            sx={{
                              wordBreak: "break-all",
                              maxWidth: 420,
                              fontFamily: "monospace",
                              color: "#355846",
                            }}
                          >
                            {replica.storedPath}
                          </TableCell>
                          <TableCell>{replica.createdAt}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ContentCopyIcon />}
                              onClick={() => handleCopy(replica.storedPath)}
                              sx={{
                                textTransform: "none",
                                borderColor: "#9bb7a7",
                                color: "#355846",
                                "&:hover": {
                                  borderColor: "#4b6f7a",
                                  backgroundColor: "#d8e9f4",
                                },
                              }}
                            >
                              Copy
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography color="text.secondary" sx={{ py: 1 }}>
                            No replicas available.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: "none",
            borderRadius: 2,
            backgroundColor: "#495a47",
            "&:hover": {
              backgroundColor: "#6b7f68",
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}