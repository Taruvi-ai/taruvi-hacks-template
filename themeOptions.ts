import { ThemeOptions } from "@mui/material/styles";

export const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1565c0',
      light: '#64b5f6',
      dark: '#0d47a1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      light: '#cbd5e1',
      dark: '#1e293b',
      contrastText: '#ffffff',
    },
    error: {
      main: '#c2185b',
      light: '#f8bbd0',
      dark: '#ad1457',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#ffe082',
      dark: '#e65100',
      contrastText: '#000000',
    },
    info: {
      main: '#0277bd',
      light: '#4fc3f7',
      dark: '#01579b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#0a7d5a',
      light: '#81c784',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#f8fafc',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  typography: {
    fontSize: 16,
    fontFamily: "'Open Sans', sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
};

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#64b5f6',
      light: '#90caf9',
      dark: '#1e88e5',
      contrastText: '#0f172a',
    },
    secondary: {
      main: '#cbd5e1',
      light: '#e2e8f0',
      dark: '#94a3b8',
      contrastText: '#0f172a',
    },
    error: {
      main: '#f06292',
      light: '#f8bbd0',
      dark: '#c2185b',
      contrastText: '#0f172a',
    },
    warning: {
      main: '#fbbf24',
      light: '#fde68a',
      dark: '#f59e0b',
      contrastText: '#0f172a',
    },
    info: {
      main: '#4fc3f7',
      light: '#81d4fa',
      dark: '#0288d1',
      contrastText: '#0f172a',
    },
    success: {
      main: '#34d399',
      light: '#6ee7b7',
      dark: '#059669',
      contrastText: '#0f172a',
    },
    background: {
      default: '#020617',
      paper: '#020617',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
    },
  },
  typography: {
    fontSize: 16,
    fontFamily: "'Open Sans', sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
};
