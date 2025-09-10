import { useRef, useEffect } from 'react';
import { useDebateStore } from '../store/store';
import { WhatsAppInput } from './WhatsAppInput';

export function AiCheckFlow() {
  console.log('AiCheckFlow component rendering!');
  const { 
    aiCheckState,
    confirmCurrentAiSuggestion,
    rejectCurrentAiSuggestion,
    editCurrentAiSuggestion,
    completeAiCheck
  } = useDebateStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  console.log('AiCheckFlow aiCheckState:', aiCheckState);

  useEffect(() => {
    // Focus the text input when component mounts or suggestion changes
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [aiCheckState?.currentIndex]);

  if (!aiCheckState) return null;

  if (aiCheckState.loading) {
    return (
      <div 
        className="w-full block-expander block-expander-expanded block-expander-full-width"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1000,
          overflow: 'visible'
        }}
      >
        <div 
          className="w-full sharp-corners" 
          style={{
            backgroundColor: '#FFF9E6',
            border: `var(--border-width)px solid #FF9500`,
            padding: 'var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="text-center">
            <div className="text-lg mb-2">🤔 Claude is analyzing your argument...</div>
            <div className="text-sm opacity-70">Looking for logical gaps, unsupported claims, and debate-worthy issues</div>
          </div>
        </div>
      </div>
    );
  }

  if (!aiCheckState.isActive) {
    return (
      <div 
        className="w-full block-expander block-expander-expanded block-expander-full-width"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1000,
          overflow: 'visible'
        }}
      >
        <div 
          className="w-full sharp-corners" 
          style={{
            backgroundColor: '#E8F5E8',
            border: `var(--border-width)px solid #4CAF50`,
            padding: 'var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="text-center">
            <div className="text-lg mb-2">✅ No significant issues found!</div>
            <div className="text-sm opacity-70">Your argument looks solid from a debate perspective</div>
          </div>
        </div>
      </div>
    );
  }

  const currentSuggestion = aiCheckState.suggestions[aiCheckState.currentIndex];
  if (!currentSuggestion) {
    completeAiCheck();
    return null;
  }

  const progress = `${aiCheckState.currentIndex + 1} of ${aiCheckState.suggestions.length}`;
  const OBJECTION_CHAR_LIMIT = 300;

  const handleConfirm = () => {
    const text = inputRef.current?.value || currentSuggestion.text;
    confirmCurrentAiSuggestion(text !== currentSuggestion.text ? text : undefined);
  };

  const handleTextChange = (text: string) => {
    if (text !== currentSuggestion.text) {
      editCurrentAiSuggestion(text);
    }
  };

  return (
    <div 
      className="w-full block-expander block-expander-expanded block-expander-full-width"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1000,
        overflow: 'visible'
      }}
    >
      <div 
        className="w-full sharp-corners" 
        style={{
          backgroundColor: '#FFF9E6',
          border: `var(--border-width)px solid #FF9500`,
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header with category and progress */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span 
              className="px-2 py-1 text-xs font-medium rounded sharp-corners"
              style={{
                backgroundColor: '#FF9500',
                color: 'white'
              }}
            >
              {currentSuggestion.category}
            </span>
            <span className="text-sm font-medium">AI Suggestion</span>
          </div>
          <div className="text-sm opacity-70">
            Reviewing suggestion {progress}
          </div>
        </div>

        {/* AI suggestion text input */}
        <div className="mb-4" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WhatsAppInput
            ref={inputRef}
            value={currentSuggestion.text}
            onChange={handleTextChange}
            placeholder="AI suggestion text"
            maxLength={OBJECTION_CHAR_LIMIT}
            showCharacterCount={true}
            autoFocus
            style={{ flex: 1, minHeight: '60px', height: '100%' }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!currentSuggestion.text.trim() || currentSuggestion.text.length > OBJECTION_CHAR_LIMIT}
              className="px-4 py-2 text-sm font-medium sharp-corners disabled:opacity-50"
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none'
              }}
            >
              {aiCheckState.currentIndex < aiCheckState.suggestions.length - 1 ? 'Confirm & Next' : 'Confirm & Finish'}
            </button>
            
            <button
              onClick={rejectCurrentAiSuggestion}
              className="px-4 py-2 text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#F44336',
                color: 'white',
                border: 'none'
              }}
            >
              {aiCheckState.currentIndex < aiCheckState.suggestions.length - 1 ? 'Reject & Next' : 'Reject & Finish'}
            </button>
          </div>

          <div className="text-sm opacity-70 flex items-center">
            {aiCheckState.suggestions.length > 1 && (
              <>
                {aiCheckState.suggestions.slice(0, aiCheckState.currentIndex).length} confirmed, 
                {aiCheckState.suggestions.length - aiCheckState.currentIndex - 1} remaining
              </>
            )}
          </div>
        </div>

        {/* Help text */}
        <div className="mt-3 text-xs opacity-60">
          Review this AI-generated objection. You can edit the text before confirming or reject it entirely.
          {currentSuggestion.isEdited && ' (Modified from original AI suggestion)'}
        </div>
      </div>
    </div>
  );
}