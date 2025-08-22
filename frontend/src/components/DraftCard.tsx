import { useState } from 'react';
import { useDebateStore } from '../store/store';

interface DraftCardProps {
  onCancel?: () => void;
}

export function DraftCard({ onCancel }: DraftCardProps) {
  const { 
    draft, 
    updateDraft, 
    confirmDraft, 
    cancelDraft 
  } = useDebateStore();
  
  if (!draft) return null;

  const handleCancel = () => {
    cancelDraft();
    onCancel?.();
  };

  const isOpening = draft.parentId === null;

  return (
    <div 
      className="w-full p-4 sharp-corners"
      style={{
        minHeight: 'var(--expander-min-height)',
        backgroundColor: isOpening ? 'var(--opening-bg)' : 'var(--surface-color)',
        color: isOpening ? 'var(--opening-fg)' : 'var(--text-color)',
        border: `var(--border-width)px solid var(--border-color)`
      }}
    >
      <div className="text-sm uppercase tracking-wide mb-2" 
           style={{ fontSize: 'var(--label-size)' }}>
        {isOpening ? 'Draft Opening' : 'Draft Response'}
      </div>
      
      <textarea
        value={draft.text}
        onChange={(e) => updateDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleCancel();
          } else if (e.key === 'Enter' && e.ctrlKey && draft.text.trim()) {
            confirmDraft();
          }
        }}
        placeholder={isOpening ? 'Enter your opening statement...' : 'Enter your response...'}
        aria-label={isOpening ? 'Draft opening statement' : 'Draft response'}
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
          onClick={confirmDraft}
          disabled={!draft.text.trim()}
          className="px-4 py-2 text-sm font-medium sharp-corners disabled:opacity-50"
          style={{
            backgroundColor: 'var(--opening-bg)',
            color: 'var(--opening-fg)'
          }}
        >
          Confirm
        </button>
        
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium sharp-corners"
          style={{
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-color)',
            border: `var(--border-width)px solid var(--border-color)`
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}