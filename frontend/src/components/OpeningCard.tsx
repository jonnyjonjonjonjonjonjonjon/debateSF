import { useState } from 'react';
import { useDebateStore } from '../store/store';
import { DraftCard } from './DraftCard';

export function OpeningCard() {
  const { 
    debate, 
    expandedBlockId, 
    setExpanded, 
    createDraft, 
    draft
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
          border: `var(--border-width)px solid var(--border-color)`,
          position: 'relative'
        }}
      >
        <div
          className="sharp-corners"
          style={{
            position: 'absolute',
            top: 'var(--spacing-xs)',
            left: 'var(--spacing-xs)',
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
            color: 'var(--opening-fg)',
            padding: '2px 6px',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}
        >
          {openingBlock.staticNumber || '1'}
        </div>
        <div className="text-sm uppercase tracking-wide mb-2" 
             style={{ fontSize: 'var(--label-size)' }}>
          Opening Statement
        </div>
        
{isExpanded ? (
          <div>{openingBlock.text}</div>
        ) : (
          <div 
            style={{
              textAlign: 'center',
              height: 'calc(var(--closed-card-height) - 80px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {openingBlock.text.length > 100 ? openingBlock.text.substring(0, 100) + '...' : openingBlock.text}
            </div>
          </div>
        )}
        
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
            
          </div>
        )}
      </button>
    </div>
  );
}