import { useState } from 'react';

export type ThemeName = 'cool-professional' | 'warm-earthy' | 'vibrant-distinct' | 'muted-pastels' | 'academic-classic';

interface ThemeOption {
  name: ThemeName;
  label: string;
  baseHues: number[];
  description: string;
}

const themes: ThemeOption[] = [
  {
    name: 'cool-professional', 
    label: 'Cool Professional',
    baseHues: [230, 180, 120, 280, 200, 300],
    description: 'Navy, Teal, Sage, Lavender, Steel, Plum'
  },
  {
    name: 'warm-earthy',
    label: 'Warm Earthy', 
    baseHues: [15, 45, 80, 210, 320, 35],
    description: 'Terracotta, Golden, Olive, Slate, Mauve, Amber'
  },
  {
    name: 'vibrant-distinct',
    label: 'Vibrant Distinct',
    baseHues: [240, 180, 90, 300, 30, 270], 
    description: 'Indigo, Cyan, Lime, Magenta, Orange, Violet'
  },
  {
    name: 'muted-pastels',
    label: 'Muted Pastels',
    baseHues: [210, 140, 280, 25, 250, 160],
    description: 'Dusty Blue, Sage Green, Soft Purple, Peach, Lavender Gray, Mint'
  },
  {
    name: 'academic-classic',
    label: 'Academic Classic',
    baseHues: [220, 140, 340, 200, 35, 250],
    description: 'Deep Blue, Forest, Burgundy, Charcoal, Bronze, Indigo'
  }
];

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentThemeOption = themes.find(t => t.name === currentTheme) || themes[0];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 text-sm font-medium sharp-corners flex items-center gap-2"
        style={{
          backgroundColor: '#EFEFEF',
          color: '#111111', 
          border: `var(--border-width)px solid var(--border-color)`
        }}
      >
        Theme: {currentThemeOption.label}
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 sharp-corners z-10 min-w-64"
          style={{
            backgroundColor: 'var(--surface-color)',
            border: `var(--border-width)px solid var(--border-color)`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {themes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => {
                onThemeChange(theme.name);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-opacity-50"
              style={{
                backgroundColor: currentTheme === theme.name ? 'rgba(190, 24, 93, 0.1)' : 'transparent',
                color: 'var(--text-color)',
                borderBottom: `var(--border-width)px solid var(--border-color)`
              }}
            >
              <div className="font-medium">{theme.label}</div>
              <div className="text-xs opacity-75 mt-1">{theme.description}</div>
              <div className="flex gap-1 mt-2">
                {theme.baseHues.map((hue, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 sharp-corners"
                    style={{
                      backgroundColor: `hsl(${hue}, 70%, 60%)`,
                      border: '1px solid rgba(0,0,0,0.2)'
                    }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}