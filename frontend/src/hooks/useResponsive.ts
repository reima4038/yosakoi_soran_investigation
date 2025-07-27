import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

export const useResponsive = () => {
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Touch device detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Screen orientation
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isPortrait = useMediaQuery('(orientation: portrait)');
  
  // Specific breakpoint checks
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));
  
  // Helper functions for responsive values
  const getResponsiveValue = <T>(values: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
  }): T | undefined => {
    if (isXl && values.xl !== undefined) return values.xl;
    if (isLg && values.lg !== undefined) return values.lg;
    if (isMd && values.md !== undefined) return values.md;
    if (isSm && values.sm !== undefined) return values.sm;
    if (isXs && values.xs !== undefined) return values.xs;
    
    // Fallback to the largest available value
    return values.xl || values.lg || values.md || values.sm || values.xs;
  };
  
  // Grid columns helper
  const getGridColumns = (mobile: number = 1, tablet: number = 2, desktop: number = 3) => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };
  
  // Spacing helper
  const getSpacing = (mobile: number = 1, desktop: number = 2) => {
    return isMobile ? mobile : desktop;
  };
  
  return {
    // Device type checks
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isTouchDevice,
    
    // Orientation
    isLandscape,
    isPortrait,
    
    // Specific breakpoints
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    
    // Helper functions
    getResponsiveValue,
    getGridColumns,
    getSpacing,
    
    // Common responsive configurations
    containerMaxWidth: isMobile ? 'xs' : isTablet ? 'md' : 'lg',
    cardSpacing: isMobile ? 1 : 2,
    buttonSize: isMobile ? 'medium' : 'large',
    iconSize: isMobile ? 'small' : 'medium',
  };
};

export default useResponsive;