import { useState, useEffect } from 'react';
import type { ThemeName } from '../components/ThemeSelector';

const themeConfigs = {
  'cool-professional': [230, 180, 120, 280, 200, 300], 
  'warm-earthy': [15, 45, 80, 210, 320, 35],
  'vibrant-distinct': [240, 180, 90, 300, 30, 270],
  'muted-pastels': [210, 140, 280, 25, 250, 160],
  'academic-classic': [220, 140, 340, 200, 35, 250]
};

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('academic-classic');

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('debate-theme');
    if (saved && saved in themeConfigs) {
      setCurrentTheme(saved as ThemeName);
    }
  }, []);

  // Apply theme by updating the design system
  useEffect(() => {
    const baseHues = themeConfigs[currentTheme];
    
    console.log('Theme changing to:', currentTheme, 'with hues:', baseHues);
    
    // Store the base hues for the color calculation functions to use
    (window as any).currentThemeHues = baseHues;
    
    // Force a re-render by triggering a custom event
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: currentTheme, baseHues } }));
    console.log('Theme change event dispatched');
  }, [currentTheme]);

  const changeTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    localStorage.setItem('debate-theme', theme);
  };

  return {
    currentTheme,
    changeTheme
  };
}