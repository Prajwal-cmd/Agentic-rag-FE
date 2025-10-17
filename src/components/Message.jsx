// frontend/src/components/Message.jsx
import React, { useState } from 'react';
import { User, Bot, ChevronDown, ChevronUp, ExternalLink, FileText, Copy, Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { normalizeLLMResponse, segmentContent, preprocessLLMResponse } from '../utils/formatters';

// Enhanced CodeBlock component with better dark theme support
const CodeBlock = ({ language, codeString, ...props }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe language detection
  const safeLanguage = language && typeof language === 'string' 
    ? language.toLowerCase().replace(/[^a-z0-9+#-]/g, '') 
    : 'text';

  return (
    <div className="relative my-6 bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
      {/* Code header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-300 uppercase tracking-wide">
            {safeLanguage || 'text'}
          </span>
        </div>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 border border-gray-600"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* SyntaxHighlighter with better dark theme */}
      <SyntaxHighlighter
        language={safeLanguage}
        style={vscDarkPlus} // Better dark theme than atomDark
        customStyle={{ 
          margin: 0, 
          padding: '1.5rem',
          fontSize: '0.9rem', 
          lineHeight: '1.6',
          backgroundColor: 'rgb(17, 24, 39)',
          border: 'none',
          borderRadius: '0',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
        }}
        wrapLongLines={true}
        showLineNumbers={codeString.split('\n').length > 2}
        lineNumberStyle={{ 
          color: '#6B7280',
          paddingRight: '1.5rem',
          minWidth: '3em',
          backgroundColor: 'rgb(31, 41, 55)'
        }}
        lineNumberContainerStyle={{
          paddingRight: '1rem'
        }}
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

// Enhanced SourceItem component with better dark theme
const SourceItem = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 bg-gray-800/60 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {source.type === 'websearch' || source.url ? (
            <ExternalLink className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-100 truncate">
              {source.title || source.filename || `Source ${index + 1}`}
            </div>
            {source.url && (
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 truncate block mt-1 hover:underline"
              >
                {source.url}
              </a>
            )}
            {source.type && (
              <a 
                href={source.type} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 truncate block mt-1 hover:underline"
              >
                {source.type}
              </a>
            )}
            {source.authors && source.authors.length > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                By {source.authors.join(', ')}
              </div>
            )}
            {(source.year || source.citation_count) && (
              <div className="text-xs text-gray-500 mt-1">
                {source.year && `Published: ${source.year}`}
                {source.year && source.citation_count && ' • '}
                {source.citation_count && `Citations: ${source.citation_count}`}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 ml-3 flex-shrink-0 px-3 py-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
        >
          {expanded ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{expanded ? 'Hide' : 'View'}</span>
        </button>
      </div>
      
      {expanded && source.content && (
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
          <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Content Preview</div>
          <div className="text-sm text-gray-200 leading-relaxed max-h-40 overflow-y-auto">
            {source.content}
          </div>
        </div>
      )}
    </div>
  );
};

const Message = ({ message }) => {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // Enhanced content processing with robust LLM response handling
  const processContent = (content) => {
    if (isUser) return [{ type: 'text', content }];
    
    try {
      // Step 1: Preprocess LLM response (fix common issues)
      const preprocessed = preprocessLLMResponse(content);
      
      // Step 2: Normalize markdown and code blocks
      const normalized = normalizeLLMResponse(preprocessed);
      
      // Step 3: Segment into blocks for proper rendering
      const blocks = segmentContent(normalized);
      
      return blocks;
    } catch (error) {
      console.error('Error processing LLM content:', error);
      // Fallback: treat as plain text
      return [{ type: 'text', content }];
    }
  };

  const contentBlocks = processContent(message.content);

  // Enhanced Markdown components with perfect dark theme support
  const MarkdownComponents = {
    // Root container - ensure proper dark theme inheritance
    root: ({ children }) => (
      <div className="text-gray-100 leading-relaxed">
        {children}
      </div>
    ),
    
    // Paragraph handling
    p: ({ children }) => {
      const childrenArray = React.Children.toArray(children);
      
      // Check if this paragraph contains only inline elements
      const hasOnlyInline = childrenArray.every(child => {
        if (typeof child === 'string') return true;
        if (React.isValidElement(child)) {
          const elementType = child.type;
          return typeof elementType === 'string' && 
            !['div', 'pre', 'table', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(elementType);
        }
        return true;
      });
      
      if (hasOnlyInline) {
        return <p className="mb-4 leading-7 text-gray-200">{children}</p>;
      } else {
        return <div className="my-4">{children}</div>;
      }
    },
    
    // Headers with perfect dark theme contrast
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-8 mb-4 pb-3 border-b border-gray-700 text-gray-100">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold mt-7 mb-3 text-gray-100">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-100">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold mt-5 mb-2 text-gray-200">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-semibold mt-4 mb-2 text-gray-300 uppercase tracking-wide">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-xs font-semibold mt-4 mb-2 text-gray-400 uppercase tracking-wider">
        {children}
      </h6>
    ),
    
    // Lists with better spacing and dark theme
    ul: ({ children }) => (
      <ul className="list-disc list-outside space-y-2 pl-6 mb-5">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside space-y-2 pl-6 mb-5">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-7 text-gray-200 mb-1">
        {children}
      </li>
    ),
    
    // Blockquotes with better dark theme styling
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-3 my-5 bg-gray-800/40 italic text-gray-300 rounded-r-lg">
        {children}
      </blockquote>
    ),
    
    // Tables with enhanced dark theme
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 border border-gray-700 rounded-lg shadow-lg">
        <table className="min-w-full divide-y divide-gray-700">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-800/80">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-800 bg-gray-900/20">
        {children}
      </tbody>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-200 uppercase tracking-wider bg-gray-800/80">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-gray-300 align-top border-t border-gray-800">
        {children}
      </td>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-gray-800/30 transition-colors duration-150">
        {children}
      </tr>
    ),
    
    // Links with better dark theme visibility
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-400 hover:text-blue-300 underline transition-colors duration-200 font-medium"
      >
        {children}
      </a>
    ),
    
    // Horizontal rule
    hr: () => <hr className="my-8 border-gray-700" />,
    
    // Strong/Bold text
    strong: ({ children }) => (
      <strong className="font-bold text-gray-100">
        {children}
      </strong>
    ),
    
    // Emphasis/Italic text
    em: ({ children }) => (
      <em className="italic text-gray-300">
        {children}
      </em>
    ),
    
    // Combined bold+italic
    // Inline code with perfect dark theme contrast
    code: ({ inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code 
            className="px-2 py-1 bg-gray-800 text-orange-300 rounded-md text-sm font-mono border border-gray-700"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // If we get here, it's a code block that wasn't segmented properly
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      
      return (
        <CodeBlock
          language={language}
          codeString={String(children).replace(/\n$/, '')}
        />
      );
    },
    
    // Preformatted text - fallback for unsegmented code
    pre: ({ children }) => {
      if (React.isValidElement(children) && children.type === 'code') {
        return children;
      }
      
      // Extract text content as fallback
      const codeContent = React.Children.toArray(children)
        .map(child => {
          if (typeof child === 'string') return child;
          if (React.isValidElement(child) && child.props.children) {
            return React.Children.toArray(child.props.children).join('');
          }
          return '';
        })
        .join('')
        .trim();
      
      if (codeContent) {
        return (
          <CodeBlock 
            language="text" 
            codeString={codeContent}
          />
        );
      }
      
      return <div className="my-4">{children}</div>;
    },
  };

  // Render segmented content with proper error handling
  const renderSegmentedContent = () => {
    if (!contentBlocks || contentBlocks.length === 0) {
      return (
        <div className="text-gray-400 italic">
          No content to display
        </div>
      );
    }

    return contentBlocks.map((block, index) => {
      try {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={block.language}
              codeString={block.content}
            />
          );
        } else {
          return (
            <div key={index} className="max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={MarkdownComponents}
                skipHtml={true}
              >
                {block.content}
              </ReactMarkdown>
            </div>
          );
        }
      } catch (error) {
        console.error('Error rendering content block:', error);
        return (
          <div key={index} className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800">
            Error rendering content block
          </div>
        );
      }
    });
  };

  return (
    <div className="flex gap-4 items-start my-8">
      {/* Bot Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border border-blue-400 shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`rounded-2xl px-5 py-4 max-w-full lg:max-w-[85%] shadow-xl ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-gray-800 border border-gray-700 shadow-2xl'
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap break-words leading-7 font-medium">
              {message.content}
            </div>
          ) : (
            <div className="break-words text-gray-200">
              {renderSegmentedContent()}
            </div>
          )}
        </div>
        
        {/* Enhanced Sources Section */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pl-2">
            <div className="flex items-center justify-between mb-2">
              <button 
                onClick={() => setShowSources(!showSources)} 
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-gray-200 transition-colors px-4 py-2 rounded-lg hover:bg-gray-800/50 border border-gray-700 hover:border-gray-600"
              >
                {showSources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span className="font-medium">
                  {showSources ? 'Hide' : 'Show'} {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                </span>
              </button>
              
              {showSources && (
                <button
                  onClick={() => setShowSources(false)}
                  className="text-sm text-gray-500 hover:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-800/30 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
            
            {showSources && (
              <div className="mt-3 space-y-4 p-5 bg-gray-900/40 rounded-xl border border-gray-700 backdrop-blur-sm">
                <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Sources & References
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {message.sources.map((source, index) => (
                    <SourceItem 
                      key={index} 
                      source={source} 
                      index={index} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Enhanced Streaming Indicator */}
        {!isUser && isStreaming && (
          <div className="mt-3 pl-2 flex items-center gap-3 text-sm text-gray-400">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <span className="font-medium">Generating response...</span>
          </div>
        )}
      </div>
      
      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center border border-green-400 shadow-lg">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default Message;