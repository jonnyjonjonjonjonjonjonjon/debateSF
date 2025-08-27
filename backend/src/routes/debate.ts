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
  staticNumber: string;
  text: string; 
  history: HistoryItem[] 
};
type Debate = { 
  _id: Id; 
  resolved: boolean; 
  blocks: DebateBlock[]; 
  updatedAt: string 
};

// Store multiple debates in memory
let debates: Map<string, Debate> = new Map();
let currentDebateId: string | null = null;

// Initialize with a default debate
const defaultDebate: Debate = {
  _id: uuidv4(),
  resolved: false,
  blocks: [],
  updatedAt: new Date().toISOString()
};
debates.set(defaultDebate._id, defaultDebate);
currentDebateId = defaultDebate._id;

function getCurrentDebate(): Debate | null {
  if (!currentDebateId) return null;
  return debates.get(currentDebateId) || null;
}

function updateDebate(debateId: string): Debate | null {
  const debate = debates.get(debateId);
  if (!debate) return null;
  
  debate.updatedAt = new Date().toISOString();
  debates.set(debateId, debate);
  return debate;
}

function reindexChildren(debateId: string, parentId: Id | null) {
  const debate = debates.get(debateId);
  if (!debate) return;
  
  const children = debate.blocks
    .filter(block => block.parentId === parentId)
    .sort((a, b) => a.order - b.order);
  
  children.forEach((child, index) => {
    child.order = index;
  });
  
  debates.set(debateId, debate);
}

function generateStaticNumber(debateId: string, parentId: Id | null): string {
  const debate = debates.get(debateId);
  if (!debate) return '1';

  if (parentId === null) {
    // Opening statement gets "1"
    return '1';
  }

  const parent = debate.blocks.find(b => b.id === parentId);
  if (!parent) return '1';

  // Get all existing children of this parent
  const siblings = debate.blocks.filter(b => b.parentId === parentId);
  
  // Find the highest existing number among siblings
  let maxChildNumber = 0;
  siblings.forEach(sibling => {
    if (sibling.staticNumber) {
      const parts = sibling.staticNumber.split('.');
      const lastPart = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastPart) && lastPart > maxChildNumber) {
        maxChildNumber = lastPart;
      }
    }
  });

  // Generate next number in sequence
  const nextNumber = maxChildNumber + 1;
  return `${parent.staticNumber}.${nextNumber}`;
}

function deleteBlockAndChildren(debateId: string, blockId: Id) {
  const debate = debates.get(debateId);
  if (!debate) return;
  
  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return;

  const children = debate.blocks.filter(b => b.parentId === blockId);
  children.forEach(child => deleteBlockAndChildren(debateId, child.id));
  
  debate.blocks = debate.blocks.filter(b => b.id !== blockId);
  
  reindexChildren(debateId, block.parentId);
  debates.set(debateId, debate);
}

// New multiple debate endpoints
router.get('/debates', (req, res) => {
  const debateList = Array.from(debates.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(debateList);
});

router.post('/debate', (req, res) => {
  const newDebate: Debate = {
    _id: uuidv4(),
    resolved: false,
    blocks: [],
    updatedAt: new Date().toISOString()
  };
  
  debates.set(newDebate._id, newDebate);
  currentDebateId = newDebate._id;
  res.json(newDebate);
});

router.get('/debate/:id', (req, res) => {
  const { id } = req.params;
  const debate = debates.get(id);
  
  if (!debate) {
    return res.status(404).json({ error: 'Debate not found' });
  }
  
  currentDebateId = id;
  res.json(debate);
});

router.delete('/debate/:id', (req, res) => {
  const { id } = req.params;
  const debate = debates.get(id);
  
  if (!debate) {
    return res.status(404).json({ error: 'Debate not found' });
  }
  
  debates.delete(id);
  
  // If we deleted the current debate, switch to another one or create a new one
  if (currentDebateId === id) {
    const remainingDebates = Array.from(debates.values());
    if (remainingDebates.length > 0) {
      currentDebateId = remainingDebates[0]._id;
    } else {
      // Create a new default debate if none exist
      const newDebate: Debate = {
        _id: uuidv4(),
        resolved: false,
        blocks: [],
        updatedAt: new Date().toISOString()
      };
      debates.set(newDebate._id, newDebate);
      currentDebateId = newDebate._id;
    }
  }
  
  res.json({ message: 'Debate deleted successfully' });
});

router.post('/debate/:id/reset', (req, res) => {
  const { id } = req.params;
  const debate = debates.get(id);
  
  if (!debate) {
    return res.status(404).json({ error: 'Debate not found' });
  }
  
  debate.blocks = [];
  debate.resolved = false;
  debate.updatedAt = new Date().toISOString();
  
  debates.set(id, debate);
  currentDebateId = id;
  res.json(debate);
});

// Legacy endpoints (backwards compatibility)
router.get('/debate', (req, res) => {
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  res.json(debate);
});

router.post('/block', (req, res) => {
  const { parentId, text } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }

  const siblings = debate.blocks.filter(block => block.parentId === parentId);
  const depth = parentId ? 
    (debate.blocks.find(b => b.id === parentId)?.depth ?? 0) + 1 : 
    0;

  const staticNumber = generateStaticNumber(debate._id, parentId);

  const newBlock: DebateBlock = {
    id: uuidv4(),
    parentId: parentId || null,
    depth,
    order: siblings.length,
    staticNumber,
    text,
    history: []
  };

  debate.blocks.push(newBlock);
  const updatedDebate = updateDebate(debate._id);
  res.json(updatedDebate);
});

router.patch('/block/:id', (req, res) => {
  const { id } = req.params;
  const { text, order } = req.body;
  
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  
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
    reindexChildren(debate._id, block.parentId);
  }

  const updatedDebate = updateDebate(debate._id);
  res.json(updatedDebate);
});

router.delete('/block/:id', (req, res) => {
  const { id } = req.params;
  const { cascade } = req.query;
  
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  
  const block = debate.blocks.find(b => b.id === id);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }

  if (cascade === 'true') {
    deleteBlockAndChildren(debate._id, id);
  } else {
    debate.blocks = debate.blocks.filter(b => b.id !== id);
    reindexChildren(debate._id, block.parentId);
  }

  const updatedDebate = updateDebate(debate._id);
  res.json(updatedDebate);
});

router.put('/debate', (req, res) => {
  const { resolve } = req.query;
  
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  
  if (resolve === 'true') {
    debate.resolved = true;
  } else if (resolve === 'false') {
    debate.resolved = false;
  }

  const updatedDebate = updateDebate(debate._id);
  res.json(updatedDebate);
});

router.delete('/debate', (req, res) => {
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  
  // Reset the current debate
  debate.blocks = [];
  debate.resolved = false;
  debate.updatedAt = new Date().toISOString();
  
  debates.set(debate._id, debate);
  res.json(debate);
});

export { router as debateRouter };