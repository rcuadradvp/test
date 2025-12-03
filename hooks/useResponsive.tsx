import { useState, useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

/**
 * Hook para detectar el tamaño de pantalla y tipo de dispositivo
 * Útil para navegación adaptativa
 */
export function useResponsive() {
  const { width } = useWindowDimensions();
  
  // Breakpoints (puedes ajustarlos)
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  
  // Solo en web usamos sidebar
  const shouldUseSidebar = Platform.OS === 'web' && isDesktop;
  const shouldUseTabs = Platform.OS !== 'web' || !isDesktop;

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    shouldUseSidebar,
    shouldUseTabs,
  };
}
