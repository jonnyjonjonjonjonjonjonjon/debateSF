import { create } from 'zustand';

export type Id = string;
export type DebateBlock = { 
  id: Id; 
  parentId: Id | null; 
  depth: number; 
  order: number; 
  text: string; 
};
export type Debate = { 
  _id: Id; 
  resolved: boolean; 
  blocks: DebateBlock[]; 
  updatedAt: string 
};

export interface Draft {
  id: string;
  parentId: Id | null;
  text: string;
}

interface DebateState {
  debate: Debate | null;
  expandedBlockId: Id | null;
  editingBlockId: Id | null;
  draft: Draft | null;
  loading: boolean;
  error: string | null;
  
  loadDebate: () => Promise<void>;
  setExpanded: (blockId: Id | null) => void;
  setEditing: (blockId: Id | null) => void;
  createDraft: (parentId: Id | null, text: string) => void;
  updateDraft: (text: string) => void;
  confirmDraft: () => Promise<void>;
  cancelDraft: () => void;
  agreeToBlock: (blockId: Id) => void;
  updateBlock: (blockId: Id, text: string) => Promise<void>;
  deleteBlock: (blockId: Id) => Promise<void>;
  toggleResolved: () => Promise<void>;
  resetDebate: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://debatesf-production-4206.up.railway.app/api'
    : '/api');

export const useDebateStore = create<DebateState>((set, get) => ({
  debate: null,
  expandedBlockId: null,
  editingBlockId: null,
  draft: null,
  loading: false,
  error: null,

  loadDebate: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/debate`);
      if (!response.ok) {
        throw new Error(`Failed to load debate (${response.status})`);
      }
      const debate = await response.json();
      set({ debate, loading: false });
    } catch (error) {
      console.error('Error loading debate:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load debate', 
        loading: false 
      });
    }
  },

  setExpanded: (blockId) => {
    const { expandedBlockId } = get();
    set({ 
      expandedBlockId: expandedBlockId === blockId ? null : blockId,
      editingBlockId: null,
      draft: null 
    });
  },

  setEditing: (blockId) => {
    set({ editingBlockId: blockId, draft: null });
  },

  createDraft: (parentId, text) => {
    set({ 
      draft: { 
        id: Math.random().toString(36), 
        parentId, 
        text 
      } 
    });
  },

  updateDraft: (text) => {
    const { draft } = get();
    if (draft) {
      set({ draft: { ...draft, text } });
    }
  },

  confirmDraft: async () => {
    const { draft } = get();
    if (!draft) return;

    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parentId: draft.parentId, 
          text: draft.text 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create block');
      const debate = await response.json();
      set({ debate, draft: null, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  cancelDraft: () => {
    set({ draft: null });
  },

  agreeToBlock: (blockId) => {
    const { debate } = get();
    if (!debate) return;
    
    const block = debate.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    set({ 
      editingBlockId: blockId,
      expandedBlockId: null,
      draft: null 
    });
  },

  updateBlock: async (blockId, text) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/block/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('Failed to update block');
      const debate = await response.json();
      set({ debate, editingBlockId: null, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteBlock: async (blockId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/block/${blockId}?cascade=true`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete block');
      const debate = await response.json();
      set({ debate, editingBlockId: null, expandedBlockId: null, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },


  toggleResolved: async () => {
    const { debate } = get();
    if (!debate) return;

    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/debate?resolve=${!debate.resolved}`, {
        method: 'PUT',
      });
      
      if (!response.ok) throw new Error('Failed to toggle resolved status');
      const updatedDebate = await response.json();
      set({ debate: updatedDebate, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  resetDebate: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/debate`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to reset debate');
      const debate = await response.json();
      set({ 
        debate, 
        expandedBlockId: null,
        editingBlockId: null,
        draft: null,
              loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

}));