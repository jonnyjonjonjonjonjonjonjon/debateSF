import { useEffect } from 'react';
import { useDebateStore } from '../store/store';
import { Tree } from '../components/Tree';
import { OpeningCard } from '../components/OpeningCard';
import { DebateSelection } from '../components/DebateSelection';
import { ThemeSelector } from '../components/ThemeSelector';
import { useTheme } from '../hooks/useTheme';

export default function App() {
  const { 
    debate, 
    loading, 
    error, 
    showDebateSelection,
    loadDebate, 
    resetDebate,
    createNewDebate,
    setShowDebateSelection
  } = useDebateStore();
  
  const { currentTheme, changeTheme } = useTheme();

  useEffect(() => {
    loadDebate();
  }, [loadDebate]);

  if (loading && !debate) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={loadDebate}
          className="px-4 py-2 text-sm font-medium sharp-corners"
          style={{
            backgroundColor: '#111111',
            color: '#FFFFFF'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!debate) {
    return <div className="p-4">No debate found</div>;
  }

  const rootBlocks = debate.blocks.filter(block => block.parentId === null);

  return (
    <div className="min-h-screen">
      <header className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Debate Mapper 🚀</h1>
            <span className="text-sm text-white font-mono bg-orange-600 px-2 py-1 rounded font-bold">
              v1.6.0 - THEME SELECTOR!
            </span>
          </div>
          <div className="flex gap-2">
            <ThemeSelector currentTheme={currentTheme} onThemeChange={changeTheme} />
            <button
              onClick={createNewDebate}
              className="px-3 py-1 text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#EFEFEF',
                color: '#111111',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              New
            </button>
            <button
              onClick={() => setShowDebateSelection(true)}
              className="px-3 py-1 text-sm font-medium sharp-corners"
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
              className="px-3 py-1 text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#EFEFEF',
                color: '#111111',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="p-4">
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