import { DefaultTheme } from 'styled-components';

const baseColors = {
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3', // Primary color
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  error: {
    light: '#EF5350',
    main: '#DC3545',
    dark: '#C62828',
  },
  warning: {
    light: '#FFB74D',
    main: '#FFA726',
    dark: '#F57C00',
  },
  success: {
    light: '#4CAF50',
    main: '#2E7D32',
    dark: '#1B5E20',
  },
  info: {
    light: '#29B6F6',
    main: '#0288D1',
    dark: '#01579B',
  },
};

export const lightTheme: DefaultTheme = {
  colors: {
    primary: baseColors.primary[500],
    primaryLight: baseColors.primary[300],
    primaryDark: baseColors.primary[700],
    
    background: '#FFFFFF',
    backgroundAlt: baseColors.gray[50],
    backgroundHover: baseColors.gray[100],
    
    text: baseColors.gray[900],
    textLight: baseColors.gray[600],
    textInverted: '#FFFFFF',
    
    border: baseColors.gray[200],
    borderHover: baseColors.gray[300],
    
    error: baseColors.error.main,
    warning: baseColors.warning.main,
    success: baseColors.success.main,
    info: baseColors.info.main,
    
    disabled: baseColors.gray[300],
  },
  
  typography: {
    fontFamily: {
      base: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
  },
  
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  radii: {
    none: '0',
    sm: '0.125rem',  // 2px
    md: '0.25rem',   // 4px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
  
  transitions: {
    default: '0.2s ease-in-out',
    fast: '0.1s ease-in-out',
    slow: '0.3s ease-in-out',
  },
  
  zIndices: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

export const darkTheme: DefaultTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: baseColors.primary[400],
    primaryLight: baseColors.primary[300],
    primaryDark: baseColors.primary[600],
    
    background: baseColors.gray[900],
    backgroundAlt: baseColors.gray[800],
    backgroundHover: baseColors.gray[700],
    
    text: baseColors.gray[100],
    textLight: baseColors.gray[400],
    textInverted: baseColors.gray[900],
    
    border: baseColors.gray[700],
    borderHover: baseColors.gray[600],
    
    disabled: baseColors.gray[700],
  },
};
