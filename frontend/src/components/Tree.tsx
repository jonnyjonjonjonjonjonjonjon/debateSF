import { useDebateStore } from '../store/store';
import { BlockCard } from './BlockCard';
import { DraftCard } from './DraftCard';

interface TreeProps {
  blockId: string;
}

export function Tree({ blockId }: TreeProps) {
  const { debate, draft } = useDebateStore();
  
  if (!debate) return null;

  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return null;

  const children = debate.blocks
    .filter(b => b.parentId === blockId)
    .sort((a, b) => a.order - b.order);

  const showDraft = draft && draft.parentId === blockId;

  return (
    <div className="w-full">
      <BlockCard block={block} />
      
      {(children.length > 0 || showDraft) && (
        <div className="w-full">
          <div 
            className="grid no-gap w-full mobile-grid"
            style={{
              gridTemplateColumns: `repeat(${children.length + (showDraft ? 1 : 0)}, minmax(0, 1fr))`
            }}
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
        </div>
      )}
    </div>
  );
}