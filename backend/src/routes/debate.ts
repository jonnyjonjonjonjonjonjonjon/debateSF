import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type Id = string;
type HistoryItem = { text: string; at: string };
type DebateBlock = { 
  id: Id; 
  parentId: Id | null; 
  depth: number; 
  order: number; 
  staticNumber: string;
  text: string; 
  history: HistoryItem[];
  disabled?: boolean;
  disabledAt?: string;
  category?: string;
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

// Store AI prompts
interface AIPrompts {
  opening: string;
  objection: string;
}

const defaultPrompts: AIPrompts = {
  opening: `You are an expert debate analyst and fact-checker. Analyze this opening statement for significant issues that would meaningfully impact a debate. Focus only on substantial problems, not minor stylistic issues.

Opening Statement: "\${text}"

Look for these critical issues:
- Factual errors (statements that contradict well-established facts, scientific consensus, or easily verifiable information)
- Major logical fallacies or reasoning gaps
- Unsupported claims that need evidence
- Missing key counterarguments or context
- Contradictory statements

Pay special attention to basic factual accuracy - if the statement makes claims that are obviously false (like "the sky is green" or "water boils at 200°C"), these should be flagged as factual errors.

If you find significant issues, provide 1-4 specific, actionable objections. Each objection should:
- Be under 300 characters (about 50-60 words) - keep it very brief and punchy
- Use clear, simple language an 18-year-old would understand
- Focus on one main issue only
- Be completely distinct from other objections - no duplicated points or overlapping arguments
- Include a category from: "Factual Error", "Logical Gap", "Unsupported Claim", "Missing Context", "Weak Evidence", "Contradictory", "Scope Issue", "Definition Problem"

If no significant issues are found, respond with just "null".

Format your response as a JSON array of objects with "category" and "text" properties, or just "null" if no issues found.

Example of good brief response:
[{"category": "Factual Error", "text": "The sky appears blue due to light scattering, not green. This contradicts basic observation and scientific understanding of atmospheric optics."}]`,
  objection: `You are an expert debate analyst and fact-checker. Analyze this objection for significant issues that would meaningfully impact a debate. Focus only on substantial problems, not minor stylistic issues.

Objection: "\${text}"

Look for these critical issues:
- Factual errors (statements that contradict well-established facts, scientific consensus, or easily verifiable information)
- Major logical fallacies or reasoning gaps
- Unsupported claims that need evidence
- Strawman arguments or misrepresentations
- Missing evidence or weak reasoning
- Contradictory statements

Pay special attention to basic factual accuracy - if the objection makes claims that are obviously false (like "the sky is green" or "water boils at 200°C"), these should be flagged as factual errors.

If you find significant issues, provide 1-4 specific, actionable counter-objections. Each should:
- Be under 300 characters (about 50-60 words) - keep it very brief and punchy
- Use clear, simple language an 18-year-old would understand
- Focus on one main issue only
- Be completely distinct from other counter-objections - no duplicated points or overlapping arguments
- Include a category from: "Factual Error", "Logical Gap", "Unsupported Claim", "Missing Context", "Weak Evidence", "Contradictory", "Scope Issue", "Definition Problem"

If no significant issues are found, respond with just "null".

Format your response as a JSON array of objects with "category" and "text" properties, or just "null" if no issues found.

Example of good brief response:
[{"category": "Factual Error", "text": "This claim lacks supporting evidence. Well-established research contradicts this position."}]`
};

let currentPrompts: AIPrompts = { ...defaultPrompts };

// Debug logging storage
interface DebugLogEntry {
  timestamp: string;
  blockId: string;
  blockType: 'opening' | 'objection';
  inputText: string;
  prompt: string;
  rawResponse: string;
  parsedSuggestions: any;
  error?: string;
}

let debugLogs: DebugLogEntry[] = [];
const MAX_DEBUG_LOGS = 20;

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

function disableBlockAndChildren(debateId: string, blockId: Id) {
  const debate = debates.get(debateId);
  if (!debate) return;
  
  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return;

  // Disable this block
  block.disabled = true;
  block.disabledAt = new Date().toISOString();

  // Disable all children recursively
  const children = debate.blocks.filter(b => b.parentId === blockId);
  children.forEach(child => disableBlockAndChildren(debateId, child.id));
  
  debates.set(debateId, debate);
}

function restoreBlockAndChildren(debateId: string, blockId: Id) {
  const debate = debates.get(debateId);
  if (!debate) return;
  
  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) return;

  // Check if parent is disabled - if so, cannot restore this block
  if (block.parentId) {
    const parent = debate.blocks.find(b => b.id === block.parentId);
    if (parent && parent.disabled) {
      throw new Error('Cannot restore block while parent is disabled');
    }
  }

  // Restore this block
  block.disabled = false;
  delete block.disabledAt;

  // Restore all children recursively
  const children = debate.blocks.filter(b => b.parentId === blockId);
  children.forEach(child => restoreBlockAndChildren(debateId, child.id));
  
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

// AI Check endpoint
router.post('/debate/:id/ai-check', async (req, res) => {
  const { id } = req.params;
  const { blockId, text, blockType } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  if (!blockId || typeof blockId !== 'string') {
    return res.status(400).json({ error: 'Block ID is required' });
  }
  
  if (!blockType || !['opening', 'objection'].includes(blockType)) {
    return res.status(400).json({ error: 'Block type must be "opening" or "objection"' });
  }
  
  const debate = debates.get(id);
  if (!debate) {
    return res.status(404).json({ error: 'Debate not found' });
  }
  
  const block = debate.blocks.find(b => b.id === blockId);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }
  
  try {
    const promptTemplate = blockType === 'opening' ? currentPrompts.opening : currentPrompts.objection;
    const prompt = promptTemplate.replace('${text}', text);
    
    // Log the request details
    console.log('\n=== AI CHECK REQUEST ===');
    console.log('Block ID:', blockId);
    console.log('Block Type:', blockType);
    console.log('Input Text:', text);
    console.log('Prompt Template Length:', promptTemplate.length);
    console.log('Final Prompt:', prompt);
    console.log('========================\n');

    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const content = message.content[0];
    if (content.type !== 'text') {
      console.error('Unexpected response format from AI - not text type');
      return res.status(500).json({ error: 'Unexpected response format from AI' });
    }
    
    const responseText = content.text.trim();
    
    // Log the raw response
    console.log('\n=== AI CHECK RESPONSE ===');
    console.log('Raw Response:', responseText);
    console.log('Response Length:', responseText.length);
    console.log('=========================\n');
    
    let suggestions;
    let parseError: string | undefined;
    
    try {
      if (responseText === 'null' || responseText.toLowerCase().trim() === 'no significant issues found' || responseText.toLowerCase().includes('no significant issues found')) {
        suggestions = null;
        console.log('AI found no significant issues');
      } else {
        suggestions = JSON.parse(responseText);
        console.log('Parsed suggestions:', JSON.stringify(suggestions, null, 2));
        
        // Validate the response format
        if (!Array.isArray(suggestions)) {
          console.log('Suggestions is not an array, setting to null');
          suggestions = null;
        } else {
          const originalCount = suggestions.length;
          // Filter out any invalid suggestions
          suggestions = suggestions.filter(s => 
            s && 
            typeof s === 'object' && 
            typeof s.category === 'string' && 
            typeof s.text === 'string' &&
            s.text.length <= 300
          );
          
          console.log(`Filtered suggestions: ${originalCount} -> ${suggestions.length}`);
          
          if (suggestions.length === 0) {
            suggestions = null;
            console.log('No valid suggestions after filtering');
          }
        }
      }
    } catch (error) {
      parseError = (error as Error).message;
      console.error('Failed to parse AI response:', error);
      console.error('Response that failed to parse:', responseText);
      
      // Store debug log even for parse errors
      const logEntry: DebugLogEntry = {
        timestamp: new Date().toISOString(),
        blockId,
        blockType: blockType as 'opening' | 'objection',
        inputText: text,
        prompt,
        rawResponse: responseText,
        parsedSuggestions: null,
        error: parseError
      };
      
      debugLogs.unshift(logEntry);
      if (debugLogs.length > MAX_DEBUG_LOGS) {
        debugLogs = debugLogs.slice(0, MAX_DEBUG_LOGS);
      }
      
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    // Store successful debug log
    const logEntry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      blockId,
      blockType: blockType as 'opening' | 'objection',
      inputText: text,
      prompt,
      rawResponse: responseText,
      parsedSuggestions: suggestions,
      error: parseError
    };
    
    debugLogs.unshift(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) {
      debugLogs = debugLogs.slice(0, MAX_DEBUG_LOGS);
    }
    
    console.log('Final result - suggestions:', suggestions);
    console.log('=== END AI CHECK ===\n');
    
    res.json({ suggestions });
    
  } catch (error: any) {
    console.error('\n=== AI CHECK ERROR ===');
    console.error('Error:', error);
    console.error('Block ID:', blockId);
    console.error('Block Type:', blockType);
    console.error('Input Text:', text);
    console.error('======================\n');
    
    // Store error in debug log
    const logEntry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      blockId,
      blockType: blockType as 'opening' | 'objection',
      inputText: text,
      prompt: 'Error occurred before prompt was sent',
      rawResponse: '',
      parsedSuggestions: null,
      error: error.message || 'Unknown error'
    };
    
    debugLogs.unshift(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) {
      debugLogs = debugLogs.slice(0, MAX_DEBUG_LOGS);
    }
    
    // Handle specific Anthropic API errors
    if (error.status === 529) {
      return res.status(503).json({ 
        error: 'AI service is temporarily overloaded. Please try again in a few minutes.' 
      });
    }
    
    if (error.status === 401) {
      return res.status(500).json({ 
        error: 'AI service authentication error. Please contact support.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Too many AI requests. Please wait a moment before trying again.' 
      });
    }
    
    // Generic error fallback
    res.status(500).json({ 
      error: 'Failed to analyze text with AI. Please try again later.' 
    });
  }
});

// Admin endpoints for managing AI prompts
router.get('/admin/prompts', (req, res) => {
  res.json(currentPrompts);
});

router.post('/admin/prompts', (req, res) => {
  const { opening, objection } = req.body;
  
  if (!opening || typeof opening !== 'string') {
    return res.status(400).json({ error: 'Opening prompt is required and must be a string' });
  }
  
  if (!objection || typeof objection !== 'string') {
    return res.status(400).json({ error: 'Objection prompt is required and must be a string' });
  }
  
  currentPrompts = { opening, objection };
  res.json({ message: 'Prompts updated successfully', prompts: currentPrompts });
});

router.post('/admin/prompts/reset', (req, res) => {
  currentPrompts = { ...defaultPrompts };
  res.json(currentPrompts);
});

router.get('/admin/debug-logs', (req, res) => {
  res.json(debugLogs);
});

router.delete('/admin/debug-logs', (req, res) => {
  debugLogs = [];
  res.json({ message: 'Debug logs cleared' });
});

router.post('/admin/test-ai', async (req, res) => {
  const { text, blockType } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required and must be a string' });
  }
  
  if (!blockType || !['opening', 'objection'].includes(blockType)) {
    return res.status(400).json({ error: 'Block type must be "opening" or "objection"' });
  }
  
  try {
    const promptTemplate = blockType === 'opening' ? currentPrompts.opening : currentPrompts.objection;
    const prompt = promptTemplate.replace('${text}', text);
    
    console.log('\n=== ADMIN AI TEST REQUEST ===');
    console.log('Block Type:', blockType);
    console.log('Input Text:', text);
    console.log('Final Prompt:', prompt);
    console.log('============================\n');

    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const content = message.content[0];
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response format from AI' });
    }
    
    const responseText = content.text.trim();
    
    console.log('\n=== ADMIN AI TEST RESPONSE ===');
    console.log('Raw Response:', responseText);
    console.log('==============================\n');
    
    let suggestions;
    try {
      if (responseText === 'null' || responseText.toLowerCase().trim() === 'no significant issues found' || responseText.toLowerCase().includes('no significant issues found')) {
        suggestions = null;
      } else {
        suggestions = JSON.parse(responseText);
        
        if (!Array.isArray(suggestions)) {
          suggestions = null;
        } else {
          suggestions = suggestions.filter(s => 
            s && 
            typeof s === 'object' && 
            typeof s.category === 'string' && 
            typeof s.text === 'string' &&
            s.text.length <= 300
          );
          
          if (suggestions.length === 0) {
            suggestions = null;
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI test response:', parseError);
      suggestions = null;
    }
    
    // Store in debug log
    const logEntry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      blockId: 'ADMIN_TEST',
      blockType: blockType as 'opening' | 'objection',
      inputText: text,
      prompt,
      rawResponse: responseText,
      parsedSuggestions: suggestions
    };
    
    debugLogs.unshift(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) {
      debugLogs = debugLogs.slice(0, MAX_DEBUG_LOGS);
    }
    
    res.json({ 
      suggestions,
      debug: {
        prompt,
        rawResponse: responseText,
        timestamp: logEntry.timestamp
      }
    });
    
  } catch (error: any) {
    console.error('Admin AI test error:', error);
    
    const logEntry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      blockId: 'ADMIN_TEST',
      blockType: blockType as 'opening' | 'objection',
      inputText: text,
      prompt: 'Error occurred before prompt was sent',
      rawResponse: '',
      parsedSuggestions: null,
      error: error.message || 'Unknown error'
    };
    
    debugLogs.unshift(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) {
      debugLogs = debugLogs.slice(0, MAX_DEBUG_LOGS);
    }
    
    res.status(500).json({ error: 'Failed to test AI: ' + error.message });
  }
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
  const { parentId, text, category } = req.body;
  
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

  // Enforce 300-character limit for objections (depth > 0)
  const OBJECTION_CHAR_LIMIT = 300;
  if (depth > 0 && text.length > OBJECTION_CHAR_LIMIT) {
    return res.status(400).json({ 
      error: `Objections must be ${OBJECTION_CHAR_LIMIT} characters or less (current: ${text.length})` 
    });
  }

  const staticNumber = generateStaticNumber(debate._id, parentId);

  const newBlock: DebateBlock = {
    id: uuidv4(),
    parentId: parentId || null,
    depth,
    order: siblings.length,
    staticNumber,
    text,
    history: [],
    ...(category && { category })
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
    // Enforce 300-character limit for objections (depth > 0)
    const OBJECTION_CHAR_LIMIT = 300;
    if (block.depth > 0 && text.length > OBJECTION_CHAR_LIMIT) {
      return res.status(400).json({ 
        error: `Objections must be ${OBJECTION_CHAR_LIMIT} characters or less (current: ${text.length})` 
      });
    }
    
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

router.patch('/block/:id/disable', (req, res) => {
  const { id } = req.params;
  
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  
  const block = debate.blocks.find(b => b.id === id);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }

  // Prevent disabling the opening statement
  if (block.depth === 0) {
    return res.status(400).json({ error: 'Cannot disable opening statement' });
  }

  disableBlockAndChildren(debate._id, id);
  const updatedDebate = updateDebate(debate._id);
  res.json(updatedDebate);
});

router.patch('/block/:id/restore', (req, res) => {
  const { id } = req.params;
  
  const debate = getCurrentDebate();
  if (!debate) {
    return res.status(404).json({ error: 'No current debate' });
  }
  
  const block = debate.blocks.find(b => b.id === id);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }

  try {
    restoreBlockAndChildren(debate._id, id);
    const updatedDebate = updateDebate(debate._id);
    res.json(updatedDebate);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
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