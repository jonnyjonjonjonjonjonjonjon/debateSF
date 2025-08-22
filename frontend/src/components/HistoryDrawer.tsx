import { useDebateStore } from '../store/store';

export function HistoryDrawer() {
  const { 
    debate,
    expandedBlockId,
    setHistoryOpen,
    restoreBlock
  } = useDebateStore();

  if (!debate || !expandedBlockId) return null;

  const block = debate.blocks.find(b => b.id === expandedBlockId);
  if (!block || block.history.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => setHistoryOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setHistoryOpen(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
    >
      <div 
        className="max-w-2xl w-full mx-4 max-h-96 overflow-y-auto sharp-corners"
        style={{
          backgroundColor: 'var(--surface-color)',
          border: `var(--border-width)px solid var(--border-color)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-center">
            <h3 id="history-title" className="text-lg font-semibold">History</h3>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xl font-bold w-8 h-8 flex items-center justify-center sharp-corners"
              style={{
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-color)',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Current:</div>
            <div 
              className="p-3 sharp-corners"
              style={{
                backgroundColor: 'var(--neutral-50)',
                border: `var(--border-width)px solid var(--border-color)`
              }}
            >
              {block.text}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2">Previous versions:</div>
            <div className="space-y-2">
              {block.history.map((item, index) => (
                <div 
                  key={index}
                  className="flex justify-between items-start gap-3 p-3 sharp-corners"
                  style={{
                    backgroundColor: 'var(--neutral-100)',
                    border: `var(--border-width)px solid var(--border-color)`
                  }}
                >
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      {new Date(item.at).toLocaleString()}
                    </div>
                    <div>{item.text}</div>
                  </div>
                  <button
                    onClick={() => {
                      restoreBlock(block.id, index);
                      setHistoryOpen(false);
                    }}
                    className="px-3 py-1 text-xs font-medium sharp-corners"
                    style={{
                      backgroundColor: 'var(--opening-bg)',
                      color: 'var(--opening-fg)'
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}