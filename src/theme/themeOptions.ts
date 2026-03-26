import { alpha, type ThemeOptions } from "@mui/material/styles";

const BODY_FONT_FAMILY = "'Open Sans', sans-serif";
const HEADING_FONT_FAMILY = "'Quicksand', sans-serif";

const sharedTypography: ThemeOptions["typography"] = {
  htmlFontSize: 16,
  fontSize: 14,
  fontFamily: BODY_FONT_FAMILY,
  h1: { fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.1, fontFamily: HEADING_FONT_FAMILY, letterSpacing: "-0.03em" },
  h2: { fontSize: "2.1rem", fontWeight: 700, lineHeight: 1.15, fontFamily: HEADING_FONT_FAMILY, letterSpacing: "-0.025em" },
  h3: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.18, fontFamily: HEADING_FONT_FAMILY, letterSpacing: "-0.02em" },
  h4: { fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.24, fontFamily: HEADING_FONT_FAMILY },
  h5: { fontSize: "1.18rem", fontWeight: 700, lineHeight: 1.28, fontFamily: HEADING_FONT_FAMILY },
  h6: { fontSize: "1rem", fontWeight: 700, lineHeight: 1.35, fontFamily: HEADING_FONT_FAMILY },
  body1: { fontSize: "0.95rem", lineHeight: 1.6, fontFamily: BODY_FONT_FAMILY },
  body2: { fontSize: "0.875rem", lineHeight: 1.55, fontFamily: BODY_FONT_FAMILY },
  button: { fontSize: "0.9rem", fontWeight: 600, textTransform: "none" },
  caption: { fontSize: "0.76rem", lineHeight: 1.4, fontFamily: BODY_FONT_FAMILY },
  subtitle1: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.45, fontFamily: HEADING_FONT_FAMILY },
  subtitle2: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.45, fontFamily: HEADING_FONT_FAMILY },
  overline: { fontFamily: HEADING_FONT_FAMILY, letterSpacing: "0.08em", fontWeight: 700 },
};

const buildComponents = (mode: "light" | "dark"): ThemeOptions["components"] => {
  const isLight = mode === "light";
  const border = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const shadow = isLight
    ? "0 24px 60px rgba(15, 23, 42, 0.08)"
    : "0 24px 60px rgba(2, 6, 23, 0.45)";
  const paperGradient = isLight
    ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,249,245,0.9) 100%)"
    : "linear-gradient(180deg, rgba(18,24,38,0.96) 0%, rgba(12,18,31,0.92) 100%)";

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: isLight
            ? "radial-gradient(circle at top left, rgba(255,119,61,0.12), transparent 28%), radial-gradient(circle at top right, rgba(20,184,166,0.12), transparent 26%), linear-gradient(180deg, #fffaf6 0%, #fff3ec 100%)"
            : "radial-gradient(circle at top left, rgba(255,119,61,0.18), transparent 24%), radial-gradient(circle at top right, rgba(45,212,191,0.14), transparent 22%), linear-gradient(180deg, #09111f 0%, #050913 100%)",
          minHeight: "100vh",
        },
        "#root": {
          minHeight: "100vh",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: "medium",
      },
      styleOverrides: {
        root: {
          padding: "8px 16px",
          minHeight: "40px",
          borderRadius: "12px",
          boxShadow: "none",
        },
        containedPrimary: {
          boxShadow: isLight ? "0 10px 24px rgba(255, 119, 61, 0.24)" : "0 10px 24px rgba(255, 119, 61, 0.28)",
        },
        outlined: {
          borderColor: border,
          backgroundColor: isLight ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.02)",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "medium",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          backgroundColor: isLight ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.03)",
          "& fieldset": {
            borderColor: border,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "22px",
          border: `1px solid ${border}`,
          background: paperGradient,
          backdropFilter: "blur(18px)",
          boxShadow: shadow,
          overflow: "hidden",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "22px",
          "&:last-child": {
            paddingBottom: "22px",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: "30px",
          borderRadius: "999px",
          fontWeight: 600,
        },
        outlined: {
          borderColor: border,
          backgroundColor: isLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.03)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: border,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
        },
      },
    },
  };
};

export const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: "#ff6b3d",
      light: "#ff9a78",
      dark: "#dc4d22",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#12344d",
      light: "#49657a",
      dark: "#081d2f",
      contrastText: "#ffffff",
    },
    error: {
      main: "#d63b55",
      light: "#f59ca8",
      dark: "#aa1835",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#f59e0b",
      light: "#fcd34d",
      dark: "#b45309",
      contrastText: "#101828",
    },
    info: {
      main: "#0f9ec0",
      light: "#63c8df",
      dark: "#0b718d",
      contrastText: "#ffffff",
    },
    success: {
      main: "#14976b",
      light: "#58c7a2",
      dark: "#0f6d4d",
      contrastText: "#ffffff",
    },
    background: {
      default: "#fff7f2",
      paper: "#fffdfa",
    },
    text: {
      primary: "#102033",
      secondary: "#526173",
    },
    divider: alpha("#102033", 0.08),
  },
  typography: sharedTypography,
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: buildComponents("light"),
};

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: "#ff7a4f",
      light: "#ffab8d",
      dark: "#e35b30",
      contrastText: "#08111d",
    },
    secondary: {
      main: "#8ad3c7",
      light: "#b7ebe3",
      dark: "#5ba79b",
      contrastText: "#08111d",
    },
    error: {
      main: "#ef5f7a",
      light: "#f8a5b5",
      dark: "#cc3654",
      contrastText: "#08111d",
    },
    warning: {
      main: "#ffb020",
      light: "#ffd36a",
      dark: "#cc8500",
      contrastText: "#08111d",
    },
    info: {
      main: "#43c7e8",
      light: "#7fe2f6",
      dark: "#1299b8",
      contrastText: "#08111d",
    },
    success: {
      main: "#38c997",
      light: "#7be0bb",
      dark: "#1d946e",
      contrastText: "#08111d",
    },
    background: {
      default: "#07101c",
      paper: "#0d1726",
    },
    text: {
      primary: "#eff6ff",
      secondary: "#a8b5c7",
    },
    divider: alpha("#ffffff", 0.08),
  },
  typography: sharedTypography,
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: buildComponents("dark"),
};
