import { useState } from "react";
import { Alert, Box, Paper, Stack, Button, Typography } from "@mui/material";
import api from "../services/api";

const PRIMARY_GREEN = "#495a47";
const LIGHT_GREEN = "#eef3ee";
const BORDER_GREEN = "#cfd8cf";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setErrorMessage("");
      const res = await api.post("/upload", formData);
      setUploadResult(res.data);
      alert("Upload successful");
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.error || "Upload failed";
      setErrorMessage(message);
      alert(message);
    }
  };

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
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: PRIMARY_GREEN, mb: 0.5 }}
          >
            Upload
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a file, split it into segments and distribute replicas across nodes
          </Typography>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${BORDER_GREEN}`,
          boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: PRIMARY_GREEN, mb: 1 }}
            >
              Select file
            </Typography>

            <Button
              variant="outlined"
              component="label"
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
              Choose file
              <input
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Button>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              {file ? `Selected file: ${file.name}` : "No file selected."}
            </Typography>
          </Box>

          <Box>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                backgroundColor: PRIMARY_GREEN,
                minWidth: 140,
                "&:hover": {
                  backgroundColor: "#3d4d3b",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#b7c2b6",
                  color: "#ffffff",
                },
              }}
            >
              Upload file
            </Button>
          </Box>

          {uploadResult && (
            <Alert
              severity="success"
              sx={{
                borderRadius: 3,
                border: `1px solid ${BORDER_GREEN}`,
              }}
            >
              Uploaded <strong>{uploadResult.originalName}</strong> — fileId:{" "}
              {uploadResult.fileId}, segments created:{" "}
              {uploadResult.segmentsCreated}
            </Alert>
          )}

          {errorMessage && (
            <Alert
              severity="error"
              sx={{
                borderRadius: 3,
              }}
            >
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}