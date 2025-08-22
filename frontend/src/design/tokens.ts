import designSystem from '../../../design/debate-design-system.json';

export interface DesignTokens {
  radii: { none: number };
  spacing: { xs: number; sm: number; md: number; lg: number };
  border: { width: number; color: string; radius: number };
  sizes: { closedCardHeight: number; expanderMinHeight: number; minCardWidth: number };
  typography: { fontFamily: string; labelUppercase: boolean; labelSize: number };
}

export interface ColorConfig {
  text: string;
  surface: string;
  neutral: { '50': string; '100': string };
  danger: string;
  opening: { bg: string; fg: string; resolvedBg: string };
  branch: {
    baseHues: number[];
    satStart: number;
    litStart: number;
    perDepth: {
      satStep: number;
      litStep: number;
      minSat: number;
      minLit: number;
    };
  };
  counterVariation: {
    applyTo: string;
    strategy: string;
    goldenAngle: number;
    hueSpread: number;
    sBoostMax: number;
    lJitterAmp: number;
  };
}

export const tokens: DesignTokens = designSystem.tokens;
export const colors: ColorConfig = designSystem.colors;
export const layout = designSystem.layout;
export const components = designSystem.components;

export function initializeCSSVariables() {
  const root = document.documentElement;
  
  root.style.setProperty('--spacing-xs', `${tokens.spacing.xs}px`);
  root.style.setProperty('--spacing-sm', `${tokens.spacing.sm}px`);
  root.style.setProperty('--spacing-md', `${tokens.spacing.md}px`);
  root.style.setProperty('--spacing-lg', `${tokens.spacing.lg}px`);
  
  root.style.setProperty('--border-width', `${tokens.border.width}px`);
  root.style.setProperty('--border-color', tokens.border.color);
  root.style.setProperty('--border-radius', `${tokens.border.radius}px`);
  
  root.style.setProperty('--closed-card-height', `${tokens.sizes.closedCardHeight}px`);
  root.style.setProperty('--expander-min-height', `${tokens.sizes.expanderMinHeight}px`);
  root.style.setProperty('--min-card-width', `${tokens.sizes.minCardWidth}px`);
  
  root.style.setProperty('--font-family', tokens.typography.fontFamily);
  root.style.setProperty('--label-size', `${tokens.typography.labelSize}px`);
  
  root.style.setProperty('--text-color', colors.text);
  root.style.setProperty('--surface-color', colors.surface);
  root.style.setProperty('--neutral-50', colors.neutral['50']);
  root.style.setProperty('--neutral-100', colors.neutral['100']);
  root.style.setProperty('--danger-color', colors.danger);
  root.style.setProperty('--opening-bg', colors.opening.bg);
  root.style.setProperty('--opening-fg', colors.opening.fg);
  root.style.setProperty('--opening-resolved-bg', colors.opening.resolvedBg);
  
  root.style.setProperty('--text-clamp-lines', layout.textClampLines.toString());
}

export function branchColor(depth: number, topIndex: number): string {
  const hue = colors.branch.baseHues[topIndex % colors.branch.baseHues.length];
  
  let saturation = colors.branch.satStart + (depth * colors.branch.perDepth.satStep);
  let lightness = colors.branch.litStart + (depth * colors.branch.perDepth.litStep);
  
  saturation = Math.max(saturation, colors.branch.perDepth.minSat);
  lightness = Math.max(lightness, colors.branch.perDepth.minLit);
  
  return `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`;
}

export function counterColor(i: number, sibCount: number, baseHue: number): string {
  const { goldenAngle, hueSpread, sBoostMax, lJitterAmp } = colors.counterVariation;
  
  const hueOffset = (i * goldenAngle) % 360;
  const spreadAmount = (hueSpread * (i / Math.max(1, sibCount - 1))) - (hueSpread / 2);
  const finalHue = (baseHue + hueOffset + spreadAmount + 360) % 360;
  
  const sBoost = Math.random() * sBoostMax;
  const lJitter = (Math.random() - 0.5) * lJitterAmp;
  
  const saturation = Math.max(colors.branch.satStart + sBoost, colors.branch.perDepth.minSat);
  const lightness = Math.max(colors.branch.litStart + lJitter, colors.branch.perDepth.minLit);
  
  return `hsl(${finalHue}, ${saturation * 100}%, ${lightness * 100}%)`;
}