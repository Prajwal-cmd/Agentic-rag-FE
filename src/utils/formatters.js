// frontend/src/utils/formatters.js
// Enhanced LLM response formatting utilities with comprehensive pattern handling

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const isValidFileType = (filename) => {
  if (!filename) return false;
  const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
};

/**
 * NEW: Comprehensive LLM response preprocessing
 * Handles patterns from OpenAI, Anthropic, and other LLMs
 */
export function preprocessLLMResponse(content) {
  if (!content || typeof content !== 'string') return '';
  
  let processed = content;
  
  // Fix 1: Remove common LLM response wrappers and artifacts
  processed = processed.replace(/^(```(?:json|markdown|html|javascript|python|java|cpp|csharp|php|sql)?\s*\n?)/, '');
  processed = processed.replace(/(\n?```\s*)$/, '');
  
  // Fix 2: Remove thinking/response markers
  processed = processed.replace(/^(思考：|思考:|Thinking:|Response:|Answer:|回答：|回答:)\s*/i, '');
  
  // Fix 3: Handle escaped characters that LLMs sometimes over-escape
  processed = processed.replace(/\\\*/g, '*');
  processed = processed.replace(/\\_/g, '_');
  processed = processed.replace(/\\`/g, '`');
  processed = processed.replace(/\\\[/g, '[');
  processed = processed.replace(/\\\]/g, ']');
  processed = processed.replace(/\\\(/g, '(');
  processed = processed.replace(/\\\)/g, ')');
  
  // Fix 4: Normalize line endings and remove excessive whitespace
  processed = processed.replace(/\r\n/g, '\n');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/[ \t]{2,}/g, ' ');
  
  // Fix 5: Handle common header patterns (like "Adding Two Numbers in C++ ===========")
  processed = processed.replace(/^(.+)\n=+\s*$/gm, '# $1');  // Convert === underlines to h1
  processed = processed.replace(/^(.+)\n-+\s*$/gm, '## $1'); // Convert --- underlines to h2
  
  // Fix 6: Ensure proper spacing around code blocks
  processed = processed.replace(/([^\n])\n```/g, '$1\n\n```');
  processed = processed.replace(/```\n([^\n])/g, '```\n\n$1');
  
  // Fix 7: Handle mixed markdown indicators
  processed = processed.replace(/\*\*\*([^*]+)\*\*\*/g, '***$1***');
  processed = processed.replace(/___([^_]+)___/g, '___$1___');
  
  // Fix 8: Fix common C++/programming examples with headers
  processed = processed.replace(/^#{1,6}\s*Example:\s*/gim, '### Example: ');
  processed = processed.replace(/^#{1,6}\s*Code:\s*/gim, '### Code: ');
  processed = processed.replace(/^#{1,6}\s*Explanation:\s*/gim, '### Explanation: ');
  
  return processed.trim();
}

/**
 * Enhanced content segmentation - handles all LLM response patterns
 */
export function segmentContent(content) {
  if (!content || typeof content !== 'string') return [{ type: 'text', content: '' }];
  
  const blocks = [];
  const lines = content.split('\n');
  let currentBlock = { type: 'text', content: '' };
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Detect code block boundaries - handle various LLM formats
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        if (codeBuffer.length > 0) {
          blocks.push({
            type: 'code',
            content: codeBuffer.join('\n'),
            language: codeLanguage || 'text'
          });
        }
        codeBuffer = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        // Start of code block
        if (currentBlock.content.trim()) {
          blocks.push({ ...currentBlock });
          currentBlock.content = '';
        }
        inCodeBlock = true;
        // Extract language if specified
        codeLanguage = trimmedLine.slice(3).trim() || 'text';
        // Clean up language spec
        codeLanguage = codeLanguage.replace(/[^a-zA-Z0-9+#-]/g, '');
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
    } else {
      // Enhanced implicit code detection for programming examples
      const looksLikeCode = /^\s*(#include|using namespace|int main|function|class|import |export |def |var |let |const |public |private |\/\/|\/\*|{|}|<\?|<!DOCTYPE|package |cout|printf|System\.out|console\.log)\s*/.test(line);
      
      if (looksLikeCode && !currentBlock.content.trim()) {
        // Start collecting potential code
        let j = i;
        const potentialCode = [];
        let consecutiveCodeLines = 0;
        let blankLines = 0;
        
        while (j < lines.length && j < i + 20) {
          const currentLine = lines[j];
          if (currentLine.trim() === '') {
            blankLines++;
            potentialCode.push(currentLine);
            j++;
            if (blankLines > 2) break;
            continue;
          } else {
            blankLines = 0;
          }
          
          const isCodeLine = /^\s*(\w+\s+\w+\(|#include|using namespace|int main|function|class|import|export|def|var|let|const|public|private|\/\/|\/\*|{|}|<\/?|#|package|\$|\+\+|--|=>|\.\w+\(|System\.out|console\.log|cout|printf|std::|template|typename|from |require|module\.exports)/.test(currentLine);
          
          if (isCodeLine) {
            consecutiveCodeLines++;
            potentialCode.push(currentLine);
            j++;
          } else {
            // Check if this might be a continuation (indented lines or comments)
            const isIndented = /^\s{4,}|\t/.test(currentLine);
            const isComment = /^\s*\/\//.test(currentLine) || /^\s*\/\*/.test(currentLine) || /^\s*#/.test(currentLine);
            
            if ((isIndented || isComment) && consecutiveCodeLines > 0) {
              potentialCode.push(currentLine);
              j++;
            } else {
              break;
            }
          }
        }
        
        // More lenient detection for code examples
        if (consecutiveCodeLines >= 1 && potentialCode.join('').trim().length > 10) {
          const potentialContent = potentialCode.join('\n');
          const detectedLang = detectLanguage(potentialContent);
          blocks.push({
            type: 'code',
            content: potentialContent,
            language: detectedLang
          });
          i = j - 1;
          continue;
        }
      }
      
      // Add to current text block
      currentBlock.content += line + '\n';
    }
  }

  // Handle remaining content
  if (codeBuffer.length > 0) {
    blocks.push({
      type: 'code',
      content: codeBuffer.join('\n'),
      language: codeLanguage || 'text'
    });
  }
  
  if (currentBlock.content.trim()) {
    // Clean up the text block
    currentBlock.content = currentBlock.content.trim();
    blocks.push(currentBlock);
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content }];
}

/**
 * Enhanced language detection for comprehensive programming language support
 */
function detectLanguage(content) {
  if (!content) return 'text';
  
  const lowerContent = content.toLowerCase();
  const firstLine = content.split('\n')[0] || '';
  
  // C++ detection (comprehensive)
  if (lowerContent.includes('#include') || 
      lowerContent.includes('std::') || 
      lowerContent.includes('cout') ||
      lowerContent.includes('printf') ||
      lowerContent.includes('using namespace') ||
      /int\s+main\s*\(/.test(content) ||
      /class\s+\w+/.test(content)) {
    return 'cpp';
  }
  
  // C detection
  if ((lowerContent.includes('#include') && !lowerContent.includes('iostream') && 
       !lowerContent.includes('std::')) || lowerContent.includes('printf(')) {
    return 'c';
  }
  
  // Java detection
  if (lowerContent.includes('public class') || 
      lowerContent.includes('system.out') ||
      lowerContent.includes('string[] args') ||
      /public\s+static\s+void\s+main/.test(content)) {
    return 'java';
  }
  
  // Python detection
  if (lowerContent.includes('def ') || 
      lowerContent.includes('import ') || 
      lowerContent.includes('print(') ||
      lowerContent.includes('__main__') ||
      lowerContent.includes('if __name__') ||
      /^from\s+\w+\s+import/.test(firstLine) ||
      /^import\s+\w+/.test(firstLine)) {
    return 'python';
  }
  
  // JavaScript/TypeScript
  if (lowerContent.includes('function') || 
      lowerContent.includes('const ') || 
      lowerContent.includes('let ') || 
      lowerContent.includes('=>') ||
      lowerContent.includes('console.log') ||
      lowerContent.includes('document.') ||
      /export\s+(default\s+)?(function|class|const)/.test(content) ||
      /require\(['"]/.test(content)) {
    return 'javascript';
  }
  
  // HTML
  if (lowerContent.includes('<!doctype') || 
      lowerContent.includes('<html') || 
      lowerContent.includes('<div') ||
      /<[a-z][\s\S]*>/.test(content)) {
    return 'html';
  }
  
  // CSS
  if ((content.includes('{') && content.includes('}') && 
       (content.includes(':') || content.includes('@media')))) {
    return 'css';
  }
  
  // SQL
  if (/\b(select|insert|update|delete|from|where|join|inner|outer|group by|order by)\b/i.test(content)) {
    return 'sql';
  }
  
  // Shell/Bash
  if (lowerContent.startsWith('#!') || 
      lowerContent.includes('#!/bin/') ||
      /^\s*(echo|cd|ls|mkdir|rm|cp|mv|grep|find)\s+/.test(firstLine)) {
    return 'bash';
  }
  
  // PHP
  if (lowerContent.includes('<?php') || 
      lowerContent.includes('$_') ||
      lowerContent.includes('echo ')) {
    return 'php';
  }
  
  // C#
  if (lowerContent.includes('using system') || 
      lowerContent.includes('console.writeline') ||
      lowerContent.includes('namespace ')) {
    return 'csharp';
  }
  
  // Ruby
  if (lowerContent.includes('def ') && 
      (lowerContent.includes('puts') || lowerContent.includes('end'))) {
    return 'ruby';
  }
  
  // Go
  if (lowerContent.includes('package main') || 
      lowerContent.includes('import "') ||
      lowerContent.includes('func main()')) {
    return 'go';
  }
  
  // Rust
  if (lowerContent.includes('fn main') || 
      lowerContent.includes('println!') ||
      lowerContent.includes('let ') && lowerContent.includes(': ')) {
    return 'rust';
  }
  
  return 'text';
}

/**
 * Fix common markdown formatting issues from LLM outputs
 */
function fixMarkdownFormatting(text) {
  if (!text) return text;
  
  let processed = text;
  
  // Fix 1: Ensure proper spacing around lists
  processed = processed.replace(/(\S)\n([*-])/g, '$1\n\n$2');
  processed = processed.replace(/([*-])\n(\S)/g, '$1\n\n$2');
  
  // Fix 2: Fix numbered lists
  processed = processed.replace(/(\d+)\.\s+([^\n]+?)\s+(\d+)\./g, '$1. $2\n$3.');
  
  // Fix 3: Fix bullet lists
  processed = processed.replace(/([-*])\s+([^\n]+?)\s+([-*])/g, '$1 $2\n$3');
  
  // Fix 4: Normalize bold formatting
  processed = processed.replace(/\*\*\*([^*]+)\*\*\*/g, '**$1**');
  processed = processed.replace(/__([^_]+)__/g, '**$1**');
  
  // Fix 5: Normalize italic formatting
  processed = processed.replace(/(^|\s)\*(\S[^*]*\S)\*($|\s)/g, '$1_$2_$3');
  processed = processed.replace(/(^|\s)_(\S[^_]*\S)_($|\s)/g, '$1_$2_$3');
  
  // Fix 6: Handle mixed bold+italic
  processed = processed.replace(/\*\*\*([^*]+)\*\*\*/g, '***$1***');
  
  // Fix 7: Ensure proper header spacing
  processed = processed.replace(/(#+)\s*([^#\n]+)\s*(#*)/g, '$1 $2');
  processed = processed.replace(/(\S)\n(#+)/g, '$1\n\n$2');
  
  // Fix 8: Fix common programming example headers
  processed = processed.replace(/^#{1,6}\s*(Example|Code|Explanation|Solution):?\s*/gim, '### $1: ');
  
  return processed;
}

/**
 * Fix broken code blocks in LLM responses
 */
function fixBrokenCodeBlocks(content) {
  if (!content) return content;
  
  const lines = content.split('\n');
  const fixed = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Closing code block
        fixed.push('```');
        inCodeBlock = false;
        codeBuffer = [];
      } else {
        // Opening code block
        if (codeBuffer.length > 0) {
          fixed.push(codeBuffer.join('\n'));
          codeBuffer = [];
        }
        fixed.push(line);
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      fixed.push(line);
    } else {
      codeBuffer.push(line);
    }
  }
  
  // Close any unclosed code blocks
  if (inCodeBlock) {
    fixed.push('```');
  }
  
  // Add any remaining text
  if (codeBuffer.length > 0) {
    fixed.push(codeBuffer.join('\n'));
  }
  
  return fixed.join('\n');
}

/**
 * Main LLM response normalization function
 * Handles the specific "Adding Two Numbers in C++" example and all common patterns
 */
export function normalizeLLMResponse(content, langHint = null) {
  if (!content || typeof content !== 'string') return '';
  
  // Step 1: Fix broken code blocks first
  let processed = fixBrokenCodeBlocks(content);
  
  // Step 2: Fix common markdown issues
  processed = fixMarkdownFormatting(processed);
  
  // Step 3: Handle specific patterns like "Adding Two Numbers in C++ ==========="
  // This converts underline-style headers to proper markdown headers
  processed = processed.replace(/^(.+?)\s*=+\s*$/gm, (match, header) => {
    // Only convert if it looks like a header (not code or other content)
    if (header.length < 100 && !header.includes('```')) {
      return `## ${header.trim()}`;
    }
    return match;
  });
  
  // Step 4: Check if entire content is code (only if no markdown structure)
  const lines = processed.split('\n').filter(line => line.trim().length > 0);
  if (lines.length >= 3) {
    const codeLikeLines = lines.filter(line => 
      /^\s*(#include|using namespace|int main|function|class|import|export|def|var|let|const|public|private|\/\/|\/\*|{|}|<\?|package|cout|printf)/.test(line) ||
      line.trim().startsWith('```')
    ).length;
    
    const hasMarkdownStructure = lines.some(line => 
      line.trim().startsWith('#') || 
      line.trim().startsWith('>') ||
      line.trim().match(/^[-*]\s/) ||
      line.trim().match(/^\d+\.\s/)
    );
    
    // If it looks like code but has no markdown structure, wrap it
    if (!hasMarkdownStructure && (codeLikeLines / lines.length) > 0.6) {
      const language = detectLanguage(processed);
      return `\`\`\`${language}\n${processed}\n\`\`\``;
    }
  }
  
  return processed;
}

/**
 * Format mixed content for proper display
 */
export function formatMixedContent(content) {
  if (!content) return '';
  
  const blocks = segmentContent(content);
  
  // If only one text block, return as is
  if (blocks.length === 1 && blocks[0].type === 'text') {
    return blocks[0].content;
  }
  
  // Reconstruct with proper formatting
  return blocks.map(block => {
    if (block.type === 'code') {
      return `\`\`\`${block.language}\n${block.content}\n\`\`\``;
    }
    return block.content;
  }).join('\n\n');
}

/**
 * NEW: Safe content rendering for error-prone LLM responses
 */
export function safeRenderContent(content, fallback = 'Unable to display content') {
  try {
    const processed = preprocessLLMResponse(content);
    const normalized = normalizeLLMResponse(processed);
    return normalized || fallback;
  } catch (error) {
    console.error('Error in safeRenderContent:', error);
    return fallback;
  }
}