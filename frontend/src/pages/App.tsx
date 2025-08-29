import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDebateStore } from '../store/store';
import { ThemeSelector } from '../components/ThemeSelector';
import { useTheme } from '../hooks/useTheme';

export default function App() {
  const { 
    debates,
    loading, 
    error, 
    loadDebates,
    createNewDebate
  } = useDebateStore();
  
  const { currentTheme, changeTheme } = useTheme();

  useEffect(() => {
    loadDebates();
  }, [loadDebates]);

  if (loading && debates.length === 0) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={loadDebates}
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

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="p-3 md:p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <div className="flex items-center gap-2 md:gap-3 justify-center md:justify-start">
            <h1 className="text-lg md:text-xl font-bold">Debate Mapper 🚀</h1>
            <span className="text-xs md:text-sm text-white font-mono bg-blue-600 px-1 md:px-2 py-1 rounded font-bold">
              v1.7.0 - URL SHARING!
            </span>
          </div>
          <div className="flex gap-1 md:gap-2 justify-center md:justify-end flex-wrap">
            <ThemeSelector currentTheme={currentTheme} onThemeChange={changeTheme} />
            <button
              onClick={createNewDebate}
              className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium sharp-corners"
              style={{
                backgroundColor: '#EFEFEF',
                color: '#111111',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              New Debate
            </button>
          </div>
        </div>
      </header>

      <main className="p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Your Debates</h2>
          
          {debates.length === 0 ? (
            <div className="text-center py-8">
              <p className="mb-4 text-gray-600">No debates yet. Create your first one!</p>
              <button
                onClick={createNewDebate}
                className="px-4 py-2 text-sm font-medium sharp-corners"
                style={{
                  backgroundColor: '#111111',
                  color: '#FFFFFF'
                }}
              >
                Create New Debate
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {debates.map(debate => (
                <Link
                  key={debate._id}
                  to={`/debate/${debate._id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium mb-1">
                        {debate.blocks.length > 0 
                          ? debate.blocks.find(b => b.parentId === null)?.text?.substring(0, 100) + '...'
                          : 'Empty Debate'
                        }
                      </h3>
                      <p className="text-sm text-gray-600">
                        {debate.blocks.length} blocks • Updated {new Date(debate.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {debate.resolved && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}