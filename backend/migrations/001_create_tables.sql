-- Create debates table
CREATE TABLE IF NOT EXISTS debates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create debate_blocks table
CREATE TABLE IF NOT EXISTS debate_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES debate_blocks(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    static_number TEXT NOT NULL,
    text TEXT NOT NULL,
    disabled BOOLEAN DEFAULT FALSE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create debate_block_history table for tracking text changes
CREATE TABLE IF NOT EXISTS debate_block_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES debate_blocks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_debate_blocks_debate_id ON debate_blocks(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_blocks_parent_id ON debate_blocks(parent_id);
CREATE INDEX IF NOT EXISTS idx_debate_blocks_depth ON debate_blocks(depth);
CREATE INDEX IF NOT EXISTS idx_debate_block_history_block_id ON debate_block_history(block_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_debates_updated_at 
    BEFORE UPDATE ON debates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debate_blocks_updated_at 
    BEFORE UPDATE ON debate_blocks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();