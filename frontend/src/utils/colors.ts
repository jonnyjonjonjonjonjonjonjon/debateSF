import { branchColor, counterColor, colors } from '../design/tokens';
import type { DebateBlock } from '../store/store';

function parseBranchFromStaticNumber(staticNumber: string): number {
  // Parse "1.2.3.1" to extract branch identifier "2"
  // Opening statement "1" returns 0 (no branch)
  const parts = staticNumber.split('.');
  if (parts.length < 2 || parts[0] !== '1') {
    return 0; // Fallback for opening statement or malformed numbers
  }
  return parseInt(parts[1]) || 1; // Return branch number, default to 1 if parsing fails
}

// Force re-render counter for theme changes
let renderCounter = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('theme-changed', () => {
    renderCounter++;
  });
}

export function getBlockColor(block: DebateBlock, blocks: DebateBlock[]): string {
  if (block.depth === 0) {
    return 'var(--opening-bg)';
  }
  
  // Use static number to determine branch family
  const branchNumber = parseBranchFromStaticNumber(block.staticNumber);
  const colorFamilyIndex = (branchNumber - 1) % colors.branch.baseHues.length;
  
  const siblings = blocks.filter(b => b.parentId === block.parentId);
  const siblingIndex = siblings
    .sort((a, b) => a.order - b.order)
    .findIndex(b => b.id === block.id);
  
  if (colors.counterVariation.applyTo === 'counter' && siblings.length > 1) {
    const currentHues = (window as any).currentThemeHues || colors.branch.baseHues;
    const baseHue = currentHues[colorFamilyIndex];
    return counterColor(siblingIndex, siblings.length, baseHue, block.id);
  }
  
  return branchColor(block.depth, colorFamilyIndex);
}

function getTopLevelAncestor(block: DebateBlock, blocks: DebateBlock[]): DebateBlock | null {
  if (block.depth === 1) return block;
  if (!block.parentId) return null;
  
  const parent = blocks.find(b => b.id === block.parentId);
  if (!parent) return null;
  
  return getTopLevelAncestor(parent, blocks);
}