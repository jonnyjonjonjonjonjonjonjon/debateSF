import { useState } from 'react';
import { useDebateStore } from '../store/store';
import { DraftCard } from './DraftCard';

export function OpeningCard() {
  const { 
    debate, 
    expandedBlockId, 
    setExpanded, 
    createDraft, 
    draft,
    setHistoryOpen 
  } = useDebateStore();
  
  const [isCreatingOpening, setIsCreatingOpening] = useState(false);

  if (!debate) return null;

  const openingBlock = debate.blocks.find(block => block.depth === 0);
  
  if (!openingBlock) {
    if (isCreatingOpening || draft?.parentId === null) {
      return (
        <DraftCard 
          onCancel={() => {
            setIsCreatingOpening(false);
          }}
        />
      );
    }

    return (
      <div className="w-full">
        <button
          onClick={() => {
            setIsCreatingOpening(true);
            createDraft(null, '');
          }}
          className="w-full text-left p-4 sharp-corners"
          style={{
            height: 'var(--closed-card-height)',
            backgroundColor: 'var(--opening-bg)',
            color: 'var(--opening-fg)',
            border: `var(--border-width)px solid var(--border-color)`
          }}
        >
          <div className="text-sm uppercase tracking-wide mb-2" 
               style={{ fontSize: 'var(--label-size)' }}>
            Opening Statement
          </div>
          <div className="text-center text-lg">
            Click to add opening statement
          </div>
        </button>
      </div>
    );
  }

  const isExpanded = expandedBlockId === openingBlock.id;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(openingBlock.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(openingBlock.id);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`Opening statement${isExpanded ? ', expanded' : ', collapsed'}`}
        className="w-full text-left p-4 sharp-corners"
        style={{
          height: isExpanded ? 'auto' : 'var(--closed-card-height)',
          minHeight: isExpanded ? 'var(--expander-min-height)' : 'var(--closed-card-height)',
          backgroundColor: debate.resolved ? 'var(--opening-resolved-bg)' : 'var(--opening-bg)',
          color: 'var(--opening-fg)',
          border: `var(--border-width)px solid var(--border-color)`
        }}
      >
        <div className="text-sm uppercase tracking-wide mb-2" 
             style={{ fontSize: 'var(--label-size)' }}>
          Opening Statement
        </div>
        
        <div className={isExpanded ? '' : 'text-clamp'}>
          {openingBlock.text}
        </div>
        
        {isExpanded && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                createDraft(openingBlock.id, '');
              }}
              className="px-4 py-2 text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#EFEFEF',
                color: '#111111',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              Challenge
            </button>
            
            {openingBlock.history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHistoryOpen(true);
                }}
                className="px-4 py-2 text-sm font-medium sharp-corners"
                style={{
                  backgroundColor: '#EFEFEF',
                  color: '#111111',
                  border: `var(--border-width)px solid var(--border-color)`
                }}
              >
                History
              </button>
            )}
          </div>
        )}
      </button>
    </div>
  );
}