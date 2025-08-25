import { useDebateStore } from '../store/store';
import { BlockCard } from './BlockCard';
import { DraftCard } from './DraftCard';
import { getBlockColor } from '../utils/colors';

interface TreeProps {
  blockId: string;
}

export function Tree({ blockId }: TreeProps) {
  const { debate, draft, expandedBlockId } = useDebateStore();
  
  if (!debate) return null;

  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return null;

  const children = debate.blocks
    .filter(b => b.parentId === blockId)
    .sort((a, b) => a.order - b.order);

  const showDraft = draft && draft.parentId === blockId;

  // Find if any child is expanded 
  const expandedChild = children.find(child => expandedBlockId === child.id);

  return (
    <div className="w-full">
      <BlockCard block={block} />
      
      {(children.length > 0 || showDraft) && (
        <div className="w-full">
          <div 
            className="grid no-gap w-full mobile-grid"
            style={{
              gridTemplateColumns: `repeat(${children.length + (showDraft ? 1 : 0)}, minmax(0, 1fr))`,
              '--mobile-cols': children.length + (showDraft ? 1 : 0)
            } as React.CSSProperties}
          >
            {children.map((child) => (
              <div key={child.id} className="w-full overflow-hidden">
                <Tree blockId={child.id} />
              </div>
            ))}
            
            {showDraft && (
              <div className="w-full overflow-hidden">
                <DraftCard />
              </div>
            )}
          </div>
          
          {/* Global expanded content that breaks out to full width */}
          {expandedChild && (
            <div className="expanded-full-width">
              <div 
                className="w-full p-4 sharp-corners" 
                style={{
                  minHeight: 'var(--expander-min-height)',
                  backgroundColor: getBlockColor(expandedChild, debate.blocks),
                  border: `var(--border-width)px solid var(--border-color)`,
                  marginTop: '2px'
                }}
              >
                <div className="mb-4 text-base">
                  {expandedChild.text}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const { agreeToBlock } = useDebateStore.getState();
                      agreeToBlock(expandedChild.id);
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
                    onClick={() => {
                      const { createDraft } = useDebateStore.getState();
                      createDraft(expandedChild.id, '');
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
                  
                  {expandedChild.history.length > 0 && (
                    <button
                      onClick={() => {
                        const { setHistoryOpen } = useDebateStore.getState();
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
              
              {/* Render children of the expanded block below */}
              {debate.blocks
                .filter(b => b.parentId === expandedChild.id)
                .sort((a, b) => a.order - b.order)
                .map(grandchild => (
                  <Tree key={grandchild.id} blockId={grandchild.id} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}