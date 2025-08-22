import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

type Id = string;
type HistoryItem = { text: string; at: string };
type DebateBlock = { 
  id: Id; 
  parentId: Id | null; 
  depth: number; 
  order: number; 
  text: string; 
  history: HistoryItem[] 
};
type Debate = { 
  _id: Id; 
  resolved: boolean; 
  blocks: DebateBlock[]; 
  updatedAt: string 
};

let debate: Debate = {
  _id: uuidv4(),
  resolved: false,
  blocks: [],
  updatedAt: new Date().toISOString()
};

function updateDebate(): Debate {
  debate.updatedAt = new Date().toISOString();
  return debate;
}

function reindexChildren(parentId: Id | null) {
  const children = debate.blocks
    .filter(block => block.parentId === parentId)
    .sort((a, b) => a.order - b.order);
  
  children.forEach((child, index) => {
    child.order = index;
  });
}

function deleteBlockAndChildren(blockId: Id) {
  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return;

  const children = debate.blocks.filter(b => b.parentId === blockId);
  children.forEach(child => deleteBlockAndChildren(child.id));
  
  debate.blocks = debate.blocks.filter(b => b.id !== blockId);
  
  reindexChildren(block.parentId);
}

router.get('/debate', (req, res) => {
  res.json(debate);
});

router.post('/block', (req, res) => {
  const { parentId, text } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const siblings = debate.blocks.filter(block => block.parentId === parentId);
  const depth = parentId ? 
    (debate.blocks.find(b => b.id === parentId)?.depth ?? 0) + 1 : 
    0;

  const newBlock: DebateBlock = {
    id: uuidv4(),
    parentId: parentId || null,
    depth,
    order: siblings.length,
    text,
    history: []
  };

  debate.blocks.push(newBlock);
  res.json(updateDebate());
});

router.patch('/block/:id', (req, res) => {
  const { id } = req.params;
  const { text, order } = req.body;
  
  const block = debate.blocks.find(b => b.id === id);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }

  if (text && typeof text === 'string' && text !== block.text) {
    block.history.push({
      text: block.text,
      at: new Date().toISOString()
    });
    block.text = text;
  }

  if (typeof order === 'number' && order !== block.order) {
    block.order = order;
    reindexChildren(block.parentId);
  }

  res.json(updateDebate());
});

router.delete('/block/:id', (req, res) => {
  const { id } = req.params;
  const { cascade } = req.query;
  
  const block = debate.blocks.find(b => b.id === id);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }

  if (cascade === 'true') {
    deleteBlockAndChildren(id);
  } else {
    debate.blocks = debate.blocks.filter(b => b.id !== id);
    reindexChildren(block.parentId);
  }

  res.json(updateDebate());
});

router.put('/debate', (req, res) => {
  const { resolve } = req.query;
  
  if (resolve === 'true') {
    debate.resolved = true;
  } else if (resolve === 'false') {
    debate.resolved = false;
  }

  res.json(updateDebate());
});

router.delete('/debate', (req, res) => {
  debate = {
    _id: uuidv4(),
    resolved: false,
    blocks: [],
    updatedAt: new Date().toISOString()
  };
  res.json(debate);
});

export { router as debateRouter };