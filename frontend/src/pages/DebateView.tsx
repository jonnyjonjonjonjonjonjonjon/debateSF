import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDebateStore } from '../store/store';
import { Tree } from '../components/Tree';
import { OpeningCard } from '../components/OpeningCard';
import { DebateSelection } from '../components/DebateSelection';
import { ThemeSelector } from '../components/ThemeSelector';
import { useTheme } from '../hooks/useTheme';

export default function DebateView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    debate, 
    loading, 
    error, 
    showDebateSelection,
    selectDebate, 
    resetDebate,
    setShowDebateSelection,
    setExpanded
  } = useDebateStore();
  
  const { currentTheme, changeTheme } = useTheme();

  useEffect(() => {
    if (id) {
      selectDebate(id);
    }
  }, [id, selectDebate]);

  if (loading && !debate) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <div className="space-x-2">
          <button
            onClick={() => id && selectDebate(id)}
            className="px-4 py-2 text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#111111',
              color: '#FFFFFF'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#EFEFEF',
              color: '#111111',
              border: `var(--border-width)px solid var(--border-color)`
            }}
          >
            Back to Debates
          </button>
        </div>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="p-4 text-center">
        <div className="mb-4">Debate not found</div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 text-sm font-medium sharp-corners"
          style={{
            backgroundColor: '#111111',
            color: '#FFFFFF'
          }}
        >
          Back to Debates
        </button>
      </div>
    );
  }

  const rootBlocks = debate.blocks.filter(block => block.parentId === null);
  const isBlankDebate = rootBlocks.length === 0;

  const handleNewDebate = () => {
    if (isBlankDebate) {
      // Already on a blank debate, do nothing
      return;
    }
    // Navigate to create new debate only if current has content
    navigate('/');
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="p-3 md:p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <div className="flex items-center gap-2 md:gap-3 justify-center md:justify-start">
            <h1 
              className="text-lg md:text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleNewDebate}
              title={isBlankDebate ? "Already on a new blank debate" : "Click to create a new blank debate"}
            >
              Debate Mapper 🚀
            </h1>
            <span className="text-xs md:text-sm text-white font-mono bg-green-600 px-1 md:px-2 py-1 rounded font-bold">
              v1.12.6 - Smart New Button!
            </span>
          </div>
          <div className="flex gap-1 md:gap-2 justify-center md:justify-end flex-wrap">
            <ThemeSelector currentTheme={currentTheme} onThemeChange={changeTheme} />
            <button
              onClick={handleNewDebate}
              className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium sharp-corners"
              style={{
                backgroundColor: isBlankDebate ? '#F5F5F5' : '#EFEFEF',
                color: isBlankDebate ? '#888888' : '#111111',
                border: `var(--border-width)px solid var(--border-color)`,
                opacity: isBlankDebate ? 0.6 : 1,
                cursor: isBlankDebate ? 'not-allowed' : 'pointer'
              }}
              title={isBlankDebate ? "Already on a new blank debate" : "Create a new blank debate"}
            >
              {isBlankDebate ? "Current" : "New"}
            </button>
            <button
              onClick={() => setShowDebateSelection(true)}
              className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#EFEFEF',
                color: '#111111',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              Select
            </button>
            <button
              onClick={resetDebate}
              className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#EFEFEF',
                color: '#111111',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              Reset
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#FF9500',
                color: 'white',
                border: 'none'
              }}
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      <main 
        className="p-3 md:p-4 min-h-screen"
        onClick={(e) => {
          // Close expanded blocks when clicking in empty space or on non-interactive elements
          const target = e.target as HTMLElement;
          const isClickableElement = target.tagName === 'BUTTON' || 
                                   target.tagName === 'INPUT' || 
                                   target.tagName === 'TEXTAREA' ||
                                   target.getAttribute('role') === 'button' ||
                                   target.closest('button');
          
          if (!isClickableElement) {
            setExpanded(null);
          }
        }}
      >
        {showDebateSelection ? (
          <DebateSelection />
        ) : rootBlocks.length === 0 ? (
          <OpeningCard />
        ) : (
          <div className="space-y-0">
            {rootBlocks
              .sort((a, b) => a.order - b.order)
              .map(block => (
                <div key={block.id} className="w-full">
                  <Tree blockId={block.id} />
                </div>
              ))}
          </div>
        )}
      </main>

    </div>
  );
}