import { branchColor, counterColor, colors } from '../design/tokens';
import type { DebateBlock } from '../store/store';

export function getBlockColor(block: DebateBlock, blocks: DebateBlock[]): string {
  if (block.depth === 0) {
    return 'var(--opening-bg)';
  }
  
  const topLevelAncestor = getTopLevelAncestor(block, blocks);
  if (!topLevelAncestor) return branchColor(block.depth, 0);
  
  const topLevelSiblings = blocks.filter(b => b.depth === 1);
  const topIndex = topLevelSiblings
    .sort((a, b) => a.order - b.order)
    .findIndex(b => b.id === topLevelAncestor.id);
  
  const siblings = blocks.filter(b => b.parentId === block.parentId);
  const siblingIndex = siblings
    .sort((a, b) => a.order - b.order)
    .findIndex(b => b.id === block.id);
  
  if (colors.counterVariation.applyTo === 'counter' && siblings.length > 1) {
    const baseHue = colors.branch.baseHues[topIndex % colors.branch.baseHues.length];
    return counterColor(siblingIndex, siblings.length, baseHue, block.id);
  }
  
  return branchColor(block.depth, topIndex);
}

function getTopLevelAncestor(block: DebateBlock, blocks: DebateBlock[]): DebateBlock | null {
  if (block.depth === 1) return block;
  if (!block.parentId) return null;
  
  const parent = blocks.find(b => b.id === block.parentId);
  if (!parent) return null;
  
  return getTopLevelAncestor(parent, blocks);
}