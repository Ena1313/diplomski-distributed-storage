import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
    const location = useLocation();

    const navButtonStyle = (path) => {
  const isActive =
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return {
    position: "relative",
    textTransform: "none",
    fontWeight: 400,
    borderRadius: 2,
    px: 2,

    "&::after": {
      content: '""',
      position: "absolute",
      left: 8,
      right: 8,
      bottom: 4,
      height: "2px",
      backgroundColor: "white",
      transition: "opacity 0.3s ease",
      opacity: isActive ? 1 : 0,
    },

    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.1)",
    },
  };
};

    return (
        <>
            <AppBar position="static">
                <Toolbar sx={{ backgroundColor: "#495a47" }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Distributed Storage System
                    </Typography>

                    <Button color="inherit" component={Link} to="/" sx={navButtonStyle("/")}>
                        Dashboard
                    </Button>

                    <Button color="inherit" component={Link} to="/upload" sx={navButtonStyle("/upload")}>
                        Upload
                    </Button>

                    <Button color="inherit" component={Link} to="/files" sx={navButtonStyle("/files")}>
                        Files
                    </Button>

                    <Button color="inherit" component={Link} to="/nodes" sx={navButtonStyle("/nodes")}>
                        Nodes
                    </Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ padding: 4 }}>
                <Outlet />
            </Box>
        </>
    );
}