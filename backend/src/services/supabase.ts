import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types matching the current debate structure
export interface DebateBlock {
  id: string;
  debate_id: string;
  parent_id: string | null;
  depth: number;
  order_index: number;
  static_number: string;
  text: string;
  disabled?: boolean;
  disabled_at?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface DebateBlockHistory {
  id: string;
  block_id: string;
  text: string;
  created_at: string;
}

export interface Debate {
  id: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  blocks?: DebateBlock[];
}

// Transform database row to match existing API format
function transformDebateBlock(dbBlock: any): any {
  return {
    id: dbBlock.id,
    parentId: dbBlock.parent_id,
    depth: dbBlock.depth,
    order: dbBlock.order_index,
    staticNumber: dbBlock.static_number,
    text: dbBlock.text,
    disabled: dbBlock.disabled,
    disabledAt: dbBlock.disabled_at,
    category: dbBlock.category,
    history: [] // Will be populated separately if needed
  };
}

function transformDebate(dbDebate: any): any {
  return {
    _id: dbDebate.id,
    resolved: dbDebate.resolved,
    updatedAt: dbDebate.updated_at,
    blocks: dbDebate.blocks ? dbDebate.blocks.map(transformDebateBlock) : []
  };
}

class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Debate operations
  async getAllDebates(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('debates')
      .select(`
        id,
        resolved,
        created_at,
        updated_at,
        debate_blocks (
          id,
          parent_id,
          depth,
          order_index,
          static_number,
          text,
          disabled,
          disabled_at,
          category,
          created_at,
          updated_at
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map(debate => transformDebate({
      ...debate,
      blocks: debate.debate_blocks || []
    }));
  }

  async getDebateById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('debates')
      .select(`
        id,
        resolved,
        created_at,
        updated_at,
        debate_blocks (
          id,
          parent_id,
          depth,
          order_index,
          static_number,
          text,
          disabled,
          disabled_at,
          category,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return transformDebate({
      ...data,
      blocks: data.debate_blocks || []
    });
  }

  async createDebate(): Promise<any> {
    const { data, error } = await this.supabase
      .from('debates')
      .insert({})
      .select()
      .single();

    if (error) throw error;

    return transformDebate({ ...data, blocks: [] });
  }

  async deleteDebate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('debates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateDebateResolved(id: string, resolved: boolean): Promise<any> {
    const { data, error } = await this.supabase
      .from('debates')
      .update({ resolved })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Get blocks separately
    const debate = await this.getDebateById(id);
    return debate;
  }

  async resetDebate(id: string): Promise<any> {
    // Delete all blocks for this debate
    const { error: blocksError } = await this.supabase
      .from('debate_blocks')
      .delete()
      .eq('debate_id', id);

    if (blocksError) throw blocksError;

    // Update debate to not resolved
    const { data, error } = await this.supabase
      .from('debates')
      .update({ resolved: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return transformDebate({ ...data, blocks: [] });
  }

  // Block operations
  async createBlock(debateId: string, parentId: string | null, depth: number, order: number, staticNumber: string, text: string, category?: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('debate_blocks')
      .insert({
        debate_id: debateId,
        parent_id: parentId,
        depth,
        order_index: order,
        static_number: staticNumber,
        text,
        category
      })
      .select()
      .single();

    if (error) throw error;

    // Update debate's updated_at timestamp
    await this.supabase
      .from('debates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', debateId);

    return transformDebateBlock(data);
  }

  async updateBlockText(blockId: string, newText: string, debateId: string): Promise<void> {
    // Get current text to save to history
    const { data: currentBlock, error: fetchError } = await this.supabase
      .from('debate_blocks')
      .select('text')
      .eq('id', blockId)
      .single();

    if (fetchError) throw fetchError;

    // Save current text to history
    const { error: historyError } = await this.supabase
      .from('debate_block_history')
      .insert({
        block_id: blockId,
        text: currentBlock.text
      });

    if (historyError) throw historyError;

    // Update block text
    const { error: updateError } = await this.supabase
      .from('debate_blocks')
      .update({ text: newText })
      .eq('id', blockId);

    if (updateError) throw updateError;

    // Update debate's updated_at timestamp
    await this.supabase
      .from('debates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', debateId);
  }

  async updateBlockOrder(blockId: string, newOrder: number, debateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('debate_blocks')
      .update({ order_index: newOrder })
      .eq('id', blockId);

    if (error) throw error;

    // Update debate's updated_at timestamp
    await this.supabase
      .from('debates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', debateId);
  }

  async deleteBlock(blockId: string, debateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('debate_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;

    // Update debate's updated_at timestamp
    await this.supabase
      .from('debates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', debateId);
  }

  async disableBlock(blockId: string, debateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('debate_blocks')
      .update({ 
        disabled: true, 
        disabled_at: new Date().toISOString() 
      })
      .eq('id', blockId);

    if (error) throw error;

    // Update debate's updated_at timestamp
    await this.supabase
      .from('debates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', debateId);
  }

  async restoreBlock(blockId: string, debateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('debate_blocks')
      .update({ 
        disabled: false, 
        disabled_at: null 
      })
      .eq('id', blockId);

    if (error) throw error;

    // Update debate's updated_at timestamp
    await this.supabase
      .from('debates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', debateId);
  }

  async getBlockHistory(blockId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('debate_block_history')
      .select('*')
      .eq('block_id', blockId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(history => ({
      text: history.text,
      at: history.created_at
    }));
  }

  async getBlocksByParent(debateId: string, parentId: string | null): Promise<any[]> {
    const query = this.supabase
      .from('debate_blocks')
      .select('*')
      .eq('debate_id', debateId)
      .order('order_index');

    if (parentId === null) {
      query.is('parent_id', null);
    } else {
      query.eq('parent_id', parentId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(transformDebateBlock);
  }

  // Helper method to check if service is properly configured
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('debates')
        .select('*', { count: 'exact', head: true });
      
      return !error;
    } catch {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();