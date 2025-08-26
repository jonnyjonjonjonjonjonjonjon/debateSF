import { useEffect, useRef } from 'react';
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
  
  const draftRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to draft when it appears and focus textarea
  useEffect(() => {
    if (draft && draftRef.current && textareaRef.current) {
      // Use setTimeout to ensure DOM is updated and layout is complete
      setTimeout(() => {
        // Scroll the draft container into view first - top of draft at top of screen
        draftRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        
        // Then focus the textarea after scrolling is done
        setTimeout(() => {
          textareaRef.current?.focus({ preventScroll: true });
        }, 400);
      }, 100);
    }
  }, [draft?.id]); // Only trigger when a new draft is created
  
  if (!draft) return null;

  const handleCancel = () => {
    cancelDraft();
    onCancel?.();
  };

  const isOpening = draft.parentId === null;

  return (
    <div 
      ref={draftRef}
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
        ref={textareaRef}
        value={draft.text}
        onChange={(e) => updateDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleCancel();
          } else if (e.key === 'Enter' && e.ctrlKey && draft.text.trim()) {
            confirmDraft();
          }
        }}
        placeholder={isOpening ? 'Enter your opening statement... (Ctrl+Enter to confirm, Esc to cancel)' : 'Enter your response... (Ctrl+Enter to confirm, Esc to cancel)'}
        aria-label={isOpening ? 'Draft opening statement' : 'Draft response'}
        className="w-full p-2 mb-4 sharp-corners resize-none"
        style={{
          backgroundColor: 'var(--surface-color)',
          color: 'var(--text-color)',
          border: `var(--border-width)px solid var(--border-color)`,
          minHeight: '8rem',
          maxHeight: '40vh',
          height: 'auto',
          fontSize: '16px' // Prevent zoom on iOS
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
          Confirm (Ctrl+Enter)
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
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
}