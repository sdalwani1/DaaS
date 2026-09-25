"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1a5fb4" },
    warning: { main: "#e6a817" },
    info: { main: "#3b82c4" },
    success: { main: "#2e7d32" },
  },
  spacing: 8,
  shape: { borderRadius: 8 },
});