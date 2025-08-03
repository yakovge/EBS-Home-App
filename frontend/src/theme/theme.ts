/**
 * Material-UI theme configuration for EBS Home.
 * Implements a warm, family-friendly color scheme.
 */

import { createTheme, ThemeOptions } from '@mui/material/styles'

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#D2691E', // Warm brown (Chocolate)
      light: '#DEB887', // Burlywood
      dark: '#8B4513', // Saddle Brown
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#228B22', // Forest Green
      light: '#90EE90', // Light Green
      dark: '#006400', // Dark Green
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFF8DC', // Cornsilk
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2F1B14', // Very dark brown
      secondary: '#5D4037', // Brown
    },
    error: {
      main: '#DC143C', // Crimson
    },
    warning: {
      main: '#FF8C00', // Dark Orange
    },
    info: {
      main: '#4682B4', // Steel Blue
    },
    success: {
      main: '#228B22', // Forest Green
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
  },
}

export const theme = createTheme(themeOptions)