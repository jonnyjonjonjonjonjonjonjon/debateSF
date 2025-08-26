// WhatsApp-style markdown parser
// Supports: *bold*, _italic_, ~strikethrough~, `code`, lists, quotes, links

export interface ParsedElement {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'code' | 'link' | 'line' | 'list' | 'quote';
  content: string;
  url?: string;
  children?: ParsedElement[];
}

// Auto-detect URLs in text
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Parse inline formatting within a line
function parseInlineFormatting(text: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  let remaining = text;
  
  try {
    while (remaining.length > 0) {
    // Check for bold *text*
    const boldMatch = remaining.match(/^\*([^*]+)\*/);
    if (boldMatch) {
      elements.push({
        type: 'bold',
        content: boldMatch[1],
        children: parseInlineFormatting(boldMatch[1])
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    
    // Check for italic _text_
    const italicMatch = remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      elements.push({
        type: 'italic',
        content: italicMatch[1],
        children: parseInlineFormatting(italicMatch[1])
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    
    // Check for strikethrough ~text~
    const strikeMatch = remaining.match(/^~([^~]+)~/);
    if (strikeMatch) {
      elements.push({
        type: 'strikethrough',
        content: strikeMatch[1],
        children: parseInlineFormatting(strikeMatch[1])
      });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }
    
    // Check for code `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push({
        type: 'code',
        content: codeMatch[1]
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    
    // Check for URLs
    const urlMatch = remaining.match(urlRegex);
    if (urlMatch && remaining.startsWith(urlMatch[0])) {
      elements.push({
        type: 'link',
        content: urlMatch[0],
        url: urlMatch[0]
      });
      remaining = remaining.slice(urlMatch[0].length);
      continue;
    }
    
    // Regular text - find next special character
    const nextSpecial = remaining.search(/[*_~`]|https?:\/\//);
    if (nextSpecial === -1) {
      // No more special characters
      if (remaining.trim()) {
        elements.push({
          type: 'text',
          content: remaining
        });
      }
      break;
    } else {
      // Add text up to next special character
      const textContent = remaining.slice(0, nextSpecial);
      if (textContent) {
        elements.push({
          type: 'text',
          content: textContent
        });
      }
      remaining = remaining.slice(nextSpecial);
    }
    }
  } catch (error) {
    console.warn('Inline formatting parsing error:', error);
    // Return plain text if parsing fails
    return [{
      type: 'text',
      content: text
    }];
  }
  
  return elements;
}

// Parse a single line for list items, quotes, etc.
function parseLine(line: string): ParsedElement {
  try {
    const trimmed = line.trim();
  
  // Check for bullet list (* item or - item)
  const bulletMatch = trimmed.match(/^[*-]\s+(.+)$/);
  if (bulletMatch) {
    return {
      type: 'list',
      content: 'bullet',
      children: parseInlineFormatting(bulletMatch[1])
    };
  }
  
  // Check for numbered list (1. item, 2. item, etc.)
  const numberMatch = trimmed.match(/^\d+\.\s+(.+)$/);
  if (numberMatch) {
    return {
      type: 'list',
      content: 'numbered',
      children: parseInlineFormatting(numberMatch[1])
    };
  }
  
  // Check for quote (> text)
  const quoteMatch = trimmed.match(/^>\s*(.+)$/);
  if (quoteMatch) {
    return {
      type: 'quote',
      content: quoteMatch[1],
      children: parseInlineFormatting(quoteMatch[1])
    };
  }
  
    // Regular line
    return {
      type: 'line',
      content: line,
      children: parseInlineFormatting(line)
    };
  } catch (error) {
    console.warn('Line parsing error:', error);
    // Return plain text line if parsing fails
    return {
      type: 'line',
      content: line,
      children: [{
        type: 'text',
        content: line
      }]
    };
  }
}

// Main parsing function
export function parseMarkdown(text: string): ParsedElement[] {
  if (!text || typeof text !== 'string') return [];
  
  try {
    const lines = text.split('\n');
    return lines.map(line => parseLine(line));
  } catch (error) {
    console.warn('Markdown parsing failed:', error);
    // Return plain text fallback
    return [{
      type: 'text',
      content: text
    }];
  }
}

// Convert parsed elements to HTML string (for debugging)
export function elementsToHtml(elements: ParsedElement[]): string {
  return elements.map(element => {
    switch (element.type) {
      case 'text':
        return element.content;
      case 'bold':
        return `<strong>${element.children ? elementsToHtml(element.children) : element.content}</strong>`;
      case 'italic':
        return `<em>${element.children ? elementsToHtml(element.children) : element.content}</em>`;
      case 'strikethrough':
        return `<del>${element.children ? elementsToHtml(element.children) : element.content}</del>`;
      case 'code':
        return `<code>${element.content}</code>`;
      case 'link':
        return `<a href="${element.url}" target="_blank" rel="noopener noreferrer">${element.content}</a>`;
      case 'line':
        return element.children ? elementsToHtml(element.children) : element.content;
      case 'list':
        const listContent = element.children ? elementsToHtml(element.children) : '';
        return element.content === 'bullet' 
          ? `<li>${listContent}</li>`
          : `<li data-type="numbered">${listContent}</li>`;
      case 'quote':
        return `<blockquote>${element.children ? elementsToHtml(element.children) : element.content}</blockquote>`;
      default:
        return element.content;
    }
  }).join('<br>');
}