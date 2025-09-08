import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDebateStore } from '../store/store';
import { BlockCard } from './BlockCard';
import { DraftCard } from './DraftCard';
import { AiCheckFlow } from './AiCheckFlow';
import { getBlockColor } from '../utils/colors';
import { RichText } from './RichText';

interface TreeProps {
  blockId: string;
}

export function Tree({ blockId }: TreeProps) {
  const { 
    debate, 
    draft, 
    expandedBlockId, 
    showDisabledBlocks,
    aiCheckState,
    agreeToBlock, 
    createDraft, 
    disableBlock,
    toggleShowDisabledBlocks,
    startAiCheck 
  } = useDebateStore();
  const [, forceRender] = useState(0);
  const [expandedTop, setExpandedTop] = useState(0);
  
  // Force re-render on theme changes
  useEffect(() => {
    const handleThemeChange = () => forceRender(prev => prev + 1);
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);
  
  if (!debate) return null;

  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return null;
  
  const isExpanded = expandedBlockId === block.id;

  // Calculate position when block expands
  useEffect(() => {
    if (isExpanded) {
      // Add a small delay to ensure DOM is fully updated
      const timer = setTimeout(() => {
        const blockCard = document.querySelector(`[data-block-id="${blockId}"]`);
        if (blockCard) {
          const rect = blockCard.getBoundingClientRect();
          // Position directly below the block with no gap, accounting for scroll position
          setExpandedTop(rect.bottom + window.scrollY - 2);
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [isExpanded, blockId]);

  // Check if this block is disabled and should be hidden
  if (block.disabled) {
    // Only render if an ancestor has explicitly requested to show disabled blocks
    // OR if the parent is also disabled (showing disabled children of disabled blocks)
    const ancestorRequestingDisabled = (function checkAncestorShowingDisabled(currentBlock: any): boolean {
      if (!currentBlock.parentId) return false;
      if (showDisabledBlocks.has(currentBlock.parentId)) return true;
      const parent = debate.blocks.find(b => b.id === currentBlock.parentId);
      return parent ? checkAncestorShowingDisabled(parent) : false;
    })(block);
    
    const parentIsDisabled = block.parentId ? 
      debate.blocks.find(b => b.id === block.parentId)?.disabled : false;
    
    if (!ancestorRequestingDisabled && !parentIsDisabled) {
      return null; // Hide this disabled block
    }
  }

  const allChildren = debate.blocks
    .filter(b => b.parentId === blockId)
    .sort((a, b) => a.order - b.order);
  
  // Split children into enabled and disabled
  const enabledChildren = allChildren.filter(b => !b.disabled);
  const disabledChildren = allChildren.filter(b => b.disabled);
  
  // Determine which children to show based on showDisabledBlocks state
  const shouldShowDisabledDirectly = showDisabledBlocks.has(blockId);
  
  // Show disabled children if explicitly requested for this block OR if this block itself is disabled
  const shouldShowDisabled = shouldShowDisabledDirectly || block.disabled;
  const childrenToShow = shouldShowDisabled ? allChildren : enabledChildren;

  const showDraft = draft && draft.parentId === blockId;
  const totalItems = childrenToShow.length + (showDraft ? 1 : 0);
  const blockColor = getBlockColor(block, debate.blocks);
  
  // Check if this block has any disabled children to show indicator
  const hasDisabledChildren = disabledChildren.length > 0;
  
  const expandedRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full" style={{ position: 'relative' }}>
      {/* Top row - uniform height, shows text when closed, empty when open */}
      <BlockCard 
        block={block} 
        hasDisabledChildren={hasDisabledChildren}
        disabledChildrenCount={disabledChildren.length}
      />
      
      {/* Bottom row - only appears when this block is expanded */}
      {isExpanded && createPortal(
        <div 
          className="w-full block-expander block-expander-expanded block-expander-full-width" 
          ref={expandedRef}
          style={{
            position: 'absolute',
            top: expandedTop,
            zIndex: 1000
          }}
        >
          <div 
            className="w-full sharp-corners" 
            style={{
              minHeight: 'var(--expander-min-height)',
              backgroundColor: blockColor,
              border: `var(--border-width)px solid var(--border-color)`,
              padding: 'var(--spacing-lg)'
            }}
          >
            <div className="text-base" style={{ 
              marginBottom: 'var(--spacing-md)',
              color: block.depth === 0 ? 'var(--opening-fg)' : 'var(--text-color)'
            }}>
              <RichText text={block.text} />
            </div>
            
            <div className="flex" style={{ gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              {!showDraft && (
                <>
                  <button
                    onClick={() => agreeToBlock(block.id)}
                    className="text-sm font-medium sharp-corners"
                    style={{
                      backgroundColor: '#111111',
                      color: '#FFFFFF',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      border: 'none'
                    }}
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => createDraft(block.id, '')}
                    className="text-sm font-medium sharp-corners"
                    style={{
                      backgroundColor: '#EFEFEF',
                      color: '#111111',
                      border: `var(--border-width)px solid var(--border-color)`,
                      padding: 'var(--spacing-sm) var(--spacing-md)'
                    }}
                  >
                    Challenge
                  </button>
                  
                  <button
                    onClick={() => startAiCheck(block.id)}
                    className="text-sm font-medium sharp-corners"
                    style={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      border: 'none'
                    }}
                  >
                    AI Check
                  </button>
                  
                  {/* Only show Disable button for objections (depth > 0), not opening statement */}
                  {block.depth > 0 && (
                    <button
                      onClick={() => disableBlock(block.id)}
                      className="text-sm font-medium sharp-corners"
                      style={{
                        backgroundColor: '#FF9500',
                        color: 'white',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: 'none'
                      }}
                    >
                      Disable
                    </button>
                  )}
                </>
              )}
              
              {/* Show Hidden blocks button */}
              {hasDisabledChildren && (
                <button
                  onClick={() => toggleShowDisabledBlocks(block.id)}
                  className="text-sm font-medium sharp-corners"
                  style={{
                    backgroundColor: shouldShowDisabled ? '#666666' : '#CCCCCC',
                    color: shouldShowDisabled ? '#FFFFFF' : '#333333',
                    border: `var(--border-width)px solid var(--border-color)`,
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    marginLeft: 'auto'
                  }}
                >
                  {shouldShowDisabled ? 'Hide' : 'Show'} {disabledChildren.length} hidden
                </button>
              )}
            </div>
          </div>
          
          {/* AI Check Flow - renders above children when active */}
          {aiCheckState && aiCheckState.targetBlockId === block.id && (
            <AiCheckFlow />
          )}
          
          {/* Children of expanded block render below */}
          {(childrenToShow.length > 0 || showDraft) && (
            <div className="w-full">
              <div 
                className="grid w-full mobile-grid"
                style={{
                  gridTemplateColumns: `repeat(${childrenToShow.length + (showDraft ? 1 : 0)}, minmax(0, 1fr))`,
                  '--mobile-cols': childrenToShow.length + (showDraft ? 1 : 0),
                  gap: 0
                } as React.CSSProperties}
              >
                {childrenToShow.map((child) => (
                  <div key={child.id} className="w-full">
                    <Tree blockId={child.id} />
                  </div>
                ))}
                
                {showDraft && (
                  <div className="w-full">
                    <DraftCard />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
      
      {/* Helper message for opening statement when closed and has no children */}
      {!isExpanded && block.depth === 0 && totalItems === 0 && !showDraft && (
        <div 
          className="w-full text-center text-sm"
          style={{ 
            color: 'var(--text-color)', 
            opacity: 0.7,
            padding: 'var(--spacing-md)',
            fontStyle: 'italic'
          }}
        >
          Tap the statement block to edit or add a challenge
        </div>
      )}
      
      {/* Children grid - only when this block is NOT expanded */}
      {!isExpanded && totalItems > 0 && (
        <div className="w-full">
          <div 
            className="grid w-full mobile-grid"
            style={{
              gridTemplateColumns: `repeat(${totalItems}, minmax(0, 1fr))`,
              '--mobile-cols': totalItems,
              gap: 0
            } as React.CSSProperties}
          >
            {childrenToShow.map((child) => (
              <div key={child.id} className="w-full">
                <Tree blockId={child.id} />
              </div>
            ))}
            
            {showDraft && (
              <div className="w-full">
                <DraftCard />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}