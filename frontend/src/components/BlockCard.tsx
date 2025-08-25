import { useState } from 'react';
import { useDebateStore, type DebateBlock } from '../store/store';
import { getBlockColor } from '../utils/colors';

interface BlockCardProps {
  block: DebateBlock;
}

export function BlockCard({ block }: BlockCardProps) {
  const { 
    debate,
    expandedBlockId, 
    editingBlockId,
    setExpanded, 
    agreeToBlock,
    createDraft,
    updateBlock,
    deleteBlock,
    setEditing,
    setHistoryOpen
  } = useDebateStore();
  
  const [editText, setEditText] = useState(block.text);

  if (!debate) return null;

  const isExpanded = expandedBlockId === block.id;
  const isEditing = editingBlockId === block.id;
  const blockColor = getBlockColor(block, debate.blocks);

  if (isEditing) {
    return (
      <div 
        className="w-full p-4 sharp-corners"
        style={{
          minHeight: 'var(--expander-min-height)',
          backgroundColor: blockColor,
          border: `var(--border-width)px solid var(--border-color)`
        }}
      >
        <div className="text-sm uppercase tracking-wide mb-2" 
             style={{ fontSize: 'var(--label-size)' }}>
          Edit Mode
        </div>
        
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full h-32 p-2 mb-4 sharp-corners resize-none"
          style={{
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-color)',
            border: `var(--border-width)px solid var(--border-color)`
          }}
          autoFocus
        />
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              updateBlock(block.id, editText);
            }}
            className="px-4 py-2 text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#111111',
              color: '#FFFFFF'
            }}
          >
            Save
          </button>
          
          <button
            onClick={() => {
              setEditing(null);
              setEditText(block.text);
            }}
            className="px-4 py-2 text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#EFEFEF',
              color: '#111111',
              border: `var(--border-width)px solid var(--border-color)`
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={() => deleteBlock(block.id)}
            className="px-4 py-2 text-sm font-medium sharp-corners ml-auto"
            style={{
              backgroundColor: 'var(--danger-color)',
              color: 'white'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top row - always same size, shows text when closed, empty when open */}
      <button
        onClick={() => setExpanded(block.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(block.id);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`Block ${isExpanded ? 'expanded' : 'collapsed'}`}
        className="w-full text-left p-4 sharp-corners"
        style={{
          height: 'var(--closed-card-height)',
          minHeight: 'var(--closed-card-height)',
          backgroundColor: blockColor,
          border: `var(--border-width)px solid var(--border-color)`
        }}
      >
        {!isExpanded && (
          <div className="text-clamp">
            {block.text}
          </div>
        )}
      </button>
      
      {/* Bottom row - only appears when open, full width with text + buttons */}
      {isExpanded && (
        <div className="expanded-full-width">
          <div className="w-full p-4 sharp-corners" 
               style={{
                 minHeight: 'var(--expander-min-height)',
                 backgroundColor: blockColor,
                 border: `var(--border-width)px solid var(--border-color)`,
                 marginTop: '2px'
               }}>
            <div className="mb-4">
              {block.text}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  agreeToBlock(block.id);
                }}
                className="px-4 py-2 text-sm font-medium sharp-corners"
                style={{
                  backgroundColor: '#111111',
                  color: '#FFFFFF'
                }}
              >
                Agree
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createDraft(block.id, '');
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
              
              {block.history.length > 0 && (
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
          </div>
        </div>
      )}
    </div>
  );
}