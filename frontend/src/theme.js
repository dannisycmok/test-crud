import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0f3d4c",
      light: "#3d6a78",
      dark: "#082833",
      contrastText: "#f7fbfc",
    },
    secondary: {
      main: "#b45309",
      contrastText: "#fffaf5",
    },
    background: {
      default: "#e7eef1",
      paper: "#ffffff",
    },
    text: {
      primary: "#12242b",
      secondary: "#4d6470",
    },
    success: { main: "#0f766e" },
    warning: { main: "#b45309" },
    error: { main: "#b42318" },
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.03em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});

export default theme;
