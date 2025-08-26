import { useRef } from 'react';
import { useDebateStore } from '../store/store';
import { BlockCard } from './BlockCard';
import { DraftCard } from './DraftCard';
import { getBlockColor } from '../utils/colors';
import { RichText } from './RichText';

interface TreeProps {
  blockId: string;
}

export function Tree({ blockId }: TreeProps) {
  const { debate, draft, expandedBlockId, agreeToBlock, createDraft } = useDebateStore();
  
  if (!debate) return null;

  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return null;

  const children = debate.blocks
    .filter(b => b.parentId === blockId)
    .sort((a, b) => a.order - b.order);

  const showDraft = draft && draft.parentId === blockId;
  const isExpanded = expandedBlockId === block.id;
  const totalItems = children.length + (showDraft ? 1 : 0);
  const blockColor = getBlockColor(block, debate.blocks);
  
  const expandedRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full">
      {/* Top row - uniform height, shows text when closed, empty when open */}
      <BlockCard block={block} />
      
      {/* Bottom row - only appears when this block is expanded */}
      {isExpanded && (
        <div className="expanded-full-width" ref={expandedRef}>
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
            
            {!showDraft && (
              <div className="flex" style={{ gap: 'var(--spacing-sm)' }}>
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
              </div>
            )}
          </div>
          
          {/* Children of expanded block render below */}
          {(children.length > 0 || showDraft) && (
            <div className="w-full">
              <div 
                className="grid w-full mobile-grid"
                style={{
                  gridTemplateColumns: `repeat(${children.length + (showDraft ? 1 : 0)}, minmax(0, 1fr))`,
                  '--mobile-cols': children.length + (showDraft ? 1 : 0),
                  gap: 0
                } as React.CSSProperties}
              >
                {children.map((child) => (
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
            {children.map((child) => (
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