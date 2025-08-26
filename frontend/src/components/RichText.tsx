import React from 'react';
import { parseMarkdown, ParsedElement } from '../utils/markdown';

interface RichTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean; // When true, renders as a single line without line breaks
}

function renderElement(element: ParsedElement, key: string): React.ReactNode {
  try {
    const childContent = element.children 
      ? element.children.map((child, index) => renderElement(child, `${key}-${index}`))
      : element.content;

    switch (element.type) {
    case 'text':
      return <span key={key}>{element.content}</span>;
    
    case 'bold':
      return <strong key={key} className="rich-bold">{childContent}</strong>;
    
    case 'italic':
      return <em key={key} className="rich-italic">{childContent}</em>;
    
    case 'strikethrough':
      return <del key={key} className="rich-strikethrough">{childContent}</del>;
    
    case 'code':
      return <code key={key} className="rich-code">{element.content}</code>;
    
    case 'link':
      return (
        <a 
          key={key} 
          href={element.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="rich-link"
        >
          {element.content}
        </a>
      );
    
    case 'line':
      return (
        <span key={key}>
          {childContent}
        </span>
      );
    
    case 'list':
      return (
        <li key={key} className={`rich-list-item ${element.content === 'bullet' ? 'rich-bullet' : 'rich-numbered'}`}>
          {childContent}
        </li>
      );
    
    case 'quote':
      return (
        <blockquote key={key} className="rich-quote">
          {childContent}
        </blockquote>
      );
    
    default:
      return <span key={key}>{element.content}</span>;
    }
  } catch (error) {
    console.warn('Error rendering element:', error);
    // Fallback to plain text
    return <span key={key}>{element.content || ''}</span>;
  }
}

export function RichText({ text, className = '', style, inline = false }: RichTextProps) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  let elements: ParsedElement[] = [];
  try {
    elements = parseMarkdown(text);
  } catch (error) {
    console.warn('Markdown parsing error:', error);
    // Fallback to plain text if parsing fails
    elements = [{
      type: 'text',
      content: text
    }];
  }
  
  try {
    if (inline) {
      // For inline rendering (like in the input overlay), render without wrapping divs
      return (
        <span className={`rich-text ${className}`} style={style}>
          {elements.map((element, index) => {
            return renderElement(element, `element-${index}`);
          })}
        </span>
      );
    }
    
    return (
      <div className={`rich-text ${className}`} style={style}>
        {elements.map((element, index) => {
          if (element.type === 'list') {
            return renderElement(element, `element-${index}`);
          }
          
          const content = renderElement(element, `element-${index}`);
          return (
            <div key={`line-${index}`} className="rich-line">
              {content}
            </div>
          );
        })}
      </div>
    );
  } catch (error) {
    console.warn('Error rendering RichText:', error);
    // Ultimate fallback - just render plain text
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }
}