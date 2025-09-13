import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseService } from '../services/supabase.js';

const router = express.Router();

// Lazy initialization of Anthropic client to handle Railway timing issues
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('Lazy init - Environment check - hasApiKey:', !!apiKey, 'keyLength:', apiKey?.length, 'keyPrefix:', apiKey?.substring(0, 15));
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    if (apiKey.length < 50 || !apiKey.startsWith('sk-ant-')) {
      throw new Error(`Invalid API key format. Length: ${apiKey.length}, starts with sk-ant-: ${apiKey.startsWith('sk-ant-')}`);
    }
    
    try {
      anthropic = new Anthropic({
        apiKey: apiKey,
      });
      console.log('Anthropic client initialized successfully with key length:', apiKey.length);
    } catch (initError) {
      console.error('Failed to create Anthropic client:', initError);
      throw initError;
    }
  }
  
  return anthropic;
}

type Id = string;

// Store AI prompt (unified for all argument types)
const defaultPrompt = `Analyze this argument and identify specific vulnerabilities an opponent could exploit. For each weakness found, provide:

1. The exact problematic statement/claim
2. The specific flaw category (use examples below or identify other flaws)
3. Brief guidance on how to strengthen this point

Use professional but accessible language that a 16-year-old could understand. Avoid jargon, slang, or overly academic terms.

COMMON FLAW CATEGORIES (watch for these and others):

Evidence & Support Issues:
- Missing evidence, Insufficient evidence, Outdated sources, Anecdotal evidence treated as universal, Sample size issues, Cherry-picking evidence

Logical Structure Problems:
- Correlation treated as causation, Unsubstantiated causal links, False dilemma, Hasty generalization, Circular reasoning

Relevance & Focus Issues:
- Red herring/irrelevant point, Ad hominem attack, Strawman argument

Standards & Criteria Problems:
- Unclear criteria, Subjective standards treated as objective

**Also identify any other reasoning flaws, logical errors, or argumentative weaknesses not listed above.**

Format: "CLAIM: [exact quote] | FLAW: [specific category] | GUIDANCE: [how to strengthen]"

**CRITICAL: Each suggestion must be under 300 characters total. Keep guidance very brief and actionable.**

Argument text: "\${text}"

If no significant issues are found, respond with just "null".

Format your response as a JSON array of objects with "category" and "text" properties, or just "null" if no issues found.`;

let currentPrompt = defaultPrompt;

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

// Store current debate ID for legacy endpoints
let currentDebateId: string | null = null;

// Helper functions for business logic
function generateStaticNumber(blocks: any[], parentId: Id | null): string {
  if (parentId === null) {
    return '1';
  }

  const parent = blocks.find(b => b.id === parentId);
  if (!parent) return '1';

  const siblings = blocks.filter(b => b.parentId === parentId);
  
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

  const nextNumber = maxChildNumber + 1;
  return `${parent.staticNumber}.${nextNumber}`;
}

async function reindexChildren(debateId: string, parentId: Id | null) {
  const children = await supabaseService.getBlocksByParent(debateId, parentId);
  children.sort((a, b) => a.order - b.order);
  
  for (let i = 0; i < children.length; i++) {
    if (children[i].order !== i) {
      await supabaseService.updateBlockOrder(children[i].id, i, debateId);
    }
  }
}

async function deleteBlockAndChildren(debateId: string, blockId: Id) {
  const debate = await supabaseService.getDebateById(debateId);
  if (!debate) return;
  
  const block = debate.blocks.find((b: any) => b.id === blockId);
  if (!block) return;

  const children = debate.blocks.filter((b: any) => b.parentId === blockId);
  for (const child of children) {
    await deleteBlockAndChildren(debateId, child.id);
  }
  
  await supabaseService.deleteBlock(blockId, debateId);
  await reindexChildren(debateId, block.parentId);
}

async function disableBlockAndChildren(debateId: string, blockId: Id) {
  const debate = await supabaseService.getDebateById(debateId);
  if (!debate) return;
  
  const block = debate.blocks.find((b: any) => b.id === blockId);
  if (!block) return;

  await supabaseService.disableBlock(blockId, debateId);

  const children = debate.blocks.filter((b: any) => b.parentId === blockId);
  for (const child of children) {
    await disableBlockAndChildren(debateId, child.id);
  }
}

async function restoreBlockAndChildren(debateId: string, blockId: Id) {
  const debate = await supabaseService.getDebateById(debateId);
  if (!debate) return;
  
  const block = debate.blocks.find((b: any) => b.id === blockId);
  if (!block) return;

  if (block.parentId) {
    const parent = debate.blocks.find((b: any) => b.id === block.parentId);
    if (parent && parent.disabled) {
      throw new Error('Cannot restore block while parent is disabled');
    }
  }

  await supabaseService.restoreBlock(blockId, debateId);

  const children = debate.blocks.filter((b: any) => b.parentId === blockId);
  for (const child of children) {
    await restoreBlockAndChildren(debateId, child.id);
  }
}

// Multiple debate endpoints
router.get('/debates', async (req, res) => {
  try {
    const debates = await supabaseService.getAllDebates();
    res.json(debates);
  } catch (error) {
    console.error('Error fetching debates:', error);
    res.status(500).json({ error: 'Failed to fetch debates' });
  }
});

router.post('/debate', async (req, res) => {
  try {
    const newDebate = await supabaseService.createDebate();
    currentDebateId = newDebate._id;
    res.json(newDebate);
  } catch (error) {
    console.error('Error creating debate:', error);
    res.status(500).json({ error: 'Failed to create debate' });
  }
});

router.get('/debate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const debate = await supabaseService.getDebateById(id);
    
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }
    
    currentDebateId = id;
    res.json(debate);
  } catch (error) {
    console.error('Error fetching debate:', error);
    res.status(500).json({ error: 'Failed to fetch debate' });
  }
});

router.delete('/debate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const debate = await supabaseService.getDebateById(id);
    
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }
    
    await supabaseService.deleteDebate(id);
    
    if (currentDebateId === id) {
      const remainingDebates = await supabaseService.getAllDebates();
      if (remainingDebates.length > 0) {
        currentDebateId = remainingDebates[0]._id;
      } else {
        const newDebate = await supabaseService.createDebate();
        currentDebateId = newDebate._id;
      }
    }
    
    res.json({ message: 'Debate deleted successfully' });
  } catch (error) {
    console.error('Error deleting debate:', error);
    res.status(500).json({ error: 'Failed to delete debate' });
  }
});

router.post('/debate/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    const debate = await supabaseService.resetDebate(id);
    
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }
    
    currentDebateId = id;
    res.json(debate);
  } catch (error) {
    console.error('Error resetting debate:', error);
    res.status(500).json({ error: 'Failed to reset debate' });
  }
});

// AI Check endpoint
router.post('/debate/:id/ai-check', async (req, res) => {
  console.log('=== AI CHECK ENDPOINT HIT ===');
  console.log('Debate ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('Timestamp:', new Date().toISOString());
  console.log('==============================');
  
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
  
  try {
    const debate = await supabaseService.getDebateById(id);
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }
    
    const block = debate.blocks.find((b: any) => b.id === blockId);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    const prompt = currentPrompt.replace('${text}', text);
    
    console.log('\n=== AI CHECK REQUEST ===');
    console.log('Block ID:', blockId);
    console.log('Block Type:', blockType);
    console.log('Input Text:', text);
    console.log('Prompt Length:', currentPrompt.length);
    console.log('Final Prompt:', prompt);
    console.log('API Key available:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key length:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 'undefined');
    console.log('========================\n');

    let message;
    try {
      console.log('About to call getAnthropicClient()...');
      const client = getAnthropicClient();
      console.log('Client obtained successfully, making API call...');
      
      message = await client.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      console.log('API call completed successfully');
    } catch (apiError: any) {
      console.error('Detailed API Error:', apiError);
      console.error('Error message:', apiError.message);
      console.error('Error type:', typeof apiError);
      console.error('Error constructor:', apiError.constructor.name);
      if (apiError.stack) console.error('Error stack:', apiError.stack);
      throw apiError;
    }
    
    const content = message.content[0];
    if (content.type !== 'text') {
      console.error('Unexpected response format from AI - not text type');
      return res.status(500).json({ error: 'Unexpected response format from AI' });
    }
    
    const responseText = content.text.trim();
    
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
        let cleanedResponse = responseText.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(7, -3).trim();
        } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3, -3).trim();
        }
        
        cleanedResponse = cleanedResponse.replace(/"text":\s*"((?:[^"\\]|\\.)*)"/gs, (match, content) => {
          console.log('Escaping newlines in content:', JSON.stringify(content));
          const escapedContent = content.replace(/\n/g, '\\n');
          console.log('Escaped content:', JSON.stringify(escapedContent));
          return `"text": "${escapedContent}"`;
        });
        
        console.log('After escaping text content:');
        console.log('Response length:', cleanedResponse.length);
        console.log('First 300 chars:', cleanedResponse.substring(0, 300));
        
        cleanedResponse = cleanedResponse
          .replace(/\n(\s*[\}\]])/g, '$1')
          .replace(/\n(\s*[,])/g, '$1')
          .replace(/\n(\s*"[^"]*":)/g, ' $1')
          .replace(/\[\s*\n\s*/g, '[')
          .replace(/\{\s*\n\s*/g, '{')
          .replace(/,\s*\n\s*/g, ', ')
          .replace(/  +/g, ' ');
        
        console.log('Original response length:', responseText.length);
        console.log('Original first 200 chars:', responseText.substring(0, 200));
        console.log('Cleaned response length:', cleanedResponse.length);
        console.log('Cleaned first 200 chars:', cleanedResponse.substring(0, 200));
        suggestions = JSON.parse(cleanedResponse);
        console.log('Parsed suggestions:', JSON.stringify(suggestions, null, 2));
        
        if (!Array.isArray(suggestions)) {
          console.log('Suggestions is not an array, setting to null');
          suggestions = null;
        } else {
          const originalCount = suggestions.length;
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
    
    if (error.status === 529) {
      return res.status(503).json({ 
        error: 'AI service is temporarily overloaded. Please try again in a few minutes.' 
      });
    }
    
    if (error.status === 401) {
      console.error('Authentication error - API key may be invalid or missing');
      return res.status(500).json({ 
        error: 'AI service authentication error. Please contact support.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Too many AI requests. Please wait a moment before trying again.' 
      });
    }
    
    if (error.message && error.message.includes('Could not resolve authentication method')) {
      console.error('Authentication method error - API key configuration issue:', error.message);
      return res.status(500).json({ 
        error: 'AI service configuration error. Authentication method could not be resolved.' 
      });
    }
    
    console.error('Unhandled AI service error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze text with AI. Please try again later.' 
    });
  }
});

// Admin endpoints for managing AI prompt
router.get('/admin/prompts', (req, res) => {
  res.json({ prompt: currentPrompt });
});

router.get('/admin/env-debug', (req, res) => {
  const envDebug = {
    hasAnthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicApiKeyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : null,
    anthropicApiKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 15) + '...' : null,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    availableAnthropicEnvVars: Object.keys(process.env).filter(key => key.includes('ANTHROPIC')),
    availableSupabaseEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  };
  res.json(envDebug);
});

router.post('/admin/prompts', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required and must be a string' });
  }
  
  currentPrompt = prompt;
  res.json({ message: 'Prompt updated successfully', prompt: currentPrompt });
});

router.post('/admin/prompts/reset', (req, res) => {
  currentPrompt = defaultPrompt;
  res.json({ prompt: currentPrompt });
});

router.get('/admin/debug-logs', (req, res) => {
  res.json(debugLogs);
});

router.delete('/admin/debug-logs', (req, res) => {
  debugLogs = [];
  res.json({ message: 'Debug logs cleared' });
});

router.post('/admin/test-ai', async (req, res) => {
  console.log('=== ADMIN TEST ENDPOINT HIT ===');
  console.log('Request body:', req.body);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================');
  
  const { text, blockType } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required and must be a string' });
  }
  
  if (!blockType || !['opening', 'objection'].includes(blockType)) {
    return res.status(400).json({ error: 'Block type must be "opening" or "objection"' });
  }
  
  try {
    const prompt = currentPrompt.replace('${text}', text);
    
    console.log('\n=== ADMIN AI TEST REQUEST ===');
    console.log('Block Type:', blockType);
    console.log('Input Text:', text);
    console.log('Final Prompt:', prompt);
    console.log('API Key available:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key length:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 'undefined');
    console.log('============================\n');

    let message;
    try {
      console.log('ADMIN TEST: About to call getAnthropicClient()...');
      const client = getAnthropicClient();
      console.log('ADMIN TEST: Client obtained successfully, making API call...');
      
      message = await client.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      console.log('ADMIN TEST: API call completed successfully');
    } catch (apiError: any) {
      console.error('ADMIN TEST: Detailed API Error:', apiError);
      console.error('ADMIN TEST: Error message:', apiError.message);
      console.error('ADMIN TEST: Error type:', typeof apiError);
      console.error('ADMIN TEST: Error constructor:', apiError.constructor.name);
      if (apiError.stack) console.error('ADMIN TEST: Error stack:', apiError.stack);
      throw apiError;
    }
    
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
        let cleanedResponse = responseText.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(7, -3).trim();
        } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3, -3).trim();
        }
        
        cleanedResponse = cleanedResponse.replace(/"text":\s*"((?:[^"\\]|\\.)*)"/gs, (match, content) => {
          console.log('Escaping newlines in content:', JSON.stringify(content));
          const escapedContent = content.replace(/\n/g, '\\n');
          console.log('Escaped content:', JSON.stringify(escapedContent));
          return `"text": "${escapedContent}"`;
        });
        
        console.log('After escaping text content:');
        console.log('Response length:', cleanedResponse.length);
        console.log('First 300 chars:', cleanedResponse.substring(0, 300));
        
        cleanedResponse = cleanedResponse
          .replace(/\n(\s*[\}\]])/g, '$1')
          .replace(/\n(\s*[,])/g, '$1')
          .replace(/\n(\s*"[^"]*":)/g, ' $1')
          .replace(/\[\s*\n\s*/g, '[')
          .replace(/\{\s*\n\s*/g, '{')
          .replace(/,\s*\n\s*/g, ', ')
          .replace(/  +/g, ' ');
        
        console.log('Original response length:', responseText.length);
        console.log('Original first 200 chars:', responseText.substring(0, 200));
        console.log('Cleaned response length:', cleanedResponse.length);
        console.log('Cleaned first 200 chars:', cleanedResponse.substring(0, 200));
        suggestions = JSON.parse(cleanedResponse);
        
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
    
    if (error.message && error.message.includes('Could not resolve authentication method')) {
      console.error('Authentication method error in admin test:', error.message);
      return res.status(500).json({ 
        error: 'Authentication configuration error: ' + error.message 
      });
    }
    
    if (error.status === 401) {
      console.error('Authentication error in admin test - API key may be invalid');
      return res.status(500).json({ 
        error: 'Authentication error - invalid API key: ' + error.message 
      });
    }
    
    res.status(500).json({ error: 'Failed to test AI: ' + error.message });
  }
});

// Test Supabase connection endpoint
router.get('/admin/test-supabase', async (req, res) => {
  try {
    const isConnected = await supabaseService.testConnection();
    res.json({ connected: isConnected });
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    res.status(500).json({ connected: false, error: (error as Error).message });
  }
});

// Legacy endpoints (backwards compatibility)
router.get('/debate', async (req, res) => {
  try {
    if (!currentDebateId) {
      // Try to get the most recent debate
      const debates = await supabaseService.getAllDebates();
      if (debates.length === 0) {
        const newDebate = await supabaseService.createDebate();
        currentDebateId = newDebate._id;
        return res.json(newDebate);
      } else {
        currentDebateId = debates[0]._id;
      }
    }
    
    const debate = await supabaseService.getDebateById(currentDebateId!);
    if (!debate) {
      return res.status(404).json({ error: 'No current debate' });
    }
    res.json(debate);
  } catch (error) {
    console.error('Error fetching current debate:', error);
    res.status(500).json({ error: 'Failed to fetch current debate' });
  }
});

router.post('/block', async (req, res) => {
  try {
    const { parentId, text, category } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!currentDebateId) {
      const debates = await supabaseService.getAllDebates();
      if (debates.length === 0) {
        const newDebate = await supabaseService.createDebate();
        currentDebateId = newDebate._id;
      } else {
        currentDebateId = debates[0]._id;
      }
    }

    const debate = await supabaseService.getDebateById(currentDebateId!);
    if (!debate) {
      return res.status(404).json({ error: 'No current debate' });
    }

    const siblings = debate.blocks.filter((block: any) => block.parentId === parentId);
    const depth = parentId ? 
      (debate.blocks.find((b: any) => b.id === parentId)?.depth ?? 0) + 1 : 
      0;

    const OBJECTION_CHAR_LIMIT = 300;
    if (depth > 0 && text.length > OBJECTION_CHAR_LIMIT) {
      return res.status(400).json({ 
        error: `Objections must be ${OBJECTION_CHAR_LIMIT} characters or less (current: ${text.length})` 
      });
    }

    const staticNumber = generateStaticNumber(debate.blocks, parentId);

    await supabaseService.createBlock(
      currentDebateId!,
      parentId || null,
      depth,
      siblings.length,
      staticNumber,
      text,
      category
    );

    const updatedDebate = await supabaseService.getDebateById(currentDebateId!);
    res.json(updatedDebate);
  } catch (error) {
    console.error('Error creating block:', error);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

router.patch('/block/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, order } = req.body;
    
    if (!currentDebateId) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const debate = await supabaseService.getDebateById(currentDebateId!);
    if (!debate) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const block = debate.blocks.find((b: any) => b.id === id);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    if (text && typeof text === 'string' && text !== block.text) {
      const OBJECTION_CHAR_LIMIT = 300;
      if (block.depth > 0 && text.length > OBJECTION_CHAR_LIMIT) {
        return res.status(400).json({ 
          error: `Objections must be ${OBJECTION_CHAR_LIMIT} characters or less (current: ${text.length})` 
        });
      }
      
      await supabaseService.updateBlockText(id, text, currentDebateId);
    }

    if (typeof order === 'number' && order !== block.order) {
      await supabaseService.updateBlockOrder(id, order, currentDebateId);
      await reindexChildren(currentDebateId, block.parentId);
    }

    const updatedDebate = await supabaseService.getDebateById(currentDebateId!);
    res.json(updatedDebate);
  } catch (error) {
    console.error('Error updating block:', error);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

router.delete('/block/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade } = req.query;
    
    if (!currentDebateId) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const debate = await supabaseService.getDebateById(currentDebateId!);
    if (!debate) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const block = debate.blocks.find((b: any) => b.id === id);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    if (cascade === 'true') {
      await deleteBlockAndChildren(currentDebateId, id);
    } else {
      await supabaseService.deleteBlock(id, currentDebateId);
      await reindexChildren(currentDebateId, block.parentId);
    }

    const updatedDebate = await supabaseService.getDebateById(currentDebateId!);
    res.json(updatedDebate);
  } catch (error) {
    console.error('Error deleting block:', error);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

router.patch('/block/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!currentDebateId) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const debate = await supabaseService.getDebateById(currentDebateId!);
    if (!debate) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const block = debate.blocks.find((b: any) => b.id === id);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    if (block.depth === 0) {
      return res.status(400).json({ error: 'Cannot disable opening statement' });
    }

    await disableBlockAndChildren(currentDebateId, id);
    const updatedDebate = await supabaseService.getDebateById(currentDebateId!);
    res.json(updatedDebate);
  } catch (error) {
    console.error('Error disabling block:', error);
    res.status(500).json({ error: 'Failed to disable block' });
  }
});

router.patch('/block/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!currentDebateId) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const debate = await supabaseService.getDebateById(currentDebateId!);
    if (!debate) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const block = debate.blocks.find((b: any) => b.id === id);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    await restoreBlockAndChildren(currentDebateId, id);
    const updatedDebate = await supabaseService.getDebateById(currentDebateId!);
    res.json(updatedDebate);
  } catch (error) {
    console.error('Error restoring block:', error);
    if ((error as Error).message.includes('Cannot restore block while parent is disabled')) {
      res.status(400).json({ error: (error as Error).message });
    } else {
      res.status(500).json({ error: 'Failed to restore block' });
    }
  }
});

router.put('/debate', async (req, res) => {
  try {
    const { resolve } = req.query;
    
    if (!currentDebateId) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    if (resolve === 'true' || resolve === 'false') {
      const resolved = resolve === 'true';
      const updatedDebate = await supabaseService.updateDebateResolved(currentDebateId, resolved);
      res.json(updatedDebate);
    } else {
      const debate = await supabaseService.getDebateById(currentDebateId!);
      res.json(debate);
    }
  } catch (error) {
    console.error('Error updating debate:', error);
    res.status(500).json({ error: 'Failed to update debate' });
  }
});

router.delete('/debate', async (req, res) => {
  try {
    if (!currentDebateId) {
      return res.status(404).json({ error: 'No current debate' });
    }
    
    const debate = await supabaseService.resetDebate(currentDebateId);
    res.json(debate);
  } catch (error) {
    console.error('Error resetting debate:', error);
    res.status(500).json({ error: 'Failed to reset debate' });
  }
});

export { router as debateRouter };