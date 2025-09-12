import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebateStore } from '../store/store';

export function DebateSelection() {
  const navigate = useNavigate();
  const { 
    debates, 
    loading, 
    error, 
    loadDebates, 
    selectDebate, 
    deleteDebateById,
    setShowDebateSelection 
  } = useDebateStore();

  useEffect(() => {
    loadDebates();
  }, [loadDebates]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getDebatePreview = (debate: any) => {
    const openingBlock = debate.blocks?.find((block: any) => block.depth === 0);
    if (!openingBlock) return 'Empty debate';
    return openingBlock.text.length > 100 
      ? openingBlock.text.substring(0, 100) + '...'
      : openingBlock.text;
  };

  // Filter out empty debates (those with no blocks)
  const nonEmptyDebates = debates.filter(debate => debate.blocks && debate.blocks.length > 0);

  const handleCreateNew = () => {
    // Close the selection modal first
    setShowDebateSelection(false);
    // Use replace to ensure we get a fresh blank debate
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">Loading debates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={loadDebates}
          className="px-4 py-2 text-sm font-medium sharp-corners"
          style={{
            backgroundColor: '#EFEFEF',
            color: '#111111',
            border: `var(--border-width)px solid var(--border-color)`
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Select a Debate</h2>
      </div>

      {nonEmptyDebates.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">No debates found.</p>
          <p className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
            Use the "New" button in the header to create your first debate.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {nonEmptyDebates.map((debate) => (
            <div
              key={debate._id}
              className="sharp-corners border p-3 flex justify-between items-start"
              style={{
                backgroundColor: 'var(--surface-color)',
                borderColor: 'var(--border-color)',
                borderWidth: 'var(--border-width)px'
              }}
            >
              <div className="flex-1 cursor-pointer" onClick={() => {
                selectDebate(debate._id);
                window.history.pushState(null, '', `/debate/${debate._id}`);
              }}>
                <div className="font-medium mb-1">
                  {debate.resolved && <span className="text-green-600 mr-1">✓</span>}
                  Debate from {formatDate(debate.updatedAt)}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-color)' }}>
                  {getDebatePreview(debate)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                  {debate.blocks?.length || 0} blocks
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this debate?')) {
                    deleteDebateById(debate._id);
                  }
                }}
                className="ml-3 px-2 py-1 text-xs font-medium sharp-corners"
                style={{
                  backgroundColor: 'var(--danger-color)',
                  color: 'white',
                  border: 'none'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}