import { useState } from 'react';
import { useDebateStore, type DebateBlock } from '../store/store';
import { getBlockColor } from '../utils/colors';
import { RichText } from './RichText';

interface BlockCardProps {
  block: DebateBlock;
}

export function BlockCard({ block }: BlockCardProps) {
  const { 
    debate,
    expandedBlockId, 
    editingBlockId,
    setExpanded, 
    updateBlock,
    deleteBlock,
    setEditing
  } = useDebateStore();
  
  const [editText, setEditText] = useState(block.text);

  if (!debate) return null;

  const isExpanded = expandedBlockId === block.id;
  const isEditing = editingBlockId === block.id;
  const blockColor = getBlockColor(block, debate.blocks);

  if (isEditing) {
    return (
      <div 
        className="w-full sharp-corners"
        style={{
          minHeight: 'var(--expander-min-height)',
          backgroundColor: blockColor,
          border: `var(--border-width)px solid var(--border-color)`,
          padding: 'var(--spacing-lg)'
        }}
      >
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full h-32 mb-4 sharp-corners resize-none"
          style={{
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-color)',
            border: `var(--border-width)px solid var(--border-color)`,
            padding: 'var(--spacing-sm)'
          }}
          autoFocus
        />
        
        <div className="flex" style={{ gap: 'var(--spacing-sm)' }}>
          <button
            onClick={() => {
              updateBlock(block.id, editText);
            }}
            className="text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#111111',
              color: '#FFFFFF',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: 'none'
            }}
          >
            Save
          </button>
          
          <button
            onClick={() => {
              setEditing(null);
              setEditText(block.text);
            }}
            className="text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#EFEFEF',
              color: '#111111',
              border: `var(--border-width)px solid var(--border-color)`,
              padding: 'var(--spacing-sm) var(--spacing-md)'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={() => deleteBlock(block.id)}
            className="text-sm font-medium sharp-corners"
            style={{
              backgroundColor: 'var(--danger-color)',
              color: 'white',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: 'none',
              marginLeft: 'auto'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
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
      className="w-full text-left sharp-corners"
      style={{
        height: 'var(--closed-card-height)',
        minHeight: 'var(--closed-card-height)',
        backgroundColor: blockColor,
        border: `var(--border-width)px solid var(--border-color)`,
        padding: 'var(--spacing-md)',
        display: 'block',
        color: block.depth === 0 ? 'var(--opening-fg)' : 'var(--text-color)'
      }}
    >
      {!isExpanded && (
        <div className="text-clamp">
          <RichText text={block.text} />
        </div>
      )}
    </button>
  );
}